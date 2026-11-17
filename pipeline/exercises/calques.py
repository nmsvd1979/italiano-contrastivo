"""Calcos mecánicos del español para los códigos de error con una transformación segura.

Cada generador busca un patrón en una oración italiana ya validada y devuelve el tramo que cambia y su versión
errónea. Todo usa listas cerradas: si el patrón no aparece, aparece dos veces o es ambiguo, devuelve None.
El resultado `wrong` es un error por construcción; nunca se genera italiano nuevo que pudiera ser válido.
"""
import re
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class Calque:
    code: str
    start: int
    end: int
    correct: str
    wrong: str
    kind: str  # distractor_kind del esquema de ítems


def _cap(wrong: str, correct: str) -> str:
    return wrong[0].upper() + wrong[1:] if correct[:1].isupper() else wrong


def _only(pattern: re.Pattern, it: str):
    found = list(pattern.finditer(it))
    return found[0] if len(found) == 1 else None


CITIES = "Roma|Milano|Napoli|Torino|Firenze|Venezia|Bologna|Parigi|Londra|Madrid"
COUNTRIES = "Italia|Spagna|Francia|Germania|Cile|Argentina|Messico|Inghilterra|Portogallo"
PEOPLE_VERBS = ("vedo|vedi|vede|conosco|conosci|conosce|amo|ami|ama|aspetto|aspetti|aspetta|"
                "cerco|cerchi|cerca|chiamo|chiami|chiama")
KIN = {"padre", "madre", "fratello", "sorella", "figlio", "figlia", "nonno", "nonna", "zio", "zia", "marito", "moglie",
       "cugino", "cugina", "nipote", "papà", "mamma", "famiglia"}
SG_PLURAL_Q = {"due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci", "molti", "molte", "pochi",
               "poche", "tanti", "tante", "dei", "delle", "degli", "i", "le", "gli", "alcuni", "alcune"}
SG_DET = {"un", "una", "uno", "il", "la", "lo"}
# Tras una forma de essere el posesivo sin artículo es válido («è mio dovere», «sia nostro destino»).
COPULA = {"è", "era", "sia", "sono", "siano", "fu", "sarà", "sarebbe", "fosse", "essere", "stato", "stata", "siamo", "siete",
          "sei", "ero", "eri", "eravamo", "erano", "sarebbero", "saranno", "foste", "fossero",
          "diventato", "diventata", "diventati", "diventate", "diventare", "diventa", "diventava", "sembra", "sembrava", "sembrano",
          "resta", "restava", "restato", "rimane", "rimaneva", "rimasto", "rimasta"}

AUX_SWAP = {"è": "ha", "È": "Ha", "sei": "hai", "Sei": "Hai", "siamo": "abbiamo", "Siamo": "Abbiamo",
            "siete": "avete", "Siete": "Avete"}
TENERE = {"ho": "tengo", "hai": "tieni", "ha": "tiene", "abbiamo": "teniamo", "avete": "tenete", "hanno": "tengono"}
CONTRACTIONS = {
    "nel": "in il", "nello": "in lo", "nella": "in la", "nell'": "in l'", "negli": "in gli", "nelle": "in le", "nei": "in i",
    "sul": "su il", "sullo": "su lo", "sulla": "su la", "sull'": "su l'", "sugli": "su gli", "sulle": "su le", "sui": "su i",
    "dal": "da il", "dallo": "da lo", "dalla": "da la", "dall'": "da l'", "dagli": "da gli", "dalle": "da le",
    "del": "di il", "dello": "di lo", "della": "di la", "dell'": "di l'", "degli": "di gli", "delle": "di le",
    "al": "a il", "allo": "a lo", "alla": "a la", "all'": "a l'", "agli": "a gli", "alle": "a le",
}

ADVERBS = {"sempre", "ancora", "anche", "già", "solo", "proprio", "davvero", "ormai", "mai", "non", "più", "ora", "adesso"}


def _after_copula(before: str) -> bool:
    """¿La palabra que gobierna (saltando adverbios) es una forma de essere o un verbo copulativo?"""
    words = re.findall(r"[\w']+", before.lower())
    while words and words[-1] in ADVERBS:
        words.pop()
    return bool(words) and words[-1] in COPULA


