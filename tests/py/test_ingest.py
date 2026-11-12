import pytest

from pipeline import config, ingest, workdb


def write_raw(d, ita, spa, links):
    d.mkdir(parents=True, exist_ok=True)
    row = lambda i, lang, text: f"{i}\t{lang}\t{text}\tautor\t2020-01-01 00:00:00\t\\N\n"
    (d / "ita_sentences_detailed.tsv").write_text("".join(row(i, "ita", t) for i, t in ita), encoding="utf8")
    (d / "spa_sentences_detailed.tsv").write_text("".join(row(i, "spa", t) for i, t in spa), encoding="utf8")
    (d / "ita-spa_links.tsv").write_text("".join(f"{a}\t{b}\n" for a, b in links), encoding="utf8")


def test_ingest_counts(tmp_path):
    write_raw(tmp_path, [(1, "Ciao."), (2, "Sono andato.")], [(10, "Hola."), (11, "He ido.")], [(1, 10), (2, 11)])
    con = workdb.connect(":memory:")
    assert ingest.ingest(con, tmp_path) == {"ita": 2, "spa": 2, "pairs": 2}


def test_ingest_keeps_double_quotes(tmp_path):
    write_raw(tmp_path, [(1, 'Dice "ciao" a tutti.')], [(10, 'Dice "hola" a todos.')], [(1, 10)])
    con = workdb.connect(":memory:")
    ingest.ingest(con, tmp_path)
    assert con.execute("SELECT text FROM raw_sentences WHERE id=1").fetchone()[0] == 'Dice "ciao" a tutti.'


def test_ingest_skips_dangling_link(tmp_path):
    write_raw(tmp_path, [(1, "Ciao.")], [(10, "Hola.")], [(1, 10), (1, 999), (777, 10)])
    con = workdb.connect(":memory:")
    assert ingest.ingest(con, tmp_path)["pairs"] == 1


def test_ingest_is_idempotent(tmp_path):
    write_raw(tmp_path, [(1, "Ciao.")], [(10, "Hola.")], [(1, 10)])
    con = workdb.connect(":memory:")
    first = ingest.ingest(con, tmp_path)
    assert ingest.ingest(con, tmp_path) == first
    assert con.execute("SELECT COUNT(*) FROM raw_sentences").fetchone()[0] == 2


def test_ingest_keeps_author_and_marks_direct(tmp_path):
    write_raw(tmp_path, [(1, "Ciao.")], [(10, "Hola.")], [(1, 10)])
    con = workdb.connect(":memory:")
    ingest.ingest(con, tmp_path)
    assert con.execute("SELECT author FROM raw_sentences WHERE id=1").fetchone()[0] == "autor"
    assert con.execute("SELECT kind, via_eng_id FROM pairs").fetchone() == ("direct", None)


@pytest.mark.realdata
def test_real_counts():
    if not (config.RAW_DIR / "ita-spa_links.tsv").exists():
        pytest.skip("falta data/raw")
    con = workdb.connect(":memory:")
    counts = ingest.ingest(con, config.RAW_DIR)
    assert counts["pairs"] == 19975
    assert con.execute("SELECT COUNT(DISTINCT ita_id) FROM pairs").fetchone()[0] == 18688
