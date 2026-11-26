"""Aplica content/audits/2026-11-25-voz-humana.json a la base de autoría (reviewer="llm-audit").
- keep: se aprueba SIN códigos (no entra a las unidades: es solo para el dictado con voz humana); si trae «es», el español pasa a ser el
  escrito desde el italiano (translation_kind="llm"; el de pivote o de Tatoeba se descarta).
- reject: se rechaza.
Idempotente. Uso: python scripts/voz_humana_apply.py [ruta a authoring.db] [--audit content/audits/ARCHIVO.json] [--cefr A1|A2]
(sin opciones: la auditoría de A1 de 2026-11-25, como siempre)"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline import filters  # noqa: E402
from pipeline.db import store  # noqa: E402
from pipeline.review import batch  # noqa: E402

args = sys.argv[1:]


def opt(name: str, default: str) -> str:
    if name not in args:
        return default
    i = args.index(name)
    value = args[i + 1]
    del args[i:i + 2]
    return value


audit_file = opt("--audit", "content/audits/2026-11-25-voz-humana.json")
CEFR = opt("--cefr", "A1")
db = Path(args[0]) if args else ROOT / "data" / "work" / "authoring.db"
auth = store.connect(db)
audit = json.loads((ROOT / audit_file).read_text(encoding="utf8"))
summary = Counter()
for v in audit["veredictos"]:
    doc = json.loads(auth.execute("SELECT body FROM sentences WHERE id=?", (v["id"],)).fetchone()[0])
    if doc["it"] != v["it"]:
        raise SystemExit(f"{v['id']}: el italiano cambió desde la auditoría")
    note = f"voz humana {audit.get('fecha', '')}: " + v.get("nota", f"italiano correcto y de {CEFR}; para el dictado con voz humana")
    if doc["review_status"] == "rejected":
        summary["ya_rechazada"] += 1
        continue
    if v["v"] == "reject":
        batch.record_decision(auth, v["id"], {"action": "reject", "reason": note}, reviewer="llm-audit")
        summary["rechazada"] += 1
        continue
    if doc["review_status"] == "validated" and not doc.get("error_codes") and (not v.get("es") or doc["es"] == filters.normalize(v["es"])):
        summary["ya_aplicada"] += 1
        continue
    if v.get("es"):
        doc = {k: val for k, val in doc.items() if k not in ("es_source_id", "pivot_via")}
        doc.update(es=filters.normalize(v["es"]), translation_kind="llm", es_author="IA (Claude)",
                   qa_flags=sorted((set(doc.get("qa_flags", [])) - {"pivot"}) | {"llm"}))
        store.upsert(auth, "sentences", doc)
    tags = {c: False for c in doc.get("error_codes", [])}
    batch.record_decision(auth, v["id"], {"action": "approve", "reason": note, "cefr": CEFR, "tags": tags, "translation_ok": True}, reviewer="llm-audit")
    summary["aprobada"] += 1
auth.commit()
print(dict(summary))
