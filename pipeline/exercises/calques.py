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
    listen: bool = False  # el ítem de elección se presenta como audio («escucha y elige»)


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
_PERSONAL = re.compile(rf"\b({PEOPLE_VERBS}) ((?!(?:{CITIES}|{COUNTRIES}|New|San|Santa)\b)[A-Z]\w+)")
# Con estos pronombres delante el verbo es reflexivo («mi chiamo Ludwig») o el objeto ya está dicho («lo ama Mary»).
_CLITIC_BEFORE = {"mi", "ti", "si", "ci", "vi", "lo", "la", "li", "le", "ne", "gli"}
_POSS = re.compile(r"\b(il|Il|la|La|i|I|le|Le) ((?:mi|tu|su|nostr|vostr)[oaie]|miei|tuoi|suoi|loro|mie|tue|sue)(?= (\w+))")
_CONTR = re.compile(r"\b(" + "|".join(sorted(CONTRACTIONS, key=len, reverse=True)).replace("'", "['’]") + r")\b", re.I)
_COMP = re.compile(r"\b(?:più|meno) \w+ (di) (?=(?:me|te|lui|lei|noi|voi|loro|[A-Z]\w+)\b)")
_TENERE = re.compile(r"\b(ho|hai|ha|abbiamo|avete|hanno|Ho|Hai|Ha|Abbiamo|Avete|Hanno) (?=(?:fame|sete|sonno|freddo|caldo|paura|ragione|fretta|\d+ anni)\b)")


IMPURE = r"(?:s[^\W\daeiou_]|z|gn|ps|x|y|pn)"
_ART = re.compile(rf"\b(lo|Lo) (?={IMPURE}\w*)|\b(gli|Gli) (?=(?:[aeiou]|{IMPURE})\w*)", re.I)
# Solo «siamo/siete» (plurales): con «sono/sei/è» el participio en -o puede ser válido (hablante masculino, impersonal).
_PART = re.compile(r"\b(?:[Ss]iamo|[Ss]iete) (?:non )?((?:andat|venut|arrivat|partit|uscit|nat|mort|rimast|stat|cadut|diventat|tornat|entrat)[ie])\b")
_SPELL = re.compile(r"\b(il|Il|la|La|i|I|le|Le|un|Un|una|Una) (mio|mia|miei|mie|tuo|tua|tuoi|tue|suo|sua|suoi|sue)\b")
SPELL_ES = {"mio": "mi", "mia": "mi", "miei": "mis", "mie": "mis", "tuo": "tu", "tua": "tu", "tuoi": "tus", "tue": "tus",
            "suo": "su", "sua": "su", "suoi": "sus", "sue": "sus"}
SUBJ_TO_IND = {"sia": "è", "siano": "sono", "abbia": "ha", "abbiano": "hanno", "faccia": "fa", "facciano": "fanno", "vada": "va", "vadano": "vanno",
               "venga": "viene", "vengano": "vengono", "possa": "può", "possano": "possono", "voglia": "vuole", "vogliano": "vogliono",
               "debba": "deve", "debbano": "devono", "sappia": "sa", "sappiano": "sanno", "stia": "sta", "stiano": "stanno", "dica": "dice", "dicano": "dicono"}
_OPINION = re.compile(r"\b(?:[Cc]redo|[Pp]enso|[Rr]itengo|[Cc]redi|[Pp]ensi|[Cc]rede|[Pp]ensa|[Rr]itiene|[Pp]are|[Ss]embra) che (?:non )?(" + "|".join(SUBJ_TO_IND) + r")\b")


def _article_allomorph(it: str):
    found = list(_ART.finditer(it))
    if len(found) != 1:
        return None
    m = found[0]
    g = 1 if m.group(1) else 2
    art = m.group(g)
    wrong = _cap("il" if g == 1 else "i", art)
    return Calque("ERR_ARTICLE_ALLOMORPH", m.start(g), m.end(g), art, wrong, "morphological")


def _participle_agreement(it: str):
    m = _only(_PART, it)
    if not m:
        return None
    return Calque("ERR_PARTICIPLE_AGREEMENT", m.start(1), m.end(1), m.group(1), m.group(1)[:-1] + "o", "morphological")


def _possessive_spelling(it: str):
    m = _only(_SPELL, it)
    if not m:
        return None
    poss = m.group(2)
    return Calque("ERR_POSSESSIVE_SPELLING", m.start(2), m.end(2), poss, SPELL_ES[poss], "morphological")


