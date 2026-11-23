import json
from pathlib import Path

import pytest

from pipeline.exercises import readings
from pipeline.tts.generate import texts_for_pack
from pipeline.tts.ids import clip_id

SRC = Path(__file__).resolve().parents[2] / "content" / "readings"
COURSE = Path(__file__).resolve().parents[2] / "schemas" / "data" / "course.json"


def test_las_lecturas_del_repo_son_validas():
    rs = readings.load_readings(SRC)
    assert len(rs) >= 4
    for r in rs:
        assert r["translation"].startswith("IA")
        assert r["source"]["license"].startswith("CC BY-NC")


def test_las_unidades_apuntan_a_lecturas_que_existen():
    ids = {r["id"] for r in readings.load_readings(SRC)}
    for u in json.loads(COURSE.read_text(encoding="utf8"))["units"]:
        assert set(u.get("readings", [])) <= ids


def test_validate_detecta_respuesta_fuera_de_rango():
    r = json.loads((SRC / "rd_zaino.json").read_text(encoding="utf8"))
    r["questions"][0]["answer"] = 9
    assert any("fuera de rango" in e for e in readings.validate(r))


def test_validate_exige_cuatro_preguntas():
    r = json.loads((SRC / "rd_zaino.json").read_text(encoding="utf8"))
    r["questions"] = r["questions"][:3]
    assert any("preguntas" in e for e in readings.validate(r))


def test_pack_tiene_audio_y_alimenta_el_tts(tmp_path):
    (tmp_path / "sentences.json").write_text("[]")
    (tmp_path / "lexemes.json").write_text("[]")
    rs = readings.build_pack(SRC, tmp_path)
    s = rs[0]["sentences"][0]
    assert s["audio"] == clip_id(s["it"])
    assert s["it"] in texts_for_pack(tmp_path)


def test_cada_palabra_de_las_lecturas_tiene_glosa_y_tamiz(tmp_path):
    rs = readings.build_pack(SRC, tmp_path)
    words = json.loads((tmp_path / "reading_words.json").read_text(encoding="utf8"))
    used = {t for r in rs for s in r["sentences"] for t in readings.tokens(s["it"])}
    assert used == set(words)
    for w, v in words.items():
        assert v["g"] and v["k"] in {"transparente", "regular", "opaca"}, w
        assert (v["k"] == "regular") == bool(v.get("r")), w


def test_tokens_separa_las_elisiones():
    assert readings.tokens("L'amico è qui, Giuditta.") == ["l", "amico", "è", "qui", "giuditta"]
