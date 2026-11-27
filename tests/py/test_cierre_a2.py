"""Lista de cierre de un módulo de A2 (plan A2 §7). Se aplica a cada módulo con `estado: "cerrado"` en schemas/data/syllabus-a2.json:
mientras un módulo no cumpla TODO esto no puede marcarse cerrado. Se escribió en rojo antes de construir a2m01.
Mide el paquete publicable (web/public/content) y los textos de content/readings; nada de esto lo da por verificado un nativo."""
import json
import re
from collections import Counter
from pathlib import Path

import pytest

from pipeline.audit_rules import italian_issue
from pipeline.exercises.course import fit_for_level

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "web/public/content"
SYL = json.loads((ROOT / "schemas/data/syllabus-a2.json").read_text(encoding="utf8"))
CLOSED = [m for m in SYL["modulos_planificados"] if m.get("estado") == "cerrado"]
MIN_SENTENCES = 30
MAX_PER_SKELETON = 3
MAX_TOM_MARY = 0.20
NAMES = {"tom", "mary", "maria", "marco", "giovanni", "john", "anna", "luca", "paolo", "giulia", "carlo", "sara", "ken", "mike", "bob", "paul", "jane"}


def _load(name):
    return json.loads((PACK / name).read_text(encoding="utf8"))


def _skeleton(it):
    return tuple("N" if t in NAMES else re.sub(r"\d+", "0", t) for t in re.findall(r"[\wàèéìòù']+", it.lower()))


@pytest.mark.skipif(not CLOSED, reason="ningún módulo de A2 marcado como cerrado")
@pytest.mark.parametrize("mod", CLOSED, ids=[m["id"] for m in CLOSED])
class TestCierreModuloA2:
    def setup_method(self):
        self.course = _load("course.json")
        self.sent = {s["id"]: s for s in _load("sentences.json")}
        self.readings = {r["id"]: r for r in _load("readings.json")}
        self.speaking = _load("speaking.json")

    def _module(self, mod):
        cm = next((m for m in self.course["modules"] if m["id"] == mod["id"]), None)
        assert cm, f"{mod['id']} no está en course.json"
        return cm

    def test_el_modulo_tiene_todos_los_elementos_de_la_forma(self, mod):
        cm = self._module(mod)
        assert cm["level"] == "A2" and len(cm["units"]) == len(mod["capsulas"])
        assert cm["entry_reading"] in self.readings
        extra = cm["extra_readings"]
        assert any(x == f"ls_{mod['id']}" and self.readings[x].get("listen") for x in extra), "falta la escucha a dos voces"
        assert any(x.startswith("doc_") or x.startswith("rd_") for x in extra if x in self.readings), "falta al menos un documento o texto"
        assert f"vh_{mod['id']}" in extra, "falta el dictado con voz humana del nivel"
        assert len(cm["roleplays"]) >= 2 and len(cm["tasks"]) >= 1
        assert cm["writing_es"] and cm.get("writing_short_es")
        bank = [q for q in self.speaking["interview"]["questions"] if q["module"] == mod["id"]]
        assert len(bank) >= mod.get("interview_min", 5)

    def test_cada_unidad_cumple_las_reglas_de_contenido(self, mod):
        cm = self._module(mod)
        units = {u["id"]: u for u in self.course["units"]}
        for uid in cm["units"]:
            u = units[uid]
            parts = u["parts"]
            ids = parts["practica"] + parts["prueba"]
            assert len(ids) >= MIN_SENTENCES, f"{uid}: {len(ids)} frases (mínimo {MIN_SENTENCES})"
            assert u.get("ficha_es") and u.get("why_here"), f"{uid}: falta ficha o why_here"
            sents = [self.sent[i] for i in ids]
            assert all(s["translation_kind"] in ("direct", "llm") for s in sents if "translation_kind" in s), uid
            tm = sum(1 for s in sents if any(t in NAMES for t in re.findall(r"[\wàèéìòù']+", s["it"].lower())))
            if u["codes"][0] != "ERR_PERSONAL_A":   # la «a» personal solo se ve con personas: sus frases llevan nombres propios por naturaleza
                assert tm / len(sents) <= MAX_TOM_MARY, f"{uid}: demasiados nombres propios ({tm}/{len(sents)})"
            per = Counter(_skeleton(s["it"]) for s in sents)
            assert max(per.values()) <= MAX_PER_SKELETON, f"{uid}: esqueleto repetido {per.most_common(1)}"
            for s in sents:
                assert fit_for_level({"it": s["it"], "es": s.get("es"), "cefr_estimate": s.get("cefr_estimate", "A2")}, "A2", u["codes"][0]) or "ERR_" in u["codes"][0], (uid, s["it"])
                assert not italian_issue(s["it"], "A2", {"condizionale", "imperativo_formale", "combinati"}), (uid, s["it"])
            assert 6 <= len(parts["prueba"]) <= 8, f"{uid}: la prueba debe tener 6–8 frases"
            assert all(self.sent[i].get("cefr_estimate") not in ("B2", "C1", "C2") for i in parts["prueba"]), f"{uid}: prueba con B2"
            assert len(parts.get("reserva", [])) >= 3 or len(parts["prueba"]) >= 6, uid

    def test_todo_texto_y_frase_del_modulo_tiene_audio_en_disco(self, mod):
        audio = ROOT / "web/public/audio"
        cm = self._module(mod)
        clips = {s["audio"] for u in self.course["units"] if u["id"] in cm["units"] for i in u["parts"]["practica"] + u["parts"]["prueba"] for s in [self.sent[i]]}
        clips |= {s["audio"] for rid in [cm["entry_reading"], *cm["extra_readings"]] if rid in self.readings for s in self.readings[rid]["sentences"]}
        missing = sorted(c for c in clips if not (audio / "tts" / f"{c}.mp3").exists() and not (audio / f"{c}.mp3").exists())
        assert not missing, f"{len(missing)} clips sin mp3, p. ej. {missing[:5]}"

    def test_las_lecturas_del_modulo_tienen_todas_sus_palabras(self, mod):
        words = _load("reading_words.json")
        cm = self._module(mod)
        for rid in [cm["entry_reading"], *cm["extra_readings"]]:
            if rid in self.readings:
                for s in self.readings[rid]["sentences"]:
                    for t in re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ]+", s["it"].lower()):
                        assert t in words, f"{rid}: «{t}» sin glosa"

    def test_los_requisitos_cubiertos_del_modulo_tienen_evidencia(self, mod):
        for q in SYL["requisitos"]:
            if q.get("module") == mod["id"] and q["status"] == "covered" and q["area"] == "gramatica":   # evidencia en frases solo para gramática; léxico, funciones y textos se apoyan en refs obligatorias (test_cobertura_a2)
                assert q.get("evidence"), q["id"]
