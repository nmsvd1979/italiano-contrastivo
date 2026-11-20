"""Mide el prefiltro contra las decisiones históricas (data/work/capsules/verdicts.json + authoring.db).
Criterio de calidad: ninguna oración aprobada ('keep') puede quedar rechazada por el prefiltro (falsos rechazos = 0)."""
import json
import sqlite3
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.audit_rules import prefilter  # noqa: E402

auth = sqlite3.connect(f"file:{ROOT/'data/work/authoring.db'}?mode=ro", uri=True)
verdicts = json.loads((ROOT / "data/work/capsules/verdicts.json").read_text(encoding="utf8"))
items, truth = [], []
for v in verdicts:
    row = auth.execute("SELECT body FROM sentences WHERE id=?", (v["id"],)).fetchone()
    if not row:
        continue
    d = json.loads(row[0])
    direct = d.get("translation_kind", "direct") != "pivot" and not v.get("espanol")
    items.append({"italiano": d["it"], "espanol_tatoeba": d["es"] if direct else None, "directa": direct})
    truth.append(v)
reasons = prefilter(items)
HARD = ("traducción con", "passato remoto", "futuro", "imperfetto", "condicional", "congiuntivo", "tema inadecuado")  # reglas de calidad: no deberían chocar con nada aprobado
fp_all = [(t["id"], items[i]["italiano"], reasons[i]) for i, t in enumerate(truth) if t["veredicto"] == "keep" and reasons[i]]
fp = [x for x in fp_all if x[2].startswith(HARD)]
soft = [x for x in fp_all if not x[2].startswith(HARD)]
rej = [(i, t) for i, t in enumerate(truth) if t["veredicto"] == "reject"]
caught = [(i, t) for i, t in rej if reasons[i]]
print(f"decisiones: {len(truth)} (aprobadas {len(truth)-len(rej)}, rechazadas {len(rej)})")
print(f"aprobadas que chocan con reglas de calidad (revisar el contenido): {len(fp)}; con reglas de estilo (nombres, duplicadas, temas): {len(soft)}")
for x in fp[:40]:
    print("  FP", x)
print(f"rechazos que el prefiltro captura solo: {len(caught)} de {len(rej)} ({100*len(caught)//max(1,len(rej))} %)")
print(Counter(reasons[i].split(" (")[0] for i, _ in caught).most_common())
