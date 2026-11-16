import hashlib
import json

import pytest

from pipeline import export, promote
from pipeline.db import store
from pipeline.review import batch

AUX, POSS = "ERR_AUX_ESSERE", "ERR_POSSESSIVE_ARTICLE"
LEVELS = ["A1", "A2", "B1", "B2"]


def doc(i, cefr="A1", codes=(), author="Guybrush88", kind="direct"):
    d = {"id": f"s_{i}", "source": "tatoeba", "source_id": str(i), "license": "CC BY 2.0 FR", "it": f"Frase {i}.", "es": f"Frase es {i}.",
         "es_source_id": str(i + 1000), "es_author": "arh", "translation_kind": kind, "cefr_estimate": cefr, "cefr_confidence": 0.6,
         "qa_flags": [], "error_codes": list(codes), "tag_rules": {c: f"r_{c}" for c in codes}, "review_status": "needs_review"}
    if author:
        d["author"] = author
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


def read(out, level):
    return json.loads((out / "sentences" / f"{level}.json").read_text(encoding="utf8"))


def tree_hash(out):
    h = hashlib.sha1()
    for f in sorted(out.rglob("*")):
        if f.is_file():
            h.update(f.relative_to(out).as_posix().encode() + f.read_bytes())
    return h.hexdigest()


def test_export_only_validated_with_review_row(auth, tmp_path):
    put(auth, doc(1, "A1", [AUX]), doc(2, "A1", [AUX]), doc(3, "A1", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "approve"})
    auth.execute("UPDATE sentences SET review_status='validated', body=json_set(body,'$.review_status','validated') WHERE id='s_3'")  # sin fila en reviews
    export.export(auth, tmp_path)
    assert [d["id"] for d in read(tmp_path, "A1")] == ["s_1"]


def test_export_empty_is_valid(auth, tmp_path):
    manifest = export.export(auth, tmp_path)
    assert all(read(tmp_path, lv) == [] for lv in LEVELS)
    assert manifest["levels"] == {lv: 0 for lv in LEVELS} and manifest["codes"] == {} and manifest["authors"] == {}
    assert (tmp_path / "ATTRIBUZIONI-tatoeba.md").read_text(encoding="utf8").strip()
    assert json.loads((tmp_path / "manifest.json").read_text(encoding="utf8")) == manifest


def test_export_groups_by_corrected_level_and_counts(auth, tmp_path):
    put(auth, doc(1, "A1", [AUX]), doc(2, "A2", [AUX, POSS], author="otro"), doc(3, "A2", [], kind="pivot"))
    batch.record_decision(auth, "s_1", {"action": "approve", "cefr": "B1"})
    batch.record_decision(auth, "s_2", {"action": "approve"})
    batch.record_decision(auth, "s_3", {"action": "approve", "translation_ok": True})
    m = export.export(auth, tmp_path)
    assert [d["id"] for d in read(tmp_path, "B1")] == ["s_1"] and [d["id"] for d in read(tmp_path, "A2")] == ["s_2", "s_3"]
    assert m["levels"] == {"A1": 0, "A2": 2, "B1": 1, "B2": 0}
    assert m["codes"] == {AUX: 2, POSS: 1}
    assert m["translation_kind"] == {"direct": 2, "pivot": 1}
    assert m["authors"] == {"Guybrush88": 2, "otro": 1}


def test_every_exported_sentence_has_author_license_and_source_id(auth, tmp_path):
    put(auth, doc(1, "A1", [AUX]), doc(2, "A2", []))
    for i in (1, 2):
        batch.record_decision(auth, f"s_{i}", {"action": "approve"})
    export.export(auth, tmp_path)
    for lv in LEVELS:
        for d in read(tmp_path, lv):
            assert d["author"] and d["license"] == "CC BY 2.0 FR" and d["source_id"]


def test_sentence_without_author_is_excluded_and_reported(auth, tmp_path):
    put(auth, doc(1, "A1", [AUX], author=None), doc(2, "A1", [AUX]))
    for i in (1, 2):
        batch.record_decision(auth, f"s_{i}", {"action": "approve"})
    m = export.export(auth, tmp_path)
    assert [d["id"] for d in read(tmp_path, "A1")] == ["s_2"] and m["excluded_missing_attribution"] == ["s_1"]


def test_attribution_lists_every_exported_id_with_both_authors(auth, tmp_path):
    put(auth, doc(7, "A1", [AUX]), doc(8, "B2", []))
    for i in (7, 8):
        batch.record_decision(auth, f"s_{i}", {"action": "approve"})
    export.export(auth, tmp_path)
    text = (tmp_path / "ATTRIBUZIONI-tatoeba.md").read_text(encoding="utf8")
    for i in (7, 8):
        assert f"https://tatoeba.org/en/sentences/show/{i}" in text and f"https://tatoeba.org/en/sentences/show/{i + 1000}" in text
    assert "Guybrush88" in text and "arh" in text and "CC BY 2.0 FR" in text


def test_export_is_deterministic_and_idempotent(auth, tmp_path):
    put(auth, *[doc(i, LEVELS[i % 4], [AUX]) for i in range(1, 9)])
    for i in range(1, 9):
        batch.record_decision(auth, f"s_{i}", {"action": "approve"})
    export.export(auth, tmp_path / "a")
    export.export(auth, tmp_path / "b")
    export.export(auth, tmp_path / "b")
    assert tree_hash(tmp_path / "a") == tree_hash(tmp_path / "b")


def test_reject_after_approve_leaves_export(auth, tmp_path):
    put(auth, doc(1, "A1", [AUX]))
    batch.record_decision(auth, "s_1", {"action": "approve"})
    batch.record_decision(auth, "s_1", {"action": "reject", "reason": "error"})
    export.export(auth, tmp_path)
    assert read(tmp_path, "A1") == []