def _congiuntivo_opinion(it: str):
    m = _only(_OPINION, it)
    if not m:
        return None
    return Calque("ERR_CONGIUNTIVO_OPINION", m.start(1), m.end(1), m.group(1), SUBJ_TO_IND[m.group(1)], "l1_calque")


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
    found = [m for m in _PERSONAL.finditer(it) if (re.findall(r"[\w']+", it[:m.start(1)].lower()) or [""])[-1] not in _CLITIC_BEFORE]
    if len(found) != 1:
        return None
    m = found[0]
    return Calque("ERR_PERSONAL_A", m.start(2), m.end(2), m.group(2), "a " + m.group(2), "l1_calque")


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


def _present_for(code: str) -> Callable[[str], Calque | None]:
    from pipeline.exercises.present import find_present  # import local: present.py no depende de calques.py

    def gen(it: str) -> Calque | None:
        hit = find_present(code, it)
        return Calque(code, hit[0], hit[1], hit[2], hit[3], "morphological") if hit else None
    return gen


def _vocab_codes() -> tuple[str, ...]:
    from pipeline.exercises.vocab import VOCAB_CODES
    return VOCAB_CODES


def _vocab_for(code: str) -> Callable[[str], Calque | None]:
    from pipeline.exercises.vocab import find_vocab

    def gen(it: str) -> Calque | None:
        hit = find_vocab(code, it)
        return Calque(code, hit[0], hit[1], hit[2], hit[3], "different_word", listen=True) if hit else None
    return gen


def _phonetic_for(code: str) -> Callable[[str], Calque | None]:
    from pipeline.exercises.phonetics import find_phonetic

    def gen(it: str) -> Calque | None:
        hit = find_phonetic(code, it)
        return Calque(code, hit[0], hit[1], hit[2], hit[3], "morphological", listen=True) if hit else None
    return gen


_PIACE = re.compile(r"\b(piace|piacciono)\s+(?:(il|lo|la|un|uno|una|questo|questa|quel|quella|quello|mio|mia|tuo|tua|suo|sua|nostro|nostra|vostro|vostra)\b|(l')|"
                    r"(i|gli|le|questi|queste|quei|quelle|miei|tuoi|suoi|nostri|nostre|vostri|vostre|mie|tue|sue|molti|molte|tanti|tante)\b)", re.I)


def _piacere(it: str):
    """«Mi piace il gelato» / «mi piacciono i gatti»: el verbo concuerda con lo que gusta. El error es cambiar el número del verbo."""
    found = list(_PIACE.finditer(it))
    if len(found) != 1 or len(re.findall(r"\bpiac(?:e|ciono)\b", it, re.I)) != 1:
        return None
    m = found[0]
    singular = bool(m.group(2) or m.group(3))
    verb = m.group(1)
    wrong = "piacciono" if singular else "piace"
    if verb != ("piace" if singular else "piacciono"):  # ya está mal en el original: no es un buen ejemplo
        return None
    return Calque("ERR_PIACERE_ACCORDO", m.start(1), m.end(1), verb, wrong, "morphological")


# --- Plan corregido: génerо distinto del español, uno/un', pronombres reflexivos y participio calcado -------------------


def _genere(it: str):
    """El género de estas palabras no coincide con el español (la leche → il latte; el mapa → la mappa): el error es copiar el género español."""
    pats = [(re.compile(r"\b(il|un|uno)\s+(latte|sale|miele|sangue|fiore|naso|ginocchio|sorriso)\b", re.I), {"il": "la", "un": "una", "uno": "una"}),
            (re.compile(r"\b(i)\s+(fiori|nasi|sorrisi|ginocchi)\b", re.I), {"i": "le"}),
            (re.compile(r"\b(la|una)\s+(mappa|matita|penna|scarpa|borsa)\b", re.I), {"la": "il", "una": "un"}),
            (re.compile(r"\b(le)\s+(mappe|matite|penne|scarpe|borse)\b", re.I), {"le": "i"})]
    found = [(m, sw) for pat, sw in pats for m in pat.finditer(it)]
    if len(found) != 1:
        return None
    m, sw = found[0]
    art = m.group(1)
    return Calque("ERR_GENERE_ES", m.start(1), m.end(1), art, _cap(sw[art.lower()], art), "l1_calque")


_INDEF_UNO = re.compile(rf"\b(uno|Uno)\s+(?={IMPURE}\w*)", re.I)
_INDEF_UN_APOS = re.compile(r"\b(un')(?=[aeiouàèéìòù]\w*)", re.I)


def _indefinite(it: str):
    """«uno studente» (no «un studente») y «un'amica» (no «un amica»): el indefinido cambia con la letra inicial del sustantivo."""
    a = list(_INDEF_UNO.finditer(it))
    b = list(_INDEF_UN_APOS.finditer(it))
    if len(a) + len(b) != 1:
        return None
    if a:
        m = a[0]
        return Calque("ERR_INDEFINITE_ARTICLE", m.start(1), m.end(1), m.group(1), _cap("un", m.group(1)), "morphological")
    m = b[0]
    end = m.end(1)
    return Calque("ERR_INDEFINITE_ARTICLE", m.start(1), end, m.group(1), _cap("un ", m.group(1)), "morphological")


