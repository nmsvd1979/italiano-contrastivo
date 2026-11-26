"""Esquemas de la ruta y de los programas (schemas/data/*.schema.json): los archivos reales los cumplen y los defectos típicos se rechazan.
No están en la raíz de schemas/ a propósito: no generan tipos ni modelos (los tipos de la web están en content/load.ts)."""
import copy
import json
from pathlib import Path

import jsonschema
import pytest

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "schemas/data"


def _load(p: Path):
    return json.loads(p.read_text(encoding="utf8"))


def _errors(schema_name: str, doc) -> list:
    schema = _load(DATA / f"{schema_name}.schema.json")
    jsonschema.Draft202012Validator.check_schema(schema)
    return list(jsonschema.Draft202012Validator(schema).iter_errors(doc))


@pytest.mark.parametrize("schema,path", [
    ("course-source", DATA / "course.json"),
    ("course", ROOT / "web/public/content/course.json"),
    ("syllabus", DATA / "syllabus-a1.json"),
    ("syllabus", DATA / "syllabus-a2.json"),
])
def test_los_archivos_reales_cumplen_su_esquema(schema, path):
    errs = _errors(schema, _load(path))
    assert not errs, [(list(e.path), e.message[:120]) for e in errs[:5]]


def test_un_modulo_acepta_ids_de_a2_y_rechaza_ids_raros():
    course = _load(ROOT / "web/public/content/course.json")
    ok = copy.deepcopy(course)
    ok["modules"][0]["id"] = "a2m01"
    assert not _errors("course", ok)
    bad = copy.deepcopy(course)
    bad["modules"][0]["id"] = "modulo1"
    assert _errors("course", bad)


@pytest.mark.parametrize("mutar", [
    lambda c: c["units"][0].pop("ficha_es"),                       # toda unidad lleva su ficha
    lambda c: c["units"][0].__setitem__("codes", ["ERR_A", "ERR_B"]),   # un solo código por unidad (codes[0] identifica la tarjeta de repaso)
    lambda c: c["units"][0].__setitem__("productive", "no"),
    lambda c: c["levels"][0].__setitem__("milestone", "si"),
    lambda c: c["modules"][0].__setitem__("can_do_es", ["solo uno"]),
    lambda c: c["units"][0].__setitem__("nivel_raro", 1),
])
def test_el_esquema_de_la_ruta_rechaza_los_defectos_tipicos(mutar):
    course = _load(ROOT / "web/public/content/course.json")
    mutar(course)
    assert _errors("course", course)


@pytest.mark.parametrize("mutar", [
    lambda d: d["requisitos"][0].__setitem__("area", "funciones"),      # los nombres de área son los de A1: gramatica/lexico/funcion/texto/fonologia
    lambda d: d["requisitos"][0].__setitem__("status", "cubierto"),
    lambda d: d["requisitos"][0].__setitem__("scope", "X"),
    lambda d: d["requisitos"][0].pop("source"),
    lambda d: d["requisitos"][0].__setitem__("capsulas", ["c01"]),
    lambda d: d["modulos_planificados"][0]["capsulas"][0].__setitem__("scope", "B"),
    lambda d: d["modulos_planificados"][0].__setitem__("interview_min", 2),
])
def test_el_esquema_del_programa_rechaza_los_defectos_tipicos(mutar):
    doc = _load(DATA / "syllabus-a2.json")
    mutar(doc)
    assert _errors("syllabus", doc)
