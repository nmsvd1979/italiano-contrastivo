"""Cobertura del programa A1 (CILS y PLIDA): cada requisito apunta a algo que existe, y lo que falta está declarado con su plan.
Es el criterio de «A1 terminado» del proyecto: cobertura declarada + hito + que el usuario complete los módulos."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "web/public/content"
DOC = json.loads((ROOT / "schemas/data/syllabus-a1.json").read_text(encoding="utf8"))


def _ids():
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    sp = json.loads((PACK / "speaking.json").read_text(encoding="utf8"))
    return {
        "units": {u["id"] for u in course["units"] if u["level"] == "A1"},
        "modules": {m["id"] for m in course["modules"]},
        "readings": {r["id"] for r in json.loads((PACK / "readings.json").read_text(encoding="utf8"))},
        "roleplays": {r["id"] for r in sp["roleplays"]},
        "tasks": {t["id"] for t in sp["tasks"]},
        "phrase_groups": {g["id"] for g in sp["phrases"]["groups"]},
    }


def test_cada_referencia_existe_y_lo_cubierto_trae_referencias():
    ids = _ids()
    seen = set()
    for q in DOC["requisitos"]:
        assert q["id"] not in seen
        seen.add(q["id"])
        for kind, refs in q["refs"].items():
            for x in refs:
                assert x in ids[kind], (q["id"], kind, x)
        if q["status"] in ("covered", "partial"):
            assert q["refs"], f"{q['id']} dice cubrir algo pero no apunta a nada"


def test_lo_que_falta_declara_el_hueco_y_como_cerrarlo_y_lo_cubierto_no_declara_huecos():
    for q in DOC["requisitos"]:
        assert q["status"] in {"covered", "partial", "gap", "deferred"}, q["id"]
        if q["status"] == "covered":
            assert "gap_es" not in q, f"{q['id']} está «covered» pero declara un hueco"
        else:
            assert q.get("gap_es") and q.get("how_es"), q["id"]


def test_todas_las_unidades_de_a1_sirven_a_algun_requisito_o_son_de_apoyo():
    """Una unidad que no cubre ningún requisito del programa es contenido sin justificar: debe ser de las pocas de apoyo declaradas."""
    used = {u for q in DOC["requisitos"] for u in q["refs"].get("units", [])}
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    mod_ok = {u for q in DOC["requisitos"] for mid in q["refs"].get("modules", []) for m in course["modules"] if m["id"] == mid for u in m["units"]}
    soporte = {"u28", "u71", "u72"}   # animales: vocabulario de la lista PLIDA «ambiente», sin requisito propio
    sueltas = {u for u in _ids()["units"] if u not in used | mod_ok | soporte}
    assert not sueltas, sorted(sueltas)


def test_la_cobertura_es_suficiente_y_los_huecos_son_pocos():
    from collections import Counter
    c = Counter(q["status"] for q in DOC["requisitos"])
    assert c["covered"] / (sum(c.values()) - c["deferred"]) >= 0.9, c
