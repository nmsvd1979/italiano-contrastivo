"""Calcos mecánicos de A2 (passato prossimo, imperfetto, pronombres, comparativos, futuro…). Se registran desde `calques.py`.

Misma regla que en A1: listas cerradas y un error por construcción; si el patrón no aparece, aparece dos veces o es ambiguo, devuelve None.
Reglas de oro de A2 (revisión 2026-11-26): el `wrong` nunca puede ser una forma VÁLIDA del italiano. Por eso NO se generan como error
`ha successo`, `sono corso`, `lo posso fare`, `quando arrivi ti chiamo`, `vado a mangiare`, `più buono`, `dopo mangiato`, `vorrei → volerei`,
`ho dovuto / sono dovuto`, `costato / bastato con avere`, ni `a me mi piace` (ver plan docs/specs/2026-11-26-plan-a2.md §5.6).
Lo registra `calques.py` al final de su carga; los tipos compartidos viven en `calque_base.py` para que no haya ciclo de importación.
"""
import re
from typing import Callable

from pipeline.exercises.calque_base import Calque, _cap, _only

ADV = r"(?: (?:non|mai|già|ancora|sempre|appena|più|molto|poco))?"


def _mk(code: str, m: re.Match, group: int, wrong: str, kind: str = "l1_calque") -> Calque:
    return Calque(code, m.start(group), m.end(group), m.group(group), _cap(wrong, m.group(group)), kind)


def _vowel_to_o(participle: str) -> str:
    return participle[:-1] + "o"


# ── ERR_PP_PARTICIPI_IRREG ────────────────────────────────────────────────────────────────────────────────────────────────
# Participios que el español NO anticipa: el hispanohablante regulariza (prender → *prenduto). veduto y perduto son válidos: no están.
PART_IRREG = {"preso": "prenduto", "messo": "mettuto", "chiuso": "chiudito", "letto": "leggiuto", "deciso": "decidito", "chiesto": "chieduto",
              "scelto": "scegliuto", "risposto": "rispondito", "speso": "spenduto"}
_PP_IRREG = re.compile(r"\b(?:ho|hai|ha|abbiamo|avete|hanno)" + ADV + r" (" + "|".join(PART_IRREG) + r")\b", re.I)
_PP_RIMASTO = re.compile(r"\b(?:è|sono|sei|siamo|siete)" + ADV + r" (rimast)([oaie])\b", re.I)


def pp_participi_irreg(it: str):
    m = _only(_PP_IRREG, it)
    if m:
        return _mk("ERR_PP_PARTICIPI_IRREG", m, 1, PART_IRREG[m.group(1).lower()], "morphological")
    m = _only(_PP_RIMASTO, it)
    return m and Calque("ERR_PP_PARTICIPI_IRREG", m.start(1), m.end(2), m.group(1) + m.group(2), _cap("rimanut" + m.group(2), m.group(1)), "morphological")


# ── ERR_PP_AUSILIARE ──────────────────────────────────────────────────────────────────────────────────────────────────────
# (a) essere donde el español usa haber: *ha piaciuto, *ho stato, *ha rimasto. Sin costare/bastare/mancare (con avere son válidos o ambiguos).
_ESSERE_PP = re.compile(r"\b(è|sono|sei|siamo|siete)(" + ADV + r") (stat|piaciut|rimast|diventat|riuscit)([oaie])\b", re.I)
_AUX_TO_AVERE = {"è": "ha", "sei": "hai", "siamo": "abbiamo", "siete": "avete"}
# (b) avere donde el hispanohablante hipercorrige: *sono camminato. Sin correre, volare, saltare, vivere ni verbos de doble auxiliar.
_AVERE_PP = re.compile(r"\b(ho|hai|ha|abbiamo|avete|hanno)(" + ADV + r") (cammin|viaggi|nuot|dorm|passeggi|sci|pranz|cen|telefon|litig|ball|gioc)(at|it)o\b", re.I)
_AVERE_TO_ESSERE = {"ho": "sono", "hai": "sei", "ha": "è", "abbiamo": "siamo", "avete": "siete", "hanno": "sono"}


