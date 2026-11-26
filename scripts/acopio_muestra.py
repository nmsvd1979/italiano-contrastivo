"""Muestras para medir la PRECISIÓN de las candidatas del acopio (plan §7, Fase 2: generador ≥ 90 % en 30 coincidencias revisadas por un agente independiente).
Toma, de cada cápsula, 30 frases al azar (semilla fija) de las 100 primeras candidatas —las que de verdad se elegirían— y arma, para cada una, lo que el revisor
necesita: la frase, su traducción si es directa, y la versión errónea que produce el generador. Escribe grupos de cápsulas en el directorio indicado.
Uso: python scripts/acopio_muestra.py DIRECTORIO_SALIDA [grupos=4]"""
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.exercises import vocab  # noqa: E402
from pipeline.exercises.calques import find_calque  # noqa: E402

out = Path(sys.argv[1])
groups = int(sys.argv[2]) if len(sys.argv) > 2 else 4
out.mkdir(parents=True, exist_ok=True)
doc = json.loads((ROOT / "schemas/data/syllabus-a2.json").read_text(encoding="utf8"))
caps = {c["id"]: {**c, "modulo": m["id"]} for m in doc["modulos_planificados"] for c in m["capsulas"]}
ids = sorted(caps)
rows = {}
for cid in ids:
    c = caps[cid]
    cands = json.loads((ROOT / f"data/work/acopio/{cid}.json").read_text(encoding="utf8"))[:100]
    sample = random.Random(11).sample(cands, min(30, len(cands)))
    items = []
    for s in sample:
        item = {"id": s["id"], "it": s["it"], "es_directa": s["es"], "nivel_estimado": s["cefr_estimate"] if "cefr_estimate" in s else s.get("level")}
        if c["code"] in vocab.VOCAB_CODES:
            h = vocab.find_vocab(c["code"], s["it"])
            if h:
                item["palabra_del_tema"] = h[2]
                item["sustituta"] = h[3]
        else:
            k = find_calque(c["code"], s["it"])
            if k:
                item["tramo_correcto"], item["version_erronea"] = k.correct, k.wrong
                item["frase_errónea_completa"] = s["it"][:k.start] + k.wrong + s["it"][k.end:]
        items.append(item)
    rows[cid] = {"capsula": cid, "codigo": c["code"], "titulo": c["title_es"], "ambito": c["scope"], "error_del_hispanohablante": c["calco_es"],
                 "formas_validas_que_nunca_son_error": c.get("formas_validas_es", []), "nota": c.get("nota_es", ""), "muestra": items}
per = -(-len(ids) // groups)
for g in range(groups):
    chunk = ids[g * per:(g + 1) * per]
    (out / f"grupo{g + 1}.json").write_text(json.dumps([rows[i] for i in chunk], ensure_ascii=False, indent=1), encoding="utf8")
    print(f"grupo{g + 1}: {chunk[0]}–{chunk[-1]} ({sum(len(rows[i]['muestra']) for i in chunk)} frases)")
