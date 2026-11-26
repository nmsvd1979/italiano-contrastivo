import json
from pathlib import Path

import pytest

from pipeline.exercises import course as C
from pipeline.exercises.capsules import load_items

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
    assert len(parts["prueba"]) == C.LARGE_TEST_SIZE                       # 40 oraciones: prueba de 8
    assert len(C.assign_parts(_sents(30), ["ERR_X"])["prueba"]) == C.TEST_SIZE  # 30: se queda en 6
    idx = [int(i[1:]) for i in parts["prueba"]]
    assert idx == sorted(idx) and min(idx) >= C.DISCOVER_SIZE  # no usa las 4 más fáciles (van a «Descubre»)
    assert idx[0] < 12 and idx[-1] > 33  # cubre desde lo fácil hasta lo difícil, no solo el extremo duro
    assert len(parts["practica"]) == 32 and set(parts["descubre"]) == {f"s{i:03d}" for i in range(4)}


def test_unidades_a1_solo_aceptan_oraciones_que_pasan_el_prefiltro():
    ok = {"it": "Io parlo italiano.", "es": "Hablo italiano."}
    assert C.fit_for_level(ok, "A1")
    for it, es in [("Lui aveva ragione prima.", "Tenía razón antes."),
                   ("Credo che sia malata, ma non lo so con certezza e non voglio dirlo a nessuno.", "Creo que está enferma."),
                   ("Mi piacerebbe andare in Francia.", "Me gustaría ir a Francia.")]:
        assert not C.fit_for_level({"it": it, "es": es}, "A1"), it
    assert C.fit_for_level({"it": "Credo che sia malata.", "es": "Creo que está enferma."}, "B1")  # el filtro es solo de A1


def test_a1_rechaza_enclíticos_y_las_unidades_de_sonidos_exigen_frases_cortas():
    ok = {"it": "Io voglio parlare.", "es": "Quiero hablar."}
    assert C.fit_for_level(ok, "A1")
    for it in ["So che posso farcela.", "Io non voglio pensarci.", "Non posso vederlo.", "Ci sono stati molti omicidi.", "Mi sono alzato presto come al solito.", "Sono andato a casa."]:
        assert not C.fit_for_level({"it": it, "es": "x y z"}, "A1"), it
    largo = {"it": "Questa è una frase molto lunga per un principiante.", "es": "Esta es una frase muy larga para un principiante."}
    assert C.fit_for_level(largo, "A1", "ERR_PRESENT_ARE")                       # en otras unidades sigue valiendo hasta 14 palabras
    assert not C.fit_for_level(largo, "A1", "ERR_C_G_PALATAL")                   # en sonidos, no más de 7


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
    items = load_items(PACK)
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


def test_ninguna_palabra_domina_una_unidad_de_vocabulario():
    """Auditoría 2026-11-23: u42 tenía 28 de 35 oraciones con «soldi». Tope por palabra en `balance_by_word`; u65 queda por encima por falta de oraciones."""
    import collections
    from pipeline.exercises import vocab
    sent = {s["id"]: s for s in json.loads((PACK / "sentences.json").read_text(encoding="utf8"))}
    known_thin = {"u65": "pocas oraciones de «pedir con cortesía» en Tatoeba: necesita diálogos propios (Bloque 2)"}
    for u in json.loads((PACK / "course.json").read_text(encoding="utf8"))["units"]:
        code = u["codes"][0]
        if code not in vocab.VOCAB_CODES or u["id"] in known_thin:
            continue
        ids = set(u["parts"]["practica"]) | set(u["parts"]["prueba"])
        hits = collections.Counter(h[2].lower() for i in ids if (h := vocab.find_vocab(code, sent[i]["it"])))
        assert hits.most_common(1)[0][1] / sum(hits.values()) <= 0.65, (u["id"], hits.most_common(3))


def test_u65_practica_solo_vorrei_y_prendo():
    sent = {s["id"]: s for s in json.loads((PACK / "sentences.json").read_text(encoding="utf8"))}
    u = next(x for x in json.loads((PACK / "course.json").read_text(encoding="utf8"))["units"] if x["id"] == "u65")
    caps = {c["id"]: c for c in json.loads((PACK / "capsules.json").read_text(encoding="utf8"))}
    for i in u["parts"]["practica"] + u["parts"]["prueba"]:
        assert not __import__("re").search(r"\b(voglio|vogliamo)\b", sent[i]["it"], __import__("re").I), sent[i]["it"]
    cap = caps["cap_err_voc_vorrei"]
    text = json.dumps([cap["trigger"], cap["retrieval"]], ensure_ascii=False).lower()  # los ejercicios (la explicación sí compara con «voglio»)
    assert "voglio" not in text


def test_prueba_a1_prefiere_a1_completa_con_a2_y_nunca_b1():
    """Auditoría 2026-11-25: las pruebas A1 traían frases A2/B1. Ahora: primero A1, A2 solo para completar, nunca B1."""
    def mk(n, lv):
        return [{"id": f"{lv}{i}", "it": f"frase {lv} {i}", "es": "x", "cefr_estimate": lv} for i in range(n)]
    mixed = mk(30, "A1") + mk(10, "B1")
    assert {s[0:2] for s in C.assign_parts(mixed, ["ERR_X"], "A1")["prueba"]} == {"A1"}
    few = mk(10, "A1") + mk(10, "A2") + mk(10, "B1")   # 4 van a «Descubre»: quedan 6 A1 para una prueba de 6
    prueba = C.assign_parts(few, ["ERR_X"], "A1")["prueba"]
    assert len(prueba) == C.TEST_SIZE and all(i.startswith("A1") for i in prueba)
    a2 = mk(6, "A1") + mk(20, "A2") + mk(5, "B1")      # solo 2 A1 después de «Descubre»: se completa con A2
    prueba = C.assign_parts(a2, ["ERR_X"], "A1")["prueba"]
    assert len(prueba) == C.TEST_SIZE and not any(i.startswith("B1") for i in prueba) and any(i.startswith("A2") for i in prueba)
    assert any(i.startswith("B1") for i in C.assign_parts(mk(20, "B1"), ["ERR_X"], "B1")["prueba"])   # en otros niveles no se filtra


def test_pruebas_a1_del_paquete_sin_b1():
    import json
    from pathlib import Path
    pack = Path(__file__).resolve().parents[2] / "web/public/content"
    course = json.loads((pack / "course.json").read_text(encoding="utf8"))
    lv = {s["id"]: s["cefr_estimate"] for s in json.loads((pack / "sentences.json").read_text(encoding="utf8"))}
    for u in course["units"]:
        if u["level"] == "A1":
            levels = [lv[i] for i in u["parts"]["prueba"]]
            assert all(x in ("A1", "A2") for x in levels), u["id"]
            if "A2" in levels:   # A2 solo para completar: la unidad no tenía frases A1 suficientes fuera de «Descubre»
                pool = [i for i in u["parts"]["practica"] + u["parts"]["prueba"] if i not in u["parts"]["descubre"]]
                assert sum(lv[i] == "A1" for i in pool) < len(u["parts"]["prueba"]), u["id"]
