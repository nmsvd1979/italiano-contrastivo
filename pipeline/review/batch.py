"""Revisión humana: selección de lotes por déficit de cobertura y registro de decisiones."""
import json
from datetime import datetime, timezone

import yaml

from pipeline import config
from pipeline.db import store

LEVELS = ("A1", "A2", "B1", "B2")
STATUS = {"approve": "validated", "reject": "rejected", "doubt": "needs_review"}
# Las traducciones por pivote (vía inglés) pierden género, número y persona (37% de rechazo en la auditoría): no se sirven nunca.
SERVED_KINDS = ("direct", "llm")


def load_coverage() -> dict:
    return yaml.safe_load((config.RULES_DIR / "coverage.yaml").read_text(encoding="utf8"))


def select_batch(work_con, authoring_con, size: int = 20, coverage: dict | None = None, mode: str = "pending") -> list[dict]:
    """mode="pending": oraciones `needs_review` sin ninguna revisión, por déficit de cobertura (mayor primero) y, a igual
    déficit, menor confianza; se alternan traducciones directas y generadas desde el italiano (llm) para que el lote sea representativo.
    mode="doubts": oraciones cuya última decisión fue "duda"."""
    if mode == "doubts":
        ids = [r[0] for r in authoring_con.execute(
            "SELECT s.id FROM sentences s WHERE s.review_status = 'needs_review' "
            "AND COALESCE(json_extract(s.body, '$.translation_kind'), 'direct') IN ('direct', 'llm') AND EXISTS ("
            "SELECT 1 FROM reviews r WHERE r.entity = 'sentences' AND r.entity_id = s.id AND r.status = 'needs_review' "
            "AND r.id = (SELECT MAX(id) FROM reviews WHERE entity = 'sentences' AND entity_id = s.id)) ORDER BY s.id LIMIT ?", (size,))]
        return [_item(work_con, authoring_con, sid) for sid in ids]
    cov = coverage or load_coverage()
    val_code = dict(authoring_con.execute(
        "SELECT sec.code, COUNT(*) FROM sentence_error_codes sec JOIN sentences s ON s.id = sec.sentence_id "
        "WHERE s.review_status = 'validated' GROUP BY sec.code"))
    val_level = dict(authoring_con.execute(
        "SELECT cefr_estimate, COUNT(*) FROM sentences WHERE review_status = 'validated' GROUP BY cefr_estimate"))
    rows = authoring_con.execute(
        "SELECT s.id, s.cefr_estimate, json_extract(s.body, '$.cefr_confidence'), GROUP_CONCAT(sec.code), "
        "json_extract(s.body, '$.translation_kind') "
        "FROM sentences s LEFT JOIN sentence_error_codes sec ON sec.sentence_id = s.id "
        "WHERE s.review_status = 'needs_review' AND COALESCE(json_extract(s.body, '$.translation_kind'), 'direct') IN ('direct', 'llm') "
        "AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.entity = 'sentences' AND r.entity_id = s.id) GROUP BY s.id"
    ).fetchall()
    scored = []
    for sid, level, conf, codes, kind in rows:
        codes = codes.split(",") if codes else []
        deficit = sum(max(0, cov["per_code"] - val_code.get(c, 0)) for c in codes) + max(0, cov["per_level"] - val_level.get(level, 0))
        scored.append((-deficit, 1.0 if conf is None else conf, sid, kind or "direct"))
    scored.sort()
    queues = {"direct": [t for t in scored if t[3] == "direct"], "llm": [t for t in scored if t[3] == "llm"]}
    order = ["llm", "direct"] if scored and scored[0][3] == "llm" else ["direct", "llm"]
    picked: list[str] = []
    while len(picked) < size and (queues["direct"] or queues["llm"]):
        for kind in order:
            if queues[kind] and len(picked) < size:
                picked.append(queues[kind].pop(0)[2])
    return [_item(work_con, authoring_con, sid) for sid in picked]


def item_for(work_con, authoring_con, sentence_id: str) -> dict:
    return _item(work_con, authoring_con, sentence_id)


def last_decided(work_con, authoring_con) -> dict | None:
    """La oración de la revisión más reciente (para "Deshacer": se puede decidir de nuevo, la última decisión gana)."""
    row = authoring_con.execute("SELECT entity_id FROM reviews WHERE entity = 'sentences' ORDER BY id DESC LIMIT 1").fetchone()
    return _item(work_con, authoring_con, row[0]) if row else None


def _item(work_con, authoring_con, sentence_id: str) -> dict:
    d = json.loads(authoring_con.execute("SELECT body FROM sentences WHERE id=?", (sentence_id,)).fetchone()[0])
    kept = set(d.get("error_codes", []))
    # Se ofrecen todos los códigos etiquetados por el pipeline; los ya desmarcados en una decisión previa vienen sin marcar.
    tags = [
        {"code": code, "rule_id": rule_id, "evidence": json.loads(evidence), "accepted": code in kept}
        for code, rule_id, evidence in work_con.execute(
            "SELECT code, rule_id, evidence FROM tags WHERE ita_id = ? ORDER BY code", (int(d["source_id"]),))
    ]
    return {
        "id": d["id"], "it": d["it"], "es": d["es"], "translation_kind": d.get("translation_kind", "direct"),
        "author": d.get("author"), "source_url": f"https://tatoeba.org/en/sentences/show/{d['source_id']}",
        "cefr": d["cefr_estimate"], "cefr_confidence": d.get("cefr_confidence"), "tags": tags, "qa_flags": d.get("qa_flags", []),
        "status": d.get("review_status", "needs_review"),
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
    previous = dict(con.execute("SELECT code, rule_id FROM tag_reviews WHERE sentence_id = ?", (sentence_id,)).fetchall())
    rules = {**previous, **doc.get("tag_rules", {})}  # códigos ya desmarcados antes siguen siendo reactivables
    unknown = [c for c in tags if c not in rules]
    if unknown:
        raise ValueError(f"códigos que la oración no tiene etiquetados: {unknown}")

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    status = STATUS[action]
    con.execute("INSERT INTO reviews(entity, entity_id, status, reviewer, reviewed_at, note) VALUES ('sentences', ?, ?, ?, ?, ?)",
                (sentence_id, status, reviewer, now, decision.get("reason")))
    new = dict(doc, review_status=status)
    if action == "approve":
        # Solo al aprobar tiene sentido medir la precisión de las reglas: al rechazar, las casillas sin tocar no son un juicio.
        for code, accepted in tags.items():
            con.execute("INSERT INTO tag_reviews VALUES (?, ?, ?, ?, ?)", (sentence_id, code, rules[code], int(accepted is True), now))
        # La estimación automática original es la de la primera revisión; aprobar de nuevo no la reemplaza por la corregida.
        first = con.execute("SELECT estimated FROM level_reviews WHERE sentence_id = ? ORDER BY rowid LIMIT 1", (sentence_id,)).fetchone()
        estimated = first[0] if first else doc["cefr_estimate"]
        corrected = level or doc["cefr_estimate"]
        con.execute("INSERT INTO level_reviews VALUES (?, ?, ?, ?)", (sentence_id, estimated, corrected, now))
        current = set(doc.get("error_codes", []))
        keep = sorted(c for c in rules if tags.get(c, c in current) is True or (c not in tags and c in current))
        new.update(error_codes=keep, tag_rules={c: rules[c] for c in keep}, cefr_estimate=corrected)
    store.upsert(con, "sentences", new)
    con.commit()
