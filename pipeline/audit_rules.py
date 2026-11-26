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
_OBSCENO = re.compile(r"\b(cazzo|merda|puttana|fottere|vaffanculo|stronzo|stronza|troia|coglione|sesso|sessuale|nudo|nuda|stupro|droga|drogat\w+|cocaina|suicidio|genocidio|terrorist\w+|nazist\w+|satana|diavolo|inferno)\b", re.I)
_RELIGIOSO = re.compile(r"\b(Dio|Gesù|Cristo|Allah|Madonna|santo|santi|Bibbia|biblico|biblica|profeta|paradiso|peccato)\b")
_MORBIDO = re.compile(r"\b(uccidere|ucciso|uccisa|assassin\w+|omicid\w+|cadavere|tomba|funerale|ammazzat\w+)\b", re.I)

# --- italiano: tiempos fuera de A1 (solo formas inequívocas) -------------------------------------------------------------------
_FUTURO = re.compile(r"\b(\w{3,}(?:erò|irò|erà|irà|erai|eremo|erete|eranno|iranno|iremo|irete|irai)|sarò|sarà|sarai|saremo|sarete|saranno|farò|farà|farai|faremo|farete|faranno|avrò|avrà|avrai|avremo|avrete|avranno|andrò|andrà|andrai|andremo|andrete|andranno|verrò|verrà|verrai|verremo|verrete|verranno|vorrà|vorranno|potrà|potranno|dovrà|dovranno|saprà|vedrà)\b", re.I)
_CONDIZIONALE = re.compile(r"\b(?!vorrei\b)(\w{3,}(?:erei|eresti|erebbe|eremmo|ereste|erebbero|irei|iresti|irebbe|iremmo|ireste|irebbero)|sarei|saresti|sarebbe|saremmo|sareste|sarebbero|avrei|avresti|avrebbe|avremmo|avreste|avrebbero|potrei|potresti|potrebbe|potremmo|potreste|potrebbero|dovrei|dovresti|dovrebbe|vorresti|vorrebbe|vorremmo|vorreste|vorrebbero|farei|faresti|farebbe|andrei|andresti|andrebbe|verrei|verresti|verrebbe)\b", re.I)
_CONGIUNTIVO_IMP = re.compile(r"\b(fossi|fosse|fossimo|foste|fossero|avessi|avesse|avessimo|aveste|avessero|potessi|potesse|potessimo|potessero|facessi|facesse|andasse|andassi|venisse|venissi|volesse|volessi|dovesse|dovessi|sapesse|sapessi|stesse|stessi|dicesse|dicessi|dessero|desse)\b", re.I)
_REMOTO = re.compile(r"\b(\w{3,}(?:arono|erono|irono|ò)|\w{4,}ì|fui|fosti|fummo|furono|ebbi|ebbe|ebbero|fece|fecero|disse|dissero|venne|vennero|vide|videro|prese|presero|mise|misero|volle|vollero|seppe|seppero|ebbi|nacque|morì|vissi|visse|scrisse|lesse|chiese|rispose|rimase)\b|\b\w{3,}ai\b(?=\s)", re.I)
_REMOTO_OK = {"però", "ciò", "così", "perciò", "oltrechè", "lì", "giù", "più", "università", "città", "verità", "qualità", "libertà", "età", "metà", "difficoltà", "felicità", "novità", "attività", "comunità", "realtà", "possibilità", "identità", "società", "curiosità", "povertà", "pietà", "estate", "caffè", "tè", "ieri", "mai", "assai", "sempre", "guai", "bai", "rai", "mamma", "cinquant'", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "bevì", "ahimè"}
_REMOTO_OK |= {w for w in ("lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "così", "perché", "affinché", "anziché", "sicché", "finché", "poiché", "benché", "né", "sì", "bambù", "tribù", "virtù", "gioventù", "schiavitù")}
_IMPERFETTO = re.compile(r"\b(ero|eri|era|eravamo|eravate|erano|avevo|avevi|aveva|avevamo|avevate|avevano|stavo|stavi|stava|stavamo|stavano|facevo|facevi|faceva|facevano|dicevo|diceva|dicevano|andavo|andavi|andava|andavano|venivo|veniva|venivano|potevo|poteva|potevano|volevo|voleva|volevano|dovevo|doveva|dovevano|sapevo|sapeva|vedevo|vedeva|c'era|c'erano)\b", re.I)
_IMPERATIVO_FORMALE = re.compile(r"^(?:\s*(?:Per favore|Mi scusi),?\s*)?(?:apra|chiuda|guardi|ascolti|prenda|venga|vada|faccia|dica|aspetti|entri|si sieda|legga|scriva)\b", re.I)

# --- italiano: lo que A2 todavía no enseña (B1), temas poco útiles y lo que Tatoeba trae demasiado (muertes) ------------------------------------
_PART_IRREG = r"preso|messo|chiuso|perso|letto|scritto|fatto|detto|aperto|visto|rotto|risposto|scelto|deciso|corso|speso|bevuto|vissuto"
_PART_MOV = r"stato|stata|stati|state|andato|andata|andati|andate|venuto|venuta|venuti|venute|arrivato|arrivata|arrivati|arrivate|partito|partita|partiti|partite|uscito|uscita|usciti|uscite|tornato|tornata|tornati|tornate|nato|nata|nati|nate|morto|morta|morti|morte|caduto|caduta|entrato|entrata"
_TRAPASSATO = re.compile(r"\b(?:avevo|avevi|aveva|avevamo|avevate|avevano) (?:\w+(?:ato|uto|ito)|" + _PART_IRREG + r")\b|\b(?:ero|eri|era|eravamo|eravate|erano) (?:" + _PART_MOV + r")\b", re.I)
_COMBINATI = re.compile(r"\bglie(?:lo|la|li|le|ne)\b|\b(?:me|te|ce|ve) (?:lo|la|li|le|ne)\b|\b(?:me|te|ce|ve|se)\s?l'|\b(?:me|te|ce|ve) ne\b", re.I)
_MORBIDO_A2 = re.compile(r"\b(mort[oaie]|morire|muor\w+|muoio|muoi|morì|suicid\w+|impicc\w+|uccid\w+|uccis\w+|sparat\w+|pistola|sangue|cancro|tumore)\b", re.I)
MAX_WORDS = {"A1": 14, "A2": 12}

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


# Revisión de precisión de las candidatas A2 (2026-11-26, 4 revisores independientes, 1077 frases): lo que más se colaba.
_A2_TEMA = re.compile(r"\b(manett\w+|denunci\w+|esorciz\w+|copula|gay|scorreg\w+|puzza|violazione|comunist\w+|islam\w*|musulman\w+|chiesa|sciopero|coma|porno\w*|bisessual\w*|omosessual\w*|colp(?:ire|isc\w+|it[oaie])|rubat\w+|rubare|rubò|vaccin\w+|seppell\w+|decedut\w+|deceduto|picchi\w+|preg(?:o|a|ava|are|hiera|hiere)|elezion\w+|politic\w+|guerra|soldat\w+|esercito|pistola|massacr\w+|ferit\w+|ferire|sangue|bomba|prigione|carcere|ladro|ladri)\b", re.I)
_A2_LESSICO_B1 = re.compile(r"\b(migliaia|degn\w+|sputar\w+|sputare|circuito|ratifica|lacuna|edilizia|epoca|predominio|riscaldamento|nebbia|illuminist\w+|prendersi gioco|presa gioco|prendere in giro|gioco di|al volo|volo degli|interessat\w+ nel|tirar\w*te?la|tirarsela|andarsene|San Pablo|soria|piragna|un epidemia|fraintendiment\w+|alcuna|vincere una causa|intim\w+|più bisogno|intorno a (?:mezzo\w+|mezzanotte|\d+)|ultimi saranno|in lungo e in largo|le sue tasche|diametro|foro|vaso d'acqua|topo di biblioteca|merita attenzione|tizio|bivio|in vigore|ammenda|a pagamento|vagar\w+|vagav\w+|laggiù|si dice che|di fila)\b", re.I)
_A2_REMOTO_EXTRA = re.compile(r"\b(?:sedett\w+|sedetti|apparve|lessi|chiesi|scrissi|risposi|misi|vidi|feci|dissi|venni|ebbi|fui|dovetti|dovette|potei|volli|seppi|credette|perdette|vendette|ricevette|ripetette|ruppi|diedi|nacqui|(?:diede|dette|ruppe|accadde|cadde|scese|pose|ottenne|apparse|convinse|spinse|vinse|perse|sorse|offrì|aprì|capì|partì|sentì|finì|uscì|morì|tenne|condusse|trasse))\b", re.I)
_A2_CONGIUNTIVO = re.compile(r"\b(?:credo|penso|spero|voglio|immagino|sembra|temo|dubito|vorrei|bisogna|è meglio|peccato|nonostante|benché|affinché|purché|prima che) che\b|\b(?:prima che|affinché|benché|purché|nonostante)\b|\bci (?:sia|siano)\b|\bche (?:\w+ )?(?:sia|siano|abbia|abbiano|faccia|facciano|dica|dicano|venga|vengano|vada|vadano|possa|possano|voglia|vogliano|debba|sappia|stia|dia|conosca|senta|capisca|lasci)\b", re.I)


_A2_CONDIZ_PASSATO = re.compile(r"\b(?:avrei|avresti|avrebbe|avremmo|avreste|avrebbero|sarei|saresti|sarebbe|saremmo|sareste|sarebbero) (?:potuto|dovuto|voluto|stato|stata|stati|state|\w+(?:ato|uto|ito))\b", re.I)
_A2_SI_FORMALE = re.compile(r"^Si [a-zà-ù]{3,}i\b", re.I)


def italian_issue(it: str, level: str = "A1", allow: frozenset[str] | set[str] = frozenset()) -> str | None:
    """`allow` deja pasar, para una cápsula concreta, lo que el filtro rechaza siempre: «condizionale», «imperativo_formale», «combinati»."""
    it = _strip(it)
    if _OBSCENO.search(it):
        return "tema inadecuado o vulgar"
    if _RELIGIOSO.search(it):
        return "tema religioso, poco útil para practicar"
    if _MORBIDO.search(it):
        return "tema mórbido, poco útil para practicar"
    if _CONGIUNTIVO_IMP.search(it):
        return "congiuntivo (fuera de A1)"
    if _CONDIZIONALE.search(it) and "condizionale" not in allow:
        return "condicional (fuera de A1)"
    if level == "A1":
        if _FUTURO.search(it):
            return "futuro (fuera de A1)"
        if _IMPERFETTO.search(it):
            return "imperfetto (fuera de A1)"
        for m in _REMOTO.finditer(it):
            if m.group(0).lower() not in _REMOTO_OK and m.group(0).lower().rstrip("'") not in _REMOTO_OK:
                return "passato remoto (fuera de A1)"
    if level == "A2":
        for m in _REMOTO.finditer(it):
            w = m.group(0).lower()
            if w not in _REMOTO_OK and w.rstrip("'") not in _REMOTO_OK and not _FUTURO.search(w):   # el futuro (parlerò, andrò) termina igual y sí es de A2
                return "passato remoto (fuera de A2)"
        if _TRAPASSATO.search(it):
            return "trapassato (fuera de A2)"
        if _COMBINATI.search(it) and "combinati" not in allow:
            return "pronombres combinados (fuera de A2)"
        if _MORBIDO_A2.search(it):
            return "tema mórbido (muerte), poco útil para practicar"
        if _A2_TEMA.search(it):
            return "tema inadecuado para A2 (política, religión, violencia, delito)"
        if _A2_LESSICO_B1.search(it):
            return "léxico de B1 o más"
        if _A2_REMOTO_EXTRA.search(it):
            return "passato remoto (fuera de A2)"
        if _A2_SI_FORMALE.search(it) and "imperativo_formale" not in allow:
            return "imperativo formal (fuera de A2)"
        if _A2_CONDIZ_PASSATO.search(it):
            return "condizionale passato (fuera de A2)"
        if _A2_CONGIUNTIVO.search(it) and "congiuntivo" not in allow:
            return "congiuntivo (fuera de A2)"
    if _IMPERATIVO_FORMALE.search(it) and "imperativo_formale" not in allow:
        return "imperativo formal (fuera de A1)"
    if _META.search(it):
        return "metalingüística o con palabra citada (poco útil)"
    if _words(it) > MAX_WORDS.get(level, 14):
        return f"demasiado larga para {level if level in MAX_WORDS else 'A1'}"
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


def prefilter(items: list[dict], level: str = "A1", allow: frozenset[str] | set[str] = frozenset()) -> list[str | None]:
    """Un motivo de rechazo (o None) por candidata. Cada item: {italiano, espanol_tatoeba|None, directa}."""
    nlp = get_nlp()
    docs = list(nlp.pipe([i["italiano"] for i in items], batch_size=64))
    names = proper_name_issue(docs)
    out: list[str | None] = []
    seen: list[str] = []
    for i, it in enumerate(items):
        es = it.get("espanol_tatoeba") if it.get("directa", True) else None
        reason = italian_issue(it["italiano"], level, allow) or spanish_issue(es) or length_issue(it["italiano"], es) or names[i]
        key = re.sub(r"\W+", "", it["italiano"].lower())
        if not reason and any(k.startswith(key[:18]) or key.startswith(k[:18]) for k in seen if min(len(k), len(key)) >= 15):
            reason = "casi duplicada de otra candidata"
        seen.append(key)
        out.append(reason)
    return out
