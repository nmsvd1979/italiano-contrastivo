import re

import pytest
from jsonschema import Draft202012Validator

from pipeline.db import store
from pipeline.exercises.calques import find_calque
from pipeline.exercises.items import build_choice, build_cloze, build_reorder, build_translate, item_id

ITEM = Draft202012Validator({"$ref": "https://italiano-contrastivo/schemas/item.schema.json"}, registry=store._REG)


def sent(i, it, es, kind="direct"):
    return {"id": f"s_{i}", "source": "tatoeba", "source_id": str(i), "license": "CC BY 2.0 FR", "author": "a", "it": it, "es": es,
            "cefr_estimate": "A2", "review_status": "validated", "translation_kind": kind}


TENERE = sent(1, "Vedrai che ho ragione.", "Verás que tengo razón.")
PLACE = sent(2, "Domani vado a Parigi.", "Mañana voy a París.")
PERSONAL = sent(3, "Io cerco Maria.", "Yo busco a María.")
POSS = sent(4, "Mi è piaciuta la tua idea e l'ho adottata.", "Me gustó tu idea y la adopté.")


def calque(code, s):
    c = find_calque(code, s["it"])
    assert c
    return c


def test_choice_valida_y_tiene_una_sola_correcta():
    it = build_choice(TENERE, calque("ERR_TENERE_AVERE", TENERE), seed=1)
    assert not list(ITEM.iter_errors(it))
    assert it["type"] == "choice_l1_distractor" and it["target_error_codes"] == ["ERR_TENERE_AVERE"] and it["sentence_id"] == "s_1"
    good = [o for o in it["options"] if o["correct"]]
    bad = [o for o in it["options"] if not o["correct"]]
    assert [o["text"] for o in good] == ["Vedrai che ho ragione."]
    assert [(o["text"], o["error_code"], o["distractor_kind"]) for o in bad] == [("Vedrai che tengo ragione.", "ERR_TENERE_AVERE", "l1_calque")]
    assert it["review_status"] == "validated" and it["requires_server"] is False


def test_choice_es_determinista_y_el_orden_depende_de_la_semilla():
    c = calque("ERR_TENERE_AVERE", TENERE)
    assert build_choice(TENERE, c, 1) == build_choice(TENERE, c, 1)
    assert [o["correct"] for o in build_choice(TENERE, c, 0)["options"]] != [o["correct"] for o in build_choice(TENERE, c, 1)["options"]]


def test_cloze_tiene_un_solo_hueco_y_la_pista_no_contiene_la_respuesta():
    for s, code in ((TENERE, "ERR_TENERE_AVERE"), (PLACE, "ERR_PREP_PLACE"), (POSS, "ERR_POSSESSIVE_ARTICLE")):
        it = build_cloze(s, calque(code, s))
        assert not list(ITEM.iter_errors(it))
        assert it["text"].count("___") == 1
        assert it["text"].replace("___", it["answers"][0]) == s["it"]
        for a in it["answers"]:
            if len(a) >= 3:
                assert not re.search(rf"(?<!\w){re.escape(a)}(?!\w)", it["hint_es"], re.I)


def test_cloze_none_si_el_calco_solo_agrega_texto():
    assert build_cloze(PERSONAL, calque("ERR_PERSONAL_A", PERSONAL)) is None


def test_reorder_baraja_distinto_y_con_el_mismo_conjunto():
    it = build_reorder(TENERE, seed=3, code="ERR_TENERE_AVERE")
    assert not list(ITEM.iter_errors(it))
    assert it["answer"] == ["Vedrai", "che", "ho", "ragione."]
    assert it["tokens"] != it["answer"] and sorted(it["tokens"]) == sorted(it["answer"])
    assert build_reorder(TENERE, seed=3, code="ERR_TENERE_AVERE") == it


def test_reorder_none_con_menos_de_3_o_mas_de_9_palabras():
    assert build_reorder(sent(5, "Ciao Marco.", "Hola Marco."), 1) is None
    assert build_reorder(sent(6, "Una due tre quattro cinque sei sette otto nove dieci.", "x"), 1) is None


def test_translate_valida_y_acepta_la_oracion_original():
    it = build_translate(PLACE, code="ERR_PREP_PLACE")
    assert not list(ITEM.iter_errors(it))
    assert it["source_es"] == PLACE["es"] and it["accepted_it"] == [PLACE["it"]] and it["requires_server"] is False


def test_item_id_estable():
    assert item_id("choice", "s_1", "ERR_X") == "it_choice_s_1_ERR_X"
