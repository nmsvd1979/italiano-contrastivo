"""Sonidos por escucha: la grabación dice la frase correcta y el usuario elige entre ella y una versión con UNA palabra mal escrita.
Solo se ofrece como error una forma que NO es palabra italiana (frecuencia 0 en wordfreq): nunca se presenta una palabra real como error."""
import re

from wordfreq import zipf_frequency

RULES = {
    # ch/gh duros ante e/i frente a c/g suaves, y al revés
    "ERR_C_G_PALATAL": [(r"ch(?=[ei])", "c"), (r"(?<![scg])c(?=[ei])", "ch"), (r"gh(?=[ei])", "g"), (r"(?<![g])g(?=[ei])", "gh")],
    "ERR_SC_PALATAL": [(r"sch(?=[ei])", "sc"), (r"sc(?=[ei])", "sch")],
    "ERR_GLI_PALATAL": [(r"gli(?=[aeiou])", "li"), (r"gli(?=[aeiou])", "lli")],
}
_WORD = re.compile(r"[A-Za-zÀ-ÿ']+")
MIN_LEN = 5


def is_word(w: str) -> bool:
    return zipf_frequency(w.lower(), "it") > 0 or zipf_frequency(w.lower(), "es") > 0


def find_phonetic(code: str, it: str):
    """(start, end, palabra correcta, palabra mal escrita) de la primera palabra mangleable, o None."""
    for m in _WORD.finditer(it):
        word = m.group(0)
        if len(word) < MIN_LEN or "'" in word:
            continue
        for pattern, repl in RULES[code]:
            wrong = re.sub(pattern, repl, word, count=1, flags=re.I)
            if wrong != word and not is_word(wrong):
                return m.start(), m.end(), word, wrong
    return None
