import http.client
import json
import threading

import pytest

from pipeline import promote, workdb
from pipeline.db import store
from pipeline.review import batch, server

AUX, POSS, GEM = "ERR_AUX_ESSERE", "ERR_POSSESSIVE_ARTICLE", "ERR_GEMINATE"


def doc(i, cefr="A1", codes=(), conf=0.6, kind="direct", status="needs_review"):
    d = {"id": f"s_{i}", "source": "tatoeba", "source_id": str(i), "author": "autor", "license": "CC BY 2.0 FR",
         "it": f"Frase {i}.", "es": f"Frase es {i}.", "es_source_id": str(i + 1000), "translation_kind": kind,
         "cefr_estimate": cefr, "cefr_confidence": conf, "qa_flags": [], "error_codes": list(codes),
         "tag_rules": {c: f"r_{c}" for c in codes}, "review_status": status}
    if kind == "pivot":
        d["pivot_via"] = "555"
    return d


@pytest.fixture
def auth():
    con = store.connect(":memory:")
    promote.ensure_catalog(con)
    return con


@pytest.fixture
def work():
    return workdb.connect(":memory:")


def put(con, *docs):
    for d in docs:
        store.upsert(con, "sentences", d)
    con.commit()


COV = {"per_code": 2, "per_level": 2}


def test_batch_orders_by_deficit_then_low_confidence(work, auth):
    put(auth, doc(1, "A1", [AUX], status="validated"), doc(2, "A1", [AUX], status="validated"),
        doc(11, "A1", [AUX], 0.9), doc(12, "A2", [POSS], 0.9), doc(13, "A2", [POSS], 0.3), doc(14, "B1", [], 0.5))
    assert [b["id"] for b in batch.select_batch(work, auth, 20, COV)] == ["s_13", "s_12", "s_14", "s_11"]


def test_batch_respects_size_and_is_deterministic(work, auth):
    put(auth, *[doc(i, "A2", [POSS], 0.5) for i in range(1, 8)])
    a = [b["id"] for b in batch.select_batch(work, auth, 3, COV)]
    assert len(a) == 3 and a == [b["id"] for b in batch.select_batch(work, auth, 3, COV)]


def test_batch_skips_decided(work, auth):
    put(auth, doc(1, "A1", [AUX]), doc(2, "A1", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "doubt"})
    assert [b["id"] for b in batch.select_batch(work, auth, 20, COV)] == ["s_2"]


def test_batch_items_carry_evidence_source_and_flags(work, auth):
    work.execute("INSERT INTO tags VALUES (7, ?, 'r_ERR_AUX_ESSERE', ?)", (AUX, json.dumps({"it": "Sono andato"})))
    d = doc(7, "A2", [AUX], 0.6)
    d["qa_flags"] = ["pivot"]
    put(auth, d)
    item = batch.select_batch(work, auth, 20, COV)[0]
    assert item["source_url"] == "https://tatoeba.org/en/sentences/show/7"
    assert item["tags"] == [{"code": AUX, "rule_id": "r_ERR_AUX_ESSERE", "evidence": {"it": "Sono andato"}, "accepted": True}]
    assert (item["it"], item["es"], item["author"], item["cefr"], item["cefr_confidence"], item["qa_flags"]) == ("Frase 7.", "Frase es 7.", "autor", "A2", 0.6, ["pivot"])


def test_approve_requires_translation_ok_for_pivot(auth):
    put(auth, doc(1, "A1", [AUX], kind="pivot"))
    with pytest.raises(ValueError, match="traducción"):
        batch.record_decision(auth, "s_1", {"action": "approve"})
    assert auth.execute("SELECT review_status FROM sentences WHERE id='s_1'").fetchone()[0] == "needs_review"
    batch.record_decision(auth, "s_1", {"action": "approve", "translation_ok": True})
    assert auth.execute("SELECT review_status FROM sentences WHERE id='s_1'").fetchone()[0] == "validated"


