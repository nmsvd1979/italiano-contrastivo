"""Cobertura de reglas por grupo (spec: 28 gramaticales, 10 léxicos, 9 de superficie = 47; 2 no etiquetables)."""
import json

import pytest
import yaml

from pipeline.config import ROOT, RULES_DIR
from pipeline.tagging import engine

CATALOG = {c["code"]: c for c in json.loads((ROOT / "schemas" / "data" / "error-codes.json").read_text(encoding="utf8"))}
NON_TAGGABLE = {"ERR_LEXICAL_LEAK", "ERR_ARTICLE_OMISSION"}
GROUPS = {
    "grammar": [
        "ERR_AUX_ESSERE", "ERR_PARTICIPLE_AGREEMENT", "ERR_PARTICIPLE_AGREEMENT_CLITIC", "ERR_AUX_OVERGENERALIZATION",
        "ERR_REFLEXIVE_AUX", "ERR_CLITIC_COMBINED", "ERR_CLITIC_CI", "ERR_CLITIC_NE", "ERR_CLITIC_CE_NE",
        "ERR_CLITIC_DIRECT_INDIRECT", "ERR_INDIRECT_PRONOUN_GENDER", "ERR_CLITIC_DOUBLING", "ERR_CONGIUNTIVO_OPINION",
        "ERR_CONGIUNTIVO_CONCESSIVE", "ERR_CONGIUNTIVO_IMPERSONAL", "ERR_CONGIUNTIVO_SUPERLATIVE",
        "ERR_CONGIUNTIVO_OVERUSE_FORSE", "ERR_CONGIUNTIVO_OVERUSE_TEMPORAL", "ERR_CONGIUNTIVO_OVERUSE_RELATIVE",
        "ERR_MAGARI_TENSE", "ERR_NEG_IMPERATIVE", "ERR_POSSESSIVE_ARTICLE", "ERR_ARTICLE_ALLOMORPH",
        "ERR_PREP_ARTICLE_CONTRACTION", "ERR_CE_AGREEMENT", "ERR_COMPARATIVE_DI", "ERR_PERSONAL_A", "ERR_PREP_PENSARE",
    ],
    "lexical": [
        "ERR_FALSE_FRIEND", "ERR_COLLOCATION_CALQUE", "ERR_GENDER_DIVERGENCE", "ERR_HETEROTONIC", "ERR_PRONOMINAL_VERB",
        "ERR_PREP_FIXED_GOV", "ERR_PREP_PLACE", "ERR_TENERE_AVERE", "ERR_MANCARE", "ERR_GEMINATE",
    ],
    "orthographic": [
        "ERR_SC_PALATAL", "ERR_GLI_PALATAL", "ERR_C_G_PALATAL", "ERR_Z_AFFRICATE", "ERR_GEMINATE_SPELLING",
        "ERR_GEMINATE_NASAL_CONFUSION", "ERR_ACCENT_TRANSFER", "ERR_POSSESSIVE_SPELLING", "ERR_PLURAL_VOWEL",
    ],
}
RULES = engine.load_rules()
SHORTFALL = yaml.safe_load((RULES_DIR / "shortfall.yaml").read_text(encoding="utf8")) or {}


def counts(code):
    rules = [r for r in RULES if r.code == code]
    return len(rules), sum(len(r.examples["positive"]) for r in rules), sum(len(r.examples["negative"]) for r in rules)


def test_groups_cover_exactly_the_taggable_catalog():
    union = [c for g in GROUPS.values() for c in g]
    assert len(union) == len(set(union)), "un código aparece en dos grupos"
    assert set(union) == set(CATALOG) - NON_TAGGABLE
    assert {k: len(v) for k, v in GROUPS.items()} == {"grammar": 28, "lexical": 10, "orthographic": 9}


# Quitar el xfail de cada grupo al cerrar su tarea (T8: grammar, T9: lexical, T10: orthographic).
@pytest.mark.parametrize("group", [
    "grammar",
    "lexical",
    pytest.param("orthographic", marks=pytest.mark.xfail(strict=False, reason="T10 pendiente")),
])
def test_rule_coverage(group):
    problems = []
    for code in GROUPS[group]:
        n_rules, pos, neg = counts(code)
        if n_rules == 0:
            problems.append(f"{code}: sin regla")
        elif (pos < 3 or neg < 3) and code not in SHORTFALL:
            problems.append(f"{code}: {pos} positivos / {neg} negativos (mínimo 3/3 o declarar en shortfall.yaml)")
    assert not problems, "\n".join(problems)


def test_all_rule_codes_exist_in_catalog():
    assert [r.id for r in RULES if r.code not in CATALOG] == []


def test_non_taggable_codes_have_no_rules():
    assert [r.id for r in RULES if r.code in NON_TAGGABLE] == []


def test_surface_tier_only_for_phonetic_or_orthographic_codes():
    # `tier` dice cómo se detecta; el tope de 3 usa la categoría del catálogo (p. ej. ERR_GEMINATE es fonético
    # pero se detecta con léxico). Por eso solo se exige: tier surface => categoría fonética u ortográfica.
    bad = [r.id for r in RULES if r.tier == "surface" and CATALOG[r.code]["category"] not in engine.SURFACE_CATEGORIES]
    assert bad == []


def test_shortfall_entries_are_honest():
    for code, e in SHORTFALL.items():
        assert code in {c for g in GROUPS.values() for c in g}, f"{code}: no es un código etiquetable"
        assert e.get("reason"), f"{code}: shortfall sin 'reason'"
        _, pos, neg = counts(code)
        assert (e["positives"], e["negatives"]) == (pos, neg), f"{code}: los conteos declarados no coinciden con las reglas"
        assert pos < 3 or neg < 3, f"{code}: ya tiene 3/3, borra la entrada de shortfall.yaml"
