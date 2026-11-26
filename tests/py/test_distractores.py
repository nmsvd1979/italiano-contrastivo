import json
from pathlib import Path

from pipeline.exercises.calques import find_calque
from pipeline.exercises.capsules import load_items
from pipeline.exercises.items import build_choice, extra_wrong_text

PACK = Path(__file__).resolve().parents[2] / "web/public/content"


def test_presente_agrega_otra_persona_distinta_de_la_correcta_y_del_primer_error():
    s = {"id": "s1", "it": "Voi avete sete."}
    c = find_calque("ERR_PRESENT_ESSERE_AVERE", s["it"])
    item = build_choice(s, c, seed=0)
    texts = [o["text"] for o in item["options"]]
    assert len(texts) == 3 and len(set(texts)) == 3 and "Voi avete sete." in texts
    assert sum(o["correct"] for o in item["options"]) == 1


def test_sonidos_conserva_la_mayuscula_inicial_del_tercer_distractor():
    s = {"id": "s2", "it": "Cerco di non pensarci."}
    c = find_calque("ERR_C_G_PALATAL", s["it"])
    extra = extra_wrong_text(s["it"], c)
    assert extra is None or extra[0].isupper()


def test_codigos_sin_generador_de_segundo_error_siguen_con_dos_opciones():
    s = {"id": "s3", "it": "Ho fame."}
    c = find_calque("ERR_TENERE_AVERE", s["it"])
    assert extra_wrong_text(s["it"], c) is None


def test_la_mayoria_de_las_elecciones_del_paquete_tienen_tres_opciones_sin_repetidas_ni_dos_correctas():
    items = [i for v in load_items(PACK).values() for i in v if i.get("type") == "choice_l1_distractor"]
    three = [i for i in items if len(i["options"]) == 3]
    assert len(three) / len(items) > 0.55, "con dos opciones se acierta por azar la mitad de las veces"   # 0,60 en A1; las cápsulas de A2 con variante a mano (cambio de tiempo, fechas, «si») solo tienen una errónea posible: umbral 0,55 (2026-11-26)
    for i in items:
        texts = [o["text"] for o in i["options"]]
        assert len(set(texts)) == len(texts) and sum(o["correct"] for o in i["options"]) == 1, i["id"]
