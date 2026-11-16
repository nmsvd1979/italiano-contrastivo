import copy

import pytest

from pipeline import cefr, nlp

NLP = nlp.get_nlp()


def est(text, **kw):
    return cefr.estimate(NLP(text), **kw)


@pytest.mark.parametrize(
    "text,level",
    [
        ("Vedi il mio libro?", "A1"),
        ("Sono andato a Roma.", "A2"),
        ("Credo che Giovanni abbia ragione.", "B1"),
        ("Se avessi saputo la verità, non sarei venuto.", "B2"),
    ],
)
def test_canonical_level_per_band(text, level):
    assert est(text).level == level


def test_present_question_is_not_read_as_imperative():
    assert "imperativo" not in est("Vedi il mio libro?").features


def test_negative_imperative_is_a2():
    e = est("Non parlare!")
    assert e.level == "A2" and "imperativo" in e.features


@pytest.mark.parametrize(
    "text,feature,level",
    [
        ("Il libro è stato letto da tutti.", "passivo", "B1"),
        ("Gliele ho già date.", "pronomi_combinati", "B1"),
        ("Ne ho comprate due.", "ne_partitivo", "B1"),
        ("Sebbene sia stanco, continua a lavorare.", "concessiva_congiuntivo", "B2"),
        ("Avendo finito, uscì.", "gerundio_assoluto", "B2"),
        ("Vorrei un caffè.", "condizionale_presente", "A2"),
        ("Non sarei venuto.", "condizionale_passato", "B1"),
    ],
)
def test_feature_detected_with_level(text, feature, level):
    e = est(text)
    assert feature in e.features and e.level >= level


def test_confidence_high_with_two_features_at_final_level():
    e = est("Se avessi saputo la verità, non sarei venuto.")
    assert e.level == "B2" and e.confidence == 0.9
    assert {"congiuntivo_trapassato", "periodo_ipotetico_irreale"} <= set(e.features)


def test_confidence_medium_with_one_feature():
    e = est("Credo che Giovanni abbia ragione.")
    assert e.confidence == 0.6


def test_confidence_low_when_no_grammar_features():
    e = est("Vedi il mio libro?")
    assert e.confidence == 0.3


def test_short_passato_prossimo_floor_a2_and_not_high_confidence():
    e = est("Sono andato.")
    assert e.level >= "A2" and e.confidence <= 0.6


def test_length_bands():
    assert est("Mi piace molto vedere un bel film insieme a te.").level == "A2"            # 10 palabras
    assert est("Mi piace molto vedere un bel film insieme a te e ai miei amici.").level == "B1"  # 14
    assert est(" ".join(["Mi piace il gelato"] * 5)).level == "B1"   # 20 palabras sin rasgo gramatical: el largo solo llega a B1


def test_rare_vocab_raises_one_level():
    base = est("Vedi il mio libro?", zipf=lambda lemma: 6.0)
    rare = est("Vedi il mio libro?", zipf=lambda lemma: 2.0)
    assert base.level == "A1" and rare.level == "A2" and "rare_lexicon" in rare.features


def test_common_vocab_does_not_raise():
    assert est("Vedi il mio libro?", zipf=lambda lemma: 5.5).level == "A1"


def test_empty_doc_does_not_crash():
    e = cefr.estimate(NLP(""))
    assert e.level == "A1" and e.confidence == 0.3 and e.features == []


def test_punctuation_only_does_not_crash():
    assert cefr.estimate(NLP("...")).confidence == 0.3


def test_thresholds_come_from_yaml_not_code():
    rules = copy.deepcopy(cefr.load_rules())
    rules["features"]["passato_prossimo"] = "B1"
    assert est("Sono andato a Roma.", rules=rules).level == "B1"


@pytest.mark.parametrize("text", ["Sto mangiando del riso.", "Io non comprendo questa parola.", "Voi vi stavate divertendo, vero?"])
def test_progressive_and_endo_present_are_not_absolute_gerund(text):
    assert "gerundio_assoluto" not in est(text).features


def test_absolute_gerund_is_detected():
    e = est("Camminando per strada, ho visto Maria.")
    assert "gerundio_assoluto" in e.features and e.level == "B2"


@pytest.mark.parametrize("text", ["Parlerò con lui domani.", "Ero stanco.", "Non cambierà niente.", "Lui dormiva tutto il giorno."])
def test_future_and_imperfect_are_a2_not_a1(text):
    assert est(text).level >= "A2", est(text)


def test_trapassato_prossimo_is_detected_at_b1():
    e = est("Avevo già mangiato.")
    assert "trapassato_prossimo" in e.features and e.level == "B1"


def test_length_alone_never_makes_b2_but_length_plus_b1_grammar_does():
    simple = "Ho pianto come un bambino quando il ragazzo e il suo cane si sono riuniti alla fine del film."  # A2 + largo
    assert est(simple).level == "B1"
    hard = "Credo che Giovanni abbia ragione quando dice che il nostro vecchio amico non verrà mai alla festa di domani."
    assert est(hard).level == "B2"


@pytest.mark.parametrize("text", ["Non viziare tuo figlio.", "Non pensarci due volte, Tom.", "Non mostrare le tue emozioni."])
def test_negative_imperative_without_exclamation_is_a2(text):
    e = est(text)
    assert "imperativo" in e.features and e.level == "A2"


def test_non_plus_modal_infinitive_is_not_an_imperative():
    assert "imperativo" not in est("Non voglio parlare.").features
