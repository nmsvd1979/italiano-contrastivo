import json
from pathlib import Path

import pytest

from pipeline.exercises.modules import validate_modules

PACK = Path(__file__).resolve().parents[2] / "web/public/content"


def _base():
    course = {"units": [{"id": "u1", "level": "A1"}, {"id": "u2", "level": "A1"}],
              "modules": [{"id": "m1", "level": "A1", "can_do_es": ["a", "b", "c"], "units": ["u1", "u2"], "entry_reading": "rd1", "roleplays": ["rp1"], "tasks": [], "phrase_groups": ["g1"], "library": "l1", "library_task_es": "x"}]}
    return course, [{"id": "rd1"}], {"roleplays": [{"id": "rp1"}], "tasks": [], "phrases": {"groups": [{"id": "g1"}]}}, [{"id": "l1"}]


def test_un_modulo_valido_pasa():
    assert validate_modulos_ok(*_base())


def validate_modulos_ok(course, readings, speaking, library):
    return validate_modules(course, readings, speaking, library) == []


@pytest.mark.parametrize("cambio,fragmento", [
    (lambda c, r, s, l: c["modules"][0].update(units=["u1"]), "no pertenece a ningún módulo"),
    (lambda c, r, s, l: c["modules"].append({**c["modules"][0], "id": "m2", "units": ["u1"]}), "está en dos módulos"),
    (lambda c, r, s, l: c["modules"][0].update(units=["u1", "u2", "u9"]), "no está activa"),
    (lambda c, r, s, l: c["modules"][0].update(entry_reading="nada"), "texto de entrada"),
    (lambda c, r, s, l: c["modules"][0].update(roleplays=["rp9"]), "no existe"),
    (lambda c, r, s, l: c["modules"][0].update(can_do_es=["a"]), "sé hacer"),
    (lambda c, r, s, l: c["modules"][0].update(library="nada"), "Biblioteca"),
    (lambda c, r, s, l: c["modules"][0].update(roleplays=[]), "declara el hueco"),
])
def test_rechaza_modulos_mal_armados(cambio, fragmento):
    c, r, s, l = _base()
    cambio(c, r, s, l)
    assert any(fragmento in e for e in validate_modules(c, r, s, l)), fragmento


def test_un_hueco_declarado_permite_un_modulo_sin_salida_oral():
    c, r, s, l = _base()
    c["modules"][0].update(roleplays=[], gap_es="sin diálogo abierto")
    assert validate_modules(c, r, s, l) == []


def test_el_curso_real_reparte_todas_las_unidades_de_a1_en_11_modulos_sin_perder_ni_repetir():
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    a1 = [u["id"] for u in course["units"] if u["level"] == "A1"]
    in_modules = [u for m in course["modules"] for u in m["units"]]
    assert len(course["modules"]) == 11 and sorted(in_modules) == sorted(a1) and len(a1) == 65
    for m in course["modules"]:
        assert 3 <= len(m["units"]) <= 8, m["id"]          # una situación con pocas cápsulas: ni migas ni bloques enormes
        assert 3 <= len(m["can_do_es"]) <= 5, m["id"]


def test_una_unidad_cuya_lectura_es_la_entrada_de_su_modulo_no_repite_el_paso_de_lectura():
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    entry = {u: m["entry_reading"] for m in course["modules"] for u in m["units"]}
    for u in course["units"]:
        es_entrada = bool(u.get("readings")) and u["readings"][0] == entry.get(u["id"])
        assert bool(u.get("reading_is_entry")) == es_entrada, u["id"]


def test_la_ruta_sigue_el_orden_de_los_modulos():
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    en_modulos = [u for m in course["modules"] for u in m["units"]]
    orden = [u["id"] for u in course["units"] if u["id"] in set(en_modulos)]
    assert orden == en_modulos
