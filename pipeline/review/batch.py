"""Revisión humana: selección de lotes por déficit de cobertura y registro de decisiones."""
import json
from datetime import datetime, timezone

import yaml

from pipeline import config
from pipeline.db import store

LEVELS = ("A1", "A2", "B1", "B2")
STATUS = {"approve": "validated", "reject": "rejected", "doubt": "needs_review"}


def load_coverage() -> dict:
    return yaml.safe_load((config.RULES_DIR / "coverage.yaml").read_text(encoding="utf8"))


def select_batch(work_con, authoring_con, size: int = 20, coverage: dict | None = None) -> list[dict]:
    """Oraciones `needs_review` sin ninguna revisión, ordenadas por déficit de cobertura (mayor primero) y,
    a igual déficit, por menor confianza de nivel."""
    cov = coverage or load_coverage()
    val_code = dict(authoring_con.execute(
        "SELECT sec.code, COUNT(*) FROM sentence_error_codes sec JOIN sentences s ON s.id = sec.sentence_id "
        "WHERE s.review_status = 'validated' GROUP BY sec.code"))
    val_level = dict(authoring_con.execute(
        "SELECT cefr_estimate, COUNT(*) FROM sentences WHERE review_status = 'validated' GROUP BY cefr_estimate"))
    rows = authoring_con.execute(
        "SELECT s.id, s.cefr_estimate, json_extract(s.body, '$.cefr_confidence'), GROUP_CONCAT(sec.code) "
        "FROM sentences s LEFT JOIN sentence_error_codes sec ON sec.sentence_id = s.id "
        "WHERE s.review_status = 'needs_review' "
        "AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.entity = 'sentences' AND r.entity_id = s.id) GROUP BY s.id"
    ).fetchall()
    scored = []
    for sid, level, conf, codes in rows:
        codes = codes.split(",") if codes else []
        deficit = sum(max(0, cov["per_code"] - val_code.get(c, 0)) for c in codes) + max(0, cov["per_level"] - val_level.get(level, 0))
        scored.append((-deficit, 1.0 if conf is None else conf, sid))
    scored.sort()
    return [_item(work_con, authoring_con, sid) for _, _, sid in scored[:size]]


def _item(work_con, authoring_con, sentence_id: str) -> dict:
    d = json.loads(authoring_con.execute("SELECT body FROM sentences WHERE id=?", (sentence_id,)).fetchone()[0])
    tags = [
        {"code": code, "rule_id": rule_id, "evidence": json.loads(evidence)}
        for code, rule_id, evidence in work_con.execute(
            "SELECT code, rule_id, evidence FROM tags WHERE ita_id = ? ORDER BY code", (int(d["source_id"]),))
        if code in d.get("error_codes", [])
    ]
    return {
        "id": d["id"], "it": d["it"], "es": d["es"], "translation_kind": d.get("translation_kind", "direct"),
        "author": d.get("author"), "source_url": f"https://tatoeba.org/en/sentences/show/{d['source_id']}",
        "cefr": d["cefr_estimate"], "cefr_confidence": d.get("cefr_confidence"), "tags": tags, "qa_flags": d.get("qa_flags", []),
    }


def record_decision(con, sentence_id: str, decision: dict, reviewer: str = "me") -> None:
    """Registra una decisión humana. Lanza ValueError (sin cambiar nada) si es inválida. La última decisión gana
    y el historial completo queda en `reviews`."""
    action = decision.get("action")
    if action not in STATUS:
        raise ValueError(f"acción inválida: {action!r} (usa aprobar, rechazar o duda)")
    row = con.execute("SELECT body FROM sentences WHERE id=?", (sentence_id,)).fetchone()
    if row is None:
        raise ValueError(f"la oración {sentence_id} no existe")
    doc = json.loads(row[0])
    if action == "approve" and doc.get("translation_kind") == "pivot" and decision.get("translation_ok") is not True:
        raise ValueError("un par de traducción por pivote exige marcar 'la traducción es correcta'")
    level = decision.get("cefr")
    if level is not None and level not in LEVELS:
        raise ValueError(f"nivel inválido: {level!r}")
    tags = decision.get("tags") or {}
    unknown = [c for c in tags if c not in doc.get("error_codes", [])]
    if unknown:
        raise ValueError(f"códigos que la oración no tiene etiquetados: {unknown}")

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    status = STATUS[action]
    con.execute("INSERT INTO reviews(entity, entity_id, status, reviewer, reviewed_at, note) VALUES ('sentences', ?, ?, ?, ?, ?)",
                (sentence_id, status, reviewer, now, decision.get("reason")))
    for code, accepted in tags.items():
        con.execute("INSERT INTO tag_reviews VALUES (?, ?, ?, ?, ?)", (sentence_id, code, doc["tag_rules"][code], int(bool(accepted)), now))
    new = dict(doc, review_status=status)
    if action == "approve":
        estimated = doc["cefr_estimate"]
        corrected = level or estimated
        con.execute("INSERT INTO level_reviews VALUES (?, ?, ?, ?)", (sentence_id, estimated, corrected, now))
        keep = [c for c in doc.get("error_codes", []) if tags.get(c, True)]
        new.update(error_codes=keep, tag_rules={c: doc["tag_rules"][c] for c in keep}, cefr_estimate=corrected)
    store.upsert(con, "sentences", new)
    con.commit()
