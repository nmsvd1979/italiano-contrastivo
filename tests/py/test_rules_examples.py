"""Arnés genérico: cada regla de pipeline/rules/tags/ se prueba con sus propios ejemplos."""
import re

import pytest

from pipeline import filters, nlp, workdb
from pipeline.tagging import engine

NLP = nlp.get_nlp()
RULES = engine.load_rules()
EXAMPLES = [(r, kind, ex) for r in RULES for kind in ("positive", "negative") for ex in r.examples[kind]]
IDS = [f"{r.id}:{kind}:{i}" for i, (r, kind, ex) in enumerate(EXAMPLES)]
SOURCE = re.compile(r"^(tatoeba:\d+|fuente:[0-9a-f]{8})$")


@pytest.mark.parametrize("rule,kind,ex", EXAMPLES, ids=IDS)
def test_rule_example(rule, kind, ex):
    assert ex.get("text"), "el ejemplo necesita 'text'"
    if rule.es:
        assert ex.get("es"), f"la regla {rule.id} usa el lado es: el ejemplo necesita 'es'"
    evidence = engine.match_rule(rule, NLP(ex["text"]), ex.get("es", ""))
    if kind == "positive":
        assert evidence is not None, f"{rule.id} debía dispararse con: {ex['text']}"
    else:
        assert evidence is None, f"{rule.id} no debía dispararse con: {ex['text']}"


@pytest.mark.parametrize("rule,kind,ex", EXAMPLES, ids=IDS)
def test_example_provenance(rule, kind, ex):
    src = ex.get("source", "")
    assert SOURCE.match(src), f"source inválido en {rule.id}: {src!r} (usa tatoeba:<id> o fuente:<id de 8 hex>)"
    if src.startswith("tatoeba:"):
        con = workdb.connect()
        row = con.execute("SELECT text FROM raw_sentences WHERE id=?", (int(src.split(":")[1]),)).fetchone()
        if con.execute("SELECT COUNT(*) FROM raw_sentences").fetchone()[0] == 0:
            pytest.skip("work.db sin datos reales")
        assert row is not None, f"{src} no existe en el corpus"
        assert filters.normalize(row[0]) == filters.normalize(ex["text"]), f"{src}: el texto no coincide con Tatoeba"
