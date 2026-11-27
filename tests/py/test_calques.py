import glob
import json
import re

import pytest

from pipeline.exercises import calques, calques_a2
from pipeline.exercises.calques import Calque, find_calque

# (código, oración de entrada, oración con el calco aplicado, tramo que cambia, kind)
POSITIVES = [
    ("ERR_AUX_ESSERE", "Nel mezzo della discussione si è alzato ed è uscito.", "Nel mezzo della discussione si è alzato ed ha uscito.", "è", "l1_calque"),
    ("ERR_AUX_ESSERE", "Fino a quando continueremo a credere che siamo nati per sterminarci a vicenda e che lo sterminio reciproco sia il nostro destino?",
     "Fino a quando continueremo a credere che abbiamo nati per sterminarci a vicenda e che lo sterminio reciproco sia il nostro destino?", "siamo", "l1_calque"),
    ("ERR_PREP_PLACE", "Domani vado a Parigi.", "Domani vado in Parigi.", "a", "l1_calque"),
    ("ERR_PREP_PLACE", "La mia famiglia va in Italia tutti gli anni.", "La mia famiglia va a Italia tutti gli anni.", "in", "l1_calque"),
    ("ERR_CE_AGREEMENT", "Ci sono molte persone alla festa.", "C'è molte persone alla festa.", "Ci sono", "l1_calque"),
    ("ERR_CE_AGREEMENT", "C'è un libro sul tavolo.", "Ci sono un libro sul tavolo.", "C'è", "l1_calque"),
    ("ERR_PERSONAL_A", "Io cerco Maria.", "Io cerco a Maria.", "Maria", "l1_calque"),
    ("ERR_POSSESSIVE_ARTICLE", "Per me è finita con le feste, il mio corpo malato non ce la fa più.",
     "Per me è finita con le feste, mio corpo malato non ce la fa più.", "il mio", "omission"),
    ("ERR_POSSESSIVE_ARTICLE", "Mi è piaciuta la tua idea e l'ho adottata.", "Mi è piaciuta tua idea e l'ho adottata.", "la tua", "omission"),
    ("ERR_PREP_ARTICLE_CONTRACTION", "L'economia di quell'isola dipende dalla pesca.", "L'economia di quell'isola dipende da la pesca.", "dalla", "morphological"),
    ("ERR_PREP_ARTICLE_CONTRACTION", "Sono nella stanza.", "Sono in la stanza.", "nella", "morphological"),
    ("ERR_COMPARATIVE_DI", "È più alto di me.", "È più alto che me.", "di", "l1_calque"),
    ("ERR_TENERE_AVERE", "Vedrai che ho ragione.", "Vedrai che tengo ragione.", "ho", "l1_calque"),
    ("ERR_TENERE_AVERE", "Ho fame.", "Tengo fame.", "Ho", "l1_calque"),
    ("ERR_ARTICLE_ALLOMORPH", "Lo studente legge un libro.", "Il studente legge un libro.", "Lo", "morphological"),
    ("ERR_ARTICLE_ALLOMORPH", "Ho visto lo zio ieri.", "Ho visto il zio ieri.", "lo", "morphological"),
    ("ERR_ARTICLE_ALLOMORPH", "Gli amici sono arrivati.", "I amici sono arrivati.", "Gli", "morphological"),
    ("ERR_ARTICLE_ALLOMORPH", "Conosco gli studenti.", "Conosco i studenti.", "gli", "morphological"),
    ("ERR_PARTICIPLE_AGREEMENT", "Noi siamo andati a casa.", "Noi siamo andato a casa.", "andati", "morphological"),
    ("ERR_PARTICIPLE_AGREEMENT", "Voi siete arrivate tardi.", "Voi siete arrivato tardi.", "arrivate", "morphological"),
    ("ERR_PARTICIPLE_AGREEMENT", "Siamo stati a Roma.", "Siamo stato a Roma.", "stati", "morphological"),
    ("ERR_POSSESSIVE_SPELLING", "Il mio libro è sul tavolo.", "Il mi libro è sul tavolo.", "mio", "morphological"),
    ("ERR_POSSESSIVE_SPELLING", "La tua casa è bella.", "La tu casa è bella.", "tua", "morphological"),
    ("ERR_POSSESSIVE_SPELLING", "Ho visto i suoi amici.", "Ho visto i sus amici.", "suoi", "morphological"),
    ("ERR_CONGIUNTIVO_OPINION", "Penso che sia vero.", "Penso che è vero.", "sia", "l1_calque"),
    ("ERR_CONGIUNTIVO_OPINION", "Credo che abbiano ragione.", "Credo che hanno ragione.", "abbiano", "l1_calque"),
    ("ERR_CONGIUNTIVO_OPINION", "Non credo che vada a Roma.", "Non credo che va a Roma.", "vada", "l1_calque"),
    ("ERR_PRESENT_ARE", "Tu parli troppo.", "Tu parlas troppo.", "parli", "morphological"),
    ("ERR_PRESENT_ARE", "Noi parliamo italiano.", "Noi parlamos italiano.", "parliamo", "morphological"),
    ("ERR_PRESENT_ARE", "Loro lavorano qui.", "Loro lavoran qui.", "lavorano", "morphological"),
    ("ERR_PRESENT_ARE", "Io non parlo spagnolo.", "Io non parliamo spagnolo.", "parlo", "morphological"),
    ("ERR_PRESENT_ERE_IRE", "Voi leggete molto.", "Voi leggeis molto.", "leggete", "morphological"),
    ("ERR_PRESENT_ERE_IRE", "Tu dormi tardi.", "Tu dormes tardi.", "dormi", "morphological"),
    ("ERR_PRESENT_ERE_IRE", "Lei finisce presto.", "Lei finiscono presto.", "finisce", "morphological"),
    ("ERR_PRESENT_ESSERE_AVERE", "Io sono stanco.", "Io siamo stanco.", "sono", "morphological"),
    ("ERR_PRESENT_ESSERE_AVERE", "Lei ha fame.", "Lei hanno fame.", "ha", "morphological"),
    ("ERR_PRESENT_IRREGULAR", "Lei va a casa.", "Lei vanno a casa.", "va", "morphological"),
    ("ERR_PRESENT_MODAL", "Loro vogliono mangiare.", "Loro vuole mangiare.", "vogliono", "morphological"),
    ("ERR_C_G_PALATAL", "Ho giocato a ghiaccio ieri.", "Ho ghiocato a ghiaccio ieri.", "giocato", "morphological"),
    ("ERR_SC_PALATAL", "Non mi piace uscire quando piove.", "Non mi piace uschire quando piove.", "uscire", "morphological"),
    ("ERR_GLI_PALATAL", "Questo non è mio figlio.", "Questo non è mio fillio.", "figlio", "morphological"),
]