def test_approve_sets_validated_and_writes_review_row(auth):
    put(auth, doc(1, "A1", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "approve", "reason": "ok"}, reviewer="yo")
    status, body = auth.execute("SELECT review_status, body FROM sentences WHERE id='s_1'").fetchone()
    assert status == "validated" and json.loads(body)["review_status"] == "validated"
    row = auth.execute("SELECT entity, entity_id, status, reviewer, note FROM reviews").fetchone()
    assert row == ("sentences", "s_1", "validated", "yo", "ok")


def test_decision_twice_last_wins_and_history_kept(auth):
    put(auth, doc(1, "A1", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "approve"})
    batch.record_decision(auth, "s_1", {"action": "reject", "reason": "mala traducción"})
    assert auth.execute("SELECT review_status FROM sentences WHERE id='s_1'").fetchone()[0] == "rejected"
    assert [r[0] for r in auth.execute("SELECT status FROM reviews ORDER BY id")] == ["validated", "rejected"]
    batch.record_decision(auth, "s_1", {"action": "reject", "reason": "mala traducción"})  # repetir no rompe
    assert auth.execute("SELECT COUNT(*) FROM reviews").fetchone()[0] == 3


def test_doubt_stays_needs_review(auth):
    put(auth, doc(1, "A1", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "doubt", "reason": "no sé"})
    assert auth.execute("SELECT review_status FROM sentences WHERE id='s_1'").fetchone()[0] == "needs_review"
    assert auth.execute("SELECT COUNT(*) FROM reviews").fetchone()[0] == 1


def test_tag_rejection_recorded_and_code_removed_on_approve(auth):
    put(auth, doc(1, "A1", [AUX, POSS]))
    batch.record_decision(auth, "s_1", {"action": "approve", "tags": {AUX: True, POSS: False}})
    assert [tuple(r) for r in auth.execute("SELECT code, rule_id, accepted FROM tag_reviews ORDER BY code")] == [
        (AUX, f"r_{AUX}", 1), (POSS, f"r_{POSS}", 0)]
    body = json.loads(auth.execute("SELECT body FROM sentences WHERE id='s_1'").fetchone()[0])
    assert body["error_codes"] == [AUX] and list(body["tag_rules"]) == [AUX]
    assert [r[0] for r in auth.execute("SELECT code FROM sentence_error_codes WHERE sentence_id='s_1'")] == [AUX]


def test_level_correction_recorded_and_applied(auth):
    put(auth, doc(1, "A1", [AUX]), doc(2, "A2", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "approve", "cefr": "B1"})
    batch.record_decision(auth, "s_2", {"action": "approve"})
    assert [tuple(r) for r in auth.execute("SELECT sentence_id, estimated, corrected FROM level_reviews ORDER BY sentence_id")] == [
        ("s_1", "A1", "B1"), ("s_2", "A2", "A2")]
    assert json.loads(auth.execute("SELECT body FROM sentences WHERE id='s_1'").fetchone()[0])["cefr_estimate"] == "B1"
    assert auth.execute("SELECT cefr_estimate FROM sentences WHERE id='s_1'").fetchone()[0] == "B1"


@pytest.mark.parametrize("decision", [{"action": "nada"}, {}, {"action": "approve", "cefr": "C2"}, {"action": "approve", "tags": {GEM: True}}])
def test_invalid_decisions_raise_value_error_and_change_nothing(auth, decision):
    put(auth, doc(1, "A1", [AUX]))
    with pytest.raises(ValueError):
        batch.record_decision(auth, "s_1", decision)
    assert auth.execute("SELECT COUNT(*) FROM reviews").fetchone()[0] == 0


def test_unknown_sentence_raises_value_error(auth):
    with pytest.raises(ValueError, match="no existe"):
        batch.record_decision(auth, "s_999", {"action": "approve"})


# ---- servidor ---------------------------------------------------------------------------------

