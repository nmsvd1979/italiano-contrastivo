"""Prefiltro automático de la auditoría de oraciones candidatas.

Rechaza solo lo que siempre se rechaza a mano, con un motivo. Es CONSERVADOR: ante la duda no rechaza (lo ambiguo lo revisa una persona o la IA).
Se mide contra las decisiones históricas con `scripts/audit_rules_eval.py`: ninguna oración ya aprobada debe quedar rechazada.
`level` decide qué tiempos se permiten: en A1 solo presente y passato prossimo; en A2 también imperfetto.
"""
import re
import unicodedata

from pipeline.nlp import get_nlp

# --- español de la traducción -------------------------------------------------------------------------------------------------
_VOSEO = re.compile(r"\b(vos|sos|tenés|querés|sabés|podés|vivís|decís|hacés|venís|andás|mirá|vení|hacé|decí|andá|escuchá|esperá|poné|dejame|decime|dame\w*á|fijate|acordate|sentate)\b", re.I)
_VOSOTROS = re.compile(r"\b(vosotros|vosotras|vuestro|vuestra|vuestros|vuestras|\w{3,}áis|(?!dieciséis|veintiséis)\w{2,}éis|vais|sois|oís|os)\b", re.I)
_REGIONAL = re.compile(r"\b(birome|remera|pibe|pibita|pibes|laburo|guita|boludo|coger|cogió|cogí|cogiste|coges|coge|follar|joder|chaval)\b", re.I)
_NO_LATIN = re.compile(r"[^\x00-\xFF\u2010-\u2027\u20AC]")  # el español solo usa Latin-1 (acentos, ñ, ¿, ¡)
_OBSCENO = re.compile(r"\b(cazzo|merda|puttana|fottere|vaffanculo|stronzo|stronza|troia|coglione|sesso|sessuale|nudo|nuda|stupro|droga|cocaina|suicidio|genocidio|terrorist\w+|nazist\w+|satana|diavolo|inferno)\b", re.I)
_RELIGIOSO = re.compile(r"\b(Dio|Gesù|Cristo|Allah|Madonna|santo|santi|Bibbia|biblico|biblica|profeta|paradiso|peccato)\b")
_MORBIDO = re.compile(r"\b(uccidere|ucciso|uccisa|assassin\w+|omicidio|cadavere|tomba|funerale|ammazzat\w+)\b", re.I)

