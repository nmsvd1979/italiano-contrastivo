"""Plan de cobertura A2 (CILS y PLIDA). Mientras `cierre` sea false valida que el plan esté completo y coherente (cada requisito en un módulo
planificado, cada módulo con trabajo definido, lo existente referenciado de verdad). Al cerrar A2 se pone `cierre: true` y se exige ≥ 80 % cubierto."""
import json
from collections import Counter
from pathlib import Path

from ruta_obligatoria import obligatorio

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "web/public/content"
DOC = json.loads((ROOT / "schemas/data/syllabus-a2.json").read_text(encoding="utf8"))


def _ids():
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    sp = json.loads((PACK / "speaking.json").read_text(encoding="utf8"))
    return {
        "units": {u["id"] for u in course["units"]},
        "modules": {m["id"] for m in course["modules"]},
        "readings": {r["id"] for r in json.loads((PACK / "readings.json").read_text(encoding="utf8"))},
        "roleplays": {r["id"] for r in sp["roleplays"]},
        "tasks": {t["id"] for t in sp["tasks"]},
        "phrase_groups": {g["id"] for g in sp["phrases"]["groups"]},
    }


def test_cada_requisito_esta_en_un_modulo_planificado_y_sus_referencias_existen():
    ids, mods, seen = _ids(), {m["id"] for m in DOC["modulos_planificados"]}, set()
    for q in DOC["requisitos"]:
        assert q["id"] not in seen
        seen.add(q["id"])
        assert q["module"] in mods, q["id"]
        for kind, refs in q["refs"].items():
            for x in refs:
                assert x in ids[kind], (q["id"], kind, x)
        if q["status"] in ("covered", "partial"):
            assert q["refs"], q["id"]
        if q["status"] == "covered":
            assert "gap_es" not in q
        else:
            assert q.get("gap_es") and q.get("how_es"), q["id"]


def test_cada_modulo_planificado_tiene_trabajo_definido_y_requisitos():
    usados = Counter(q["module"] for q in DOC["requisitos"])
    for m in DOC["modulos_planificados"]:
        assert 3 <= len(m["can_do_es"]) <= 5, m["id"]
        assert m["codes"] and m["work_es"] and m["sources_es"] and m["authored_texts"] and m["speaking"], m["id"]
        assert usados[m["id"]] >= 3, m["id"]


def test_los_modulos_a2_son_pocos_y_el_nivel_es_a2():
    assert DOC["nivel"] == "A2" and 8 <= len(DOC["modulos_planificados"]) <= 10   # A2 más compacto que A1 (hoja de ruta §2)


def test_al_cerrar_el_nivel_se_exige_la_cobertura():
    if not DOC["cierre"]:
        return
    c = Counter(q["status"] for q in DOC["requisitos"])
    assert c["covered"] / (sum(c.values()) - c["deferred"]) >= 0.8, c


def test_al_cerrar_a2_lo_cubierto_se_apoya_en_algo_obligatorio_de_la_ruta():
    """Misma regla que en A1: la ruta es el camino único. Solo se exige al cerrar el nivel (hasta entonces el plan declara huecos)."""
    if not DOC["cierre"]:
        return
    oblig = obligatorio("A2")
    flojos = [q["id"] for q in DOC["requisitos"] if q["status"] == "covered" and not any(x in oblig.get(kind, set()) for kind, refs in q["refs"].items() for x in refs)]
    assert not flojos, flojos
