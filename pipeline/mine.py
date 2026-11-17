"""Ayuda para autorar reglas: imprime candidatos del corpus (work.db) que calzan con un patrón.

Uso: .venv/bin/python -m pipeline.mine '<regex it>' [--es '<regex es>'] [-n 20]
"""
import argparse
import re

from pipeline import workdb

QUERY = (
    "SELECT c.ita_id, i.text, s.text FROM candidates c "
    "JOIN raw_sentences i ON i.id = c.ita_id JOIN raw_sentences s ON s.id = c.spa_id "
    "WHERE c.status = 'ok' ORDER BY c.ita_id"
)


def mine(con, it_regex: str, es_regex: str | None = None, n: int = 20) -> list[tuple[int, str, str]]:
    it_re = re.compile(it_regex, re.IGNORECASE)
    es_re = re.compile(es_regex, re.IGNORECASE) if es_regex else None
    out: list[tuple[int, str, str]] = []
    for ita_id, it, es in con.execute(QUERY):
        if it_re.search(it) and (es_re is None or es_re.search(es)):
            out.append((ita_id, it, es))
            if len(out) >= n:
                break
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("it_regex")
    ap.add_argument("--es", dest="es_regex")
    ap.add_argument("-n", type=int, default=20)
    args = ap.parse_args()
    for ita_id, it, es in mine(workdb.connect(), args.it_regex, args.es_regex, args.n):
        print(f"{ita_id} | {it} | {es}")


if __name__ == "__main__":
    main()
