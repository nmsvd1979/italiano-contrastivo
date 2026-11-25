"""Aplica content/audits/2026-11-25-pruebas.json (auditoría IA de las frases de prueba y reserva A1) a la base de autoría.
- reject: la oración se rechaza (reviewer="llm-audit") y deja de exportarse.
- fix: el español se reemplaza por uno escrito desde el italiano; la oración pasa a translation_kind="llm" (el español ya no es de Tatoeba).
- drop_alt: se maneja en pipeline/exercises/alternatives.py (EXCLUDED), no aquí.
Como audit_apply.py: nunca convierte un rechazo en aprobación. Uso: python scripts/audit_pruebas_apply.py [ruta a authoring.db]"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline import filters  # noqa: E402
from pipeline.db import store  # noqa: E402
from pipeline.review import batch  # noqa: E402

REVIEWER = "llm-audit"
db = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "work" / "authoring.db"
auth = store.connect(db)
audit = json.loads((ROOT / "content/audits/2026-11-25-pruebas.json").read_text(encoding="utf8"))
summary = Counter()
for v in audit["veredictos"]:
    row = auth.execute("SELECT body FROM sentences WHERE id=?", (v["id"],)).fetchone()
    doc = json.loads(row[0])
    note = "auditoría de pruebas 2026-11-25: " + v["nota"]
    if doc["review_status"] == "rejected":
        summary["ya_rechazada"] += 1
    elif v["v"] == "reject":
        batch.record_decision(auth, v["id"], {"action": "reject", "reason": note}, reviewer=REVIEWER)
        summary["rechazada"] += 1
    elif v["v"] == "fix" and doc["es"] == filters.normalize(v["es"]):
        summary["ya_corregida"] += 1   # el script es idempotente: se puede volver a correr tras agregar veredictos
    elif v["v"] == "fix":
        if doc["it"] != v["it"]:
            raise SystemExit(f"{v['id']}: el italiano cambió desde la auditoría")
        new = {k: val for k, val in doc.items() if k not in ("es_source_id", "pivot_via")}
        new.update(es=filters.normalize(v["es"]), translation_kind="llm", es_author="IA (Claude)",
                   qa_flags=sorted(set(doc.get("qa_flags", [])) | {"llm"}))
        store.upsert(auth, "sentences", new)
        batch.record_decision(auth, v["id"], {"action": "approve", "reason": note}, reviewer=REVIEWER)
        summary["español_corregido"] += 1
    else:
        summary["sin_cambio_en_base"] += 1
auth.commit()
print(dict(summary))
