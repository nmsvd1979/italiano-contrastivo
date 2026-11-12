"""Etapa 2: pares ita→eng→spa a partir de links.tar.bz2 (streaming, dos pasadas)."""
import bz2
import io
import tarfile
from collections import defaultdict
from pathlib import Path


def load_eng_ids(path: Path) -> set[int]:
    """Ids de las oraciones inglesas (primera columna de eng_sentences.tsv[.bz2])."""
    path = Path(path)
    opener = bz2.open if path.suffix == ".bz2" else open
    ids = set()
    with opener(path, "rt", encoding="utf8") as f:
        for line in f:
            head = line.split("\t", 1)[0]
            if head.isdigit():
                ids.add(int(head))
    return ids


def _links(links_tar: Path):
    """Itera (a, b) de links.csv dentro del tar.bz2, sin cargarlo en memoria."""
    with tarfile.open(links_tar, "r:bz2") as tf:
        member = next(m for m in tf if m.isfile())
        with io.TextIOWrapper(tf.extractfile(member), encoding="utf8") as f:
            for line in f:
                parts = line.rstrip("\n").split("\t")
                if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
                    yield int(parts[0]), int(parts[1])


def pivot(con, links_tar: Path, eng_ids: set[int]) -> dict[str, int]:
    ita = {r[0] for r in con.execute("SELECT id FROM raw_sentences WHERE lang='ita'")}
    spa = {r[0] for r in con.execute("SELECT id FROM raw_sentences WHERE lang='spa'")}

    # Pasada 1: oraciones italianas ligadas a cada oración inglesa (enlaces sin dirección).
    ita_by_eng: dict[int, set[int]] = defaultdict(set)
    for a, b in _links(links_tar):
        if a in ita and b in eng_ids:
            ita_by_eng[b].add(a)
        elif b in ita and a in eng_ids:
            ita_by_eng[a].add(b)

    # Pasada 2: oraciones españolas ligadas a esas mismas oraciones inglesas; puente = id inglés menor.
    best: dict[tuple[int, int], int] = {}
    for a, b in _links(links_tar):
        for eng, other in ((a, b), (b, a)):
            if eng in ita_by_eng and other in spa:
                for i in ita_by_eng[eng]:
                    key = (i, other)
                    if key not in best or eng < best[key]:
                        best[key] = eng

    con.executemany(
        "INSERT INTO pairs(ita_id, spa_id, kind, via_eng_id) VALUES (?, ?, 'pivot', ?) "
        "ON CONFLICT(ita_id, spa_id) DO UPDATE SET via_eng_id = excluded.via_eng_id WHERE pairs.kind = 'pivot'",
        [(i, s, e) for (i, s), e in best.items()],
    )
    con.commit()
    one = lambda sql: con.execute(sql).fetchone()[0]
    return {
        "new_pairs": one("SELECT COUNT(*) FROM pairs WHERE kind='pivot'"),
        "new_ita": one(
            "SELECT COUNT(DISTINCT ita_id) FROM pairs WHERE kind='pivot' "
            "AND ita_id NOT IN (SELECT ita_id FROM pairs WHERE kind='direct')"
        ),
    }