@pytest.mark.parametrize("code,it,wrong_sentence,correct,kind", POSITIVES)
def test_calque_aplica_el_calco_exacto(code, it, wrong_sentence, correct, kind):
    c = find_calque(code, it)
    assert isinstance(c, Calque) and c.code == code
    assert it[c.start:c.end] == c.correct == correct
    assert it[:c.start] + c.wrong + it[c.end:] == wrong_sentence
    assert c.kind == kind


@pytest.mark.parametrize("code", calques.CALQUE_CODES)
def test_sin_patron_devuelve_none(code):
    assert find_calque(code, "Tom Smith, davvero.") is None


@pytest.mark.parametrize("code,it", [
    ("ERR_TENERE_AVERE", "Ho fame e ho sete."),  # el patrón aparece dos veces
    ("ERR_PREP_ARTICLE_CONTRACTION", "Nel mezzo della discussione si è alzato ed è uscito."),  # dos contracciones
    ("ERR_AUX_ESSERE", "Sono andato a Roma."),  # «sono» es ambiguo: no se cubre
    ("ERR_AUX_ESSERE", "Ho vissuto a Roma."),  # avere + vivere es italiano válido
    ("ERR_CE_AGREEMENT", "Ci sono andata ieri."),  # «ci sono» + participio no es existencial
    ("ERR_POSSESSIVE_ARTICLE", "Vedo la mia famiglia."),  # familia exige artículo y está excluida por seguridad
    ("ERR_PERSONAL_A", "Io cerco il libro."),  # sin nombre propio
    ("ERR_PERSONAL_A", "Io mi chiamo Ludwig."),  # reflexivo: no hay objeto directo
    ("ERR_PERSONAL_A", "La sorella di Joao si chiama Joana."),
    ("ERR_PERSONAL_A", "Tom sa quanto lo ama Mary."),  # clítico de objeto: Mary es el sujeto
    ("ERR_PERSONAL_A", "Lui conosce New York come le sue tasche."),  # lugar, no persona
    ("ERR_ARTICLE_ALLOMORPH", "Il libro è sul tavolo."),  # il + consonante normal
    ("ERR_ARTICLE_ALLOMORPH", "Lo studente e lo zio sono qui."),  # dos casos
    ("ERR_ARTICLE_ALLOMORPH", "Vedo l'amico."),  # elisión: no se cubre
    ("ERR_PARTICIPLE_AGREEMENT", "Marco è andato a casa."),  # ya masculino singular
    ("ERR_PARTICIPLE_AGREEMENT", "La signora è andata a casa."),  # sujeto fuera de la lista cerrada de A2: «è andato» puede ser válido (impersonal, otro sujeto)
    ("ERR_PARTICIPLE_AGREEMENT", "Ci sono stata."),  # «sono stato» es válido si habla un hombre
    ("ERR_PARTICIPLE_AGREEMENT", "Ho mangiato la pizza."),  # avere
    ("ERR_POSSESSIVE_SPELLING", "Mio fratello è alto."),  # sin artículo antes
    ("ERR_POSSESSIVE_SPELLING", "Il mio libro e il tuo libro."),  # dos casos
    ("ERR_CONGIUNTIVO_OPINION", "So che è vero."),  # no es verbo de opinión
    ("ERR_CONGIUNTIVO_OPINION", "Penso che Marco parli bene."),  # forma fuera de la lista cerrada
    ("ERR_PRESENT_ARE", "Parlo italiano."),  # sin pronombre explícito la persona no está asegurada
    ("ERR_PRESENT_ARE", "Per lei parla Marco."),  # el pronombre no es el sujeto
    ("ERR_PRESENT_ARE", "Io parlo e tu parli."),  # dos casos
    ("ERR_PRESENT_ARE", "Io mangio."),  # verbo fuera de la lista cerrada
    ("ERR_PRESENT_IRREGULAR", "Io sono andato."),  # essere pertenece a otro grupo
    ("ERR_PRESENT_MODAL", "Tu vai a casa."),  # andare no es modal
    ("ERR_C_G_PALATAL", "Che cosa fai?"),  # palabras cortas: el «error» sería una palabra real
    ("ERR_SC_PALATAL", "Il pesce esce."),  # «pesche» es una palabra real
])
def test_casos_ambiguos_o_validos_devuelven_none(code, it):
    assert find_calque(code, it) is None


