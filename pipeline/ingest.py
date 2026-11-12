"""Etapa 1: carga los exports por idioma de Tatoeba (ya descomprimidos) y los enlaces directos."""
import csv
from pathlib import Path

BATCH = 50_000


def _rows(path: Path):
    with open(path, encoding="utf8", newline="") as f:
        yield from csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)


def _load_sentences(con, path: Path, lang: str) -> None:
    batch = []
    for r in _rows(path):
        if len(r) < 6:
            continue
        batch.append((int(r[0]), lang, r[2], r[3], r[4], r[5]))
        if len(batch) >= BATCH:
            con.executemany("INSERT OR REPLACE INTO raw_sentences VALUES (?,?,?,?,?,?)", batch)
            batch.clear()
    if batch:
        con.executemany("INSERT OR REPLACE INTO raw_sentences VALUES (?,?,?,?,?,?)", batch)


def ingest(con, raw_dir: Path) -> dict[str, int]:
    raw_dir = Path(raw_dir)
    _load_sentences(con, raw_dir / "ita_sentences_detailed.tsv", "ita")
    _load_sentences(con, raw_dir / "spa_sentences_detailed.tsv", "spa")
    links = [(int(r[0]), int(r[1])) for r in _rows(raw_dir / "ita-spa_links.tsv") if len(r) >= 2]
    con.executemany(
        "INSERT OR REPLACE INTO pairs(ita_id, spa_id, kind, via_eng_id) "
        "SELECT ?, ?, 'direct', NULL "
        "WHERE EXISTS (SELECT 1 FROM raw_sentences WHERE id=? AND lang='ita') "
        "AND EXISTS (SELECT 1 FROM raw_sentences WHERE id=? AND lang='spa')",
        [(a, b, a, b) for a, b in links],
    )
    con.commit()
    count = lambda sql: con.execute(sql).fetchone()[0]
    return {
        "ita": count("SELECT COUNT(*) FROM raw_sentences WHERE lang='ita'"),
        "spa": count("SELECT COUNT(*) FROM raw_sentences WHERE lang='spa'"),
        "pairs": count("SELECT COUNT(*) FROM pairs WHERE kind='direct'"),
    }