@pytest.fixture
def live(tmp_path):
    w, a = tmp_path / "w.db", tmp_path / "a.db"
    wc, ac = workdb.connect(w), store.connect(a)
    promote.ensure_catalog(ac)
    put(ac, doc(1, "A2", [AUX]), doc(2, "A1", [POSS], kind="pivot"))
    wc.commit(); wc.close(); ac.close()
    srv = server.make_server(w, a, port=0)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield srv, a
    srv.shutdown(); srv.server_close()


def call(srv, method, path, body=None, headers=None):
    host, port = srv.server_address
    c = http.client.HTTPConnection(host, port, timeout=5)
    h = {"Content-Type": "application/json", **(headers or {})}
    c.request(method, path, json.dumps(body) if body is not None else None, h)
    r = c.getresponse()
    return r.status, r.read().decode()


def test_server_binds_localhost_only_and_refuses_other_hosts(tmp_path):
    srv = server.make_server(tmp_path / "w.db", tmp_path / "a.db", port=0)
    try:
        assert srv.server_address[0] == "127.0.0.1"
    finally:
        srv.server_close()
    with pytest.raises(ValueError, match="localhost"):
        server.make_server(tmp_path / "w.db", tmp_path / "a.db", host="0.0.0.0", port=0)


def test_index_and_batch_over_http(live):
    srv, _ = live
    status, html = call(srv, "GET", "/")
    assert status == 200 and "Aprobar" in html
    status, body = call(srv, "GET", "/api/batch?size=5")
    assert status == 200 and {b["id"] for b in json.loads(body)} == {"s_1", "s_2"}


def test_post_decision_updates_database(live):
    srv, a = live
    status, body = call(srv, "POST", "/api/decision", {"id": "s_1", "decision": {"action": "approve"}})
    assert status == 200 and json.loads(body) == {"ok": True}
    assert store.connect(a).execute("SELECT review_status FROM sentences WHERE id='s_1'").fetchone()[0] == "validated"


def test_post_decision_400_on_invalid_and_pivot_without_translation_ok(live):
    srv, _ = live
    status, body = call(srv, "POST", "/api/decision", {"id": "s_2", "decision": {"action": "approve"}})
    assert status == 400 and "traducción" in json.loads(body)["error"]
    assert call(srv, "POST", "/api/decision", {"id": "s_1", "decision": {"action": "xx"}})[0] == 400
    assert call(srv, "POST", "/api/decision", {"decision": {"action": "approve"}})[0] == 400


def test_post_with_malformed_json_is_400_not_500(live):
    srv, _ = live
    host, port = srv.server_address
    c = http.client.HTTPConnection(host, port, timeout=5)
    c.request("POST", "/api/decision", "{no es json", {"Content-Type": "application/json"})
    assert c.getresponse().status == 400


def test_foreign_origin_and_host_are_refused(live):
    srv, a = live
    ok = {"id": "s_1", "decision": {"action": "approve"}}
    assert call(srv, "POST", "/api/decision", ok, {"Origin": "http://evil.example"})[0] == 403
    assert call(srv, "POST", "/api/decision", ok, {"Host": "evil.example"})[0] == 403
    assert call(srv, "GET", "/api/batch", None, {"Host": "evil.example"})[0] == 403
    assert store.connect(a).execute("SELECT review_status FROM sentences WHERE id='s_1'").fetchone()[0] == "needs_review"


# ---- pase de arreglos de la revisión final ---------------------------------------------------------

def index_columns(con, table):
    return [[r[2] for r in con.execute(f"PRAGMA index_info({i[1]})")] for i in con.execute(f"PRAGMA index_list({table})")]


def test_reviews_table_has_entity_index(auth):
    assert ["entity", "entity_id"] in index_columns(auth, "reviews")
    assert ["sentence_id", "code"] in index_columns(auth, "tag_reviews") and ["sentence_id"] in index_columns(auth, "level_reviews")


def test_double_approval_keeps_the_original_estimate(auth):
    put(auth, doc(1, "A2", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "approve", "cefr": "B1"})
    batch.record_decision(auth, "s_1", {"action": "approve", "cefr": "B1"})
    assert [tuple(r) for r in auth.execute("SELECT estimated, corrected FROM level_reviews ORDER BY rowid")] == [("A2", "B1"), ("A2", "B1")]