REFL = {"mi": ("me", "o"), "ti": ("te", "i"), "si": ("se", "a"), "ci": ("nos", "iamo"), "vi": ("os", "ate")}
REFL_STEMS = ("svegli", "alz", "lav", "vest", "riposa", "ferm", "diverti", "annoi", "addormento", "senti", "preoccup", "trucc", "pettin", "rad")
_REFL = re.compile(r"\b(mi|ti|si|ci|vi)\s+((?:" + "|".join(REFL_STEMS) + r")\w*)\b", re.I)


def _riflessivo(it: str):
    """«mi sveglio» (no «me sveglio»): los pronombres reflexivos son mi, ti, si, ci, vi (el español usa me, te, se, nos, os)."""
    found = []
    for m in _REFL.finditer(it):
        pron, verb = m.group(1).lower(), m.group(2).lower()
        _, ending = REFL[pron]
        ok = verb.endswith(ending) or (pron == "si" and verb.endswith(("e", "ano", "ono")))
        if pron == "mi" and not verb.endswith("o"):
            ok = False
        if ok and not verb.endswith(("ando", "endo", "ato", "uto", "ito")):  # sin gerundios ni participios
            found.append(m)
    if len(found) != 1 or len(_REFL.findall(it)) != 1:
        return None
    m = found[0]
    p = m.group(1)
    return Calque("ERR_RIFLESSIVO_PRONOME", m.start(1), m.end(1), p, _cap(REFL[p.lower()][0], p), "l1_calque")


_AVERE = r"(?:ho|hai|ha|abbiamo|avete|hanno)"
_PARTICIPIO = re.compile(rf"\b{_AVERE}\s+(?:non\s+)?((?:\w{{3,}})(?:ato|uto|ito))\b", re.I)


def _participio(it: str):
    """«ho mangiato» (no «ho mangiado»): el participio italiano termina en -ato/-uto/-ito; el español, en -ado/-ido."""
    from wordfreq import zipf_frequency
    found = list(_PARTICIPIO.finditer(it))
    if len(found) != 1:
        return None
    m = found[0]
    word = m.group(1)
    wrong = word[:-3] + ("ado" if word.endswith("ato") else "ido")
    if zipf_frequency(wrong.lower(), "it") > 0 or zipf_frequency(word.lower(), "it") == 0:
        return None
    return Calque("ERR_PARTICIPIO_ES", m.start(1), m.end(1), word, wrong, "l1_calque")


_GENERATORS: dict[str, Callable[[str], Calque | None]] = {
    "ERR_AUX_ESSERE": _aux_essere,
    "ERR_PREP_PLACE": _prep_place,
    "ERR_CE_AGREEMENT": _ce_agreement,
    "ERR_PERSONAL_A": _personal_a,
    "ERR_POSSESSIVE_ARTICLE": _possessive_article,
    "ERR_PREP_ARTICLE_CONTRACTION": _prep_article_contraction,
    "ERR_COMPARATIVE_DI": _comparative_di,
    "ERR_TENERE_AVERE": _tenere_avere,
    "ERR_ARTICLE_ALLOMORPH": _article_allomorph,
    "ERR_PARTICIPLE_AGREEMENT": _participle_agreement,
    "ERR_POSSESSIVE_SPELLING": _possessive_spelling,
    "ERR_CONGIUNTIVO_OPINION": _congiuntivo_opinion,
    "ERR_PIACERE_ACCORDO": _piacere,
    "ERR_GENERE_ES": _genere,
    "ERR_INDEFINITE_ARTICLE": _indefinite,
    "ERR_RIFLESSIVO_PRONOME": _riflessivo,
    "ERR_PARTICIPIO_ES": _participio,
    **{c: _vocab_for(c) for c in _vocab_codes()},
    **{c: _phonetic_for(c) for c in ("ERR_C_G_PALATAL", "ERR_SC_PALATAL", "ERR_GLI_PALATAL")},
    **{c: _present_for(c) for c in ("ERR_PRESENT_ARE", "ERR_PRESENT_ERE_IRE", "ERR_PRESENT_ESSERE_AVERE", "ERR_PRESENT_IRREGULAR", "ERR_PRESENT_MODAL")},
}
CALQUE_CODES: tuple[str, ...] = tuple(_GENERATORS)


def find_calque(code: str, it: str) -> Calque | None:
    gen = _GENERATORS.get(code)
    return gen(it) if gen else None
