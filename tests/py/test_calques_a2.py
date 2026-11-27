"""Generadores de calques de A2. Tres cosas: (1) cada generador produce el error esperado, (2) NUNCA marca como error una forma válida del
italiano (las listas negras de la revisión 2026-11-26) y (3) lo erróneo de las formas inventadas no es una palabra real (frecuencia cero en italiano)."""
import re

import pytest
from wordfreq import zipf_frequency

from pipeline.exercises import calques_a2 as a2
from pipeline.exercises.calques import find_calque

# (código, frase correcta, tramo correcto esperado, versión errónea esperada)
POSITIVOS = [
    ("ERR_PP_PARTICIPI_IRREG", "Ho preso il treno delle otto.", "preso", "prenduto"),
    ("ERR_PP_PARTICIPI_IRREG", "Abbiamo già chiuso la porta.", "chiuso", "chiudito"),
    ("ERR_PP_PARTICIPI_IRREG", "Hai letto questo libro?", "letto", "leggiuto"),
    ("ERR_PP_PARTICIPI_IRREG", "Maria è rimasta a casa.", "rimasta", "rimanuta"),
    ("ERR_PP_AUSILIARE", "Sono stato a Roma ieri.", "Sono stato", "Ho stato"),
    ("ERR_PP_AUSILIARE", "Mi è piaciuta la pizza.", "è piaciuta", "ha piaciuto"),
    ("ERR_PP_AUSILIARE", "Siamo rimasti a casa.", "Siamo rimasti", "Abbiamo rimasto"),
    ("ERR_PP_AUSILIARE", "Loro sono stati bravi.", "sono stati", "hanno stato"),
    ("ERR_PP_AUSILIARE", "Ho camminato per due ore.", "Ho camminato", "Sono camminato"),
    ("ERR_PP_AUSILIARE", "Abbiamo viaggiato in treno.", "Abbiamo viaggiato", "Siamo viaggiato"),
    ("ERR_REFLEXIVE_AUX", "Mi sono alzato presto.", "Mi sono", "Mi ho"),
    ("ERR_REFLEXIVE_AUX", "Ci siamo divertiti molto.", "Ci siamo", "Ci abbiamo"),
    ("ERR_REFLEXIVE_AUX", "Si è svegliata tardi.", "Si è", "Si ha"),
    ("ERR_PARTICIPLE_AGREEMENT", "Maria è andata a casa.", "andata", "andato"),
    ("ERR_PARTICIPLE_AGREEMENT", "Le ragazze sono arrivate tardi.", "arrivate", "arrivato"),
    ("ERR_PARTICIPLE_AGREEMENT", "Mi sono piaciuti i film.", "sono piaciuti", "è piaciuto"),
    ("ERR_IMPERFETTO_FORMA", "Da piccolo io giocavo molto.", "giocavo", "giocava"),
    ("ERR_IMPERFETTO_FORMA", "Io ero molto timido.", "ero", "era"),
    ("ERR_IMPERFETTO_FORMA", "Ieri parlavamo di calcio.", "parlavamo", "parlabamo"),
    ("ERR_CE_IMPERFETTO", "C'era una casa vicino al mare.", "era", "erano"),
    ("ERR_CE_IMPERFETTO", "C'erano molte persone in piazza.", "erano", "era"),
    ("ERR_TEMPO_FA_DA", "Sono arrivato due ore fa.", "due ore fa", "fa due ore"),
    ("ERR_TEMPO_FA_DA", "Ho studiato un anno fa.", "un anno fa", "fa un anno"),
    ("ERR_CLITIC_DIRECT_INDIRECT", "Gli telefono domani.", "Gli", "Lo"),
    ("ERR_CLITIC_DIRECT_INDIRECT", "Lo ringrazio molto.", "Lo", "Gli"),
    ("ERR_CLITIC_DIRECT_INDIRECT", "Li vedo ogni giorno.", "Li", "Gli"),
    ("ERR_PERSONAL_A", "Ho visto Maria al bar.", "Maria", "a Maria"),
    ("ERR_PERSONAL_A", "Ho conosciuto Marco ieri.", "Marco", "a Marco"),
    ("ERR_CLITICO_POSIZIONE", "Posso farlo domani.", "farlo", "farelo"),
    ("ERR_CLITICO_POSIZIONE", "Devo vederla stasera.", "vederla", "vederela"),
    ("ERR_PARTICIPLE_AGREEMENT_CLITIC", "Li ho comprati ieri.", "comprati", "comprato"),
    ("ERR_PARTICIPLE_AGREEMENT_CLITIC", "Le ho mangiate tutte.", "mangiate", "mangiato"),
    ("ERR_COMPARATIVO_IRREG", "Sei la mia migliore amica.", "migliore", "meglio"),
    ("ERR_COMPARATIVO_IRREG", "Mia sorella parla meglio di me.", "meglio", "migliore"),
    ("ERR_COMPARATIVO_IRREG", "Sto meglio oggi.", "meglio", "migliore"),             # «sto meglio» es válido: el error es *sto migliore
    ("ERR_COMPARATIVO_IRREG", "Questa casa è bellissima.", "iss", "is"),
    ("ERR_INDEFINITI", "Ho qualche libro nuovo.", "libro", "libri"),
    ("ERR_INDEFINITI", "Vorrei qualcosa di dolce.", "di ", ""),
    ("ERR_INDEFINITI", "Non c'è nessun problema.", "nessun", "nessuno"),
    ("ERR_RELATIVO_CHE", "Quello che dici è vero.", "Quello", "Lo"),
    ("ERR_RELATIVO_CHE", "Non capisco ciò che dici.", "ciò", "lo"),
    ("ERR_FUTURO_RADICE", "Domani parlerò con lui.", "parlerò", "parlarò"),
    ("ERR_FUTURO_RADICE", "Andrò a Roma in estate.", "Andrò", "Anderò"),
    ("ERR_FUTURO_RADICE", "Verrò alle otto.", "Verrò", "Venirò"),
    ("ERR_FUTURO_RADICE", "Potrei aiutarti domani.", "Potrei", "Poterei"),
    ("ERR_PREP_FIXED_GOV", "Ho smesso di fumare.", "di", "a"),
    ("ERR_PREP_FIXED_GOV", "Penso a te ogni giorno.", "a", "in"),
    ("ERR_PREP_FIXED_GOV", "Penso a questo.", "a", "in"),                         # «penso a questo» es válido (lo que falta es el ci); el error es *in questo
    ("ERR_PREP_FIXED_GOV", "Dipende da te.", "da", "di"),
    ("ERR_IMPERATIVO_PRONOMI", "Dammi il libro!", "Dammi", "Dami"),
    ("ERR_IMPERATIVO_PRONOMI", "Fallo subito.", "Fallo", "Falo"),
    ("ERR_IMPERATIVO_LEI", "Scusi, signore, dov'è la posta?", "Scusi", "Scusa"),
    ("ERR_IMPERATIVO_LEI", "Aspetti, signora, il bus è in ritardo.", "Aspetti", "Aspetta"),   # (la frase «Scusi, signora, dov'è la stazione?» ahora es una variante a mano de a2m08)
    ("ERR_ACCENT_TRANSFER", "Non vengo perché sono stanco.", "perché", "perchè"),
    ("ERR_ACCENT_TRANSFER", "Questa città è bella.", "città", "citta"),
    ("ERR_OPINIONE", "Secondo me è giusto.", "Secondo me", "Secondo io"),
    ("ERR_OPINIONE", "Sono d'accordo con voi.", "d'accordo", "di accordo"),
    ("ERR_SUBORDINATE", "Studio perché voglio imparare.", "perché", "per che"),
    ("ERR_SPAZIO_PREP", "La banca è di fronte a la stazione.", "a", "di"),
    ("ERR_SPAZIO_PREP", "Abito accanto a mia sorella.", "a", "di"),
    ("ERR_SPAZIO_PREP", "Il bar è di fianco a casa mia.", "a", "di"),
    ("ERR_SPAZIO_PREP", "C'è un albero in mezzo a la piazza.", "a", "di"),
    ("ERR_DATE_ORARI", "Abito al terzo piano.", "al", "nel"),
    ("ERR_DATE_ORARI", "Sono nato nel 1990.", "nel 1990", "in 1990"),
    ("ERR_SI_IMPERSONALE", "Qui si parla italiano.", "si", "se"),
    ("ERR_SI_IMPERSONALE", "Si può entrare?", "Si", "Se"),
]


