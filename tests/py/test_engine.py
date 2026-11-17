import textwrap

import pytest

from pipeline import mine, nlp, workdb
from pipeline.tagging import engine

NLP = nlp.get_nlp()


def write(tmp_path, name, body):
    d = tmp_path / "tags"
    d.mkdir(parents=True, exist_ok=True)
    (d / name).write_text(textwrap.dedent(body), encoding="utf8")
    return d


def tag(tmp_path, body, it, es="", lexicons=None, cap=False, categories=None):
    rules = engine.load_rules(write(tmp_path, "r.yaml", body))
    return engine.tag_sentence(NLP(it), es, rules, lexicons=lexicons, cap=cap, categories=categories)


def test_regex_rule_matches_it_side(tmp_path):
    body = """
    - id: aux_essere_regex
      code: ERR_AUX_ESSERE
      tier: grammar
      it: [{regex: '\\bsono andat[oaie]\\b'}]
    """
    assert [t.code for t in tag(tmp_path, body, "Sono andato a Roma.")] == ["ERR_AUX_ESSERE"]
    assert tag(tmp_path, body, "Ho mangiato la pizza.") == []


def test_matcher_rule_matches_morphology(tmp_path):
    body = """
    - id: essere_participio
      code: ERR_PARTICIPLE_AGREEMENT
      tier: grammar
      it:
        - matcher: [{POS: AUX, LOWER: sono}, {POS: VERB, MORPH: {IS_SUPERSET: ['VerbForm=Part']}}]
    """
    assert tag(tmp_path, body, "Sono andato a Roma.")[0].rule_id == "essere_participio"
    assert tag(tmp_path, body, "Ho mangiato la pizza.") == []


def test_both_sides_required(tmp_path):
    body = """
    - id: aux_both
      code: ERR_AUX_ESSERE
      tier: grammar
      it: [{regex: 'sono andato'}]
      es: [{regex: '\\bhe ido\\b'}]
    """
    assert len(tag(tmp_path, body, "Sono andato a Roma.", "He ido a Roma.")) == 1
    assert tag(tmp_path, body, "Sono andato a Roma.", "Fui a Roma.") == []


def test_lexicon_lemmas_pattern(tmp_path):
    d = tmp_path / "lexicons"
    d.mkdir()
    (d / "false_friends.yaml").write_text("source: prueba\nentries: [burro]\n", encoding="utf8")
    body = """
    - id: ff
      code: ERR_FALSE_FRIEND
      tier: lexical
      it: [{lemmas: false_friends}]
    """
    lex = {"false_friends": engine.load_lexicon("false_friends", d)}
    assert len(tag(tmp_path, body, "Ho comprato del burro.", lexicons=lex)) == 1
    assert tag(tmp_path, body, "Ho comprato del pane.", lexicons=lex) == []


def test_first_matching_rule_wins_per_code(tmp_path):
    body = """
    - {id: primera, code: ERR_AUX_ESSERE, tier: grammar, it: [{regex: 'sono'}]}
    - {id: segunda, code: ERR_AUX_ESSERE, tier: grammar, it: [{regex: 'andato'}]}
    """
    tags = tag(tmp_path, body, "Sono andato.")
    assert [(t.code, t.rule_id) for t in tags] == [("ERR_AUX_ESSERE", "primera")]


def test_evidence_contains_matched_text(tmp_path):
    body = "- {id: e, code: ERR_AUX_ESSERE, tier: grammar, it: [{regex: 'sono andat\\w'}], es: [{regex: 'he ido'}]}\n"
    t = tag(tmp_path, body, "Sono andato a Roma.", "He ido a Roma.")[0]
    assert t.evidence == {"it": "Sono andato", "es": "He ido"}


def test_load_rules_rejects_bad_tier_and_missing_code(tmp_path):
    with pytest.raises(ValueError, match="tier"):
        engine.load_rules(write(tmp_path / "a", "a.yaml", "- {id: x, code: ERR_X, tier: raro, it: [{regex: a}]}\n"))
    with pytest.raises(ValueError, match="code"):
        engine.load_rules(write(tmp_path / "b", "b.yaml", "- {id: y, tier: grammar, it: [{regex: a}]}\n"))


def test_load_rules_rejects_rule_without_any_side(tmp_path):
    with pytest.raises(ValueError, match="it.*es"):
        engine.load_rules(write(tmp_path / "c", "c.yaml", "- {id: z, code: ERR_X, tier: grammar}\n"))


