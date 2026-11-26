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
    from pipeline.exercises import vocab
    syl = json.loads((ROOT / "schemas/data/syllabus-a2.json").read_text(encoding="utf8"))   # los códigos de A2 que no están en el catálogo salen del plan de cápsulas
    a2_nuevos = {c["code"] for m in syl["modulos_planificados"] for c in m["capsulas"] if not c["code"].startswith("ERR_VOC_")} - catalog
    assert {t["code"] for t in topics} == set(present.PRESENT_CODES) | set(vocab.VOCAB_CODES) | {"ERR_PIACERE_ACCORDO", "ERR_GENERE_ES", "ERR_INDEFINITE_ARTICLE", "ERR_RIFLESSIVO_PRONOME", "ERR_PARTICIPIO_ES", "ERR_ORA_ES", "ERR_CHIAMARSI", "ERR_PRONOME_TONICO", "ERR_IMPERATIVO_FORMA", "ERR_GN_Z_SPELLING", "ERR_CONSONANTE_DOPPIA", "ERR_PLURAL_FORMA", "ERR_IMPERATIVO_NEG", "ERR_STARE_GERUNDIO", "ERR_CLITICO_MI_TI"} | a2_nuevos
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


def test_vocabulario_consistente():
    from pipeline.exercises import vocab
    topics = json.loads((ROOT / "schemas/data/topic-codes.json").read_text(encoding="utf8"))
    codes = {t["code"] for t in topics}
    assert set(vocab.VOCAB_CODES) <= codes
    seen: dict[str, str] = {}
    for code, entries in vocab.topics().items():
        forms = [e.form for e in entries]
        assert len(forms) == len(set(forms)), code
        for e in entries:
            assert e.gender in "mf-" and e.num in "sp-" and e.gloss.strip(), e
            assert seen.setdefault(e.form, code) == code, f"{e.form} está en dos temas"
        glosses = [e.gloss for e in entries]
        assert len(glosses) == len(set(glosses)), f"glosas repetidas en {code}"


def test_vocabulario_solo_con_una_palabra_y_con_el_mismo_articulo():
    from pipeline.exercises import vocab
    assert vocab.find_vocab("ERR_VOC_FAMILIA", "L'amico di mio padre è qui.") is None  # dos palabras del tema
    start, end, word, repl, gloss, others = vocab.find_vocab("ERR_VOC_FAMILIA", "Mia madre è brava.")
    assert (word, gloss) == ("madre", "la madre")
    ents = {e.form: e for e in vocab.topics()["ERR_VOC_FAMILIA"]}
    assert (ents[repl].gender, ents[repl].num) == ("f", "s") and vocab.art_class(ents[repl]) == vocab.art_class(ents["madre"])
    assert gloss not in others and len(set(others)) == 2
    # clase de artículo: «lo zio» y «lo studente» comparten artículo; «il padre» no
    assert vocab.art_class(ents["zio"]) == "S" and vocab.art_class(ents["padre"]) == "C" and vocab.art_class(ents["uomo"]) == "V"
    assert vocab.find_vocab("ERR_VOC_FAMILIA", "Zio Tom è qui.") is None  # «zio» es la única con «lo»: sin sustituta con el mismo artículo no se genera
