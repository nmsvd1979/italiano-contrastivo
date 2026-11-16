"""Herramienta de desarrollo de reglas (no forma parte del pipeline).

  python scripts/rule_dev.py build-sample            # parsea 40.000 candidatos y los guarda en data/work/
  python scripts/rule_dev.py scan RULE_ID [--near REGEX] [-n 6]
  python scripts/rule_dev.py add RULE_ID --pos 1,2,3 --neg 4,5,6   # copia texto real del corpus a examples
"""
import argparse
import json
import random
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from spacy.tokens import DocBin  # noqa: E402

from pipeline import config, nlp, workdb  # noqa: E402
from pipeline.tagging import engine  # noqa: E402

SAMPLE = config.ROOT / "data" / "work" / "sample.spacy"
SAMPLE_IDS = config.ROOT / "data" / "work" / "sample_ids.json"
SAMPLE_SIZE = 40_000


def build_sample():
    con = workdb.connect()
    direct = [r[0] for r in con.execute("SELECT ita_id FROM candidates WHERE status='ok' AND kind='direct' ORDER BY ita_id")]
    pivot = [r[0] for r in con.execute("SELECT ita_id FROM candidates WHERE status='ok' AND kind='pivot' ORDER BY ita_id")]
    random.Random(7).shuffle(pivot)
    ids = sorted(direct + pivot[: SAMPLE_SIZE - len(direct)])
    texts = [con.execute("SELECT text FROM raw_sentences WHERE id=?", (i,)).fetchone()[0] for i in ids]
    docs = DocBin(store_user_data=False)
    for d in nlp.get_nlp().pipe(texts, batch_size=256):
        docs.add(d)
    docs.to_disk(SAMPLE)
    SAMPLE_IDS.write_text(json.dumps(ids))
    print("muestra:", len(ids))


def load_sample(con):
    ids = json.loads(SAMPLE_IDS.read_text())
    docs = list(DocBin().from_disk(SAMPLE).get_docs(nlp.get_nlp().vocab))
    es = {i: con.execute("SELECT s.text FROM candidates c JOIN raw_sentences s ON s.id=c.spa_id WHERE c.ita_id=?", (i,)).fetchone()[0] for i in ids}
    return ids, docs, es


def find_rule(rule_id):
    for f in sorted((config.RULES_DIR / "tags").glob("*.yaml")):
        data = yaml.safe_load(f.read_text(encoding="utf8")) or []
        if any(r["id"] == rule_id for r in data):
            return f, data
    sys.exit(f"regla no encontrada: {rule_id}")


def scan(rule_id, near, n):
    import re
    rule = next(r for r in engine.load_rules() if r.id == rule_id)
    con = workdb.connect()
    ids, docs, es = load_sample(con)
    hits, misses = [], []
    for i, d in zip(ids, docs):
        (hits if engine.match_rule(rule, d, es[i]) is not None else misses).append((i, d))
    print(f"[{rule_id}] {rule.code}: {len(hits)} coincidencias de {len(ids)}")
    random.Random(1).shuffle(hits)
    for i, d in hits[:n]:
        print(f"  + {i} | {d.text} | {es[i]}")
    if near:
        rx = re.compile(near, re.IGNORECASE)
        close = [(i, d) for i, d in misses if rx.search(d.text)]
        print(f"  casi-aciertos (/{near}/ sin disparar la regla): {len(close)}")
        random.Random(2).shuffle(close)
        for i, d in close[:n]:
            print(f"  - {i} | {d.text} | {es[i]}")
    else:
        random.Random(3).shuffle(misses)
        for i, d in misses[: max(2, n // 3)]:
            print(f"  - {i} | {d.text} | {es[i]}")


def add(rule_id, pos, neg):
    f, data = find_rule(rule_id)
    con = workdb.connect()
    rule = next(r for r in data if r["id"] == rule_id)
    ex = rule.setdefault("examples", {"positive": [], "negative": []})
    for kind, ids in (("positive", pos), ("negative", neg)):
        have = {e["source"] for e in ex.setdefault(kind, [])}
        for i in ids:
            src = f"tatoeba:{i}"
            if src in have:
                continue
            it = con.execute("SELECT text FROM raw_sentences WHERE id=?", (i,)).fetchone()
            es = con.execute("SELECT s.text FROM candidates c JOIN raw_sentences s ON s.id=c.spa_id WHERE c.ita_id=?", (i,)).fetchone()
            if not it or not es:
                sys.exit(f"id {i} no está en el corpus candidato")
            ex[kind].append({"text": it[0], "es": es[0], "source": src})
    f.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True, width=200), encoding="utf8")
    print(f"{rule_id}: {len(ex['positive'])} positivos, {len(ex['negative'])} negativos")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("build-sample")
    s = sub.add_parser("scan"); s.add_argument("rule_id"); s.add_argument("--near"); s.add_argument("-n", type=int, default=6)
    a = sub.add_parser("add"); a.add_argument("rule_id"); a.add_argument("--pos", default=""); a.add_argument("--neg", default="")
    args = ap.parse_args()
    ints = lambda s: [int(x) for x in s.split(",") if x.strip()]
    if args.cmd == "build-sample":
        build_sample()
    elif args.cmd == "scan":
        scan(args.rule_id, args.near, args.n)
    else:
        add(args.rule_id, ints(args.pos), ints(args.neg))
