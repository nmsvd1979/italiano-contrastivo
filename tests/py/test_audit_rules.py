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
