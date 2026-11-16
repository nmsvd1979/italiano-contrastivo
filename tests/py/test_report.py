import json

import pytest

from pipeline import cli, promote, report
from pipeline.db import store
from pipeline.review import batch

AUX, POSS = "ERR_AUX_ESSERE", "ERR_POSSESSIVE_ARTICLE"


def doc(i, cefr="A1", codes=(), kind="direct"):
    d = {"id": f"s_{i}", "source": "tatoeba", "source_id": str(i), "author": "a", "license": "CC BY 2.0 FR", "it": f"Frase {i}.", "es": f"Frase es {i}.",
         "es_source_id": str(i + 1000), "es_author": "b", "translation_kind": kind, "cefr_estimate": cefr, "cefr_confidence": 0.6, "qa_flags": [],
         "error_codes": list(codes), "tag_rules": {c: f"r_{c}" for c in codes}, "review_status": "needs_review"}
    if kind == "pivot":
        d["pivot_via"] = "555"
    return d


@pytest.fixture
def auth():
    con = store.connect(":memory:")
    promote.ensure_catalog(con)
    return con


def put(con, *docs):
    for d in docs:
        store.upsert(con, "sentences", d)
    con.commit()


def test_report_with_no_reviews_is_zeroed(auth):
    r = report.build_report(auth)
    assert r == {"reviewed": 0, "decisions": {"validated": 0, "rejected": 0, "doubt": 0}, "tag_precision": {},
                 "level_agreement": {"matrix": {}, "agreement": 0.0}, "pivot_rejection_rate": 0.0}


def test_tag_precision_per_rule(auth):
    put(auth, doc(1, codes=[AUX, POSS]), doc(2, codes=[AUX]), doc(3, codes=[AUX]))
    batch.record_decision(auth, "s_1", {"action": "approve", "tags": {AUX: True, POSS: True}})
    batch.record_decision(auth, "s_2", {"action": "approve", "tags": {AUX: False}})
    batch.record_decision(auth, "s_3", {"action": "approve", "tags": {AUX: True}})
    p = report.build_report(auth)["tag_precision"]
    assert p[f"r_{AUX}"] == {"code": AUX, "accepted": 2, "rejected": 1, "precision": pytest.approx(2 / 3)}
    assert p[f"r_{POSS}"] == {"code": POSS, "accepted": 1, "rejected": 0, "precision": 1.0}


def test_level_confusion_matrix_and_agreement(auth):
    put(auth, doc(1, "A1"), doc(2, "A1"), doc(3, "A2"))
    batch.record_decision(auth, "s_1", {"action": "approve"})
    batch.record_decision(auth, "s_2", {"action": "approve", "cefr": "B1"})
    batch.record_decision(auth, "s_3", {"action": "approve"})
    la = report.build_report(auth)["level_agreement"]
    assert la["matrix"] == {"A1": {"A1": 1, "B1": 1}, "A2": {"A2": 1}} and la["agreement"] == pytest.approx(2 / 3)


def test_pivot_rejection_rate_ignores_direct_and_doubt(auth):
    put(auth, doc(1, kind="pivot"), doc(2, kind="pivot"), doc(3, kind="pivot"), doc(4, kind="direct"))
    batch.record_decision(auth, "s_1", {"action": "approve", "translation_ok": True})
    batch.record_decision(auth, "s_2", {"action": "reject", "reason": "mala traducción"})
    batch.record_decision(auth, "s_3", {"action": "doubt"})
    batch.record_decision(auth, "s_4", {"action": "reject"})
    r = report.build_report(auth)
    assert r["pivot_rejection_rate"] == 0.5 and r["decisions"] == {"validated": 1, "rejected": 2, "doubt": 1}


def test_latest_decision_wins_in_every_metric(auth):
    put(auth, doc(1, "A1", [AUX], kind="pivot"))
    batch.record_decision(auth, "s_1", {"action": "approve", "translation_ok": True, "tags": {AUX: True}, "cefr": "B1"})
    batch.record_decision(auth, "s_1", {"action": "reject"})
    r = report.build_report(auth)
    assert r["reviewed"] == 1 and r["pivot_rejection_rate"] == 1.0
    assert r["decisions"] == {"validated": 0, "rejected": 1, "doubt": 0}


def test_cli_report_stage_prints_the_three_gate_numbers(tmp_path, capsys):
    a = tmp_path / "a.db"
    con = store.connect(a)
    promote.ensure_catalog(con)
    put(con, doc(1, "A1", [AUX]))
    batch.record_decision(con, "s_1", {"action": "approve", "tags": {AUX: True}})
    con.close()
    assert cli.main(["report", "--authoring-db", str(a), "--work-db", str(tmp_path / "w.db")]) == 0
    out = capsys.readouterr().out
    assert "precisión por regla" in out and "acuerdo de nivel" in out and "rechazo del pivote" in out and f"r_{AUX}" in out


def test_double_approval_does_not_fake_level_agreement(auth):
    put(auth, doc(1, "A2"))
    batch.record_decision(auth, "s_1", {"action": "approve", "cefr": "B1"})
    batch.record_decision(auth, "s_1", {"action": "approve", "cefr": "B1"})
    assert report.build_report(auth)["level_agreement"] == {"matrix": {"A2": {"B1": 1}}, "agreement": 0.0}
