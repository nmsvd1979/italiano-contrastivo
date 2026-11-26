import json
from pathlib import Path

import pytest

from pipeline import config
from pipeline.db import store
from pipeline.exercises import capsules
from pipeline.exercises.calques import CALQUE_CODES

CODE = "ERR_TENERE_AVERE"
CAT = {"code": CODE, "category": "L1_SINTACTIC_CALQUE", "cefr_min": "A1", "explanation_es": "En italiano la necesidad se dice con avere."}


def sent(i, it, es, codes=(CODE,), kind="direct"):
    return {"id": f"s_{i}", "source": "tatoeba", "source_id": str(i), "license": "CC BY 2.0 FR", "author": "a", "es_author": "b",
            "es_source_id": str(i + 1), "it": it, "es": es, "cefr_estimate": "A1", "review_status": "validated",
            "translation_kind": kind, "error_codes": list(codes)}


S1 = sent(1, "Anna ha sonno oggi.", "Anna tiene sueño hoy.")
S2 = sent(2, "Io ho fame adesso.", "Yo tengo hambre ahora.")
S3 = sent(3, "Noi abbiamo freddo qui.", "Nosotros tenemos frío aquí.")
NOPATTERN = sent(4, "Mi piace molto la pizza.", "Me gusta mucho la pizza.")
UNTAGGED = sent(5, "Lui ha sete ora.", "Él tiene sed ahora.", codes=())


def test_curriculum_order_nivel_y_luego_categoria():
    codes = [
        {"code": "B", "cefr_min": "A2", "category": "PHONETIC"},
        {"code": "A", "cefr_min": "A1", "category": "L1_SINTACTIC_CALQUE"},
        {"code": "C", "cefr_min": "A1", "category": "PHONETIC"},
        {"code": "D", "cefr_min": "A1", "category": "ORTHOGRAPHIC"},
        {"code": "E", "cefr_min": "A1", "category": "ORTHOGRAPHIC"},
    ]
    assert capsules.curriculum_order(codes) == ["C", "D", "E", "A", "B"]


def test_capsula_con_dos_oraciones_utilizables_es_none():
    assert capsules.build_capsule(CAT, [S1, S2]) is None


def test_oracion_sin_patron_o_sin_etiqueta_no_cuenta():
    assert capsules.build_capsule(CAT, [S1, S2, NOPATTERN]) is None
    assert capsules.build_capsule(CAT, [S1, S2, UNTAGGED]) is None


def test_capsula_valida_contra_el_esquema():
    cap = capsules.build_capsule(CAT, [S3, S1, S2])  # el orden de entrada no importa
    assert cap and not list(store.validator("capsules").iter_errors(cap))
    assert cap["id"] == "cap_err_tenere_avere" and cap["cefr"] == "A1" and cap["target_error_codes"] == [CODE]
    assert cap["trigger"]["type"] == "translate_es_it" and cap["trigger"]["sentence_id"] == "s_2"
    assert 4 <= len(cap["retrieval"]) <= 6
    assert all(i["sentence_id"] != "s_2" for i in cap["retrieval"])
    assert cap["explanation"]["text_es"] == CAT["explanation_es"]
    assert 180 <= cap["estimated_seconds"] <= 300 and cap["review_status"] == "validated"
    assert capsules.build_capsule(CAT, [S1, S2, S3]) == cap


@pytest.fixture(scope="module")
def pack(tmp_path_factory):
    out = tmp_path_factory.mktemp("pack")
    manifest = capsules.build_pack(config.ROOT / "content", out)
    return out, manifest


def test_pack_escribe_los_archivos_y_excluye_pivote(pack):
    out, manifest = pack
    for f in ("capsules.json", "lexemes.json", "sentences.json", "manifest.json", "ATTRIBUZIONI-tatoeba.md", *manifest["item_files"].values()):
        assert (out / f).exists(), f
    assert not (out / "items_by_code.json").exists()   # los ejercicios van en un archivo por nivel
    sents = json.loads((out / "sentences.json").read_text(encoding="utf8"))
    assert all(s["translation_kind"] != "pivot" for s in sents)
    assert all(s.get("author") and s.get("license") for s in sents)
    caps = json.loads((out / "capsules.json").read_text(encoding="utf8"))
    assert [c["id"] for c in caps] == manifest["capsules"]
    assert all(not list(store.validator("capsules").iter_errors(c)) for c in caps)


