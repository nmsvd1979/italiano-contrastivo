"""Candidatas para completar unidades con pocas oraciones (< 30): oraciones sin revisar de la base de autoría que ya encajan en la unidad
(prefiltro de A1 y generador del código), variadas y fáciles. Luego: auditor → data/work/capsules/verdicts.json → `scripts/capsule_apply.py`.

Uso: python scripts/fill_pack.py CODIGO [por_codigo]   → data/work/capsules/fill_<CODIGO>.json y lista en pantalla."""
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
from pipeline.exercises import vocab  # noqa: E402
from pipeline.exercises.calques import find_calque  # noqa: E402
from pipeline.exercises.course import MAX_PER_WORD, fit_for_level  # noqa: E402

CODE = sys.argv[1]
PER = int(sys.argv[2]) if len(sys.argv) > 2 else 25
OUT = ROOT / "data/work/capsules"
OUT.mkdir(parents=True, exist_ok=True)
auth = sqlite3.connect(f"file:{ROOT/'data/work/authoring.db'}?mode=ro", uri=True)
reviewed = {r[0] for r in auth.execute("SELECT entity_id FROM reviews WHERE entity='sentences'")}
cands, seen = [], set()
for sid, body in auth.execute("SELECT id, body FROM sentences WHERE review_status='needs_review'"):
    if sid in reviewed:
        continue
    d = json.loads(body)
    words = re.findall(r"\w+", d["it"].lower())
    key = re.sub(r"\W+", "", d["it"].lower())[:28]
    if not 3 <= len(words) <= 9 or key in seen or not fit_for_level(d, "A1", CODE) or not find_calque(CODE, d["it"]):
        continue
    hit = vocab.find_vocab(CODE, d["it"]) if CODE in vocab.VOCAB_CODES else None
    cands.append((sid, d, (hit[2].lower() if hit else "")))
    seen.add(key)
rng = random.Random(7)
order = {"A1": 0, "A2": 1, "B1": 2, "B2": 3}
cands.sort(key=lambda t: (order.get(t[1]["cefr_estimate"], 9), len(t[1]["it"]), rng.random()))
chosen, per_word = [], Counter()
for sid, d, w in cands:
    if w and per_word[w] >= max(3, PER // 3):   # variedad: una palabra del tema no llena la tanda
        continue
    per_word[w] += 1
    chosen.append((sid, d))
    if len(chosen) >= PER:
        break
items = [{"id": sid, "codigo": CODE, "italiano": d["it"], "espanol_tatoeba": d["es"] if d.get("translation_kind", "direct") != "pivot" else None, "nivel_estimado": d["cefr_estimate"]} for sid, d in chosen]
reasons = prefilter(items)
items = [i for i, r in zip(items, reasons) if not r]
(OUT / f"fill_{CODE}.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf8")
for i in items:
    print(i["id"], "|", i["italiano"], "|", i["espanol_tatoeba"])
