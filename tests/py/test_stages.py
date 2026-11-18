import hashlib
import json

import pytest

from pipeline import cli, filters, ingest, nlp, promote, workdb
from pipeline.db import store

CORPUS = [
    (1, "Sono andato a Roma.", 10, "Fui a Roma ayer."),
    (2, "Vedi il mio libro?", 11, "¿Ves mi libro?"),
    (3, "Credo che Giovanni abbia ragione.", 12, "Creo que Juan tiene razón."),
    (4, "Una bella casa blu.", 13, "Una bonita casa azul."),  # sin verbo: se rechaza
]


def write_raw(d, corpus=CORPUS):
    d.mkdir(parents=True, exist_ok=True)
    row = lambda i, lang, t: f"{i}\t{lang}\t{t}\tautor\t2020-01-01 00:00:00\t\\N\n"
    (d / "ita_sentences_detailed.tsv").write_text("".join(row(i, "ita", it) for i, it, _, _ in corpus), encoding="utf8")
    (d / "spa_sentences_detailed.tsv").write_text("".join(row(s, "spa", es) for _, _, s, es in corpus), encoding="utf8")
    (d / "ita-spa_links.tsv").write_text("".join(f"{i}\t{s}\n" for i, _, s, _ in corpus), encoding="utf8")


@pytest.fixture
def stages(tmp_path):
    raw = tmp_path / "raw"
    write_raw(raw)
    work = workdb.connect(":memory:")
    auth = store.connect(":memory:")
    ingest.ingest(work, raw)
    n = nlp.get_nlp()
    filters.run_filters(work, n)
    return work, auth, n


def dump(con, sql):
    return hashlib.sha1(json.dumps(con.execute(sql).fetchall(), ensure_ascii=False).encode()).hexdigest()


def test_annotate_only_ok_candidates(stages):
    work, _, n = stages
    counts = cli.annotate(work, n)
    assert counts["input"] == 3 and counts["A2"] >= 1
    assert work.execute("SELECT COUNT(*) FROM annotations WHERE ita_id=4").fetchone()[0] == 0
    level, conf, feats = work.execute("SELECT cefr, confidence, features FROM annotations WHERE ita_id=1").fetchone()
    assert level == "A2" and conf <= 0.6 and "passato_prossimo" in json.loads(feats)


def test_tag_stores_tags_with_rule_and_evidence(stages):
    work, _, n = stages
    counts = cli.tag(work, n)
    assert counts["input"] == 3 and counts["tags"] >= 3
    rule_id, evidence = work.execute("SELECT rule_id, evidence FROM tags WHERE ita_id=1 AND code='ERR_AUX_ESSERE'").fetchone()
    assert rule_id == "aux_essere_movimento" and "Sono andato" in json.loads(evidence)["it"]
    assert work.execute("SELECT COUNT(*) FROM tags WHERE ita_id=4").fetchone()[0] == 0


def test_tag_replaces_stale_tags(stages):
    work, _, n = stages
    work.execute("INSERT INTO tags VALUES (2, 'ERR_MANCARE', 'rastro_viejo', '{}')")
    cli.tag(work, n)
    assert work.execute("SELECT COUNT(*) FROM tags WHERE rule_id='rastro_viejo'").fetchone()[0] == 0


def test_stages_end_to_end_on_tiny_corpus(stages):
    work, auth, n = stages
    cli.annotate(work, n)
    cli.tag(work, n)
    counts = promote.promote(work, auth)
    assert counts["promoted"] == 3
    rows = auth.execute("SELECT id, review_status, body FROM sentences ORDER BY id").fetchall()
    assert [r[0] for r in rows] == ["s_1", "s_2", "s_3"] and {r[1] for r in rows} == {"needs_review"}
    s1 = json.loads(rows[0][2])
    assert (s1["source"], s1["source_id"], s1["author"], s1["license"]) == ("tatoeba", "1", "autor", "CC BY 2.0 FR")
    assert (s1["it"], s1["es"], s1["es_source_id"], s1["translation_kind"]) == ("Sono andato a Roma.", "Fui a Roma ayer.", "10", "direct")
    assert s1["cefr_estimate"] == "A2" and "ERR_AUX_ESSERE" in s1["error_codes"]
    assert s1["tag_rules"]["ERR_AUX_ESSERE"] == "aux_essere_movimento"
    assert s1["es_author"] == "autor"
    assert "pivot_via" not in s1


def test_promote_marks_pivot_provenance(stages):
    work, auth, n = stages
    work.execute("UPDATE candidates SET kind='pivot', flags='[\"pivot\"]' WHERE ita_id=1")
    work.execute("UPDATE pairs SET kind='pivot', via_eng_id=555 WHERE ita_id=1")
    cli.annotate(work, n)
    cli.tag(work, n)
    promote.promote(work, auth)
    s1 = json.loads(auth.execute("SELECT body FROM sentences WHERE id='s_1'").fetchone()[0])
    assert (s1["translation_kind"], s1["pivot_via"], s1["qa_flags"]) == ("pivot", "555", ["pivot"])