def pp_ausiliare(it: str):
    m = _only(_ESSERE_PP, it)
    if m:
        aux = m.group(1).lower()
        avere = _AUX_TO_AVERE.get(aux) or ("ho" if m.group(4).lower() in "oa" else "hanno")
        wrong = f"{avere}{m.group(2)} {m.group(3)}o"
        return Calque("ERR_PP_AUSILIARE", m.start(), m.end(), m.group(0), _cap(wrong, m.group(0)), "l1_calque")
    m = _only(_AVERE_PP, it)
    if m:
        wrong = f"{_AVERE_TO_ESSERE[m.group(1).lower()]}{m.group(2)} {m.group(3)}{m.group(4)}o"
        return Calque("ERR_PP_AUSILIARE", m.start(), m.end(), m.group(0), _cap(wrong, m.group(0)), "hypercorrection")
    return None


# ── ERR_REFLEXIVE_AUX ─────────────────────────────────────────────────────────────────────────────────────────────────────
_REFL = re.compile(r"\b(mi sono|ti sei|si è|ci siamo|vi siete|si sono) (?!stat|dovut|potut|volut)(\w+(?:ato|ata|ati|ate|ito|ita|iti|ite|uto|uta|uti|ute|so|sa|si|se|sto|sta|sti|ste))\b", re.I)
_REFL_AUX = {"mi sono": "mi ho", "ti sei": "ti hai", "si è": "si ha", "ci siamo": "ci abbiamo", "vi siete": "vi avete", "si sono": "si hanno"}


def reflexive_aux(it: str):
    m = _only(_REFL, it)
    return m and _mk("ERR_REFLEXIVE_AUX", m, 1, _REFL_AUX[m.group(1).lower()])


# ── ERR_PARTICIPLE_AGREEMENT (u09): se amplía con sujeto femenino/plural cerrado y con piacere ─────────────────────────────────
_FEM_SUBJ = r"(?:Maria|Anna|Giulia|Sara|Paola|Marta|Lucia|Elena|Mary|Laura|Chiara|mia madre|mia sorella|mia moglie|mia nonna|mia zia|la ragazza|la donna|la mia amica|la mamma|lei)"
_FEM_PP = re.compile(r"\b" + _FEM_SUBJ + r"(?: (?:non|già|sempre|poi|ieri|oggi|ancora))? è ((?:andat|venut|arrivat|partit|uscit|tornat|stat|nat|rimast|cadut|entrat|diventat)a)\b", re.I)
_PL_PP = re.compile(r"\b(?:Maria e \w+|le ragazze|le mie amiche|le donne|le mie sorelle|loro)(?: (?:non|già|sempre|poi|ieri|oggi|ancora))? sono ((?:andat|venut|arrivat|partit|uscit|tornat|stat|nat|rimast|cadut|entrat|diventat)[ei])\b", re.I)
_PIACERE_PP = re.compile(r"\b(?:mi|ti|gli|le|ci|vi) ((?:è piaciut(?:a|e)|sono piaciut[ie]))\b", re.I)


def participle_agreement_extra(it: str):
    m = _only(_FEM_PP, it)
    if m:
        return Calque("ERR_PARTICIPLE_AGREEMENT", m.start(1), m.end(1), m.group(1), _vowel_to_o(m.group(1)), "morphological")
    m = _only(_PL_PP, it)
    if m:
        return Calque("ERR_PARTICIPLE_AGREEMENT", m.start(1), m.end(1), m.group(1), _vowel_to_o(m.group(1)), "morphological")
    m = _only(_PIACERE_PP, it)
    if m:
        return Calque("ERR_PARTICIPLE_AGREEMENT", m.start(1), m.end(1), m.group(1), "è piaciuto", "morphological")
    return None


