from pipeline.review import native

DOC = """| id | Italiano | Español | Autor de la traducción | ✅/✏️/❌ |
|---|---|---|---|---|
| s_1 | Ho fame. | Tengo hambre. | Tatoeba | ✅ |
| s_2 | Lui sono. | Él soy. | IA | ❌ |
| s_3 | Vado a casa. | Voy a casa. | IA | ✏️ Voy a mi casa |
| s_4 | Ciao. | Hola. | IA | |
| s_5 | Sì. | Sí. | Tatoeba | ✅ |
"""


def test_lee_solo_las_filas_marcadas_y_la_correccion():
    rows = native.parse_sentence_rows(DOC)
    assert [r["id"] for r in rows] == ["s_1", "s_2", "s_3", "s_5"]
    assert next(r for r in rows if r["id"] == "s_3") == {"id": "s_3", "source": "IA", "mark": "✏️", "correction": "Voy a mi casa"}


def test_tasa_de_error_por_origen_y_sin_datos_es_none_no_cero():
    rates = native.error_rates(native.parse_sentence_rows(DOC))
    assert rates["IA"] == {"revisadas": 2, "con_error": 2, "tasa": 1.0}
    assert rates["Tatoeba"]["tasa"] == 0 and rates["total"]["revisadas"] == 4
    assert native.error_rates([])["IA"]["tasa"] is None


def test_decisiones_para_el_registro():
    d = dict(native.decisions(native.parse_sentence_rows(DOC)))
    assert d["s_1"]["action"] == "approve" and d["s_2"]["action"] == "reject" and d["s_3"]["action"] == "doubt"
    assert "Voy a mi casa" in d["s_3"]["reason"]
