"""Sonidos por escucha: la grabación dice la frase correcta y el usuario elige entre ella y una versión con UNA palabra mal escrita.
Solo se ofrece como error una forma que NO es palabra italiana (frecuencia 0 en wordfreq): nunca se presenta una palabra real como error."""
import re

from wordfreq import zipf_frequency

RULES = {
    # ch/gh duros ante e/i frente a c/g suaves, y al revés
    "ERR_C_G_PALATAL": [(r"ch(?=[ei])", "c"), (r"(?<![scg])c(?=[ei])", "ch"), (r"gh(?=[ei])", "g"), (r"(?<![g])g(?=[ei])", "gh")],
    "ERR_SC_PALATAL": [(r"sch(?=[ei])", "sc"), (r"sc(?=[ei])", "sch")],
    "ERR_GLI_PALATAL": [(r"gli(?=[aeiou])", "li"), (r"gli(?=[aeiou])", "lli")],
    # gn suena [ɲ] (como la ñ) y se escribe gn; la z suena [ts]/[dz], no como la «z» española ni como «s»: el error es escribirlo como en español
    # (tercer valor True: la forma errónea puede ser una palabra española, que es justo el calco).
    "ERR_GN_Z_SPELLING": [(r"gn", "ñ", True), (r"zz", "z", False), (r"z(?=i[aeou])", "c", False), (r"z(?=e)", "c", False)],
    # Solo las geminadas que Serena distingue (medido con scripts/medir_serena.py): oclusivas, nasales, l y r. Sin ss, ff, zz ni vv.
    "ERR_CONSONANTE_DOPPIA": [(r"tt", "t", False), (r"pp", "p", False), (r"cc(?=[aou])", "c", False), (r"ll", "l", False), (r"nn", "n", False), (r"mm", "m", False),
                              (r"rr", "r", False), (r"bb", "b", False), (r"dd", "d", False), (r"gg(?=[aou])", "g", False)],
}
_WORD = re.compile(r"[A-Za-zÀ-ÿ']+")
MIN_LEN = 5


def is_word(w: str, es: bool = True) -> bool:
    return zipf_frequency(w.lower(), "it") > 0 or (es and zipf_frequency(w.lower(), "es") > 0)


def find_phonetic(code: str, it: str):
    """(start, end, palabra correcta, palabra mal escrita) de la primera palabra mangleable, o None."""
    for m in _WORD.finditer(it):
        word = m.group(0)
        if len(word) < MIN_LEN or "'" in word:
            continue
        for rule in RULES[code]:
            pattern, repl = rule[0], rule[1]
            allow_es = len(rule) > 2 and rule[2]
            wrong = re.sub(pattern, repl, word, count=1, flags=re.I)
            if wrong != word and not is_word(wrong, es=not allow_es):
                return m.start(), m.end(), word, wrong
    return None