@pytest.mark.parametrize("code,it,correct,wrong", POSITIVOS)
def test_el_generador_produce_el_error_esperado(code, it, correct, wrong):
    c = find_calque(code, it)
    assert c is not None, f"{code}: {it}"
    assert (it[c.start:c.end], c.wrong) == (correct, wrong)
    assert c.code == code and not c.manual
    assert it[:c.start] + c.wrong + it[c.end:] != it


# Formas VÁLIDAS del italiano que ningún generador puede marcar como error (revisión adversarial, plan §5.6)
VALIDAS = [
    ("ERR_PP_AUSILIARE", "Il film ha successo."),              # avere successo = tener éxito
    ("ERR_PP_AUSILIARE", "Sono corso a casa."),                 # correre con meta
    ("ERR_PP_AUSILIARE", "Ho corso per un'ora."),
    ("ERR_PP_AUSILIARE", "Ha costato dieci euro."),             # costare/bastare con avere: válido o ambiguo
    ("ERR_PP_AUSILIARE", "Ha piovuto tutto il giorno."),        # piovere admite los dos
    ("ERR_PP_AUSILIARE", "Ho finito il lavoro."),               # doble auxiliar
    ("ERR_PP_PARTICIPI_IRREG", "Ho veduto il film."),           # veduto es válido
    ("ERR_PP_PARTICIPI_IRREG", "Ho perduto le chiavi."),        # perduto es válido
    ("ERR_PP_PARTICIPI_IRREG", "Ho un letto grande."),          # «letto» sustantivo
    ("ERR_CLITICO_POSIZIONE", "Lo posso fare domani."),         # las dos posiciones valen
    ("ERR_CLITICO_POSIZIONE", "Non lo fare più."),
    ("ERR_FUTURO_RADICE", "Quando arrivi ti chiamo."),          # presente de «tu», válido
    ("ERR_FUTURO_RADICE", "Vorrei un caffè."),                  # volerei sería válido (de volare)
    ("ERR_FUTURO_RADICE", "Vado a mangiare a casa."),           # ir a + infinitivo con movimiento
    ("ERR_FUTURO_RADICE", "Se pioverà resto a casa."),
    ("ERR_COMPARATIVO_IRREG", "Questa torta è più buona."),     # più buono es válido
    ("ERR_OPINIONE", "Dopo mangiato esco."),                    # coloquial válido
    ("ERR_SI_IMPERSONALE", "Se può, venga domani."),            # «se può» condicional
    ("ERR_INDEFINITI", "Ogni giorno studio un'ora."),           # ogni + singular
    ("ERR_RELATIVO_CHE", "Che cosa fai?"),
    ("ERR_IMPERFETTO_FORMA", "Lui diceva sempre la verità."),   # diceva = 3.ª persona válida
    ("ERR_IMPERFETTO_FORMA", "Io bevo un caffè."),              # bevo es presente
    ("ERR_REFLEXIVE_AUX", "Mi sono dovuto alzare presto."),     # modal + reflexivo: dos formas válidas
    ("ERR_TEMPO_FA_DA", "Ho studiato per due anni."),           # per + pasado cerrado
    ("ERR_TEMPO_FA_DA", "Che cosa fa tuo padre?"),
]


