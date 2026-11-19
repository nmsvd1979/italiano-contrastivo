"""Vocabulario A1 por temas. Para cada oración con EXACTAMENTE una palabra del tema se arma:
- «escucha y elige»: la grabación dice la oración y se elige entre ella y otra donde la palabra se cambia por otra del tema
  con el mismo género, número y clase de artículo (así el artículo sigue siendo correcto y la diferencia es solo la palabra);
- hueco (la palabra en blanco, con la traducción de pista) y orden;
- significado: «¿qué significa X?» con la glosa correcta y dos de otras palabras del tema (glosas distintas entre sí)."""
import re
import zlib
from dataclasses import dataclass
from functools import lru_cache

import yaml

from pipeline import config

LEXICON = config.ROOT / "pipeline" / "vocab" / "vocab_a1.yaml"  # fuera de lexicons/: el motor de etiquetado carga todo lo que hay allí
_VOWELS = "aeiouàèéìòù"


@dataclass(frozen=True)
class Entry:
    form: str
    gender: str  # m | f | -
    num: str     # s | p | -
    gloss: str


def art_class(e: Entry) -> str:
    """Qué artículo pide la palabra: dos palabras con la misma clase (y género y número) comparten artículo."""
    f = e.form.lower()
    vowel = f[0] in _VOWELS
    impure = bool(re.match(r"(s[^aeiou]|z|gn|ps|x|y)", f))
    if e.gender == "f":
        return "*" if e.num == "p" else ("V" if vowel else "C")
    if e.gender == "m":
        if e.num == "p":
            return "G" if (vowel or impure) else "I"
        return "V" if vowel else ("S" if impure else "C")
    return "*"


@lru_cache(maxsize=1)
def topics() -> dict[str, list[Entry]]:
    raw = yaml.safe_load(LEXICON.read_text(encoding="utf8"))["topics"]
    out: dict[str, list[Entry]] = {}
    for code, rows in raw.items():
        entries = []
        for row in rows:
            form, g, n, gloss = row.split("|")
            entries.append(Entry(form, g, n, gloss))
        out[code] = entries
    return out


VOCAB_CODES = tuple(topics())


def _pick(seq, key: str):
    return seq[zlib.crc32(key.encode()) % len(seq)]


def find_vocab(code: str, it: str):
    """(start, end, palabra, sustituta, glosa, distractores) o None. Exactamente una palabra del tema en la oración."""
    if code == "ERR_VOC_INTERROG" and "?" not in it:  # solo como pregunta («come» también es «como»)
        return None
    entries = topics()[code]
    if code == "ERR_VOC_DIMOSTRATIVI":  # solo como adjetivo (con sustantivo): «questo è…» o «quello che…» no admiten el cambio
        nxt = re.search(r"\b(?:questo|questa|questi|queste|quel|quella|quei|quelle|quello)\s+(\w+)", it, re.I)
        if not nxt or nxt.group(1).lower() in {"è", "e", "sono", "era", "non", "che", "ha", "hanno", "di", "mi", "ti", "si", "ci", "vi", "lo", "la", "li", "le", "ne", "a"}:
            return None
    by_form = {e.form.lower(): e for e in entries}
    hits = [m for m in re.finditer(r"[\wàèéìòùÀ-Ü]+", it) if m.group(0).lower() in by_form]
    if len(hits) != 1:
        return None
    m = hits[0]
    e = by_form[m.group(0).lower()]
    same = [x for x in entries if x.form != e.form and (x.gender, x.num) == (e.gender, e.num) and art_class(x) == art_class(e)]
    if not same:
        return None
    repl = _pick(same, it + e.form).form
    if m.group(0)[0].isupper():
        repl = repl[0].upper() + repl[1:]
    others = [x for x in entries if x.gloss != e.gloss]
    d1 = _pick(others, it + "1").gloss
    d2 = _pick([x for x in others if x.gloss != d1], it + "2").gloss
    return m.start(), m.end(), m.group(0), repl, e.gloss, (d1, d2)
