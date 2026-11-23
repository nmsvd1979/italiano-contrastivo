"""Tanda dirigida a los huecos medidos en la auditoría de A1 (docs/auditoria-cobertura-a1.md): oraciones sin revisar de la base de autoría que
cubren lo que falta, con el mismo formato que `scripts/capsule_pack.py` (luego: auditor → verdicts.json → `scripts/capsule_apply.py`).

  persons   presente con sujeto tu / noi / voi / loro (casi no se practicaban en las unidades de verbos)
  months    meses del año (solo había 5 de 12)
  numbers   números 14, 17, 19 y 60–90

Uso: python scripts/gap_pack.py persons|months|numbers [por_grupo]"""
import json
import random
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.audit_rules import prefilter  # noqa: E402
from pipeline.exercises.calques import find_calque  # noqa: E402
from pipeline.exercises.present import PRESENT_CODES  # noqa: E402

MODE = sys.argv[1]
PER = int(sys.argv[2]) if len(sys.argv) > 2 else 8
OUT = ROOT / "data/work/capsules"
OUT.mkdir(parents=True, exist_ok=True)
MONTHS = "gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre".split()
NUMS = "quattordici diciassette diciannove sessanta settanta ottanta novanta".split()
SUBJECTS = ("tu", "noi", "voi", "loro")

auth = sqlite3.connect(f"file:{ROOT/'data/work/authoring.db'}?mode=ro", uri=True)
reviewed = {r[0] for r in auth.execute("SELECT entity_id FROM reviews WHERE entity='sentences'")}
rng = random.Random(11)
groups: dict[tuple, list] = {}
seen = set()
for sid, body in auth.execute("SELECT id, body FROM sentences WHERE review_status='needs_review'"):
    if sid in reviewed:
        continue
    d = json.loads(body)
    words = re.findall(r"\w+", d["it"].lower())
    key = re.sub(r"\W+", "", d["it"].lower())[:28]
    if not 3 <= len(words) <= 10 or key in seen:
        continue
    direct = d.get("translation_kind", "direct") != "pivot"   # las de pivote se traducen desde el italiano (su español no se usa)
    if MODE == "persons":
        subj = next((w for w in SUBJECTS if w in words[:4]), None)
        if not subj:
            continue
        code = next((c for c in PRESENT_CODES if find_calque(c, d["it"])), None)
        if not code:
            continue
        groups.setdefault((code, subj), []).append((sid, code, d))
    elif MODE == "months":
        m = [w for w in MONTHS if w in words]
        code = "ERR_VOC_TEMPO"
        if len(m) == 1 and find_calque(code, d["it"]):
            groups.setdefault((code, m[0]), []).append((sid, code, d))
    elif MODE == "numbers":
        n = [w for w in NUMS if w in words]
        code = "ERR_VOC_NUMERI"
        if len(n) == 1 and find_calque(code, d["it"]):
            groups.setdefault((code, n[0]), []).append((sid, code, d))
    else:
        raise SystemExit("modo: persons | months | numbers")
    seen.add(key)
items = []
for (code, tag), lst in sorted(groups.items()):
    lst.sort(key=lambda t: ({"A1": 0, "A2": 1, "B1": 2, "B2": 3}.get(t[2]["cefr_estimate"], 9), len(t[2]["it"]), rng.random()))
    cap = PER * 2 if tag == "voi" else PER
    for sid, c, d in lst[:cap]:
        direct = d.get("translation_kind", "direct") != "pivot"
        items.append({"id": sid, "codigo": c, "italiano": d["it"], "espanol_tatoeba": d["es"] if direct else None, "nivel_estimado": d["cefr_estimate"], "directa": direct, "hueco": tag})
reasons = prefilter(items)
VERDICTS = OUT / "verdicts.json"
verdicts = json.loads(VERDICTS.read_text(encoding="utf8")) if VERDICTS.exists() else []
known = {v["id"] for v in verdicts}
auto = [{"id": i["id"], "codigo": i["codigo"], "veredicto": "reject", "nota": "prefiltro: " + r, "auto": True} for i, r in zip(items, reasons) if r and i["id"] not in known]
items = [i for i, r in zip(items, reasons) if not r]
VERDICTS.write_text(json.dumps(verdicts + auto, ensure_ascii=False, indent=1), encoding="utf8")
(OUT / f"gap_{MODE}.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf8")
print(f"{len(items)} para auditar ({len(auto)} descartadas por el prefiltro)")
print(dict(Counter((i["codigo"], i["hueco"]) for i in items)))