# --- italiano: tiempos fuera de A1 (solo formas inequívocas) -------------------------------------------------------------------
_FUTURO = re.compile(r"\b(\w{3,}(?:erò|irò|erà|irà|erai|eremo|erete|eranno|iranno|iremo|irete|irai)|sarò|sarà|sarai|saremo|sarete|saranno|farò|farà|farai|faremo|farete|faranno|avrò|avrà|avrai|avremo|avrete|avranno|andrò|andrà|andrai|andremo|andrete|andranno|verrò|verrà|verrai|verremo|verrete|verranno|vorrà|vorranno|potrà|potranno|dovrà|dovranno|saprà|vedrà)\b", re.I)
_CONDIZIONALE = re.compile(r"\b(?!vorrei\b)(\w{3,}(?:erei|eresti|erebbe|eremmo|ereste|erebbero|irei|iresti|irebbe|iremmo|ireste|irebbero)|sarei|saresti|sarebbe|saremmo|sareste|sarebbero|avrei|avresti|avrebbe|avremmo|avreste|avrebbero|potrei|potresti|potrebbe|potremmo|potreste|potrebbero|dovrei|dovresti|dovrebbe|vorresti|vorrebbe|vorremmo|vorreste|vorrebbero|farei|faresti|farebbe|andrei|andresti|andrebbe|verrei|verresti|verrebbe)\b", re.I)
_CONGIUNTIVO_IMP = re.compile(r"\b(fossi|fosse|fossimo|foste|fossero|avessi|avesse|avessimo|aveste|avessero|potessi|potesse|potessimo|potessero|facessi|facesse|andasse|andassi|venisse|venissi|volesse|volessi|dovesse|dovessi|sapesse|sapessi|stesse|stessi|dicesse|dicessi|dessero|desse)\b", re.I)
_REMOTO = re.compile(r"\b(\w{3,}(?:arono|erono|irono|ò)|\w{4,}ì|fui|fosti|fummo|furono|ebbi|ebbe|ebbero|fece|fecero|disse|dissero|venne|vennero|vide|videro|prese|presero|mise|misero|volle|vollero|seppe|seppero|ebbi|nacque|morì|vissi|visse|scrisse|lesse|chiese|rispose|rimase)\b|\b\w{3,}ai\b(?=\s)", re.I)
_REMOTO_OK = {"però", "ciò", "così", "perciò", "oltrechè", "lì", "giù", "più", "università", "città", "verità", "qualità", "libertà", "età", "metà", "difficoltà", "felicità", "novità", "attività", "comunità", "realtà", "possibilità", "identità", "società", "curiosità", "povertà", "pietà", "estate", "caffè", "tè", "ieri", "mai", "assai", "sempre", "guai", "bai", "rai", "mamma", "cinquant'", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "bevì", "ahimè"}
_REMOTO_OK |= {w for w in ("lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "così", "perché", "affinché", "anziché", "sicché", "finché", "poiché", "benché", "né", "sì", "bambù", "tribù", "virtù", "gioventù", "schiavitù")}
_IMPERFETTO = re.compile(r"\b(ero|eri|era|eravamo|eravate|erano|avevo|avevi|aveva|avevamo|avevate|avevano|stavo|stavi|stava|stavamo|stavano|facevo|facevi|faceva|facevano|dicevo|diceva|dicevano|andavo|andavi|andava|andavano|venivo|veniva|venivano|potevo|poteva|potevano|volevo|voleva|volevano|dovevo|doveva|dovevano|sapevo|sapeva|vedevo|vedeva|c'era|c'erano)\b", re.I)
_IMPERATIVO_FORMALE = re.compile(r"^(?:\s*(?:Per favore|Mi scusi),?\s*)?(?:apra|chiuda|guardi|ascolti|prenda|venga|vada|faccia|dica|aspetti|entri|si sieda|legga|scriva)\b", re.I)

_META = re.compile(r"(?:\bCome si (?:dice|scrive)\b|\b(?:in|si dice) (?:giapponese|inglese|francese|tedesco|russo|cinese|arabo|ceco|greco|albanese|esperanto|spagnolo|italiano)\b.*[\"«“]|[\"«“][^\"»”]{2,}[\"»”].*\b(?:significa|vuol dire|si chiama)\b|\b(?:significa|vuol dire)\b.*[\"«“])", re.I)

_NOMI_OK = {"Tom", "Mary", "Maria", "Marco", "Luca", "John", "Ken", "Mike", "Bob", "Paul", "Jane", "Anna", "Luisa", "Roberto", "Andrea", "Luis", "Jack", "Ana", "Michele", "Giovanni",
            "Roma", "Milano", "Firenze", "Venezia", "Napoli", "Torino", "Bologna", "Italia", "Spagna", "Francia", "Germania", "Cile", "Argentina", "Messico", "Portogallo", "Inghilterra",
            "Parigi", "Londra", "Madrid", "Europa", "Giappone", "Cina", "Stati", "Uniti", "Brasile", "Tatoeba", "Siena", "Pisa", "Genova", "Palermo", "Sicilia", "Toscana", "Sardegna"}


def _strip(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def _words(s: str) -> int:
    return len(re.findall(r"\w+", s))


def spanish_issue(es: str | None) -> str | None:
    if not es:
        return None
    if _VOSEO.search(es):
        return "traducción con voseo"
    if _VOSOTROS.search(es):
        return "traducción con «vosotros»"
    if _REGIONAL.search(es):
        return "traducción con regionalismo o palabra mal vista en Chile"
    if _NO_LATIN.search(es):
        return "la traducción trae caracteres no españoles"
    return None


def italian_issue(it: str, level: str = "A1") -> str | None:
    it = _strip(it)
    if _OBSCENO.search(it):
        return "tema inadecuado o vulgar"
    if _RELIGIOSO.search(it):
        return "tema religioso, poco útil para practicar"
    if _MORBIDO.search(it):
        return "tema mórbido, poco útil para practicar"
    if _CONGIUNTIVO_IMP.search(it):
        return "congiuntivo (fuera de A1)"
    if _CONDIZIONALE.search(it):
        return "condicional (fuera de A1)"
    if level == "A1":
        if _FUTURO.search(it):
            return "futuro (fuera de A1)"
        if _IMPERFETTO.search(it):
            return "imperfetto (fuera de A1)"
        for m in _REMOTO.finditer(it):
            if m.group(0).lower() not in _REMOTO_OK and m.group(0).lower().rstrip("'") not in _REMOTO_OK:
                return "passato remoto (fuera de A1)"
    if _IMPERATIVO_FORMALE.search(it):
        return "imperativo formal (fuera de A1)"
    if _META.search(it):
        return "metalingüística o con palabra citada (poco útil)"
    if _words(it) > 14:
        return "demasiado larga para A1"
    return None


def proper_name_issue(docs) -> list[str | None]:
    """Nombre propio poco útil: palabra con mayúscula inicial, no inicial de frase, desconocida en italiano y no incluida en los nombres comunes."""
    from wordfreq import zipf_frequency
    out = []
    for d in docs:
        bad = [t.text for t in d if t.pos_ == "PROPN" and t.i > 0 and t.text[:1].isupper() and t.text not in _NOMI_OK and zipf_frequency(t.text.lower(), "it") < 3.0]
        out.append(f"nombre propio poco útil ({bad[0]})" if bad else None)
    return out


def length_issue(it: str, es: str | None) -> str | None:
    if not es:
        return None
    ratio = _words(es) / max(1, _words(it))
    return "traducción desproporcionada" if not 0.5 <= ratio <= 2.0 else None


def prefilter(items: list[dict], level: str = "A1") -> list[str | None]:
    """Un motivo de rechazo (o None) por candidata. Cada item: {italiano, espanol_tatoeba|None, directa}."""
    nlp = get_nlp()
    docs = list(nlp.pipe([i["italiano"] for i in items], batch_size=64))
    names = proper_name_issue(docs)
    out: list[str | None] = []
    seen: list[str] = []
    for i, it in enumerate(items):
        es = it.get("espanol_tatoeba") if it.get("directa", True) else None
        reason = italian_issue(it["italiano"], level) or spanish_issue(es) or length_issue(it["italiano"], es) or names[i]
        key = re.sub(r"\W+", "", it["italiano"].lower())
        if not reason and any(k.startswith(key[:18]) or key.startswith(k[:18]) for k in seen if min(len(k), len(key)) >= 15):
            reason = "casi duplicada de otra candidata"
        seen.append(key)
        out.append(reason)
    return out