def test_los_codigos_cubiertos():
    assert set(calques.CALQUE_CODES) == set(calques_a2.GENERATORS) | set(calques.manual_codes()) | {"ERR_VOC_CARATTERE", "ERR_VOC_FALSI_CASA", "ERR_VOC_FALSI_CITTA", "ERR_VOC_UFFICI", "ERR_VOC_CULTURA", "ERR_VOC_VIAGGIO"} | {
        "ERR_AUX_ESSERE", "ERR_PREP_PLACE", "ERR_CE_AGREEMENT", "ERR_PERSONAL_A",
        "ERR_POSSESSIVE_ARTICLE", "ERR_PREP_ARTICLE_CONTRACTION", "ERR_COMPARATIVE_DI", "ERR_TENERE_AVERE",
        "ERR_ARTICLE_ALLOMORPH", "ERR_PARTICIPLE_AGREEMENT", "ERR_POSSESSIVE_SPELLING", "ERR_CONGIUNTIVO_OPINION",
        "ERR_PRESENT_ARE", "ERR_PRESENT_ERE_IRE", "ERR_PRESENT_ESSERE_AVERE", "ERR_PRESENT_IRREGULAR", "ERR_PRESENT_MODAL",
        "ERR_C_G_PALATAL", "ERR_SC_PALATAL", "ERR_GLI_PALATAL",
        "ERR_VOC_FAMILIA", "ERR_VOC_CIBO", "ERR_VOC_CASA", "ERR_VOC_CITTA", "ERR_VOC_TEMPO", "ERR_VOC_CORPO", "ERR_VOC_ANIMALI", "ERR_VOC_LAVORO", "ERR_VOC_NUMERI", "ERR_VOC_INTERROG",
        "ERR_VOC_ABITI", "ERR_VOC_COLORI", "ERR_VOC_CLIMA", "ERR_VOC_TRASPORTI", "ERR_VOC_BAR", "ERR_VOC_TEMPOLIBERO",
        "ERR_VOC_SALUTI", "ERR_VOC_DIMOSTRATIVI", "ERR_VOC_QUANTITA", "ERR_VOC_AVVERBI", "ERR_VOC_AGGETTIVI", "ERR_VOC_DENARO", "ERR_VOC_SALUTE", "ERR_PIACERE_ACCORDO",
        "ERR_VOC_NAZIONALITA", "ERR_VOC_FRUTTA", "ERR_VOC_NEGOZI", "ERR_VOC_IGIENE", "ERR_VOC_OGGETTI",
        "ERR_VOC_ASTRATTI", "ERR_VOC_NATURA", "ERR_VOC_CUCINA", "ERR_VOC_SCUOLA",
        "ERR_GENERE_ES", "ERR_INDEFINITE_ARTICLE", "ERR_RIFLESSIVO_PRONOME", "ERR_PARTICIPIO_ES", "ERR_VOC_DIREZIONI",
        "ERR_ORA_ES", "ERR_CHIAMARSI", "ERR_PRONOME_TONICO", "ERR_IMPERATIVO_FORMA", "ERR_GN_Z_SPELLING", "ERR_CONSONANTE_DOPPIA", "ERR_VOC_VORREI",
        "ERR_VOC_CONNETTIVI", "ERR_VOC_ACCORDO", "ERR_VOC_PREPOSIZIONI", "ERR_PLURAL_FORMA", "ERR_IMPERATIVO_NEG", "ERR_STARE_GERUNDIO", "ERR_CLITICO_MI_TI", "ERR_VOC_COMUNICAZIONE", "ERR_VOC_SERVIZI"}
    assert find_calque("ERR_NO_EXISTE", "Ho fame.") is None


