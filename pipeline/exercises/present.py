"""Presente de indicativo (A1): el error se genera solo cuando el sujeto es un pronombre explícito justo antes del verbo, así
la forma «equivocada» lo es por construcción (persona que no concuerda, o terminación calcada del español que no existe en italiano).

Todo sale de tablas cerradas (gramática estándar del italiano); si el verbo o el patrón no está en ellas, no se genera nada."""
import re
from dataclasses import dataclass

# Personas: 0 io · 1 tu · 2 lui/lei · 3 noi · 4 voi · 5 loro
PRONOUN = {"io": 0, "tu": 1, "lui": 2, "lei": 2, "noi": 3, "voi": 4, "loro": 5}
_NOT_SUBJECT_BEFORE = {"a", "per", "con", "da", "di", "in", "su", "tra", "fra", "come", "che", "senza", "contro", "verso"}

ARE = "parlare lavorare abitare amare ascoltare aspettare cantare comprare cucinare domandare guardare imparare lavare pensare portare " \
      "preparare trovare usare visitare entrare tornare arrivare aiutare chiamare contare ballare suonare telefonare ordinare passare " \
      "ricordare nuotare cenare pranzare giurare mostrare salutare".split()  # sin verbos en -iare (la i se pierde: ringraziamo, odiamo)
ERE = "scrivere leggere vedere prendere chiudere vivere correre mettere perdere ricevere rispondere vendere credere ripetere temere chiedere decidere".split()
IRE_PLAIN = "dormire partire sentire aprire offrire servire seguire vestire coprire soffrire".split()
IRE_ISC = "finire capire preferire pulire costruire".split()

ENDINGS = {
    "are": ("o", "i", "a", "iamo", "ate", "ano"),
    "ere": ("o", "i", "e", "iamo", "ete", "ono"),
    "ire": ("o", "i", "e", "iamo", "ite", "ono"),
    "isc": ("isco", "isci", "isce", "iamo", "ite", "iscono"),
}
# Terminaciones del presente del español para el mismo grupo (lo que el hispanohablante transfiere).
ES_ENDINGS = {
    "are": ("o", "as", "a", "amos", "ais", "an"),
    "ere": ("o", "es", "e", "emos", "eis", "en"),
    "ire": ("o", "es", "e", "imos", "is", "en"),
    "isc": ("o", "es", "e", "imos", "is", "en"),
}
IRREGULAR = {
    "essere": ("sono", "sei", "è", "siamo", "siete", "sono"),
    "avere": ("ho", "hai", "ha", "abbiamo", "avete", "hanno"),
    "andare": ("vado", "vai", "va", "andiamo", "andate", "vanno"),
    "fare": ("faccio", "fai", "fa", "facciamo", "fate", "fanno"),
    "stare": ("sto", "stai", "sta", "stiamo", "state", "stanno"),
    "venire": ("vengo", "vieni", "viene", "veniamo", "venite", "vengono"),
    "dare": ("do", "dai", "dà", "diamo", "date", "danno"),
    "dire": ("dico", "dici", "dice", "diciamo", "dite", "dicono"),
    "sapere": ("so", "sai", "sa", "sappiamo", "sapete", "sanno"),
    "uscire": ("esco", "esci", "esce", "usciamo", "uscite", "escono"),
    "volere": ("voglio", "vuoi", "vuole", "vogliamo", "volete", "vogliono"),
    "potere": ("posso", "puoi", "può", "possiamo", "potete", "possono"),
    "dovere": ("devo", "devi", "deve", "dobbiamo", "dovete", "devono"),
}
GROUP_OF_IRREGULAR = {"essere": "ERR_PRESENT_ESSERE_AVERE", "avere": "ERR_PRESENT_ESSERE_AVERE", "volere": "ERR_PRESENT_MODAL",
                      "potere": "ERR_PRESENT_MODAL", "dovere": "ERR_PRESENT_MODAL"}
PRESENT_CODES = ("ERR_PRESENT_ARE", "ERR_PRESENT_ERE_IRE", "ERR_PRESENT_ESSERE_AVERE", "ERR_PRESENT_IRREGULAR", "ERR_PRESENT_MODAL")


@dataclass(frozen=True)
class Form:
    lemma: str
    person: int
    code: str
    forms: tuple[str, ...]      # las 6 formas italianas correctas
    spanish: tuple[str, ...] | None  # las 6 formas «calcadas del español» (None en irregulares)


def _regular(lemma: str, group: str) -> tuple[str, ...]:
    stem = lemma[:-3]
    return tuple(stem + e for e in ENDINGS[group])


def _build() -> dict[str, list[Form]]:
    table: dict[str, list[Form]] = {}
    for lemmas, group, code in ((ARE, "are", "ERR_PRESENT_ARE"), (ERE, "ere", "ERR_PRESENT_ERE_IRE"),
                                (IRE_PLAIN, "ire", "ERR_PRESENT_ERE_IRE"), (IRE_ISC, "isc", "ERR_PRESENT_ERE_IRE")):
        for lemma in lemmas:
            stem = lemma[:-3]
            forms = _regular(lemma, group)
            spanish = None if group == "isc" else tuple(stem + e for e in ES_ENDINGS[group])  # -isc- no tiene equivalente en español
            for person, f in enumerate(forms):
                table.setdefault(f, []).append(Form(lemma, person, code, forms, spanish))
    for lemma, forms in IRREGULAR.items():
        code = GROUP_OF_IRREGULAR.get(lemma, "ERR_PRESENT_IRREGULAR")
        for person, f in enumerate(forms):
            table.setdefault(f, []).append(Form(lemma, person, code, forms, None))
    return table


FORMS = _build()
_PRON = "|".join(PRONOUN)
_RX = re.compile(rf"\b({_PRON})\s+(?:non\s+)?([\wàèéìòù]+)\b", re.I)


def wrong_form(f: Form) -> str | None:
    """La forma errónea por construcción: terminación del español si no existe en italiano; si no, otra persona del mismo verbo."""
    if f.spanish is not None and f.spanish[f.person] != f.forms[f.person]:
        return f.spanish[f.person]
    for step in (3, 1, 2, 4, 5):  # otra persona cualquiera: con pronombre explícito ninguna otra concuerda
        cand = f.forms[(f.person + step) % 6]
        if cand != f.forms[f.person]:
            return cand
    return None


def find_present(code: str, it: str):
    """Devuelve (start, end, correcta, errónea) o None. Exactamente un «pronombre + verbo» del grupo en la oración."""
    hits = []
    for m in _RX.finditer(it):
        person = PRONOUN[m.group(1).lower()]
        word = m.group(2)
        low = word.lower()
        prev = re.findall(r"[\wàèéìòù']+", it[:m.start()].lower())
        if prev and prev[-1] in _NOT_SUBJECT_BEFORE:
            continue
        for f in FORMS.get(low, []):
            if f.person == person and f.code == code:
                w = wrong_form(f)
                if w:
                    w = w.capitalize() if word[0].isupper() else w
                    hits.append((m.start(2), m.end(2), word, w))
                break
    return hits[0] if len(hits) == 1 else None
