"""Tanda para ampliar las cápsulas: oraciones sin revisar donde un generador de calcos (pipeline/exercises/calques.py) encuentra
su patrón. Prefiere traducción directa; las de pivote se traducen desde el italiano (su español no se usa).
Escribe data/work/capsules/items.json para que un auditor confirme italiano, calco, nivel y traducción."""
import json
import random
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.exercises.calques import CALQUE_CODES, find_calque  # noqa: E402

PER_CODE = int(sys.argv[1]) if len(sys.argv) > 1 else 18
ONLY = sys.argv[2].split(",") if len(sys.argv) > 2 else list(CALQUE_CODES)
OUTFILE = sys.argv[3] if len(sys.argv) > 3 else "items.json"
OUT = ROOT / "data/work/capsules"
OUT.mkdir(parents=True, exist_ok=True)
auth = sqlite3.connect(f"file:{ROOT/'data/work/authoring.db'}?mode=ro", uri=True)
reviewed = {r[0] for r in auth.execute("SELECT entity_id FROM reviews WHERE entity='sentences'")}
rng = random.Random(7)
LEVEL_RANK = {"A1": 0, "A2": 1, "B1": 2, "B2": 3}  # para A1 se prefieren las oraciones de nivel más bajo
pool = {c: [] for c in ONLY}
seen = set()
for sid, body in auth.execute("SELECT id, body FROM sentences WHERE review_status='needs_review'"):
    if sid in reviewed:
        continue
    d = json.loads(body)
    n = len(re.findall(r"\w+", d["it"]))
    key = re.sub(r"\W+", "", d["it"].lower())[:28]
    if not 4 <= n <= 12 or key in seen:
        continue
    for code in ONLY:
        if find_calque(code, d["it"]):
            pool[code].append((d.get("translation_kind", "direct") != "pivot", sid, d))
            seen.add(key)
            break
items = []
for code, lst in pool.items():
    lst.sort(key=lambda t: (not t[0], LEVEL_RANK.get(t[2]["cefr_estimate"], 9), rng.random()))
    for direct, sid, d in lst[:PER_CODE]:
        items.append({"id": sid, "codigo": code, "italiano": d["it"], "espanol_tatoeba": d["es"] if direct else None,
                      "nivel_estimado": d["cefr_estimate"], "directa": direct})
(OUT / OUTFILE).write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf8")
print(len(items), {c: sum(1 for i in items if i["codigo"] == c) for c in ONLY})
