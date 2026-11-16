"""Los léxicos se alimentan solo de las fuentes leídas y respetan docs/dudas-italiano.md."""
import yaml

from pipeline.config import LEXICONS_DIR, RULES_DIR
from pipeline.tagging import engine

FILES = sorted(LEXICONS_DIR.glob("*.yaml"))
# Lo que docs/dudas-italiano.md dice que NO se debe usar, por léxico.
FORBIDDEN = {
    "heterotonic": {"atmosfera", "telefono"},
    "false_friends": {"adesso", "adrede", "attualmente", "assistere", "sopportare", "supportare"},
    "geminate_pairs": {"siete", "sette", "casa", "caro", "cane"},
}


def entries(path):
    data = yaml.safe_load(path.read_text(encoding="utf8"))
    return data.get("entries", [])


def test_lexicon_files_exist_for_the_token_level_rules():
    assert {"false_friends", "gender_divergence", "heterotonic", "pronominal_verbs", "geminate_pairs"} <= {f.stem for f in FILES}


def test_every_lexicon_entry_has_form_and_source():
    for f in FILES:
        for e in entries(f):
            assert isinstance(e, dict) and e.get("form") and len(e.get("source", "")) > 8, f"{f.stem}: {e!r}"


def test_no_blacklisted_entries():
    for f in FILES:
        forms = {e["form"].lower() for e in entries(f)}
        assert not (forms & FORBIDDEN.get(f.stem, set())), f"{f.stem}: {forms & FORBIDDEN[f.stem]}"


def test_lexicons_load_through_the_engine():
    for f in FILES:
        assert len(engine.load_lexicon(f.stem)) >= 3, f.stem


def test_phrase_level_lexical_rules_declare_their_source():
    rules = yaml.safe_load((RULES_DIR / "tags" / "lexical.yaml").read_text(encoding="utf8"))
    missing = [r["id"] for r in rules if not r.get("source")]
    assert missing == []