NEW_CODES = set(calques_a2.GENERATORS) | {"ERR_ARTICLE_ALLOMORPH", "ERR_POSSESSIVE_ARTICLE", "ERR_PERSONAL_A", "ERR_PARTICIPLE_AGREEMENT", "ERR_POSSESSIVE_SPELLING", "ERR_CONGIUNTIVO_OPINION",
             "ERR_PRESENT_ARE", "ERR_PRESENT_ERE_IRE", "ERR_PRESENT_ESSERE_AVERE", "ERR_PRESENT_IRREGULAR", "ERR_PRESENT_MODAL",
             "ERR_C_G_PALATAL", "ERR_SC_PALATAL", "ERR_GLI_PALATAL", "ERR_PIACERE_ACCORDO",
             "ERR_GENERE_ES", "ERR_INDEFINITE_ARTICLE", "ERR_RIFLESSIVO_PRONOME", "ERR_PARTICIPIO_ES", "ERR_ORA_ES", "ERR_CHIAMARSI", "ERR_PRONOME_TONICO"}


# Error de REGISTRO, no de forma: «scusa» es válido con «tu»; solo es error junto a un vocativo formal («Scusa, signore»). El generador exige ese vocativo.
# La forma sin concordar de un participio («è uscito») es válida con otro sujeto: en la consigna el español fija el género (decisión 2026-11-26, a2m01).
# Idem el cambio de tiempo (passato prossimo ↔ imperfetto) y non… più/ancora: ambos son italiano válido; los fija el español de la consigna.
REGISTRO = {"ERR_IMPERATIVO_LEI", "ERR_PARTICIPLE_AGREEMENT", "ERR_PARTICIPLE_AGREEMENT_CLITIC", "ERR_PP_VS_IMPERFETTO", "ERR_AVVERBI_PASSATO", "ERR_CLITIC_NE", "ERR_CLITIC_CI"}   # «ho molti.» sin «ne» es válido si el nombre está dicho antes