# ── ERR_IMPERFETTO_FORMA: io parlava (1.ª y 3.ª coinciden en español) y la b/v ────────────────────────────────────────────────
_ARE = "parl mangi gioc abit studi lavor guard ascolt cant ball cammin compr viaggi nuot aspett cerc chiam pens port arriv impar ordin".split()
_ERE = "ved legg scriv prend cred viv chied mett vend cresc conosc ricev sap pot dov vol".split()
_IRE = "dorm sent part cap fin apr serv".split()
IMPF_1SG: dict[str, str] = {}
for _stem in _ARE: IMPF_1SG[_stem + "avo"] = _stem + "ava"
for _stem in _ERE: IMPF_1SG[_stem + "evo"] = _stem + "eva"
for _stem in _IRE: IMPF_1SG[_stem + "ivo"] = _stem + "iva"
IMPF_1SG.update({"ero": "era", "avevo": "aveva", "facevo": "faceva", "dicevo": "diceva", "bevevo": "beveva", "andavo": "andava", "stavo": "stava",
                 "davo": "dava", "venivo": "veniva", "sapevo": "sapeva"})
_IMPF_IO = re.compile(r"\b[Ii]o(?: non)? (" + "|".join(sorted(IMPF_1SG, key=len, reverse=True)) + r")\b")
_AVA_FORMS = {s + e for s in _ARE for e in ("avo", "avi", "ava", "avamo", "avate", "avano")}
_AVA_RX = re.compile(r"\b(" + "|".join(sorted(_AVA_FORMS, key=len, reverse=True)) + r")\b", re.I)


def imperfetto_forma(it: str):
    m = _only(_IMPF_IO, it)
    if m:
        return _mk("ERR_IMPERFETTO_FORMA", m, 1, IMPF_1SG[m.group(1)], "morphological")
    m = _only(_AVA_RX, it)
    if not m:
        return None
    w = m.group(1).lower()
    i = w.rfind("v")   # solo la v del sufijo (arrivavo → arrivabo)
    return _mk("ERR_IMPERFETTO_FORMA", m, 1, w[:i] + "b" + w[i + 1:], "morphological")


# ── ERR_CE_IMPERFETTO: c'era / c'erano ───────────────────────────────────────────────────────────────────────────────────
_CE_SG = re.compile(r"\b[Cc]'(era)(?= (?:un|una|uno|un')\b)")
_CE_PL = re.compile(r"\b[Cc]'(erano)(?= (?:due|tre|quattro|cinque|dieci|molt\w+|dei|delle|degli|pochi|poche|tanti|tante|alcun\w+|i|le|gli)\b)")


def ce_imperfetto(it: str):
    m = _only(_CE_SG, it)
    if m:
        return _mk("ERR_CE_IMPERFETTO", m, 1, "erano", "morphological")
    m = _only(_CE_PL, it)
    return m and _mk("ERR_CE_IMPERFETTO", m, 1, "era", "morphological")


# ── ERR_TEMPO_FA_DA: «due anni fa» → *fa due anni (orden del español) ─────────────────────────────────────────────────────────
_FA = re.compile(r"\b((?:\d+|un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|venti|trenta) (?:minut[oi]|or[ae]|giorn[oi]|settiman[ae]|mes[ei]|ann[oi])) fa\b|\b(un'ora) fa\b", re.I)


def tempo_fa(it: str):
    m = _only(_FA, it)
    if not m:
        return None
    unit = m.group(1) or m.group(2)
    return Calque("ERR_TEMPO_FA_DA", m.start(), m.end(), m.group(0), _cap("fa " + unit.lower(), m.group(0)), "l1_calque")


# ── ERR_CLITIC_DIRECT_INDIRECT: el verbo decide ───────────────────────────────────────────────────────────────────────────────
_INDIRECT = re.compile(r"\b(gli|le) (?=(?:telefon\w+|rispond\w+|piace|piacciono|sembra|sembrano)\b)", re.I)
_DIRECT = re.compile(r"\b(lo|li) (?=(?:ringrazi\w+|aiut\w+|conosc\w+|ved\w+|aspett\w+|chiam\w+|invit\w+)\b)", re.I)


