"""Textos propios de A2 (Fase 4): que estén completos y cumplan las reglas de escritura. Los escribió la IA; esta prueba no los vuelve «verificados»."""
import json
import re
from pathlib import Path

from pipeline.audit_rules import italian_issue
from pipeline.exercises import relatos
from pipeline.exercises.readings import load_readings

ROOT = Path(__file__).resolve().parents[2]
SPEAK = json.loads((ROOT / "schemas/data/speaking-a2.json").read_text(encoding="utf8"))
READINGS = {r["id"]: r for r in load_readings(ROOT / "content/readings") if r["level"] == "A2" and r.get("authored")}   # los A2 de libro (p. ej. rd_giornatabrutta) se prueban en test_readings


def test_cada_modulo_de_a2_tiene_su_salida_completa():
    assert sorted(SPEAK["modules"]) == [f"a2m{n:02d}" for n in range(1, 11)]
    for m, d in SPEAK["modules"].items():
        assert len(d["interview"]) >= 6, m
        assert {"texto_es", "mensaje_es"} <= set(d["writing"]), m
        assert len(d["roleplays"]) >= 2 and d["task"]["questions"], m
        assert any(i.startswith(f"ls_{m}") for i in d["readings"]), f"{m}: falta la escucha"
        for rp in d["roleplays"]:
            r = READINGS[rp["reading"]]
            assert r["kind"] == "dialogo" and 0 <= rp["from"] < rp["to"] < len(r["sentences"]), rp["id"]   # `to` inclusivo (speaking.ts)
        for i in d["readings"]:
            assert i in READINGS, i


def test_los_textos_de_a2_cumplen_las_reglas_de_nivel():
    for r in READINGS.values():
        assert r.get("authored") and r["level"] == "A2" and all(len(q["options"]) == 3 for q in r["questions"]), r["id"]
        for s in r["sentences"]:
            allow = {"condizionale", "imperativo_formale"}
            assert not italian_issue(s["it"], "A2", allow), (s["id"], s["it"])
            assert not re.search(r"\b(vos|tenés|nomás|pololo|frutillas?|centavos)\b", s["es"], re.I), (s["id"], s["es"])   # español neutro


def test_los_relatos_de_a2_son_validos_y_hay_siete():
    rel = json.loads((ROOT / "content/relatos/a2.json").read_text(encoding="utf8"))["relatos"]
    assert len(rel) >= 7
    for r in rel:
        assert relatos.validate_relato(r) == [], r["id"]
    assert len({r["id"] for r in rel}) == len(rel)


def test_el_hito_trae_tres_lecturas_dos_escuchas_y_dos_tareas():
    h = SPEAK["hito"]
    rs = [READINGS[i] for i in h["readings"]]
    assert sum(1 for r in rs if r.get("exam") and not r.get("listen")) == 3 and sum(1 for r in rs if r.get("exam") and r.get("listen")) == 2
    assert len(h["tasks"]) == 2
