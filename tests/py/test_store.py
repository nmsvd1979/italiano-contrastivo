import json
import sqlite3
from pathlib import Path

import pytest
from jsonschema import ValidationError

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from pipeline.db import store

ROOT = Path(__file__).resolve().parents[2]
load = lambda p: json.loads((ROOT / p).read_text())


@pytest.fixture
def con():
    c = store.connect()
    for d in load("schemas/data/error-codes.json"):
        store.upsert(c, "error_codes", d)
    for d in load("fixtures/lexemes.json"):
        store.upsert(c, "lexemes", d)
    for d in load("fixtures/sentences.json"):
        store.upsert(c, "sentences", d)
    store.upsert(c, "capsules", load("fixtures/capsule-a2-aux-essere.json"))
    return c


@pytest.mark.parametrize("table,path", [
    ("error_codes", "schemas/data/error-codes.json"),
    ("lexemes", "fixtures/lexemes.json"),
    ("sentences", "fixtures/sentences.json"),
])
def test_ida_y_vuelta_sin_perdida(con, table, path):
    src = sorted(load(path), key=lambda d: json.dumps(d, sort_keys=True))
    out = sorted(store.export(con, table, ("needs_review",)), key=lambda d: json.dumps(d, sort_keys=True))
    assert out == src


def test_capsula_ida_y_vuelta(con):
    assert store.export(con, "capsules", ("needs_review",)) == [load("fixtures/capsule-a2-aux-essere.json")]


def test_solo_lo_validado_sale_por_defecto(con):
    for t in ("error_codes", "lexemes", "sentences", "capsules"):
        assert store.export(con, t) == []
    con.execute("UPDATE lexemes SET review_status='validated', body=json_set(body,'$.review_status','validated') WHERE id='lx_burro'")
    assert [d["id"] for d in store.export(con, "lexemes")] == ["lx_burro"]


def test_relaciones_de_oraciones(con):
    rows = con.execute("SELECT code FROM sentence_error_codes WHERE sentence_id='s_3860754' ORDER BY 1").fetchall()
    assert [r[0] for r in rows] == ["ERR_GEMINATE", "ERR_POSSESSIVE_ARTICLE"]


def test_rechaza_documento_invalido(con):
    bad = load("fixtures/sentences.json")[0] | {"source_id": None}
    bad.pop("source_id")
    with pytest.raises(ValidationError):
        store.upsert(con, "sentences", bad)


def test_la_base_exige_atribucion_aunque_se_salte_el_schema(con):
    with pytest.raises(sqlite3.IntegrityError):
        con.execute("INSERT INTO sentences VALUES ('x','tatoeba',NULL,NULL,NULL,'A1','draft','{}')")


def test_codigo_de_error_inexistente_no_entra_en_relacion(con):
    with pytest.raises(sqlite3.IntegrityError):
        con.execute("INSERT INTO sentence_error_codes VALUES ('s_719442','ERR_NOPE')")


def test_modelos_pydantic_aceptan_los_fixtures():
    from pipeline.models.lexeme_schema import Lexeme
    from pipeline.models.sentence_schema import Sentence
    for d in load("fixtures/lexemes.json"):
        Lexeme.model_validate(d)
    for d in load("fixtures/sentences.json"):
        Sentence.model_validate(d)