def clitic_direct_indirect(it: str):
    m = _only(_INDIRECT, it)
    if m:
        return _mk("ERR_CLITIC_DIRECT_INDIRECT", m, 1, "lo" if m.group(1).lower() == "gli" else "la")
    m = _only(_DIRECT, it)
    return m and _mk("ERR_CLITIC_DIRECT_INDIRECT", m, 1, "gli")


# ── ERR_PERSONAL_A (u10): también en pasado ───────────────────────────────────────────────────────────────────────────────
_PERSONAL_PP = re.compile(r"(?<![lL]')(?<![Ll]o )(?<![Ll]a )\b(?i:ho|hai|abbiamo|avete) (?i:visto|conosciuto|incontrato|chiamato|aspettato|cercato|salutato|invitato|ringraziato) ([A-Z]\w+)\b")


def personal_a_pasado(it: str):
    m = _only(_PERSONAL_PP, it)
    return m and Calque("ERR_PERSONAL_A", m.start(1), m.end(1), m.group(1), "a " + m.group(1), "l1_calque")


# ── ERR_CLITICO_POSIZIONE: farlo → *farelo ───────────────────────────────────────────────────────────────────────────────
_MODAL = "posso|puoi|può|possiamo|potete|possono|devo|devi|deve|dobbiamo|dovete|devono|voglio|vuoi|vuole|vogliamo|volete|vogliono"
_CLIT_POS = re.compile(r"\b(?:" + _MODAL + r") (\w+?(?:ar|er|ir))(lo|la|li|le|mi|ti|ci|vi)\b", re.I)


def clitico_posizione(it: str):
    m = _only(_CLIT_POS, it)
    if not m:
        return None
    return Calque("ERR_CLITICO_POSIZIONE", m.start(1), m.end(2), m.group(1) + m.group(2), m.group(1) + "e" + m.group(2), "morphological")


# ── ERR_PARTICIPLE_AGREEMENT_CLITIC: li/le + avere + participio que concuerda → *li ho comprato (solo li y le: «l'» es ambiguo) ───
_PPC_LI = re.compile(r"\bli (?:ho|hai|ha|abbiamo|avete|hanno) (\w+(?:ati|uti|iti|tti|sti|si))\b", re.I)
_PPC_LE = re.compile(r"\ble (?:ho|hai|ha|abbiamo|avete|hanno) (\w+(?:ate|ute|ite|tte|ste|se))\b", re.I)


def participle_clitic(it: str):
    m = _only(_PPC_LI, it) or _only(_PPC_LE, it)
    return m and Calque("ERR_PARTICIPLE_AGREEMENT_CLITIC", m.start(1), m.end(1), m.group(1), _vowel_to_o(m.group(1)), "morphological")


# ── ERR_COMPARATIVO_IRREG: meglio/migliore, -issimo ──────────────────────────────────────────────────────────────────────────
_MIGL_NOUN = re.compile(r"\b(?:il|la|i|le|un|una|mio|mia|miei|mie|tuo|tua|suo|sua|nostro|nostra) (migliore|migliori|peggiore|peggiori) (?=(?:amic\w+|giorn\w+|squadra|libro|film|anno|idea|giocatore|modo|momento|parte|posto|scelta|persona|ristorante)\b)", re.I)
_ADV_MEGLIO = re.compile(r"\b(?:parla|parlano|canta|cucina|scrive|gioca|lavora|studia|dorme|mangia|ballano|vivono|sto|stai|sta|stiamo|state|stanno) (meglio|peggio)\b", re.I)
_ISSIMO = re.compile(r"\b(\w{3,}?)(iss)(im[oaie])\b", re.I)


def comparativo_irreg(it: str):
    m = _only(_MIGL_NOUN, it)
    if m:
        return _mk("ERR_COMPARATIVO_IRREG", m, 1, "meglio" if m.group(1).lower().startswith("migl") else "peggio", "different_word")
    m = _only(_ADV_MEGLIO, it)
    if m:
        return _mk("ERR_COMPARATIVO_IRREG", m, 1, "migliore" if m.group(1).lower() == "meglio" else "peggiore", "different_word")
    m = _only(_ISSIMO, it)
    if m and m.group(1).lower() not in {"per", "pe"}:
        return Calque("ERR_COMPARATIVO_IRREG", m.start(2), m.end(2), m.group(2), "is", "morphological")
    return None


