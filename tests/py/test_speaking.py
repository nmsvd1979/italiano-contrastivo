import json
from pathlib import Path

import pytest

from pipeline.exercises import speaking
from pipeline.tts.ids import clip_id

PACK = Path(__file__).resolve().parents[2] / "web/public/content"


def _readings():
    return [{"id": "rd_x", "sentences": [
        {"id": "a", "it": "Ciao.", "es": "Hola.", "speaker": "A"}, {"id": "b", "it": "Ciao!", "es": "¡Hola!", "speaker": "B"},
        {"id": "c", "it": "Come stai?", "es": "¿Cómo estás?", "speaker": "A"}, {"id": "d", "it": "Bene.", "es": "Bien.", "speaker": "B"},
        {"id": "e", "it": "Una frase de narración.", "es": "Narración."}]}]


def _doc(**rp):
    base = {"id": "rp1", "reading": "rd_x", "from": 0, "to": 3, "after": ["u1"]}
    return {"roleplays": [{**base, **rp}], "tasks": [], "alphabet": {"letters": []}}


def test_un_juego_de_roles_valido_pasa():
    assert speaking.validate(_doc(), _readings(), {"u1"}) == []


@pytest.mark.parametrize("rp,fragmento", [
    ({"reading": "no_existe"}, "no existe"),
    ({"to": 9}, "fuera de la lectura"),
    ({"to": 4}, "sin hablante"),                       # incluye la narración
    ({"to": 1}, "dos voces"),                           # un solo turno de cada voz
    ({"after": ["u99"]}, "la unidad u99 no existe"),
])
def test_rechaza_juegos_de_roles_mal_armados(rp, fragmento):
    assert any(fragmento in e for e in speaking.validate(_doc(**rp), _readings(), {"u1"}))


def test_las_tareas_exigen_fuente_rubrica_y_adaptacion():
    doc = {"roleplays": [], "alphabet": {"letters": []}, "tasks": [{"id": "t", "questions": [{"it": "a?"}] * 3, "after": ["u1"], "source": {}, "intro_es": "x", "checklist_es": [], "adaptation": ""}]}
    errs = speaking.validate(doc, [], {"u1"})
    assert any("source" in e for e in errs) and any("checklist_es" in e for e in errs) and any("adaptation" in e for e in errs)


def test_el_paquete_real_trae_audio_de_cada_pregunta_y_letra_y_los_dialogos_son_los_de_las_lecturas():
    sp = json.loads((PACK / "speaking.json").read_text(encoding="utf8"))
    readings = {r["id"]: r for r in json.loads((PACK / "readings.json").read_text(encoding="utf8"))}
    for t in sp["tasks"]:
        for q in t["questions"]:
            assert q["audio"] == clip_id(q["it"])
    assert all(x["audio"] == clip_id(x["name"]) for x in sp["alphabet"]["letters"])
    for rp in sp["roleplays"]:
        assert rp["reading"] in readings  # no hay italiano propio: todo es de un diálogo de libro abierto
    index = {r["id"] for r in json.loads((PACK / "../audio/index.json").read_text(encoding="utf8"))}
    texts = speaking.texts(sp)
    assert all(clip_id(t) in index for t in texts), "falta el audio de alguna pregunta o letra (python -m pipeline tts)"
