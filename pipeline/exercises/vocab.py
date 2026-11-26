"""Vocabulario A1 por temas. Para cada oración con EXACTAMENTE una palabra del tema se arma:
- «escucha y elige»: la grabación dice la oración y se elige entre ella y otra donde la palabra se cambia por otra del tema
  con el mismo género, número y clase de artículo (así el artículo sigue siendo correcto y la diferencia es solo la palabra);
- hueco (la palabra en blanco, con la traducción de pista) y orden;
- significado: «¿qué significa X?» con la glosa correcta y dos de otras palabras del tema (glosas distintas entre sí)."""
import difflib
import json
import re
import unicodedata
import zlib
from dataclasses import dataclass
from functools import lru_cache

import yaml

from pipeline import config

LEXICON = config.ROOT / "pipeline" / "vocab" / "vocab_a1.yaml"  # fuera de lexicons/: el motor de etiquetado carga todo lo que hay allí
LEXICONS = sorted((config.ROOT / "pipeline" / "vocab").glob("vocab_a[0-9]*.yaml"))   # un archivo por nivel (A1, A2…): el vocabulario de un nivel nunca repite una forma del anterior
_VOWELS = "aeiouàèéìòù"


@dataclass(frozen=True)
class Entry:
    form: str
    gender: str  # m | f | -
    num: str     # s | p | -
    gloss: str
    target: bool = True   # False = «s» en el archivo: solo sirve de sustituto (mismo género y número) en los ejercicios; no se enseña ni se busca en las frases


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
    out: dict[str, list[Entry]] = {}
    raw: dict[str, list[str]] = {}
    for f in LEXICONS:
        for code, rows in yaml.safe_load(f.read_text(encoding="utf8"))["topics"].items():
            if code in raw:
                raise ValueError(f"el tema {code} está en dos archivos de vocabulario")
            raw[code] = rows
    for code, rows in raw.items():
        entries = []
        for row in rows:
            form, g, n, gloss, *flag = row.split("|")
            entries.append(Entry(form, g, n, gloss, flag != ["s"]))
        out[code] = entries
    return out


VOCAB_CODES = tuple(topics())


def _pick(seq, key: str):
    return seq[zlib.crc32(key.encode()) % len(seq)]


def find_vocab(code: str, it: str):
    """(start, end, palabra, sustituta, glosa, distractores) o None. Exactamente una palabra del tema en la oración."""
    if code == "ERR_VOC_CONNETTIVI" and "?" in it:  # «perché» y «quando» al preguntar son interrogativos (otra unidad)
        return None
    if code == "ERR_VOC_INTERROG" and "?" not in it:  # solo como pregunta («come» también es «como»)
        return None
    entries = topics()[code]
    if code == "ERR_VOC_DIMOSTRATIVI":  # solo como adjetivo (con sustantivo): «questo è…» o «quello che…» no admiten el cambio
        nxt = re.search(r"\b(?:questo|questa|questi|queste|quel|quella|quei|quelle|quello)\s+(\w+)", it, re.I)
        if not nxt or nxt.group(1).lower() in {"è", "e", "sono", "era", "non", "che", "ha", "hanno", "di", "mi", "ti", "si", "ci", "vi", "lo", "la", "li", "le", "ne", "a"}:
            return None
    by_form = {e.form.lower(): e for e in entries if e.target}
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


def second_replacement(code: str, it: str) -> str | None:
    """Otra palabra del tema (distinta de la sustituta de `find_vocab`) para un tercer distractor; None si no hay otra con el mismo género y número."""
    hit = find_vocab(code, it)
    if not hit:
        return None
    start, end, word, first = hit[0], hit[1], hit[2], hit[3]
    e = next(x for x in topics()[code] if x.form.lower() == word.lower())
    same = [x for x in topics()[code] if x.form != e.form and x.form.lower() != first.lower() and (x.gender, x.num) == (e.gender, e.num) and art_class(x) == art_class(e)]
    if not same:
        return None
    repl = _pick(same, it + e.form + "2").form
    return repl[0].upper() + repl[1:] if word[0].isupper() else repl


# --- artículo italiano y avisos contrastivos del paso «Palabras» -------------------------------------------------------------------
_ES_ARTICLE = re.compile(r"^(el|la|los|las)\s+(\w+)", re.I)
_ES_FEM_EL = {"agua", "hambre", "alma", "águila", "área", "arma", "hacha", "aula", "ala"}  # femeninos con «el» ante a- tónica


def it_article(form: str, gender: str, num: str, gloss: str) -> str:
    """Artículo determinado italiano de un SUSTANTIVO (la glosa empieza con artículo español); '' para adjetivos, verbos y palabras sueltas.
    Mostrar «il latte» y no solo «latte» evita que el género se cuele desde el español («la leche»)."""
    if gender not in ("m", "f") or num not in ("s", "p") or not _ES_ARTICLE.match(gloss):
        return ""
    f = form.lower()
    f = f[1:] if f.startswith("h") and len(f) > 1 and f[1] in _VOWELS else f  # «hobby»: la h no suena
    vowel = f[0] in _VOWELS
    impure = bool(re.match(r"(s[^aeiou]|z|gn|ps|x|y)", f))
    if gender == "f":
        return "le" if num == "p" else ("l'" if vowel else "la")
    if num == "p":
        return "gli" if (vowel or impure) else "i"
    return "l'" if vowel else ("lo" if impure else "il")


_COGNATES_DISSIMILAR = {"latte", "orecchio", "naso", "braccia", "domenica"}  # parientes de la palabra española aunque se escriban distinto (latte/leche)


def _norm(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def gender_differs(form: str, gender: str, gloss: str) -> bool:
    """El sustantivo italiano tiene distinto género que su equivalente español PARIENTE (il latte / la leche). Solo se avisa si la
    palabra se parece a la española: «lo schermo / la pantalla» no es una trampa, son palabras distintas."""
    m = _ES_ARTICLE.match(gloss)
    if not m or gender not in ("m", "f"):
        return False
    if form.lower() not in _COGNATES_DISSIMILAR and difflib.SequenceMatcher(None, _norm(form), _norm(m.group(2))).ratio() < 0.55:
        return False
    es = "f" if m.group(1).lower() in ("la", "las") or (m.group(1).lower() == "el" and m.group(2).lower() in _ES_FEM_EL) else "m"
    return es != gender


SIEVES = config.ROOT / "pipeline" / "vocab" / "sieves.json"
RULES = {"cion-zione", "dad-ta", "ch-tt", "ll-chi", "ll-pi", "fl-fi", "pl-pi", "ie-e", "ue-o", "ue-uo", "n-gn", "j-gli", "j-cchi", "h-f", "u-o", "x-s", "doble", "inf-e", "otro"}


@lru_cache(maxsize=1)
def sieves() -> dict[str, dict]:
    """Parentesco de cada palabra con el español (tamices de EuroComRom): transparente, cambio regular (con su regla) u opaca.
    Clasificado por IA (no es verificación de un nativo) y revisado por muestreo; la lista de falsos amigos del catálogo manda sobre `ff`."""
    return json.loads(SIEVES.read_text(encoding="utf8"))


@lru_cache(maxsize=1)
def false_friend_forms() -> frozenset[str]:
    """Formas italianas que el catálogo de falsos amigos (fuentes leídas) marca como engañosas para quien habla español."""
    fa = yaml.safe_load((config.LEXICONS_DIR / "false_friends.yaml").read_text(encoding="utf8"))["entries"]
    return frozenset(e["form"].lower() for e in fa)
