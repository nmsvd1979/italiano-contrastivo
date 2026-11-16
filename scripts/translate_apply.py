"""Aplica data/work/translate/verdicts.json: las oraciones aprobadas pasan a translation_kind=llm con el español generado
desde el italiano (el español del pivote se descarta) y se aprueban con reviewer="llm-audit". Lo dudoso o rechazado se registra
tal cual; nada que el auditor no confirme entra."""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline import filters  # noqa: E402
from pipeline.db import store  # noqa: E402
from pipeline.review import batch  # noqa: E402

LEVELS = {"A1", "A2", "B1", "B2"}
REVIEWER = "llm-audit"
auth = store.connect(ROOT / "data" / "work" / "authoring.db")
items = {i["id"]: i for i in json.loads((ROOT / "data/work/translate/items.json").read_text(encoding="utf8"))}
verdicts = json.loads((ROOT / "data/work/translate/verdicts.json").read_text(encoding="utf8"))
words = lambda t: len(re.findall(r"\w+", t))
# Códigos "escasos" (los que motivaron traducir): una oración solo vale la pena si cubre al menos uno de ellos.
_catalog = [c["code"] for c in json.loads((ROOT / "schemas/data/error-codes.json").read_text(encoding="utf8"))]
_direct = dict(auth.execute(
    "SELECT sec.code, COUNT(*) FROM sentence_error_codes sec JOIN sentences s ON s.id=sec.sentence_id "
    "WHERE s.review_status != 'rejected' AND COALESCE(json_extract(s.body,'$.translation_kind'),'direct') IN ('direct','llm') GROUP BY 1"))
SCARCE = {c for c in _catalog if c != "ERR_HETEROTONIC" and _direct.get(c, 0) < 25}
summary = Counter()
for v in verdicts:
    sid = v["id"]
    if sid not in items:
        summary["id_desconocido"] += 1
        continue
    row = auth.execute("SELECT body FROM sentences WHERE id=?", (sid,)).fetchone()
    doc = json.loads(row[0])
    if doc["review_status"] != "needs_review" or auth.execute("SELECT 1 FROM reviews WHERE entity='sentences' AND entity_id=?", (sid,)).fetchone():
        summary["ya_revisada_se_deja"] += 1
        continue
    note = "auditor IA: " + (v.get("nota") or "")[:300]
    es = filters.normalize(v.get("espanol") or "")
    ok = (v.get("veredicto") == "keep" and v.get("italiano_ok") is True and es and 0.4 <= words(es) / max(1, words(doc["it"])) <= 2.5
          and v.get("nivel") in LEVELS)
    if v.get("veredicto") == "reject":
        batch.record_decision(auth, sid, {"action": "reject", "reason": note}, reviewer=REVIEWER); summary["rechazada"] += 1
        continue
    if not ok:
        batch.record_decision(auth, sid, {"action": "doubt", "reason": note + " [no confirmada]"}, reviewer=REVIEWER); summary["duda"] += 1
        continue
    kept = [c for c in doc.get("error_codes", []) if (v.get("codigos", {}).get(c, {}).get("aplica") is True)]
    if not kept or not (set(kept) & SCARCE):
        batch.record_decision(auth, sid, {"action": "reject", "reason": note + " [no cubre ningún código escaso]"}, reviewer=REVIEWER); summary["rechazada_sin_codigo_escaso"] += 1
        continue
    new = {k: val for k, val in doc.items() if k not in ("es_source_id", "pivot_via")}
    new.update(es=es, translation_kind="llm", es_author="IA (Claude)", error_codes=kept, tag_rules={c: doc["tag_rules"][c] for c in kept},
               cefr_estimate=v["nivel"], qa_flags=[f for f in doc.get("qa_flags", []) if f != "pivot"] + ["llm"])
    store.upsert(auth, "sentences", new)
    batch.record_decision(auth, sid, {"action": "approve", "reason": note, "cefr": v["nivel"]}, reviewer=REVIEWER)
    summary["aprobada_llm"] += 1
auth.commit()
print(dict(summary), "| veredictos:", len(verdicts))
