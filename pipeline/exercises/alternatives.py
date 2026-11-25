"""Traducciones alternativas aceptadas en «Escribe en italiano».

La corrección compara con UNA traducción italiana, pero en Tatoeba la misma oración española suele estar enlazada a otras traducciones
italianas hechas por personas («Me gustaría estudiar en París» → «Vorrei studiare a Parigi» / «Mi piacerebbe studiare a Parigi»).
Aquí se juntan, para que una respuesta correcta distinta de la guardada no cuente como error (auditoría 2026-11-25).

Solo se usan para ACEPTAR respuestas: no se enseñan ni se presentan como validadas. Pasan el mismo prefiltro A1 que las oraciones de
las unidades (sin temas inadecuados, sin tiempos de A2+, sin imperativo formal) y se guarda su autor para la atribución CC BY."""
import csv
import glob
import json
import re
from collections import defaultdict
from pathlib import Path

from pipeline.audit_rules import italian_issue

FILE = "alternatives.json"
MAX_ALTS = 4


_ARCAICO = re.compile(r"\b(ella|egli|esso|essa|essi|esse)\b", re.I)   # pronombres de registro escrito o antiguo: no se aceptan como respuesta A1
_POSSESSIVE = re.compile(r"\b(mi[oae]|miei|tu[oae]|tuoi|su[oae]|suoi|nostr[oaie]|vostr[oaie]|loro)\b", re.I)


def _persons(t: str) -> set[str]:
    """Posesivos normalizados a su persona: «Tu deber» → «tuo»; una alternativa con «vostro» cambia la persona y no se acepta."""
    return {m.group(1).lower()[:2] if not m.group(1).lower().startswith(("nostr", "vostr", "loro")) else m.group(1).lower()[:4] for m in _POSSESSIVE.finditer(t)}


def _key(t: str) -> str:
    return re.sub(r"[^\w]+", " ", t.lower()).strip()


def build(raw_dir: Path, content_dir: Path) -> dict[str, list[dict]]:
    """Escribe `content/alternatives.json`: {id de oración: [{"id", "it", "author"}]} para las oraciones exportadas de traducción directa."""
    raw_dir, content_dir = Path(raw_dir), Path(content_dir)
    sentences = [s for f in sorted(glob.glob(str(content_dir / "sentences" / "*.json"))) for s in json.loads(Path(f).read_text(encoding="utf8"))]
    direct = [s for s in sentences if s.get("translation_kind") == "direct" and s.get("es_source_id")]
    spa_to_ita: dict[str, set[str]] = defaultdict(set)
    with open(raw_dir / "ita-spa_links.tsv", encoding="utf8") as f:
        for row in csv.reader(f, delimiter="\t"):
            if len(row) >= 2:
                spa_to_ita[row[1]].add(row[0])
    wanted = {i for s in direct for i in spa_to_ita.get(str(s["es_source_id"]), ())}
    ita: dict[str, tuple[str, str]] = {}
    with open(raw_dir / "ita_sentences_detailed.tsv", encoding="utf8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) >= 4 and p[0] in wanted:
                ita[p[0]] = (p[2], p[3])
    out: dict[str, list[dict]] = {}
    for s in sorted(direct, key=lambda x: x["id"]):
        seen = {_key(s["it"])}
        alts = []
        for i in sorted(spa_to_ita.get(str(s["es_source_id"]), ()), key=int):
            if i == str(s["source_id"]) or i not in ita:
                continue
            text, author = ita[i]
            if (_key(text) in seen or italian_issue(text, "A1") or _ARCAICO.search(text) or _persons(text) != _persons(s["it"])
                    or not author or author == r"\N"):
                continue
            seen.add(_key(text))
            alts.append({"id": i, "it": text, "author": author})
        if alts:
            out[s["id"]] = alts[:MAX_ALTS]
    (content_dir / FILE).write_text(json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf8")
    return out


def load(content_dir: Path) -> dict[str, list[dict]]:
    f = Path(content_dir) / FILE
    return json.loads(f.read_text(encoding="utf8")) if f.exists() else {}


def attribution(alts: dict[str, list[dict]], used: set[str]) -> str:
    """Sección para ATTRIBUZIONI-tatoeba.md con las alternativas que viajan en el paquete."""
    lines = [f"- {sid} (alternativa): italiano #{a['id']} por {a['author']} (https://tatoeba.org/en/sentences/show/{a['id']}) — CC BY 2.0 FR"
             for sid in sorted(alts) if sid in used for a in alts[sid]]
    if not lines:
        return ""
    return ("\n\n## Traducciones alternativas aceptadas\n\nOtras traducciones italianas de Tatoeba de la misma oración española. "
            "La app solo las usa para aceptar respuestas en «Escribe en italiano».\n\n" + "\n".join(lines) + "\n")
