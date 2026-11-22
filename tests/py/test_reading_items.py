import json
from pathlib import Path

import jsonschema

from pipeline.db.store import _REG
from pipeline.exercises import reading_items

ROOT = Path(__file__).resolve().parents[2]
READINGS = ROOT / "content" / "readings"


def _reading(name):
    return json.loads((READINGS / f"{name}.json").read_text(encoding="utf8"))


def test_items_validan_contra_el_esquema_y_usan_el_texto_del_libro():
    schema = json.loads((ROOT / "schemas/item.schema.json").read_text(encoding="utf8"))
    v = jsonschema.Draft202012Validator(schema, registry=_REG)
    r = _reading("rd_zaino")
    items = reading_items.items_for_reading(r, "ERR_VOC_CASA")
    assert items
    by_id = {s["id"]: s for s in r["sentences"]}
    for it in items:
        v.validate(it)
        s = by_id[it["sentence_id"]]
        if it["type"] == "translate_es_it":
            assert it["accepted_it"] == [s["it"]] and it["source_es"] == s["es"]
        if it["type"] == "reorder":
            assert " ".join(it["answer"]) == s["it"] and sorted(it["tokens"]) == sorted(it["answer"])
        if it["type"] == "cloze":
            assert it["text"].replace("___", it["answers"][0]) == s["it"]


def test_el_hueco_cae_en_el_punto_de_divergencia_si_existe():
    r = {"id": "rd_x", "sentences": [{"id": "rd_x_00", "it": "Ho fame.", "es": "Tengo hambre."}, {"id": "rd_x_01", "it": "Io mi sveglio presto ogni mattina.", "es": "Me despierto temprano cada mañana."}]}
    cl = [i for i in reading_items.items_for_reading(r, "ERR_RIFLESSIVO_PRONOME") if i["type"] == "cloze"]
    assert any(i["text"].startswith("Io ___ sveglio") and i["answers"] == ["mi"] for i in cl)


def test_hay_items_para_todas_las_lecturas_del_paquete():
    pack = ROOT / "web/public/content"
    ri = json.loads((pack / "reading_items.json").read_text(encoding="utf8"))
    rd = json.loads((pack / "readings.json").read_text(encoding="utf8"))
    course = json.loads((pack / "course.json").read_text(encoding="utf8"))
    by = {r["id"]: r for r in rd}
    claves = {f"{u['id']}:{rid}" for u in course["units"] for rid in u.get("readings", [])}
    assert set(ri) == claves
    assert all(len(v) >= len(by[k.split(":")[1]]["sentences"]) for k, v in ri.items())  # al menos un ejercicio por oración