def test_promote_does_not_overwrite_validated(stages):
    work, auth, n = stages
    cli.annotate(work, n)
    cli.tag(work, n)
    promote.promote(work, auth)
    auth.execute("UPDATE sentences SET review_status='validated', body=json_set(body,'$.review_status','validated','$.cefr_estimate','B1') WHERE id='s_1'")
    before = auth.execute("SELECT body FROM sentences WHERE id='s_1'").fetchone()[0]
    counts = promote.promote(work, auth)
    assert auth.execute("SELECT body FROM sentences WHERE id='s_1'").fetchone()[0] == before
    assert counts["skipped"] == 1


def test_promote_does_not_overwrite_sentence_that_already_has_a_review(stages):
    work, auth, n = stages
    cli.annotate(work, n)
    cli.tag(work, n)
    promote.promote(work, auth)
    auth.execute("INSERT INTO reviews(entity, entity_id, status, reviewer, reviewed_at) VALUES ('sentences','s_2','needs_review','me','2026-11-12')")
    auth.execute("UPDATE sentences SET body=json_set(body,'$.cefr_estimate','B2') WHERE id='s_2'")
    promote.promote(work, auth)
    assert json.loads(auth.execute("SELECT body FROM sentences WHERE id='s_2'").fetchone()[0])["cefr_estimate"] == "B2"


def test_stages_are_idempotent(stages):
    work, auth, n = stages
    def run():
        cli.annotate(work, n)
        cli.tag(work, n)
        promote.promote(work, auth)
        return (dump(work, "SELECT * FROM annotations ORDER BY ita_id"), dump(work, "SELECT * FROM tags ORDER BY ita_id, code"),
                dump(auth, "SELECT id, review_status, body FROM sentences ORDER BY id"))
    assert run() == run()


def test_cli_reports_counts_per_stage(tmp_path, capsys):
    raw, w, a = tmp_path / "raw", tmp_path / "w.db", tmp_path / "a.db"
    write_raw(raw)
    base = ["--raw-dir", str(raw), "--work-db", str(w), "--authoring-db", str(a)]
    assert cli.main(["ingest", *base]) == 0
    assert cli.main(["filter", *base]) == 0
    out = capsys.readouterr().out
    assert "ingest" in out and "filter" in out and "rechazadas (no_verb): 1" in out


def test_cli_all_runs_every_stage(tmp_path, capsys):
    raw, w, a = tmp_path / "raw", tmp_path / "w.db", tmp_path / "a.db"
    write_raw(raw)
    assert cli.main(["all", "--no-pivot", "--raw-dir", str(raw), "--work-db", str(w), "--authoring-db", str(a)]) == 0
    assert store.connect(a).execute("SELECT COUNT(*) FROM sentences").fetchone()[0] == 3


def test_cli_missing_model_prints_clear_message_not_traceback(tmp_path, capsys):
    raw, w, a = tmp_path / "raw", tmp_path / "w.db", tmp_path / "a.db"
    write_raw(raw)
    base = ["--raw-dir", str(raw), "--work-db", str(w), "--authoring-db", str(a)]
    cli.main(["ingest", *base])
    assert cli.main(["filter", "--model", "it_modelo_que_no_existe", *base]) == 2
    assert "python -m spacy download it_modelo_que_no_existe" in capsys.readouterr().err


def test_cli_export_stage_writes_files_and_reports(tmp_path, capsys):
    a, out = tmp_path / "a.db", tmp_path / "content"
    store.connect(a).close()
    assert cli.main(["export", "--authoring-db", str(a), "--work-db", str(tmp_path / "w.db"), "--out-dir", str(out)]) == 0
    assert (out / "manifest.json").exists() and (out / "sentences" / "B2.json").exists()
    assert "export" in capsys.readouterr().out


def test_promote_does_not_reset_the_review_status_of_error_codes():
    auth = store.connect(":memory:")
    promote.ensure_catalog(auth)
    auth.execute("UPDATE error_codes SET review_status='validated', body=json_set(body,'$.review_status','validated') WHERE code='ERR_AUX_ESSERE'")
    promote.ensure_catalog(auth)
    assert auth.execute("SELECT review_status FROM error_codes WHERE code='ERR_AUX_ESSERE'").fetchone()[0] == "validated"
    assert json.loads(auth.execute("SELECT body FROM error_codes WHERE code='ERR_AUX_ESSERE'").fetchone()[0])["review_status"] == "validated"
    topics = len(json.loads((promote.ROOT / "schemas/data/topic-codes.json").read_text(encoding="utf8")))
    catalog = len(json.loads((promote.ROOT / "schemas/data/error-codes.json").read_text(encoding="utf8")))
    assert auth.execute("SELECT COUNT(*) FROM error_codes").fetchone()[0] == catalog + topics