# ── ERR_INDEFINITI ────────────────────────────────────────────────────────────────────────────────────────────────────────
_QUALCHE_N = {"libro": "libri", "amico": "amici", "amica": "amiche", "volta": "volte", "giorno": "giorni", "minuto": "minuti", "anno": "anni",
              "cosa": "cose", "idea": "idee", "domanda": "domande", "persona": "persone", "parola": "parole", "problema": "problemi"}
_QUALCHE = re.compile(r"\bqualche (" + "|".join(_QUALCHE_N) + r")\b", re.I)
_QUALCOSA_DI = re.compile(r"\b(?:qualcosa|niente|nulla) (di )(?=(?:buono|bello|nuovo|interessante|dolce|speciale|diverso|strano|importante|utile|freddo|caldo)\b)", re.I)
_NESSUN = re.compile(r"\b(nessun) (?=\w)", re.I)


def indefiniti(it: str):
    m = _only(_QUALCHE, it)
    if m:
        return _mk("ERR_INDEFINITI", m, 1, _QUALCHE_N[m.group(1).lower()], "morphological")
    m = _only(_QUALCOSA_DI, it)
    if m:
        return Calque("ERR_INDEFINITI", m.start(1), m.end(1), m.group(1), "", "omission")
    m = _only(_NESSUN, it)
    return m and _mk("ERR_INDEFINITI", m, 1, "nessuno", "morphological")


# ── ERR_RELATIVO_CHE: *lo che ────────────────────────────────────────────────────────────────────────────────────────────
_QUELLO_CHE = re.compile(r"\b(quello|ciò) che\b", re.I)


def relativo_che(it: str):
    m = _only(_QUELLO_CHE, it)
    return m and _mk("ERR_RELATIVO_CHE", m, 1, "lo", "l1_calque")


# ── ERR_FUTURO_RADICE: *parlarò, *anderò (futuro y condicional comparten raíz) ───────────────────────────────────────────────
_AR_STEMS = "parl lavor cant ball cammin compr guard ascolt abit arriv aspett cerc chiam pens port impar ordin".split()
_FUT_END = "ò|ai|à|emo|ete|anno"
_COND_END = "ei|esti|ebbe|emmo|este|ebbero"
_FUT_AR = re.compile(r"\b(" + "|".join(_AR_STEMS) + r")er(" + _FUT_END + "|" + _COND_END + r")\b", re.I)
IRREG_STEMS = {"andr": "ander", "verr": "venir", "potr": "poter", "sapr": "saper", "vedr": "veder", "dovr": "dover", "avr": "aver", "sar": "esser"}
_FUT_IRREG = re.compile(r"\b(" + "|".join(IRREG_STEMS) + r")(" + _FUT_END + "|" + _COND_END + r")\b", re.I)


def futuro_radice(it: str):
    m = _only(_FUT_AR, it)
    if m:
        return Calque("ERR_FUTURO_RADICE", m.start(), m.end(), m.group(0), _cap(m.group(1) + "ar" + m.group(2), m.group(0)), "morphological")
    m = _only(_FUT_IRREG, it)
    return m and Calque("ERR_FUTURO_RADICE", m.start(), m.end(), m.group(0), _cap(IRREG_STEMS[m.group(1).lower()] + m.group(2), m.group(0)), "morphological")


# ── ERR_PREP_FIXED_GOV (absorbe ERR_PREP_PENSARE) ────────────────────────────────────────────────────────────────────────────
_GOV = [
    (re.compile(r"\b(?:smett\w+|smess\w+|cerc\w+) (di)\b", re.I), "a"),          # smettere/cercare di → *a
    (re.compile(r"\bpens\w+ (a) (?=(?:te|lui|lei|noi|voi|loro|me|questo|ciò)\b)", re.I), "in"),   # pensare a te → *in te
    (re.compile(r"\bdipend\w+ (da)\b", re.I), "di"),                              # dipendere da → *di
]


