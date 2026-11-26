"""Frases de Tatoeba con audio humano (usuario NM1, CC BY 4.0) que la app aún NO usa, del nivel pedido, listas para auditar.
Cruza el índice de audio de Tatoeba con la base de autoría (no rechazadas, 3–12 palabras, prefiltro del nivel) y descarta las que ya suenan en la app
(web/public/audio/human.json). Escribe una lista JSON: {id, it, es_directa, es_pivote, nivel_estimado, audio}.
Uso: python scripts/voz_humana_candidatas.py NIVEL SALIDA.json     (NIVEL = A1 | A2)"""
import csv
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.audit_rules import italian_issue, spanish_issue  # noqa: E402

LEVEL, OUT = sys.argv[1], Path(sys.argv[2])
OK_LICENSES = {"CC BY 4.0", "CC BY-SA 4.0", "CC0 1.0"}
ACCEPT = {"A1": ("A1",), "A2": ("A2", "B1")}[LEVEL]
csv.field_size_limit(10**7)
ita_ids = set()
with open(ROOT / "data/raw/ita_sentences_detailed.tsv", encoding="utf8") as f:
    for line in f:
        ita_ids.add(line.split("\t", 1)[0])
audio = {}
with open(ROOT / "data/raw/tatoeba_audio/sentences_with_audio.csv", encoding="utf8") as f:
    for row in csv.reader(f, delimiter="\t"):
        if len(row) >= 4 and row[0] in ita_ids and row[2] == "NM1" and row[3] in OK_LICENSES:
            audio[row[0]] = row[1]
used = {x["file"].removesuffix(".mp3") for x in json.loads((ROOT / "web/public/audio/human.json").read_text(encoding="utf8"))}
db = sqlite3.connect(f"file:{ROOT/'data/work/authoring.db'}?mode=ro", uri=True)
out = []
for sid, body in db.execute("SELECT id, body FROM sentences WHERE review_status != 'rejected'"):
    tid = sid.removeprefix("s_")
    d = json.loads(body)
    if tid not in audio or audio[tid] in used or d.get("cefr_estimate") not in ACCEPT or not 3 <= len(d["it"].split()) <= 12:
        continue
    pivot = d.get("translation_kind") == "pivot"
    if italian_issue(d["it"], LEVEL) or (not pivot and spanish_issue(d.get("es"))):
        continue
    out.append({"id": sid, "it": d["it"], "es_directa": None if pivot else d.get("es"), "es_pivote": d.get("es") if pivot else None,
                "nivel_estimado": d["cefr_estimate"], "audio": audio[tid]})
out.sort(key=lambda x: (len(x["it"]), x["it"]))
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf8")
print(f"{len(out)} candidatas {LEVEL} con voz humana sin usar → {OUT}")
