"""Programa A2 (CILS, PLIDA y Sillabo) y plan de módulos y cápsulas. Mientras `cierre` sea false valida que el plan esté completo y coherente:
cada requisito con fuente, alcance (O/A), módulo, cápsulas y evidencia; cada cápsula justificada por algún requisito; lo existente referenciado de verdad;
lo planificado con ids que no pisan lo que ya existe. Al cerrar A2 se pone `cierre: true` y se exige ≥ 80 % cubierto y apoyado en algo obligatorio."""
import json
import re
from collections import Counter
from pathlib import Path

from ruta_obligatoria import obligatorio

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "web/public/content"
DOC = json.loads((ROOT / "schemas/data/syllabus-a2.json").read_text(encoding="utf8"))

STATUS = {"covered", "partial", "prior", "gap", "deferred"}
AREAS = {"gramatica", "lexico", "funcion", "texto", "fonologia"}
OLD_IDS = (["g%02d" % i for i in range(1, 21)] + ["f%02d" % i for i in range(1, 15)] + ["l%02d" % i for i in range(1, 9)] + ["t%02d" % i for i in range(1, 7)] + ["p01"])   # el archivo anterior (49 requisitos)
PLIDA_AREAS_A2 = 21   # PLIDA A2, p. 17–18


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


def _capsulas():
    return {c["id"]: {**c, "module": m["id"]} for m in DOC["modulos_planificados"] for c in m["capsulas"]}


def test_encabezado_fuentes_y_alcance():
    assert DOC["version"] == 2 and DOC["nivel"] == "A2" and isinstance(DOC["cierre"], bool)
    assert set(DOC["areas"]) == AREAS
    assert set(DOC["alcance"]) >= {"O", "A", "estados"} and set(DOC["alcance"]["estados"]) == STATUS
    ids = {f["id"] for f in DOC["fuentes"]}
    assert {"cils-a2", "plida-sillabo", "sillabo-enti-a2", "libros-abiertos", "notebooklm"} <= ids
    assert all(f["url"] and f["uso"] and f["leido"] for f in DOC["fuentes"])
    assert len(DOC["no_es_a2"]) >= 3   # lo que se queda fuera está dicho


def test_cada_requisito_tiene_fuente_area_alcance_y_estado_validos():
    seen = set()
    mods = {m["id"] for m in DOC["modulos_planificados"]}
    for q in DOC["requisitos"]:
        assert q["id"] not in seen, q["id"]
        seen.add(q["id"])
        assert q["area"] in AREAS, q["id"]
        assert q["status"] in STATUS, q["id"]
        assert q["scope"] in {"O", "A"} and q["origen"] in {"oficial", "proyecto"}, q["id"]
        assert q["source"].strip() and q["text_es"].strip(), q["id"]
        if q["module"] is None:   # sin módulo: ya cubierto en A1 o un hueco declarado que A2 no cierra
            assert q["status"] in ("prior", "deferred"), f"{q['id']} no está en ningún módulo y no es de A1 ni un hueco declarado"
        else:
            assert q["module"] in mods, q["id"]
        if q["source"].startswith("Ampliado"):
            assert q["origen"] == "proyecto", q["id"]


def test_las_referencias_a_lo_existente_son_reales_y_lo_declarado_trae_su_hueco():
    ids = _ids()
    kinds = set(ids)
    for q in DOC["requisitos"]:
        for kind, refs in q["refs"].items():
            assert kind in kinds, (q["id"], kind)
            for x in refs:
                assert x in ids[kind], (q["id"], kind, x)
        if q["status"] in ("covered", "partial", "prior"):
            assert q["refs"], f"{q['id']} dice cubrir algo pero no apunta a nada"
        if q["status"] in ("covered", "prior"):
            assert "gap_es" not in q, q["id"]
        else:
            assert q.get("gap_es") and q.get("how_es"), q["id"]


