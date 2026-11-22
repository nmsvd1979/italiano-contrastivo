import pytest

from pipeline.exercises import vocab


@pytest.mark.parametrize("form,gender,num,gloss,esperado", [
    ("latte", "m", "s", "la leche", "il"), ("uomo", "m", "s", "el hombre", "l'"), ("zio", "m", "s", "el tío", "lo"),
    ("sci", "m", "s", "el esquí", "lo"), ("gnocchi", "m", "p", "los ñoquis", "gli"), ("amici", "m", "p", "los amigos", "gli"),
    ("fratelli", "m", "p", "los hermanos", "i"), ("jeans", "m", "p", "los jeans", "i"), ("hobby", "m", "s", "el pasatiempo", "l'"),
    ("casa", "f", "s", "la casa", "la"), ("acqua", "f", "s", "el agua", "l'"), ("mani", "f", "p", "las manos", "le"),
    ("alto", "m", "s", "alto", ""), ("vado", "x", "x", "voy", ""), ("insegnante", "-", "s", "el profesor", ""),
])
def test_articulo_italiano(form, gender, num, gloss, esperado):
    assert vocab.it_article(form, gender, num, gloss) == esperado


def test_aviso_de_genero_solo_en_palabras_parientes():
    assert vocab.gender_differs("latte", "m", "la leche")          # il latte / la leche
    assert vocab.gender_differs("sangue", "m", "la sangre")
    assert not vocab.gender_differs("acqua", "f", "el agua")        # «agua» es femenino aunque lleve «el»
    assert not vocab.gender_differs("schermo", "m", "la pantalla")  # palabras distintas: no es trampa
    assert not vocab.gender_differs("pane", "m", "el pan")


def test_falsos_amigos_del_catalogo_llegan_al_vocabulario():
    ff = vocab.false_friend_forms()
    assert {"burro", "gamba", "spalla", "topo"} <= ff
    assert "tavolo" not in ff
