"""Cambia la traducción de oraciones ya aprobadas por una neutra escrita por la IA (translation_kind=llm, marcada).
Uso: python scripts/retranslate.py cambios.json   con {"s_123": "traducción en español neutro con tuteo y «ustedes»"}"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline import filters  # noqa: E402
from pipeline.db import store  # noqa: E402

words = lambda t: len(re.findall(r"\w+", t))
changes = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
auth = store.connect(ROOT / "data" / "work" / "authoring.db")
for sid, es in changes.items():
    doc = json.loads(auth.execute("SELECT body FROM sentences WHERE id=?", (sid,)).fetchone()[0])
    es = filters.normalize(es)
    if not 0.4 <= words(es) / max(1, words(doc["it"])) <= 2.5:
        raise SystemExit(f"{sid}: traducción desproporcionada")
    new = {k: v for k, v in doc.items() if k not in ("es_source_id", "pivot_via")}
    new.update(es=es, translation_kind="llm", es_author="IA (Claude)", qa_flags=sorted({*doc.get("qa_flags", []), "llm"} - {"pivot"}))
    store.upsert(auth, "sentences", new)
auth.commit()
print("retraducidas", len(changes))