@pytest.mark.parametrize("code,it", VALIDAS)
def test_nunca_marca_como_error_una_forma_valida(code, it):
    assert find_calque(code, it) is None, f"{code} marcó algo en una frase válida: {it}"


INVENTADAS = ("ERR_PP_PARTICIPI_IRREG", "ERR_IMPERFETTO_FORMA", "ERR_FUTURO_RADICE", "ERR_CLITICO_POSIZIONE")   # dami, falo… existen como palabras sueltas pero no como imperativo
# formas que en esos códigos SÍ son palabras (era/giocava del caso «io + 3.ª persona»: el error está en la concordancia, no en la palabra)
PALABRAS_REALES = {"giocava", "era"}


@pytest.mark.parametrize("code,it,correct,wrong", [p for p in POSITIVOS if p[0] in INVENTADAS])
def test_lo_erroneo_de_las_formas_inventadas_no_es_una_palabra_real(code, it, correct, wrong):
    for tok in re.findall(r"\w+", wrong.lower()):
        if tok not in PALABRAS_REALES:
            assert zipf_frequency(tok, "it") == 0, f"{wrong!r} ({code}): «{tok}» existe en italiano"


def test_las_listas_cerradas_no_incluyen_formas_prohibidas():
    assert "veduto" not in a2.PART_IRREG.values() and "perduto" not in a2.PART_IRREG.values()
    assert "volere" not in a2.IRREG_STEMS and "vorr" not in a2.IRREG_STEMS            # volerò/volerei serían válidos (de volare)
    prohibidos = {"corr", "sal", "scend", "cambi", "fin", "cominci", "piov", "viv"}
    assert not prohibidos & set(re.findall(r"[a-z]+", a2._AVERE_PP.pattern))
    assert "costat" not in a2._ESSERE_PP.pattern and "bastat" not in a2._ESSERE_PP.pattern and "mancat" not in a2._ESSERE_PP.pattern
    assert all(wrong != correct for correct, wrong in a2.IMP_PRON.items())


def test_scusi_solo_no_es_error_de_registro():
    """«Scusa il ritardo» es válido entre tú: sin vocativo formal el generador no marca nada (revisión de precisión 2026-11-26)."""
    from pipeline.exercises.calques import find_calque
    assert find_calque("ERR_IMPERATIVO_LEI", "Scusi il ritardo.") is None
    assert find_calque("ERR_IMPERATIVO_LEI", "Scusi, dov'è il bar?") is None


def test_si_deve_no_es_si_impersonal():
    from pipeline.exercises.calques import find_calque
    assert find_calque("ERR_SI_IMPERSONALE", "Si deve fermare.") is None