def prep_fixed_gov(it: str):
    found = [(m, w) for rx, w in _GOV for m in rx.finditer(it)]
    if len(found) != 1:
        return None
    m, wrong = found[0]
    return _mk("ERR_PREP_FIXED_GOV", m, 1, wrong, "l1_calque")


# ── ERR_IMPERATIVO_PRONOMI: dammi → *dami (solo al inicio de la frase) ───────────────────────────────────────────────────────
IMP_PRON = {"dammi": "dami", "dimmi": "dimi", "fammi": "fami", "dacci": "daci", "dallo": "dalo", "fallo": "falo", "dillo": "dilo", "vacci": "vaci"}
_IMP_PRON = re.compile(r"^(" + "|".join(IMP_PRON) + r")\b", re.I)


def imperativo_pronomi(it: str):
    m = _IMP_PRON.search(it)
    return m and _mk("ERR_IMPERATIVO_PRONOMI", m, 1, IMP_PRON[m.group(1).lower()], "morphological")


# ── ERR_IMPERATIVO_LEI: error de registro (tu en lugar de Lei) con un vocativo formal ────────────────────────────────────────────
LEI_TU = {"scusi": "scusa", "senta": "senti", "prenda": "prendi", "venga": "vieni", "guardi": "guarda", "aspetti": "aspetta",
          "ascolti": "ascolta", "legga": "leggi", "scriva": "scrivi", "apra": "apri", "chiuda": "chiudi"}
_LEI = re.compile(r"\b(" + "|".join(LEI_TU) + r")\b", re.I)
_FORMAL = re.compile(r"\b(signor[ei]?|signora|dottor\w*|professor\w*|avvocato)\b", re.I)


_LEI_FORMULA = re.compile(r"\b(?:si accomodi|mi dica|prego|le dispiace|la ringrazio|\bLei\b)", re.I)   # sin «scusi»/«senta»: son la palabra que se cambia y con «tu» («scusa il ritardo») también valen


def imperativo_lei(it: str):
    """Hace falta un vocativo formal o una fórmula de cortesía (scusi, senta…): sin ellos «scusa» sería válido con «tu». La consigna en español debe decir «(usted)»."""
    if not (_FORMAL.search(it) or _LEI_FORMULA.search(it)):
        return None
    m = _only(_LEI, it)
    return m and _mk("ERR_IMPERATIVO_LEI", m, 1, LEI_TU[m.group(1).lower()], "different_word")


# ── ERR_ACCENT_TRANSFER ──────────────────────────────────────────────────────────────────────────────────────────────────────
ACCENT_WRONG = {"perché": "perchè", "più": "piu", "città": "citta", "può": "puo", "già": "gia", "così": "cosi"}
_ACC = re.compile(r"\b(" + "|".join(ACCENT_WRONG) + r")\b", re.I)


def accent_transfer(it: str):
    m = _only(_ACC, it)
    return m and _mk("ERR_ACCENT_TRANSFER", m, 1, ACCENT_WRONG[m.group(1).lower()], "morphological")


# ── ERR_OPINIONE ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
_OPIN = [(re.compile(r"\b(secondo) me\b", re.I), None), (re.compile(r"\bsono (d'accordo)\b", re.I), None)]


def opinione(it: str):
    m1, m2 = (_only(rx, it) for rx, _ in _OPIN)
    if bool(m1) == bool(m2):   # ninguna o las dos: ambiguo
        return None
    if m1:
        return Calque("ERR_OPINIONE", m1.start(), m1.end(), m1.group(0), _cap("secondo io", m1.group(0)), "l1_calque")
    return Calque("ERR_OPINIONE", m2.start(1), m2.end(1), m2.group(1), "di accordo", "l1_calque")


# ── ERR_SUBORDINATE: perché → *per che ───────────────────────────────────────────────────────────────────────────────────────
_PERCHE = re.compile(r"\b(perché)\b", re.I)