def test_reject_and_doubt_do_not_write_tag_reviews(auth):
    put(auth, doc(1, "A1", [AUX]), doc(2, "A1", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "reject", "tags": {AUX: True}})
    batch.record_decision(auth, "s_2", {"action": "doubt", "tags": {AUX: True}})
    assert auth.execute("SELECT COUNT(*) FROM tag_reviews").fetchone()[0] == 0


def test_last_decided_item_supports_undo_and_keeps_pruned_tags(work, auth):
    work.execute("INSERT INTO tags VALUES (1, ?, ?, '{}')", (AUX, f"r_{AUX}"))
    work.execute("INSERT INTO tags VALUES (1, ?, ?, '{}')", (POSS, f"r_{POSS}"))
    put(auth, doc(1, "A1", [AUX, POSS]), doc(2, "A1", [AUX]))
    assert batch.last_decided(work, auth) is None
    batch.record_decision(auth, "s_1", {"action": "approve", "tags": {AUX: True, POSS: False}})
    batch.record_decision(auth, "s_2", {"action": "approve"})
    assert batch.last_decided(work, auth)["id"] == "s_2"
    # El ítem a deshacer ofrece de nuevo TODOS los códigos etiquetados, incluso el que se desmarcó.
    batch.record_decision(auth, "s_2", {"action": "doubt"})
    item = batch.last_decided(work, auth, "s_1") if False else batch.item_for(work, auth, "s_1")
    assert {t["code"] for t in item["tags"]} == {AUX, POSS}


def test_redeciding_can_restore_a_code_that_was_unticked(auth):
    put(auth, doc(1, "A1", [AUX, POSS]))
    batch.record_decision(auth, "s_1", {"action": "approve", "tags": {AUX: True, POSS: False}})
    assert json.loads(auth.execute("SELECT body FROM sentences WHERE id='s_1'").fetchone()[0])["error_codes"] == [AUX]
    batch.record_decision(auth, "s_1", {"action": "approve", "tags": {AUX: True, POSS: True}})
    body = json.loads(auth.execute("SELECT body FROM sentences WHERE id='s_1'").fetchone()[0])
    assert body["error_codes"] == [AUX, POSS] and body["tag_rules"] == {AUX: f"r_{AUX}", POSS: f"r_{POSS}"}


def test_doubts_mode_lists_sentences_whose_last_decision_is_doubt(work, auth):
    put(auth, doc(1, "A1", [AUX]), doc(2, "A1", [AUX]), doc(3, "A1", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "doubt"})
    batch.record_decision(auth, "s_2", {"action": "doubt"})
    batch.record_decision(auth, "s_2", {"action": "approve"})
    assert [b["id"] for b in batch.select_batch(work, auth, 20, COV, mode="doubts")] == ["s_1"]
    assert [b["id"] for b in batch.select_batch(work, auth, 20, COV)] == ["s_3"]


def test_batch_mixes_direct_and_pivot_instead_of_only_the_biggest_deficit(work, auth):
    put(auth, *[doc(i, "A2", [POSS, AUX], kind="pivot") for i in range(1, 11)], doc(20, "A1", [], kind="direct"), doc(21, "A1", [], kind="direct"))
    kinds = [b["translation_kind"] for b in batch.select_batch(work, auth, 4, COV)]
    assert kinds.count("direct") == 2 and kinds.count("pivot") == 2


def test_server_exposes_last_decided_and_doubts_mode(live):
    srv, _ = live
    call(srv, "POST", "/api/decision", {"id": "s_1", "decision": {"action": "doubt"}})
    status, body = call(srv, "GET", "/api/batch?mode=doubts")
    assert status == 200 and [b["id"] for b in json.loads(body)] == ["s_1"]
    status, body = call(srv, "GET", "/api/last")
    assert status == 200 and json.loads(body)["id"] == "s_1"
