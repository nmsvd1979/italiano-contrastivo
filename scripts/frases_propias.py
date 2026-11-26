"""Frases escritas por la IA para completar una cápsula cuando el corpus no alcanza (plan A2, §5.4: a2c16, y lo que el acopio demuestre).
Entrada: JSON con [{"it": ..., "es": ..., "nivel": "A2"}]. Cada frase entra a la base de autoría como `authored` (translation_kind llm), `needs_review`:
pasa por la misma auditoría que cualquier otra (nada se presenta como de un libro ni como revisado por un nativo) y la interfaz la declara.
Reglas: italiano simple del nivel, apoyado en estructuras vistas en frases de fuentes verificadas; sin nombres raros; una idea por frase.
Uso: python scripts/frases_propias.py ARCHIVO.json"""
import json
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline import filters  # noqa: E402
from pipeline.db import store  # noqa: E402

AUTHOR = "IA (Claude)"
LICENSE = "texto propio de la app, escrito por IA (uso personal)"


def make_doc(it: str, es: str, level: str = "A2") -> dict:
    it, es = filters.normalize(it), filters.normalize(es)
    return {"id": f"a_{zlib.crc32(it.encode()):08x}", "source": "authored", "author": AUTHOR, "es_author": AUTHOR, "license": LICENSE, "it": it, "es": es,
            "cefr_estimate": level, "review_status": "needs_review", "translation_kind": "llm", "qa_flags": ["llm", "authored"], "error_codes": []}


def main():
    rows = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
    auth = store.connect(ROOT / "data" / "work" / "authoring.db")
    n = 0
    for r in rows:
        doc = make_doc(r["it"], r["es"], r.get("nivel", "A2"))
        if auth.execute("SELECT 1 FROM sentences WHERE id=?", (doc["id"],)).fetchone():
            continue
        store.upsert(auth, "sentences", doc)
        n += 1
    auth.commit()
    print(f"{n} frases propias nuevas (de {len(rows)}) → needs_review")


if __name__ == "__main__":
    main()
