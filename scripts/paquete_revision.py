"""Genera docs/revision-nativo.md: todo lo que conviene que revise un hablante nativo en UNA sola ronda
(fichas de enseñanza, lecturas con su traducción de IA y 100 oraciones muestreadas). Se vuelve a generar cuando cambie el contenido."""
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
pack = ROOT / "web/public/content"
course = json.loads((pack / "course.json").read_text(encoding="utf8"))
readings = json.loads((pack / "readings.json").read_text(encoding="utf8"))
sentences = json.loads((pack / "sentences.json").read_text(encoding="utf8"))
out = ["# Revisión por un hablante nativo", "",
       "Este documento reúne lo que más importa revisar. Para cada elemento marca ✅ (correcto), ✏️ (corregir: escribe la forma correcta) o ❌ (quitar). "
       "El italiano de las oraciones viene de Tatoeba y de libros abiertos; las traducciones al español de las lecturas y varias oraciones son de IA; "
       "las fichas las escribió la IA a partir de los libros indicados.", "",
       "## A. Fichas de enseñanza (qué dice la app antes de practicar)", ""]
for u in course["units"]:
    if u.get("ficha_es"):
        out += [f"### {u['id']} · {u['title']}", "", u["ficha_es"].replace("\n\n", "\n\n"), "", "Revisión: ☐ ✅  ☐ ✏️  ☐ ❌   Comentario: ", ""]
out += ["## B. Lecturas y diálogos (italiano del libro + traducción de IA)", ""]
for r in readings:
    out += [f"### {r['id']} · {r['title']} ({r['source']['book']}, {r['source']['license']})", "", "| # | Italiano (libro) | Español (IA) | ✅/✏️/❌ |", "|---|---|---|---|"]
    out += [f"| {i} | {s['it']} | {s['es']} | |" for i, s in enumerate(r["sentences"])] + [""]
out += ["## C. Oraciones muestreadas (100)", "", "| id | Italiano | Español | Autor de la traducción | ✅/✏️/❌ |", "|---|---|---|---|---|"]
rng = random.Random(2026)
for s in sorted(rng.sample(sentences, min(100, len(sentences))), key=lambda x: x["id"]):
    out.append(f"| {s['id']} | {s['it']} | {s['es']} | {'IA' if s.get('translation_kind') == 'llm' else 'Tatoeba'} | |")
(ROOT / "docs/revision-nativo.md").write_text("\n".join(out) + "\n", encoding="utf8")
print(len(out), "líneas")