def test_ningun_calco_aparece_en_el_corpus_validado():
    """Evidencia de que cada «wrong» es error por construcción: ningún hablante del corpus validado lo usa."""
    docs = []
    for f in glob.glob("content/sentences/*.json"):
        docs += json.load(open(f, encoding="utf8"))
    assert docs, "falta content/ (python -m pipeline export)"
    corpus = " ".join(d["it"] for d in docs)
    hits = 0
    for d in docs:
        for code in (c for c in calques.CALQUE_CODES if not c.startswith("ERR_VOC_") and c not in REGISTRO):  # en vocabulario la palabra sustituta es válida en otros contextos: la diferencia la marca el audio
            c = find_calque(code, d["it"])
            if not c:
                continue
            hits += 1
            assert d["it"][c.start:c.end] == c.correct
            frag = d["it"][:c.start] + c.wrong + d["it"][c.end:]
            assert frag not in [x["it"] for x in docs]
            after = re.match(r"\s*\S+", d["it"][c.end:])
            phrase = (c.wrong + (after.group(0) if after else "")).lower()
            if code in NEW_CODES:  # su calco solo es error dentro de su contexto («siamo stato», «che è», «il mi»): se busca con la palabra anterior
                n = 2 if code.startswith("ERR_PRESENT_") or code == "ERR_CONGIUNTIVO_OPINION" else 1  # presente: pronombre + (non) + verbo; «che è successo» es válido tras «quello» (se mira también el verbo de opinión)
                before = re.search(r"((?:\S+\s+){0,%d}\S+)\s*$" % (n - 1), d["it"][:c.start])
                phrase = (before.group(0).strip() + " " if before else "").lower() + phrase
            if code in ("ERR_IMPERATIVO_FORMA", "ERR_IMPERATIVO_NEG"):  # «apre la» / «non parli» solo son error como mandato al comienzo de la frase; en medio son «él abre» / «tú no hablas»
                full = ("non " if code == "ERR_IMPERATIVO_NEG" else "") + phrase
                assert not re.search(r"(?:^|[.!?]\s)" + re.escape(full) + r"[^.!?]*!", corpus.lower()), (code, full)   # solo cuenta como mandato (con «!»): «corre più veloce di me.» es declarativo válido
                continue
            if code == "ERR_COMPARATIVE_DI":  # «che me» solo es calco tras «più/meno + adjetivo»; «prima che me lo scordi» es otra cosa
                phrase = r"(?:più|meno) \w+ " + re.escape(phrase)
            if c.kind == "omission":  # «tua idea» está dentro de «la tua idea»: solo cuenta si no lleva artículo antes
                bare = re.search(r"(?<!il )(?<!la )(?<!le )(?<!lo )(?<!i )(?<!gli )(?<!una )(?<!un )(?<!nel )(?<!del )(?<!al )(?<!dal )(?<!sul )(?<!col )(?<!più )(?<!è )(?<!sei )(?<!era )(?<!sono )" + re.escape(phrase), corpus.lower())  # «una mia amica», «nel nostro tè» y «non sei più mio amico» (uso predicativo) son correctos
                assert not bare, (code, phrase)
            else:
                pattern = phrase if code == "ERR_COMPARATIVE_DI" else re.escape(phrase)
                if code == "ERR_PERSONAL_A":  # «un messaggio a Tom» es un complemento indirecto correcto, no la «a» personal española
                    pattern = r"(?<!messaggio )(?<!scrivi )(?<!telefona )" + pattern
                assert not re.search(r"(?<!\w)" + pattern + r"(?!\w)", corpus.lower()), (code, phrase)
    assert hits > 0


@pytest.mark.parametrize("it", [
    "Lo sterminio reciproco sia il nostro destino.",
    "Era il suo dovere e lo fece.",
    "Non è la mia intenzione offenderti.",
])
def test_posesivo_tras_copula_no_genera_calco(it):
    # «è mio dovere», «sia nostro destino» son italiano válido (predicativo): quitar el artículo no es un error.
    assert find_calque("ERR_POSSESSIVE_ARTICLE", it) is None


@pytest.mark.parametrize("it", ["Tom è alto.", "Il piatto è delizioso.", "Mi piace l'altro libro."])
def test_contraccion_dentro_de_una_palabra_no_cuenta(it):
    # «al» en «alto», «del» en «delizioso» no son contracciones: el distractor sería basura («a ilto»).
    assert find_calque("ERR_PREP_ARTICLE_CONTRACTION", it) is None


def test_contraccion_ignora_palabras_que_empiezan_igual_y_encuentra_la_real():
    c = find_calque("ERR_PREP_ARTICLE_CONTRACTION", "Sono nella stanza con un altro amico.")
    assert c and c.correct == "nella" and c.wrong == "in la"


@pytest.mark.parametrize("it", ["Tom è sempre il mio amico.", "Lui è diventato il mio amico.", "Sembra il suo dovere."])
def test_posesivo_con_copula_cercana_no_genera_calco(it):
    # «è sempre mio amico», «è diventato mio amico»: el predicativo sin artículo es válido aunque la cópula no esté pegada.
    assert find_calque("ERR_POSSESSIVE_ARTICLE", it) is None