def test_manifest_explica_cada_codigo_omitido(pack):
    _, manifest = pack
    assert set(manifest["codes"]) == set(CALQUE_CODES)
    for code, info in manifest["codes"].items():
        assert info["capsule"] == (f"cap_{code.lower()}" in manifest["capsules"])
        if not info["capsule"]:
            assert info["reason"]
    assert "reviewers" in manifest and "levels" in manifest


def test_pack_es_determinista(pack, tmp_path):
    out, _ = pack
    capsules.build_pack(config.ROOT / "content", tmp_path)
    for f in out.iterdir():
        assert (tmp_path / f.name).read_bytes() == f.read_bytes(), f.name


def test_lexemes_son_falsos_amigos_de_la_fuente(pack):
    out, _ = pack
    lex = json.loads((out / "lexemes.json").read_text(encoding="utf8"))
    assert lex and all(x["lexical_type"] == "false_friend" and x["form"] and x["gloss_es"] and x["source"] for x in lex)
    assert {x["id"] for x in lex} == {f"lx_{x['form']}" for x in lex}


def test_la_recuperacion_mezcla_tipos_de_ejercicio():
    many = [S1, S2, S3, sent(6, "Marco ha paura sempre.", "Marco tiene miedo siempre."), sent(7, "Loro hanno fretta oggi.", "Ellos tienen prisa hoy."),
            sent(8, "Voi avete ragione qui.", "Vosotros tenéis razón aquí.")]
    cap = capsules.build_capsule(CAT, many)
    assert {i["type"] for i in cap["retrieval"]} == {"choice_l1_distractor", "cloze", "reorder"}


def test_el_trigger_es_la_oracion_mas_facil():
    easy = sent(9, "Ho fame.", "Tengo hambre.")
    hard = sent(0, "Lui sostiene da molti anni che ho ragione su tutto.", "Él sostiene desde hace años que tengo razón.")
    hard["cefr_estimate"] = "A2"
    cap = capsules.build_capsule(CAT, [hard, S1, S2, easy])
    assert cap["trigger"]["sentence_id"] == "s_9"


def test_oraciones_casi_duplicadas_se_cuentan_una_vez():
    dup = sent(9, "Io ho fame adesso?", "¿Yo tengo hambre ahora?")
    assert [x["id"] for x in capsules.usable_sentences(CODE, [S2, dup])] == ["s_2"]
    assert capsules.build_capsule(CAT, [S1, S2, dup]) is None  # solo 2 distintas


def test_el_paquete_lleva_el_id_de_audio_de_cada_texto(pack):
    from pipeline.tts.ids import clip_id

    out, _ = pack
    for name, field in (("sentences.json", "it"), ("lexemes.json", "form")):
        rows = json.loads((out / name).read_text(encoding="utf8"))
        assert rows and all(r["audio"] == clip_id(r[field]) for r in rows), name


def test_los_ejercicios_se_reparten_por_nivel_de_la_unidad_o_del_codigo():
    from pipeline.exercises.capsules import split_items_by_level
    course = {"units": [{"codes": ["ERR_A"], "level": "A1"}, {"codes": ["ERR_B"], "level": "A1+"}, {"codes": ["ERR_C"], "level": "A2"}]}
    catalog = {c: {"cefr_min": m} for c, m in (("ERR_A", "A1"), ("ERR_B", "A1"), ("ERR_C", "A2"), ("ERR_D", "B1"), ("ERR_E", "C1"))}
    items = {"ERR_A": [1], "ERR_B": [2], "ERR_C": [3], "ERR_D": [4], "ERR_E": [5]}   # D no está en ninguna unidad: manda su cefr_min; E tiene un nivel desconocido
    out = split_items_by_level(items, course, catalog)
    assert out == {"A1": {"ERR_A": [1], "ERR_B": [2], "ERR_E": [5]}, "A2": {"ERR_C": [3]}, "B1": {"ERR_D": [4]}}
    assert sum(len(v) for v in out.values()) == len(items)   # ningún código se pierde ni se repite