def test_la_evidencia_detecta_lo_que_dice_y_no_lo_que_no_dice():
    """Cada expresión se aplica sin distinguir mayúsculas (como lo hará la lista de cierre) y debe acertar con sus propios ejemplos:
    así se evita que cuente presentes como imperfetto, cualquier «che» como relativo o cualquier palabra con mayúscula como nombre propio."""
    n = 0
    for q in DOC["requisitos"]:
        ev = q.get("evidence")
        if not ev:
            continue
        n += 1
        rx = re.compile(ev["regex"], re.IGNORECASE)
        assert ev["in"] == "sentences" and 5 <= ev["min"] <= 60, q["id"]
        assert q["area"] == "gramatica", f"{q['id']}: la evidencia en frases es para gramática"
        for frase in ev["si"]:
            assert rx.search(frase), f"{q['id']}: debería detectar «{frase}»"
        for frase in ev["no"]:
            assert not rx.search(frase), f"{q['id']}: no debería detectar «{frase}»"
    assert n >= 30   # casi todo el programa gramatical se puede comprobar en frases


def test_ningun_requisito_pide_nada_que_plida_clasifique_como_b1():
    """PLIDA B1 (p. 24–25 y 28): CV, anuncios de empleo, entrevista de trabajo, reclamar, aconsejar y promociones no son A2."""
    texto = json.dumps(DOC["requisitos"], ensure_ascii=False).lower() + json.dumps([m["planned"] for m in DOC["modulos_planificados"]]).lower()
    for prohibido in ("doc_cv", "annuncio_lavoro", "colloquio", "rp_reclamo", "doc_consigli"):
        assert prohibido not in texto, prohibido
    assert "rp_albergo2" in texto   # el alojamiento sí, sin reclamo detallado


def test_hay_36_capsulas_bien_formadas_y_sus_codigos_no_se_pisan():
    caps = _capsulas()
    assert len(caps) == 36 and sorted(caps) == [f"a2c{i:02d}" for i in range(1, 37)]
    codes = [c["code"] for c in caps.values()]
    assert len(codes) == len(set(codes)), [c for c, n in Counter(codes).items() if n > 1]
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    unit_of = {u["codes"][0]: u["id"] for u in course["units"]}
    for c in caps.values():
        assert c["scope"] in {"O", "A"} and c["productive"] == (c["scope"] == "O"), c["id"]
        assert c["title_es"] and c["metodo"] and c["calco_es"], c["id"]
        if c["code"].startswith("ERR_VOC_"):
            assert "vocabulario" in c["metodo"], c["id"]
        if c["code"] in unit_of:   # un código ya usado por una unidad solo se reutiliza si esa unidad pasa al módulo
            mod = next(m for m in DOC["modulos_planificados"] if m["id"] == c["module"])
            assert unit_of[c["code"]] in mod["unidades_existentes"], (c["id"], c["code"], unit_of[c["code"]])


def test_cada_modulo_declara_sus_capsulas_codigos_textos_y_tareas():
    mods = DOC["modulos_planificados"]
    assert DOC["nivel"] == "A2" and len(mods) == 10 and [m["id"] for m in mods] == [f"a2m{i:02d}" for i in range(1, 11)]
    lib = {r["id"] for r in json.loads((PACK / "library.json").read_text(encoding="utf8"))}
    seen_planned: set[str] = set()
    ids = _ids()
    existing = ids["readings"] | ids["roleplays"] | ids["tasks"] | ids["phrase_groups"]
    for m in mods:
        assert m["estado"] in {"planificado", "en_construccion", "cerrado"}, m["id"]
        assert 3 <= len(m["can_do_es"]) <= 5 and m["situacion_es"], m["id"]
        assert [c["code"] for c in m["capsulas"]] == m["codes"], m["id"]
        assert 2 <= len(m["capsulas"]) <= 5, m["id"]
        assert m["entrada"]["id"] and m["entrada"]["fuente"] and m["libro_entrada_es"] and m["libros_preguntas_es"] and m["autorales_es"], m["id"]
        assert m["library"] in lib and m["library_task_es"], m["id"]
        assert m["writing_es"] and m["writing_short_es"] and m["interview_min"] >= 5, m["id"]
        p = m["planned"]
        assert p["roleplays"] and p["tasks"] and p["extra_readings"], m["id"]
        for kind in ("roleplays", "tasks", "extra_readings", "phrase_groups", "relatos"):
            for x in p.get(kind, []):
                assert x not in seen_planned, f"{x} está planificado dos veces"
                seen_planned.add(x)
                assert x not in existing, f"{x} ya existe en la app: se pisaría"
        assert m["entrada"]["id"] not in seen_planned
    assert len(DOC["modulos_planificados"][2]["planned"]["relatos"]) >= 7   # el ejercicio de relato de a2m03