def subordinate(it: str):
    m = _only(_PERCHE, it)
    return m and _mk("ERR_SUBORDINATE", m, 1, "per che", "l1_calque")


# ── ERR_SPAZIO_PREP ──────────────────────────────────────────────────────────────────────────────────────────────────────────
_SPAZIO = re.compile(r"\b(?:di fronte|accanto|in fondo|davanti|di fianco|in mezzo|intorno|attorno|dirimpetto) (a)\b", re.I)


def spazio_prep(it: str):
    m = _only(_SPAZIO, it)
    return m and _mk("ERR_SPAZIO_PREP", m, 1, "di", "l1_calque")


# ── ERR_DATE_ORARI ───────────────────────────────────────────────────────────────────────────────────────────────────────────
_PIANO = re.compile(r"\b(al) (?:primo|secondo|terzo|quarto|quinto|sesto) piano\b", re.I)
_ANNO = re.compile(r"\b(nel) ((?:19|20)\d\d)\b", re.I)


def date_orari(it: str):
    m = _only(_PIANO, it)
    if m:
        return _mk("ERR_DATE_ORARI", m, 1, "nel", "l1_calque")
    m = _only(_ANNO, it)
    return m and Calque("ERR_DATE_ORARI", m.start(), m.end(), m.group(0), _cap("in " + m.group(2), m.group(0)), "l1_calque")


# ── ERR_SI_IMPERSONALE [A] ───────────────────────────────────────────────────────────────────────────────────────────────────
_SI = re.compile(r"(?:^|\b(?:qui|lì|là|ovunque|dappertutto) )(si) (?=(?:può|possono|dice|dicono|vende|vendono|parla|parlano|mangia|trova|vive|usa)\b)", re.I)


def si_impersonale(it: str):
    if "," in it or not 3 <= len(it.split()) <= 8 or len(re.findall(r"\b[Ss]e\b", it)) > 0:
        return None
    m = _only(_SI, it)
    return m and _mk("ERR_SI_IMPERSONALE", m, 1, "se", "l1_calque")


GENERATORS: dict[str, Callable[[str], Calque | None]] = {
    "ERR_PP_PARTICIPI_IRREG": pp_participi_irreg,
    "ERR_PP_AUSILIARE": pp_ausiliare,
    "ERR_REFLEXIVE_AUX": reflexive_aux,
    "ERR_IMPERFETTO_FORMA": imperfetto_forma,
    "ERR_CE_IMPERFETTO": ce_imperfetto,
    "ERR_TEMPO_FA_DA": tempo_fa,
    "ERR_CLITIC_DIRECT_INDIRECT": clitic_direct_indirect,
    "ERR_CLITICO_POSIZIONE": clitico_posizione,
    "ERR_PARTICIPLE_AGREEMENT_CLITIC": participle_clitic,
    "ERR_COMPARATIVO_IRREG": comparativo_irreg,
    "ERR_INDEFINITI": indefiniti,
    "ERR_RELATIVO_CHE": relativo_che,
    "ERR_FUTURO_RADICE": futuro_radice,
    "ERR_PREP_FIXED_GOV": prep_fixed_gov,
    "ERR_IMPERATIVO_PRONOMI": imperativo_pronomi,
    "ERR_IMPERATIVO_LEI": imperativo_lei,
    "ERR_ACCENT_TRANSFER": accent_transfer,
    "ERR_OPINIONE": opinione,
    "ERR_SUBORDINATE": subordinate,
    "ERR_SPAZIO_PREP": spazio_prep,
    "ERR_DATE_ORARI": date_orari,
    "ERR_SI_IMPERSONALE": si_impersonale,
}
# Se añaden a generadores que ya existen en A1/u09/u10: el original manda; si no encuentra patrón, se prueba el de A2.
EXTENSIONS: dict[str, Callable[[str], Calque | None]] = {
    "ERR_PARTICIPLE_AGREEMENT": participle_agreement_extra,
    "ERR_PERSONAL_A": personal_a_pasado,
}
