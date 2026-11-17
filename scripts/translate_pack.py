"""Tanda de traducción+auditoría: oraciones italianas (de pares por pivote, cuyo español NO se usa) de los códigos que
quedan cortos de traducciones directas. Un agente traduce del italiano al español y audita códigos/nivel. Escribe data/work/translate/."""
import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "work" / "translate"
OUT.mkdir(parents=True, exist_ok=True)
auth = sqlite3.connect(f"file:{ROOT/'data/work/authoring.db'}?mode=ro", uri=True)
TARGET = 30           # oraciones deseadas por código (directas + generadas)
SKIP = {"ERR_HETEROTONIC"}  # la definición del código está en duda (docs/dudas-italiano.md #23)
catalog = {c["code"]: c for c in json.loads((ROOT / "schemas/data/error-codes.json").read_text(encoding="utf8"))}
direct = dict(auth.execute(
    "SELECT sec.code, COUNT(*) FROM sentence_error_codes sec JOIN sentences s ON s.id=sec.sentence_id "
    "WHERE s.review_status != 'rejected' AND COALESCE(json_extract(s.body,'$.translation_kind'),'direct') IN ('direct','llm') GROUP BY 1"))
need = {c: TARGET - direct.get(c, 0) for c in catalog if c not in SKIP and c not in ("ERR_LEXICAL_LEAK", "ERR_ARTICLE_OMISSION") and direct.get(c, 0) < TARGET - 5}
rows = auth.execute(
    "SELECT s.id, s.body, GROUP_CONCAT(sec.code) FROM sentences s JOIN sentence_error_codes sec ON sec.sentence_id=s.id "
    "WHERE s.review_status='needs_review' AND json_extract(s.body,'$.translation_kind')='pivot' "
    "AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.entity='sentences' AND r.entity_id=s.id) GROUP BY s.id").fetchall()
norm = lambda t: re.sub(r"\W+", "", t.lower())[:28]
cands = []
for sid, body, codes in rows:
    d = json.loads(body)
    n = len(re.findall(r"\w+", d["it"]))
    if 4 <= n <= 14:
        cands.append((n, sid, d, codes.split(",")))
cands.sort(key=lambda t: (t[0], t[1]))
chosen, seen, got = [], set(), {c: 0 for c in need}
for n, sid, d, codes in cands:
    key = norm(d["it"])
    useful = [c for c in codes if c in need and got[c] < need[c]]
    if not useful or key in seen:
        continue
    seen.add(key); chosen.append((sid, d, codes))
    for c in useful:
        got[c] += 1
items = [{"id": sid, "italiano": d["it"], "codigos": codes, "nivel_estimado": d["cefr_estimate"]} for sid, d, codes in chosen]
legend = {c: catalog[c]["explanation_es"] for c in sorted({c for it in items for c in it["codigos"]})}
(OUT / "items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf8")
(OUT / "legend.json").write_text(json.dumps(legend, ensure_ascii=False, indent=1), encoding="utf8")
print(len(items), "oraciones; necesidad por código:", {c: (need[c], got[c]) for c in need})
