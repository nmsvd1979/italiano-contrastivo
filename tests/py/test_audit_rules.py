import json
from pathlib import Path

import pytest

from pipeline.audit_rules import _VOSEO, italian_issue, prefilter, spanish_issue

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize("es,motivo", [
    ("Vení a nadar conmigo.", "voseo"), ("¿Tenés un lápiz rojo?", "voseo"), ("¿Habéis traído la leche?", "vosotros"), ("¿Dónde está vuestra corbata?", "vosotros"),
    ("Cierro la birome.", "regionalismo"), ("Coge un libro.", "regionalismo"), ("¿Cómo se dice «mačka» en español?", "no españoles"),
])
def test_rechaza_espanol_problematico(es, motivo):
    assert motivo in (spanish_issue(es) or "")


@pytest.mark.parametrize("es", ["Voy a París en avión.", "El país es grande.", "¿Cuánto vale este anillo?", "Tengo un tío rico.", "Les gusta el fútbol.", "Mi hermano se levanta temprano."])
def test_no_rechaza_espanol_correcto(es):
    assert spanish_issue(es) is None


@pytest.mark.parametrize("it,motivo", [
    ("Comprai un gatto in quel negozio.", "passato remoto"), ("L'esercito avanzò sulla collina.", "passato remoto"), ("Domani andrò al mare.", "futuro"),
    ("Vorrei, se potessi, venire.", "congiuntivo"), ("Verrei con te.", "condicional"), ("Io mangiavo qui.", None), ("Dov'era Tom?", "imperfetto"),
    ("Chiudete la cazzo di porta!", "vulgar"),
])
def test_tiempos_y_temas(it, motivo):
    r = italian_issue(it)
    assert (motivo is None and r is None) or (motivo and motivo in (r or ""))


@pytest.mark.parametrize("it", ["Mi piace il gelato.", "Vorrei un caffè.", "Sono le tre e mezza.", "Lui parla cinque lingue.", "Prendi un libro e leggi!", "Così va bene.", "Vado in città.", "Ho comprato il pane."])
def test_no_rechaza_italiano_de_a1(it):
    assert italian_issue(it) is None


def test_prefiltro_marca_duplicadas_y_nombres():
    r = prefilter([{"italiano": "Il gatto beve il latte.", "directa": True, "espanol_tatoeba": "El gato bebe leche."},
                   {"italiano": "Il gatto beve il latte caldo.", "directa": True, "espanol_tatoeba": "El gato bebe leche caliente."},
                   {"italiano": "Salve, io sono Sepideh.", "directa": True, "espanol_tatoeba": "Hola, yo soy Sepideh."}])
    assert r[0] is None and "duplicada" in r[1] and "nombre propio" in r[2]


def test_ningun_texto_publicado_en_espanol_tiene_voseo_ni_vosotros():
    """Barrido de todo el español que ve el usuario: traducciones de oraciones, lecturas, fichas y glosas."""
    pack = ROOT / "web/public/content"
    textos = [s["es"] for s in json.loads((pack / "sentences.json").read_text(encoding="utf8"))]
    for r in json.loads((pack / "readings.json").read_text(encoding="utf8")):
        textos += [s["es"] for s in r["sentences"]] + [q["prompt_es"] for q in r["questions"]] + [o for q in r["questions"] for o in q["options"]]
    for u in json.loads((pack / "course.json").read_text(encoding="utf8"))["units"]:
        textos += [w["gloss"] for w in u.get("words", [])]
        for t in (u.get("ficha_es", ""), u.get("goal_es", ""), u.get("why_here", "")):  # las fichas citan «os, vuestro» al contrastar: solo se vigila el voseo
            assert not _VOSEO.search(t), (u["id"], t[:80])
    malos = [(t, spanish_issue(t)) for t in textos if t and (spanish_issue(t) or "").startswith(("traducción con voseo", "traducción con «vosotros»"))]
    assert not malos, malos[:5]


# ── nivel A2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("it,motivo", [
    ("Lui parlò con Maria ieri.", "remoto"),
    ("Avevo mangiato troppo tardi.", "trapassato"),
    ("Era andato a casa presto.", "trapassato"),
    ("Glielo dico domani.", "combinados"),
    ("Me lo puoi spiegare?", "combinados"),
    ("Tom è morto tre anni fa.", "mórbido"),
    ("Se fossi ricco comprerei una casa.", "congiuntivo"),
    ("Potrei venire domani se volessi.", "congiuntivo"),
    ("Ogni mattina mangio una mela e una pera e anche un'arancia con il mio caro amico Marco e sua sorella.", "larga"),
])
def test_a2_rechaza_lo_que_es_b1_o_poco_util(it, motivo):
    assert italian_issue(it, "A2"), (it, motivo)


@pytest.mark.parametrize("it", [
    "Da piccolo giocavo a calcio.",       # imperfetto
    "Domani parlerò con lui.",            # futuro
    "Ho già mangiato.",
    "Ero stanco ma contento.",            # «ero» + adjetivo no es trapassato
    "Avevo fame e sete.",
])
def test_a2_deja_pasar_lo_que_a2_si_ensena(it):
    assert italian_issue(it, "A2") is None, it


def test_a2_permite_el_condicional_y_el_imperativo_formal_solo_cuando_la_capsula_lo_ensena():
    assert italian_issue("Potrei venire domani.", "A2")
    assert italian_issue("Potrei venire domani.", "A2", {"condizionale"}) is None
    assert italian_issue("Prenda questa medicina.", "A2")
    assert italian_issue("Prenda questa medicina.", "A2", {"imperativo_formale"}) is None
    assert italian_issue("Me ne vado adesso.", "A2")
    assert italian_issue("Me ne vado adesso.", "A2", {"combinati"}) is None
    assert italian_issue("Se fossi ricco comprerei una casa.", "A2", {"condizionale", "combinati", "imperativo_formale"})   # el congiuntivo nunca pasa


def test_a1_no_cambia_con_los_filtros_de_a2():
    assert italian_issue("Tom è morto tre anni fa.", "A1") is None            # el filtro de muertes es solo de A2
    assert italian_issue("Lui parlò con Maria ieri.", "A1")                    # el remoto sigue rechazado en A1
    assert italian_issue("Ogni mattina mangio una mela e una pera e anche un'arancia con il mio caro amico Marco e sua sorella.", "A1") == "demasiado larga para A1"
