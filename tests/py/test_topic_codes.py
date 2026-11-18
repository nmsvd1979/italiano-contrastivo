import json
from pathlib import Path

import jsonschema

from pipeline.db.store import _REG
from pipeline.exercises import present

ROOT = Path(__file__).resolve().parents[2]


def test_topic_codes_cumplen_el_esquema_y_no_pisan_el_catalogo():
    topics = json.loads((ROOT / "schemas/data/topic-codes.json").read_text(encoding="utf8"))
    catalog = {c["code"] for c in json.loads((ROOT / "schemas/data/error-codes.json").read_text(encoding="utf8"))}
    schema = json.loads((ROOT / "schemas/error-code.schema.json").read_text(encoding="utf8"))
    v = jsonschema.Draft202012Validator(schema, registry=_REG)
    for t in topics:
        v.validate(t)
    assert {t["code"] for t in topics} == set(present.PRESENT_CODES)
    assert not catalog & {t["code"] for t in topics}


def test_tablas_de_presente_son_consistentes():
    for forms in present.FORMS.values():
        for f in forms:
            assert len(f.forms) == 6 and f.forms[f.person]
    # toda forma «calcada del español» sin ser italiano válido: no coincide con ninguna forma italiana de ese verbo
    for lemma_forms in present.FORMS.values():
        for f in lemma_forms:
            if f.spanish and f.spanish[f.person] != f.forms[f.person]:
                assert f.spanish[f.person] not in f.forms
    assert present.IRREGULAR["essere"] == ("sono", "sei", "è", "siamo", "siete", "sono")
    assert present.IRREGULAR["avere"][0] == "ho" and present.IRREGULAR["avere"][5] == "hanno"


def test_error_nunca_coincide_con_lo_correcto():
    for forms in present.FORMS.values():
        for f in forms:
            w = present.wrong_form(f)
            assert w is None or w != f.forms[f.person]


def test_sonidos_nunca_ofrecen_una_palabra_real_como_error():
    from pipeline.exercises import phonetics
    for code in phonetics.RULES:
        for it in ["Ho giocato a ghiaccio ieri.", "La chiave è sulla scrivania.", "Lui è un grande scienziato.", "Questo non è mio figlio.",
                   "Non mi piace uscire quando piove.", "Il pesce esce dalla scena.", "Quattro famiglie sono morte."]:
            hit = phonetics.find_phonetic(code, it)
            if hit:
                assert not phonetics.is_word(hit[3]), hit
