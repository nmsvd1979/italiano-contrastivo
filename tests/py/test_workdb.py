import sqlite3

import pytest

from pipeline import workdb

TABLES = {"raw_sentences", "pairs", "candidates", "annotations", "tags"}


def test_connect_creates_all_tables():
    con = workdb.connect(":memory:")
    names = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert TABLES <= names


def test_pairs_rejects_unknown_kind():
    con = workdb.connect(":memory:")
    with pytest.raises(sqlite3.IntegrityError):
        con.execute("INSERT INTO pairs(ita_id, spa_id, kind) VALUES (1, 2, 'x')")


def test_connect_creates_parent_directory(tmp_path):
    db = tmp_path / "deep" / "dir" / "work.db"
    workdb.connect(db).close()
    assert db.exists()


def test_get_nlp_parses_sentence():
    from pipeline import nlp

    doc = nlp.get_nlp()("Sono andato a Roma.")
    andato = next(t for t in doc if t.text == "andato")
    assert andato.pos_ == "VERB"
    assert "Past" in andato.morph.get("Tense")


def test_get_nlp_missing_model_gives_clear_message():
    from pipeline import nlp

    with pytest.raises(nlp.ModelMissingError) as e:
        nlp.get_nlp("it_modelo_que_no_existe")
    assert "python -m spacy download it_modelo_que_no_existe" in str(e.value)
