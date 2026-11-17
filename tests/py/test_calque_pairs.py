import json
from pathlib import Path

from pipeline.exercises.calque_pairs import build_pairs

ROOT = Path(__file__).resolve().parents[2]


def test_fixture_de_pares_al_dia():
    fresh = build_pairs(ROOT / "web/public/content/sentences.json")
    assert json.loads((ROOT / "web/src/writing/calque-pairs.json").read_text(encoding="utf8")) == fresh


def test_explicaciones_coinciden_con_el_catalogo():
    cat = {e["code"]: e["explanation_es"] for e in json.loads((ROOT / "schemas/data/error-codes.json").read_text(encoding="utf8"))}
    ex = json.loads((ROOT / "web/src/writing/explanations.json").read_text(encoding="utf8"))
    assert len(ex) == 8 and all(cat[c] == t for c, t in ex.items())