def test_load_rules_rejects_duplicate_ids(tmp_path):
    body = "- {id: d, code: ERR_X, tier: grammar, it: [{regex: a}]}\n- {id: d, code: ERR_Y, tier: grammar, it: [{regex: b}]}\n"
    with pytest.raises(ValueError, match="duplicad"):
        engine.load_rules(write(tmp_path / "d", "d.yaml", body))


def test_load_rules_empty_dir(tmp_path):
    (tmp_path / "vacio").mkdir()
    assert engine.load_rules(tmp_path / "vacio") == []


CATS = {"ERR_G1": "L1_SINTACTIC_CALQUE", "ERR_S1": "PHONETIC", "ERR_S2": "ORTHOGRAPHIC", "ERR_S3": "PHONETIC", "ERR_S4": "PHONETIC", "ERR_S5": "ORTHOGRAPHIC"}


def tags_for(codes):
    return [engine.Tag(c, f"r_{c}", {}) for c in codes]


def test_cap_surface_tags_keeps_grammar_and_max_3_surface():
    out = engine.cap_surface_tags(tags_for(["ERR_S1", "ERR_G1", "ERR_S2", "ERR_S3", "ERR_S4", "ERR_S5"]), 3, CATS)
    assert [t.code for t in out] == ["ERR_S1", "ERR_G1", "ERR_S2", "ERR_S3"]


def test_tag_sentence_applies_surface_cap_by_default(tmp_path):
    body = "\n".join(f"- {{id: r{c}, code: ERR_{c}, tier: surface, it: [{{regex: 'sono'}}]}}" for c in ["S1", "S2", "S3", "S4", "S5"]) + "\n"
    body += "- {id: rg, code: ERR_G1, tier: grammar, it: [{regex: 'sono'}]}\n"
    out = tag(tmp_path, body, "Sono andato.", cap=True, categories=CATS)
    assert sorted(t.code for t in out) == ["ERR_G1", "ERR_S1", "ERR_S2", "ERR_S3"]


def test_mine_filters_by_regex_on_it_and_es():
    con = workdb.connect(":memory:")
    for i, lang, text in [(1, "ita", "Sono andato a Roma."), (2, "spa", "Fui a Roma."), (3, "ita", "Ho mangiato."), (4, "spa", "Comí.")]:
        con.execute("INSERT INTO raw_sentences VALUES (?,?,?,?,NULL,NULL)", (i, lang, text, "a"))
    con.executemany("INSERT INTO candidates VALUES (?,?,?,?,?,?)", [(1, 2, "direct", "ok", "[]", "[]"), (3, 4, "direct", "ok", "[]", "[]")])
    assert mine.mine(con, r"\bsono andato\b") == [(1, "Sono andato a Roma.", "Fui a Roma.")]
    assert mine.mine(con, r"\w+", es_regex=r"^Comí") == [(3, "Ho mangiato.", "Comí.")]
    assert len(mine.mine(con, r"\w+", n=1)) == 1


def test_real_rules_cap_surface_tags_at_three_and_keep_grammar():
    rules = engine.load_rules()
    surface_ids = {r.id for r in rules if r.tier == "surface"}
    # Oración con muchas grafías de superficie (z, sc, gli, geminadas, acento, posesivo, plural) y estructura gramatical.
    doc = NLP("Mi sono accorto che la famiglia di mia sorella è andata a Venezia con gli zii già ieri.")
    tags = engine.tag_sentence(doc, "", rules)
    uncapped = engine.tag_sentence(doc, "", rules, cap=False)
    assert sum(t.rule_id in surface_ids for t in tags) == 3
    assert sum(t.rule_id in surface_ids for t in uncapped) > 3
    assert any(t.rule_id not in surface_ids for t in tags)


def test_cap_counts_tier_surface_rules_even_if_catalog_category_is_not_surface():
    # ERR_PLURAL_VOWEL es GENDER_NUMBER_AGREEMENT en el catálogo pero el spec lo cuenta como superficie.
    tags = [engine.Tag(f"ERR_X{i}", f"r{i}", {}) for i in range(5)]
    out = engine.cap_surface_tags(tags, 3, {}, surface_rule_ids={"r0", "r1", "r2", "r3", "r4"})
    assert [t.rule_id for t in out] == ["r0", "r1", "r2"]
