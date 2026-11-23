import json

from pipeline.exercises import vocab
from pipeline.exercises.course import load_course

KINDS = {"transparente", "regular", "opaca"}


def _all_words():
    forms = {e.form for es in vocab.topics().values() for e in es}
    forms |= {w["form"] for u in load_course()["units"] for w in u.get("words", [])}
    return forms


def test_toda_palabra_del_curso_tiene_tamiz():
    missing = sorted(f for f in _all_words() if f not in vocab.sieves())
    assert not missing, missing[:20]


def test_tamices_son_validos_y_las_reglas_solo_van_en_regulares():
    for form, s in vocab.sieves().items():
        assert s["k"] in KINDS, form
        if s["k"] == "regular":
            assert s.get("r") in vocab.RULES, (form, s)
        else:
            assert not s.get("r"), (form, s)


def test_los_falsos_amigos_del_catalogo_salen_marcados_en_el_curso():
    pack = json.loads((vocab.config.ROOT / "web/public/content/course.json").read_text(encoding="utf8"))
    ff = vocab.false_friend_forms()
    for u in pack["units"]:
        for w in u.get("words", []):
            assert bool(w.get("ff")) or w["form"].lower() not in ff, w["form"]
            assert w.get("sieve") in KINDS, (u["id"], w["form"])
