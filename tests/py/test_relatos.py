import copy

import pytest

from pipeline.exercises.relatos import option_tense, relato_item, validate_relato

RELATO = {
    "text": "Ieri sera, mentre {1} un film, all'improvviso {2} il telefono. Di solito {3} a quell'ora, ma questa volta {4} subito. A un tratto {5} un rumore in cucina. Ho lasciato il telefono sul tavolo e sono andato a vedere che cosa era successo.",
    "gaps": [
        {"options": ["guardavo", "ho guardato"], "answer": 0, "why_es": "Mentre marca algo en curso."},
        {"options": ["squillava", "è squillato"], "answer": 1, "why_es": "All'improvviso corta la escena."},
        {"options": ["non rispondevo", "non ho risposto"], "answer": 0, "why_es": "Di solito: costumbre."},
        {"options": ["ho risposto", "rispondevo"], "answer": 0, "why_es": "Questa volta: una vez concreta."},
        {"options": ["ho sentito", "sentivo"], "answer": 0, "why_es": "A un tratto: un momento."},
    ],
    "translation_es": "Anoche, mientras veía una película, de pronto sonó el teléfono. Normalmente no contestaba a esa hora, pero esta vez contesté enseguida. De repente oí un ruido en la cocina. Dejé el teléfono en la mesa y fui a ver qué había pasado.",
}


def test_el_relato_de_la_maqueta_es_valido():
    assert validate_relato(RELATO) == []
    item = relato_item(RELATO, "rl_a2m03_01")
    assert item["type"] == "cloze_text" and len(item["gaps"]) == 5 and item["authored"] is True


def test_option_tense():
    assert option_tense("ho guardato") == "passato" and option_tense("non ho risposto") == "passato" and option_tense("mi sono alzato") == "passato"
    assert option_tense("guardavo") == "imperfetto" and option_tense("non rispondevo") == "imperfetto"


@pytest.mark.parametrize("mutate,fragment", [
    (lambda r: r["text"].__class__ and r.update(text=r["text"].replace("{3}", "{4}")), "marcadores"),
    (lambda r: r["gaps"][1].update(options=["è stato", "era"]), "estado"),
    (lambda r: r["gaps"][0].update(answer=1), "disparador pide imperfetto"),
    (lambda r: r.update(text=r["text"].replace("mentre ", "")), "sin disparador"),
    (lambda r: r["gaps"][2].update(options=["rispondevo", "rispondevamo"]), "una passato prossimo y una imperfetto"),
    (lambda r: r["gaps"][3].update(options=["ho risposto", "Ho risposto"]), "dos opciones distintas"),
    (lambda r: r.update(translation_es=""), "traducción"),
    (lambda r: r["gaps"][1].update(options=["ha piovuto", "pioveva"]), "meteorológico"),
])
def test_cada_regla_de_escritura_se_comprueba(mutate, fragment):
    r = copy.deepcopy(RELATO)
    mutate(r)
    assert any(fragment in e for e in validate_relato(r)), validate_relato(r)


def test_el_item_cumple_el_esquema():
    from jsonschema import Draft202012Validator
    from pipeline.db import store
    v = Draft202012Validator({"$ref": "https://italiano-contrastivo/schemas/item.schema.json"}, registry=store._REG)
    v.validate(relato_item(RELATO, "rl_a2m03_01"))
    bad = relato_item(RELATO, "rl_a2m03_02")
    bad["gaps"][0]["options"] = ["solo una"]
    assert list(v.iter_errors(bad))
