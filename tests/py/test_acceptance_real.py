"""Aceptación sobre datos reales de Tatoeba (se omite si falta data/raw)."""
import csv
import hashlib
import json
import random

import pytest

from pipeline import cli, config, filters, ingest, nlp, promote, workdb
from pipeline.db import store

pytestmark = pytest.mark.realdata
FIXTURES = {719442: {"ERR_AUX_ESSERE"}, 3255442: {"ERR_POSSESSIVE_ARTICLE"}, 3860754: {"ERR_POSSESSIVE_ARTICLE", "ERR_GEMINATE"}}


@pytest.fixture(scope="module")
def subset(tmp_path_factory):
    raw = config.RAW_DIR
    if not (raw / "ita-spa_links.tsv").exists():
        pytest.skip("falta data/raw")
    rd = lambda f: list(csv.reader(open(raw / f, encoding="utf8", newline=""), delimiter="\t", quoting=csv.QUOTE_NONE))
    links = [(int(a), int(b)) for a, b in rd("ita-spa_links.tsv")]
    pick = set(FIXTURES) | {a for a, _ in random.Random(3).sample(links, 1500)}
    chosen = [(a, b) for a, b in links if a in pick]
    ita_ids, spa_ids = {a for a, _ in chosen}, {b for _, b in chosen}
    out = tmp_path_factory.mktemp("real_subset")
    for name, ids in (("ita_sentences_detailed.tsv", ita_ids), ("spa_sentences_detailed.tsv", spa_ids)):
        rows = [r for r in rd(name) if r and int(r[0]) in ids]
        (out / name).write_text("".join("\t".join(r) + "\n" for r in rows), encoding="utf8")
    (out / "ita-spa_links.tsv").write_text("".join(f"{a}\t{b}\n" for a, b in chosen), encoding="utf8")
    return out


def run_pipeline(raw_dir):
    work, auth = workdb.connect(":memory:"), store.connect(":memory:")
    spacy = nlp.get_nlp()
    ingest.ingest(work, raw_dir)
    filters.run_filters(work, spacy)
    cli.annotate(work, spacy)
    cli.tag(work, spacy)
    promote.promote(work, auth)
    return work, auth


def sentences_hash(auth):
    return hashlib.sha1(json.dumps(auth.execute("SELECT id, review_status, body FROM sentences ORDER BY id").fetchall(), ensure_ascii=False).encode()).hexdigest()


def test_fixture_sentences_through_real_pipeline(subset):
    work, auth = run_pipeline(subset)
    for ita_id, expected in FIXTURES.items():
        assert work.execute("SELECT status FROM candidates WHERE ita_id=?", (ita_id,)).fetchone()[0] == "ok", ita_id
        got = json.loads(auth.execute("SELECT body FROM sentences WHERE id=?", (f"s_{ita_id}",)).fetchone()[0])
        assert expected <= set(got["error_codes"]), f"{ita_id}: {got['error_codes']}"
        assert got["cefr_estimate"] in {"A1", "A2", "B1"} and got["license"] == "CC BY 2.0 FR" and got["author"] and got["es_author"]


def test_real_rerun_same_hash(subset):
    first = sentences_hash(run_pipeline(subset)[1])
    assert sentences_hash(run_pipeline(subset)[1]) == first
