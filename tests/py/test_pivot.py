import bz2
import io
import tarfile

from pipeline import pivot, workdb


def make_links_tar(tmp_path, rows):
    data = "".join(f"{a}\t{b}\n" for a, b in rows).encode()
    out = tmp_path / "links.tar.bz2"
    with tarfile.open(out, "w:bz2") as tf:
        info = tarfile.TarInfo("links.csv")
        info.size = len(data)
        tf.addfile(info, io.BytesIO(data))
    return out


def seed(con, ita=(1,), spa=(7,), direct=()):
    for i in ita:
        con.execute("INSERT INTO raw_sentences VALUES (?, 'ita', 't', 'a', NULL, NULL)", (i,))
    for i in spa:
        con.execute("INSERT INTO raw_sentences VALUES (?, 'spa', 't', 'a', NULL, NULL)", (i,))
    for a, b in direct:
        con.execute("INSERT INTO pairs VALUES (?, ?, 'direct', NULL)", (a, b))


def pairs(con):
    return con.execute("SELECT ita_id, spa_id, kind, via_eng_id FROM pairs ORDER BY 1,2").fetchall()


def test_pivot_creates_pair_via_english(tmp_path):
    con = workdb.connect(":memory:")
    seed(con)
    tar = make_links_tar(tmp_path, [(1, 100), (100, 7)])
    assert pivot.pivot(con, tar, {100}) == {"new_pairs": 1, "new_ita": 1}
    assert pairs(con) == [(1, 7, "pivot", 100)]


def test_pivot_works_with_reversed_links(tmp_path):
    con = workdb.connect(":memory:")
    seed(con)
    tar = make_links_tar(tmp_path, [(100, 1), (7, 100)])
    pivot.pivot(con, tar, {100})
    assert pairs(con) == [(1, 7, "pivot", 100)]


def test_pivot_prefers_lowest_bridge(tmp_path):
    con = workdb.connect(":memory:")
    seed(con)
    tar = make_links_tar(tmp_path, [(1, 100), (100, 7), (1, 90), (90, 7)])
    pivot.pivot(con, tar, {100, 90})
    assert pairs(con) == [(1, 7, "pivot", 90)]


def test_pivot_skips_existing_direct(tmp_path):
    con = workdb.connect(":memory:")
    seed(con, direct=[(1, 7)])
    tar = make_links_tar(tmp_path, [(1, 100), (100, 7)])
    pivot.pivot(con, tar, {100})
    assert pairs(con) == [(1, 7, "direct", None)]


def test_pivot_ignores_bridges_that_are_not_english(tmp_path):
    con = workdb.connect(":memory:")
    seed(con)
    tar = make_links_tar(tmp_path, [(1, 555), (555, 7)])  # 555 = francés, no está en eng_ids
    assert pivot.pivot(con, tar, {100}) == {"new_pairs": 0, "new_ita": 0}


def test_pivot_ignores_non_ita_spa_ends(tmp_path):
    con = workdb.connect(":memory:")
    seed(con)
    tar = make_links_tar(tmp_path, [(100, 200), (200, 100), (1, 100), (100, 300)])  # 300 no existe
    assert pivot.pivot(con, tar, {100, 200})["new_pairs"] == 0


def test_pivot_is_idempotent(tmp_path):
    con = workdb.connect(":memory:")
    seed(con)
    tar = make_links_tar(tmp_path, [(1, 100), (100, 7)])
    first = pivot.pivot(con, tar, {100})
    assert pivot.pivot(con, tar, {100}) == first
    assert len(pairs(con)) == 1


def test_load_eng_ids_reads_first_column_from_bz2(tmp_path):
    f = tmp_path / "eng_sentences.tsv.bz2"
    f.write_bytes(bz2.compress("100\teng\tHello.\n101\teng\tBye.\n".encode()))
    assert pivot.load_eng_ids(f) == {100, 101}
