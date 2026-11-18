"""Etapa de promoción: candidatos etiquetados → base de autoría (Fase 1) como `needs_review`."""
import json

from pipeline import config, filters
from pipeline.config import ROOT
from pipeline.db import store

CATALOG = ROOT / "schemas" / "data" / "error-codes.json"
TOPICS = ROOT / "schemas" / "data" / "topic-codes.json"  # objetivos de tema (no son errores catalogados por las fuentes)


def ensure_catalog(auth) -> None:
    """Los códigos de error deben existir en la base de autoría (clave foránea de sentence_error_codes)."""
    for entry in json.loads(CATALOG.read_text(encoding="utf8")) + json.loads(TOPICS.read_text(encoding="utf8")):
        row = auth.execute("SELECT review_status FROM error_codes WHERE code=?", (entry["code"],)).fetchone()
        # Re-ejecutar promote no puede deshacer una decisión humana sobre un código: se conserva su estado.
        store.upsert(auth, "error_codes", dict(entry, review_status=row[0]) if row else entry)


def _locked(auth, sentence_id: str) -> bool:
    """No se pisan oraciones ya decididas (validated/rejected) ni las que ya tienen alguna revisión humana."""
    row = auth.execute("SELECT review_status FROM sentences WHERE id=?", (sentence_id,)).fetchone()
    if row is None:
        return False
    if row[0] != "needs_review":
        return True
    return auth.execute("SELECT 1 FROM reviews WHERE entity='sentences' AND entity_id=? LIMIT 1", (sentence_id,)).fetchone() is not None


def promote(work, auth) -> dict[str, int]:
    ensure_catalog(auth)
    tags: dict[int, list[tuple[str, str]]] = {}
    for ita_id, code, rule_id in work.execute("SELECT ita_id, code, rule_id FROM tags ORDER BY ita_id, code"):
        tags.setdefault(ita_id, []).append((code, rule_id))
    rows = work.execute(
        "SELECT c.ita_id, c.spa_id, c.kind, c.flags, i.text, i.author, s.text, a.cefr, a.confidence, p.via_eng_id, s.author "
        "FROM candidates c JOIN annotations a ON a.ita_id = c.ita_id "
        "JOIN raw_sentences i ON i.id = c.ita_id JOIN raw_sentences s ON s.id = c.spa_id "
        "JOIN pairs p ON p.ita_id = c.ita_id AND p.spa_id = c.spa_id "
        "WHERE c.status = 'ok' ORDER BY c.ita_id"
    ).fetchall()
    promoted = skipped = 0
    for ita_id, spa_id, kind, flags, it, author, es, cefr, conf, via, es_author in rows:
        sid = f"s_{ita_id}"
        if _locked(auth, sid):
            skipped += 1
            continue
        doc = {
            "id": sid, "source": "tatoeba", "source_id": str(ita_id), "author": author, "license": config.LICENSE,
            "it": filters.normalize(it), "es": filters.normalize(es), "es_source_id": str(spa_id), "es_author": es_author,
            "translation_kind": kind, "cefr_estimate": cefr, "cefr_confidence": conf,
            "qa_flags": json.loads(flags), "error_codes": [c for c, _ in tags.get(ita_id, [])],
            "tag_rules": {c: r for c, r in tags.get(ita_id, [])}, "review_status": "needs_review",
        }
        if kind == "pivot" and via is not None:
            doc["pivot_via"] = str(via)
        store.upsert(auth, "sentences", doc)
        promoted += 1
    auth.commit()
    return {"promoted": promoted, "skipped": skipped}
