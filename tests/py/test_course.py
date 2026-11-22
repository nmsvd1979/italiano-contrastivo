import json
from pathlib import Path

import pytest

from pipeline.exercises import course as C

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "web/public/content"


def _sents(n):
    return [{"id": f"s{i:03d}", "it": f"x{i}"} for i in range(n)]


def test_la_prueba_se_reserva_y_no_aparece_en_la_practica():
    parts = C.assign_parts(_sents(20), ["ERR_X"])
    assert len(parts["prueba"]) == C.TEST_SIZE
    assert not set(parts["prueba"]) & set(parts["practica"])
    assert set(parts["descubre"]) <= set(parts["practica"]) and set(parts["escucha"]) <= set(parts["practica"])
    assert len(parts["descubre"]) == C.DISCOVER_SIZE and len(parts["escucha"]) == C.LISTEN_SIZE


def test_la_prueba_se_reparte_por_todo_el_rango_de_dificultad():
    parts = C.assign_parts(_sents(40), ["ERR_X"])
    idx = [int(i[1:]) for i in parts["prueba"]]
    assert idx == sorted(idx) and min(idx) >= C.DISCOVER_SIZE  # no usa las 4 más fáciles (van a «Descubre»)
    assert idx[0] < 12 and idx[-1] > 33  # cubre desde lo fácil hasta lo difícil, no solo el extremo duro
    assert len(parts["practica"]) == 34 and set(parts["descubre"]) == {f"s{i:03d}" for i in range(4)}


def test_unidades_a1_solo_aceptan_oraciones_que_pasan_el_prefiltro():
    ok = {"it": "Io parlo italiano.", "es": "Hablo italiano."}
    assert C.fit_for_level(ok, "A1")
    for it, es in [("Lui aveva ragione prima.", "Tenía razón antes."),
                   ("Credo che sia malata, ma non lo so con certezza e non voglio dirlo a nessuno.", "Creo que está enferma."),
                   ("Mi piacerebbe andare in Francia.", "Me gustaría ir a Francia.")]:
        assert not C.fit_for_level({"it": it, "es": es}, "A1"), it
    assert C.fit_for_level({"it": "Credo che sia malata.", "es": "Creo que está enferma."}, "B1")  # el filtro es solo de A1


def test_unidad_sin_oraciones_suficientes_baja_a_planned(monkeypatch):
    raw = {"version": 1, "levels": [], "planned": [], "units": [
        {"id": "u1", "level": "A1", "title": "Pocas", "goal_es": "g", "codes": ["ERR_PERSONAL_A"], "why_here": "w"}]}
    monkeypatch.setattr(C, "load_course", lambda: raw)
    out = C.build_course([], {"ERR_PERSONAL_A": {"explanation_es": "e"}})
    assert out["units"] == [] and "oraciones validadas" in out["planned"][0]["reason"]


def test_curso_real_es_consistente():
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    sentences = {s["id"]: s for s in json.loads((PACK / "sentences.json").read_text(encoding="utf8"))}
    assert course["units"], "el curso real no tiene unidades activas"
    ids = [u["id"] for u in course["units"]]
    assert len(set(ids)) == len(ids)  # el orden lo da la lista, no el número del id (los ids guardan progreso y no se renumeran)
    levels = [l["id"] for l in course["levels"]]
    core = [u for u in course["units"] if not u["level"].endswith("+")]  # el vocabulario opcional («A1+») va aparte, al final
    assert [levels.index(u["level"]) for u in core] == sorted(levels.index(u["level"]) for u in core)
    items = json.loads((PACK / "items_by_code.json").read_text(encoding="utf8"))
    for u in course["units"]:
        code = u["codes"][0]
        for part, sids in u["parts"].items():
            assert all(i in sentences for i in sids), (u["id"], part)
        assert not set(u["parts"]["prueba"]) & set(u["parts"]["practica"])
        by_sentence = {i["sentence_id"] for i in items[code]}
        assert set(u["parts"]["practica"]) <= by_sentence and set(u["parts"]["prueba"]) <= by_sentence
        for d in u["divergences"]:  # el tramo resaltado cae dentro de la oración
            assert 0 <= d["start"] < d["end"] <= len(sentences[d["id"]]["it"])
    assert all(p["reason"] for p in course["planned"])