_AUX = re.compile(r"\b(è|È|sei|Sei|siamo|Siamo|siete|Siete)(?= (?:andat|venut|arrivat|partit|uscit|entrat|nat|mort|salit|sces)[oaie]\b)")
_PLACE = re.compile(rf"\b(a|A) (?=(?:{CITIES})\b)|\b(in|In) (?=(?:{COUNTRIES})\b)")
_CE = re.compile(r"\b(Ci sono|ci sono|C['’]è|c['’]è) ([\w']+)")
_PERSONAL = re.compile(rf"\b(?:{PEOPLE_VERBS}) ((?!(?:{CITIES}|{COUNTRIES})\b)[A-Z]\w+)")
_POSS = re.compile(r"\b(il|Il|la|La|i|I|le|Le) ((?:mi|tu|su|nostr|vostr)[oaie]|miei|tuoi|suoi|loro|mie|tue|sue)(?= (\w+))")
_CONTR = re.compile(r"\b(" + "|".join(sorted(CONTRACTIONS, key=len, reverse=True)).replace("'", "['’]") + r")\b", re.I)
_COMP = re.compile(r"\b(?:più|meno) \w+ (di) (?=(?:me|te|lui|lei|noi|voi|loro|[A-Z]\w+)\b)")
_TENERE = re.compile(r"\b(ho|hai|ha|abbiamo|avete|hanno|Ho|Hai|Ha|Abbiamo|Avete|Hanno) (?=(?:fame|sete|sonno|freddo|caldo|paura|ragione|fretta|\d+ anni)\b)")


def _aux_essere(it: str):
    m = _only(_AUX, it)
    return m and Calque("ERR_AUX_ESSERE", m.start(1), m.end(1), m.group(1), AUX_SWAP[m.group(1)], "l1_calque")


def _prep_place(it: str):
    m = _only(_PLACE, it)
    if not m:
        return None
    g = 1 if m.group(1) else 2
    prep = m.group(g)
    wrong = _cap("in" if g == 1 else "a", prep)
    return Calque("ERR_PREP_PLACE", m.start(g), m.end(g), prep, wrong, "l1_calque")


def _ce_agreement(it: str):
    found = [m for m in _CE.finditer(it) if (m.group(1).lower().replace("’", "'") == "ci sono" and m.group(2) in SG_PLURAL_Q)
             or (m.group(1).lower().startswith("c") and "è" in m.group(1) and m.group(2) in SG_DET)]
    if len(found) != 1:
        return None
    m = found[0]
    plural = m.group(1).lower() == "ci sono"
    wrong = "C'è" if m.group(1)[0] == "C" and plural else "c'è" if plural else "Ci sono" if m.group(1)[0] == "C" else "ci sono"
    return Calque("ERR_CE_AGREEMENT", m.start(1), m.end(1), m.group(1), wrong, "l1_calque")


def _personal_a(it: str):
    m = _only(_PERSONAL, it)
    return m and Calque("ERR_PERSONAL_A", m.start(1), m.end(1), m.group(1), "a " + m.group(1), "l1_calque")


def _possessive_article(it: str):
    found = [m for m in _POSS.finditer(it)
             if not (m.group(2) in ("mio", "mia", "tuo", "tua", "suo", "sua", "nostro", "nostra", "vostro", "vostra")
                     and m.group(3) in KIN)
             and m.group(3) not in KIN
             and not _after_copula(it[:m.start(1)])]
    if len(found) != 1:
        return None
    m = found[0]
    correct = it[m.start(1):m.end(2)]
    return Calque("ERR_POSSESSIVE_ARTICLE", m.start(1), m.end(2), correct, _cap(m.group(2), correct), "omission")


def _prep_article_contraction(it: str):
    m = _only(_CONTR, it)
    if not m:
        return None
    key = m.group(1).lower().replace("’", "'")
    wrong = _cap(CONTRACTIONS[key], m.group(1))
    return Calque("ERR_PREP_ARTICLE_CONTRACTION", m.start(1), m.end(1), m.group(1), wrong, "morphological")


def _comparative_di(it: str):
    m = _only(_COMP, it)
    return m and Calque("ERR_COMPARATIVE_DI", m.start(1), m.end(1), "di", "che", "l1_calque")


def _tenere_avere(it: str):
    m = _only(_TENERE, it)
    return m and Calque("ERR_TENERE_AVERE", m.start(1), m.end(1), m.group(1), _cap(TENERE[m.group(1).lower()], m.group(1)), "l1_calque")


_GENERATORS: dict[str, Callable[[str], Calque | None]] = {
    "ERR_AUX_ESSERE": _aux_essere,
    "ERR_PREP_PLACE": _prep_place,
    "ERR_CE_AGREEMENT": _ce_agreement,
    "ERR_PERSONAL_A": _personal_a,
    "ERR_POSSESSIVE_ARTICLE": _possessive_article,
    "ERR_PREP_ARTICLE_CONTRACTION": _prep_article_contraction,
    "ERR_COMPARATIVE_DI": _comparative_di,
    "ERR_TENERE_AVERE": _tenere_avere,
}
CALQUE_CODES: tuple[str, ...] = tuple(_GENERATORS)


def find_calque(code: str, it: str) -> Calque | None:
    gen = _GENERATORS.get(code)
    return gen(it) if gen else None
