"""Ayudas para escribir lecturas (content/readings/*.json): una línea por oración, «hablante|italiano|español» o «italiano|español»."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEG = lambda slug: {"book": "Leggiamo (Long Beach City College)", "authors": "Rossella Pescatori y colaboradores", "url": f"https://lbcc.pressbooks.pub/leggiamo/chapter/{slug}/", "license": "CC BY-NC 4.0"}
PIA = lambda slug: {"book": "Piacere! (Elementary Italian, University of Iowa)", "authors": "Lucia Gemmani, Irene Lottini, Claudia Sartini-Rideout", "url": f"https://pressbooks.uiowa.edu/piacere/chapter/{slug}/", "license": "CC BY-NC-SA 4.0"}


def parse(base: str, txt: str) -> list[dict]:
    out = []
    for i, line in enumerate(t.strip() for t in txt.strip().split("\n")):
        p = line.split("|")
        d = {"id": f"{base}_{i:02d}", "it": p[-2], "es": p[-1]}
        if len(p) == 3:
            d["speaker"] = p[0]
        out.append(d)
    return out


def write(id: str, title: str, kind: str, source: dict, adaptation: str, txt: str, qs: list, level: str = "A1") -> dict:
    """qs: (pregunta, [opción correcta, otras…], índice de la oración que lo demuestra). La opción correcta se rota de lugar."""
    r = {"id": id, "title": title, "level": level, "kind": kind, "source": source, "adaptation": adaptation, "translation": "IA (Claude), sin revisar por un hablante nativo",
         "sentences": parse(id, txt), "questions": []}
    for k, (prompt, opts, ev) in enumerate(qs):
        assert 0 <= ev < len(r["sentences"]), (id, prompt)
        a = k % len(opts)
        rest = opts[1:]
        rest.insert(a, opts[0])
        r["questions"].append({"prompt_es": prompt, "options": rest, "answer": a, "evidence": ev})
    f = ROOT / "content" / "readings" / f"{id}.json"
    f.write_text(json.dumps(r, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return r
