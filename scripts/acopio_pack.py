"""Tanda de auditoría para cápsulas de A2, tomada de data/work/acopio/<cápsula>.json (la deja scripts/acopio_a2.py).
Para cada cápsula elige las N primeras candidatas que la base aún no tiene revisadas y arma lo que necesita el auditor:
la frase, su traducción si es directa, el nivel estimado y —si hay generador— la versión errónea que se mostraría al alumno.
En las cápsulas de método manual (sin generador seguro) el auditor debe escribir `correcto` y `errado`; otra pasada independiente confirma cada variante (audit2).
Uso: python scripts/acopio_pack.py SALIDA.json N cápsula [cápsula…]    p. ej. python scripts/acopio_pack.py data/work/capsules/a2m01.json 40 a2c01 a2c02"""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.exercises import vocab  # noqa: E402
from pipeline.exercises.calques import find_calque  # noqa: E402

out, n, caps = Path(sys.argv[1]), int(sys.argv[2]), sys.argv[3:]
doc = json.loads((ROOT / "schemas/data/syllabus-a2.json").read_text(encoding="utf8"))
code_of = {c["id"]: c for m in doc["modulos_planificados"] for c in m["capsulas"]}
db = sqlite3.connect(f"file:{ROOT/'data/work/authoring.db'}?mode=ro", uri=True)
reviewed = {r[0] for r in db.execute("SELECT entity_id FROM reviews WHERE entity='sentences'")}
items = []
for cid in caps:
    c = code_of[cid]
    cands = json.loads((ROOT / f"data/work/acopio/{cid}.json").read_text(encoding="utf8"))
    k = 0
    for s in cands:
        if s["id"] in reviewed:
            continue
        gen = vocab.find_vocab(c["code"], s["it"]) if c["code"] in vocab.VOCAB_CODES else find_calque(c["code"], s["it"])
        it = {"id": s["id"], "capsula": cid, "codigo": c["code"], "italiano": s["it"], "espanol_tatoeba": s["es"] if s["kind"] != "pivot" else None,
              "nivel_estimado": s["level"], "generador": bool(gen)}
        if gen and c["code"] in vocab.VOCAB_CODES:
            it["sustituta"] = gen[3]
        elif gen:
            it["correcto"], it["errado"] = gen.correct, gen.wrong
        items.append(it)
        k += 1
        if k >= n:
            break
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf8")
print(len(items), "ítems →", out)