def test_cada_capsula_se_justifica_con_un_requisito_y_cada_requisito_con_capsulas_las_tiene_planificadas():
    caps = _capsulas()
    cited = {c for q in DOC["requisitos"] for c in q.get("capsulas", [])}
    assert not cited - set(caps), cited - set(caps)
    assert not set(caps) - cited, f"cápsulas sin requisito: {sorted(set(caps) - cited)}"


def test_lo_que_se_exige_al_producir_tiene_donde_practicarse():
    """Un requisito pendiente [O] necesita una cápsula, un juego de rol, una tarea o un texto planificados (si no, A2 se cerraría sin practicarlo)."""
    caps = _capsulas()
    for q in DOC["requisitos"]:
        if q["scope"] == "O" and q["status"] in ("gap", "partial"):
            assert q.get("capsulas") or q.get("planned") or q["area"] == "lexico" or q["id"] == "p01", q["id"]
        for c in q.get("capsulas", []):
            if q["area"] == "gramatica" and q["scope"] == "O" and q["status"] != "prior":
                assert caps[c]["productive"] or q.get("planned"), f"{q['id']} exige producir pero {c} solo se reconoce y no hay tarea"


def test_las_21_areas_tematicas_de_plida_a2_estan_todas():
    areas = [q for q in DOC["requisitos"] if q["area"] == "lexico"]
    assert len(areas) == PLIDA_AREAS_A2
    assert all(q["source"].startswith("PLIDA A2") for q in areas)


def test_la_correspondencia_con_el_archivo_anterior_cubre_los_49_requisitos():
    new = {q["id"] for q in DOC["requisitos"]}
    corr = DOC["correspondencias"]
    assert sorted(c["antes"] for c in corr) == sorted(OLD_IDS)
    for c in corr:
        assert c["motivo"].strip(), c["antes"]
        if not c["ahora"]:
            assert "BAJA" in c["motivo"], f"{c['antes']} desaparece sin decir por qué"
        assert set(c["ahora"]) <= new, (c["antes"], set(c["ahora"]) - new)


def test_el_congiuntivo_y_lo_de_b1_no_estan_en_los_requisitos_de_a2():
    texto = " ".join(q["text_es"].lower() for q in DOC["requisitos"]).replace("sin congiuntivo", "")   # «opinar sin congiuntivo» sí es de A2
    assert "congiuntivo" not in texto and "subjuntivo" not in texto
    assert not any("ERR_CONGIUNTIVO" in c["code"] for c in _capsulas().values())


def test_al_cerrar_el_nivel_se_exige_la_cobertura():
    if not DOC["cierre"]:
        return
    c = Counter(q["status"] for q in DOC["requisitos"] if q["status"] != "prior")
    assert c["covered"] / (sum(c.values()) - c["deferred"]) >= 0.8, c
    assert all(m["estado"] == "cerrado" for m in DOC["modulos_planificados"])


def test_al_cerrar_a2_lo_cubierto_se_apoya_en_algo_obligatorio_de_la_ruta():
    """Misma regla que en A1: la ruta es el camino único. Solo se exige al cerrar el nivel (hasta entonces el plan declara huecos)."""
    if not DOC["cierre"]:
        return
    oblig = obligatorio("A2")
    flojos = [q["id"] for q in DOC["requisitos"] if q["status"] == "covered" and not any(x in oblig.get(kind, set()) for kind, refs in q["refs"].items() for x in refs)]
    assert not flojos, flojos
