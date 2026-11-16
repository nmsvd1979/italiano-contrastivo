"""Motor de reglas de etiquetado: ¿qué código de error contrastivo ejercita esta oración (correcta)?

Formato de regla (YAML, lista): id, code, tier (grammar|lexical|surface), it y/o es (listas de patrones),
examples {positive: [...], negative: [...]}. Un patrón es exactamente uno de:
  {regex: "..."}            sobre el texto (it: oración italiana; es: traducción española)
  {matcher: [token-dicts]}  patrón de spaCy Matcher (solo lado it)
  {lemmas: "nombre"}        léxico en pipeline/lexicons/<nombre>.yaml (forma o lema, solo lado it)
La regla se dispara si TODOS los lados presentes tienen al menos un patrón que coincide.
"""
import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml
from spacy.matcher import Matcher

from pipeline.config import LEXICONS_DIR, ROOT, RULES_DIR

TIERS = {"grammar", "lexical", "surface"}
SURFACE_CATEGORIES = {"PHONETIC", "ORTHOGRAPHIC"}
PATTERN_KINDS = {"regex", "matcher", "lemmas"}
CATALOG = ROOT / "schemas" / "data" / "error-codes.json"


@dataclass
class Rule:
    id: str
    code: str
    tier: str
    it: list[dict] = field(default_factory=list)
    es: list[dict] = field(default_factory=list)
    examples: dict = field(default_factory=lambda: {"positive": [], "negative": []})


@dataclass
class Tag:
    code: str
    rule_id: str
    evidence: dict


def _validate(raw: dict, where: str) -> Rule:
    for key in ("id", "code"):
        if not raw.get(key):
            raise ValueError(f"{where}: falta '{key}' en la regla {raw!r}")
    if raw.get("tier") not in TIERS:
        raise ValueError(f"{where}: regla '{raw['id']}' con tier inválido {raw.get('tier')!r} (usa {sorted(TIERS)})")
    if not raw.get("it") and not raw.get("es"):
        raise ValueError(f"{where}: regla '{raw['id']}' debe tener al menos un lado it o es")
    for side in ("it", "es"):
        for p in raw.get(side) or []:
            if not isinstance(p, dict) or len(p) != 1 or next(iter(p)) not in PATTERN_KINDS:
                raise ValueError(f"{where}: patrón inválido en '{raw['id']}'.{side}: {p!r}")
            if side == "es" and "regex" not in p:
                raise ValueError(f"{where}: el lado es solo admite regex ('{raw['id']}')")
    ex = raw.get("examples") or {}
    return Rule(raw["id"], raw["code"], raw["tier"], raw.get("it") or [], raw.get("es") or [],
                {"positive": ex.get("positive") or [], "negative": ex.get("negative") or []})


def load_rules(directory: Path = RULES_DIR / "tags") -> list[Rule]:
    rules: list[Rule] = []
    seen: set[str] = set()
    for f in sorted(Path(directory).glob("*.yaml")):
        for raw in yaml.safe_load(f.read_text(encoding="utf8")) or []:
            rule = _validate(raw, f.name)
            if rule.id in seen:
                raise ValueError(f"{f.name}: id de regla duplicado '{rule.id}'")
            seen.add(rule.id)
            rules.append(rule)
    return rules


def load_lexicon(name: str, directory: Path = LEXICONS_DIR) -> set[str]:
    data = yaml.safe_load((Path(directory) / f"{name}.yaml").read_text(encoding="utf8")) or {}
    out = set()
    for e in data.get("entries") or []:
        form = e if isinstance(e, str) else (e.get("form") or e.get("lemma") or e.get("word"))
        if form:
            out.add(form.strip().lower())
    return out


@lru_cache(maxsize=None)
def _lexicon_cached(name: str) -> frozenset[str]:
    return frozenset(load_lexicon(name))


@lru_cache(maxsize=None)
def _regex(pattern: str) -> re.Pattern:
    return re.compile(pattern, re.IGNORECASE)


_MATCHERS: dict[tuple, Matcher] = {}


def _matcher(rule_id: str, idx: int, pattern: list, vocab) -> Matcher:
    key = (id(vocab), rule_id, idx)
    if key not in _MATCHERS:
        m = Matcher(vocab)
        m.add(f"{rule_id}:{idx}", [pattern])
        _MATCHERS[key] = m
    return _MATCHERS[key]


def _match_side(rule: Rule, side: str, doc, text: str, lexicons) -> str | None:
    for idx, p in enumerate(getattr(rule, side)):
        kind, value = next(iter(p.items()))
        if kind == "regex":
            m = _regex(value).search(text)
            if m:
                return m.group(0)
        elif kind == "matcher":
            hits = _matcher(rule.id, idx, value, doc.vocab)(doc)
            if hits:
                _, start, end = hits[0]
                return doc[start:end].text
        elif kind == "lemmas":
            lex = lexicons.get(value) if lexicons is not None and value in lexicons else _lexicon_cached(value)
            for t in doc:
                if t.lower_ in lex or t.lemma_.lower() in lex:
                    return t.text
    return None


def match_rule(rule: Rule, doc, es_text: str = "", lexicons=None) -> dict | None:
    """Devuelve la evidencia {"it": ..., "es": ...} si la regla se dispara; None si no."""
    evidence = {}
    if rule.it:
        hit = _match_side(rule, "it", doc, doc.text, lexicons)
        if hit is None:
            return None
        evidence["it"] = hit
    if rule.es:
        hit = _match_side(rule, "es", doc, es_text or "", lexicons)
        if hit is None:
            return None
        evidence["es"] = hit
    return evidence


@lru_cache(maxsize=1)
def catalog_categories() -> dict[str, str]:
    return {c["code"]: c["category"] for c in json.loads(CATALOG.read_text(encoding="utf8"))}


def cap_surface_tags(tags: list[Tag], max_n: int = 3, categories: dict[str, str] | None = None,
                     surface_rule_ids: set[str] | None = None) -> list[Tag]:
    """Deja todos los códigos gramaticales/léxicos y, como máximo, max_n de superficie (en orden de regla).
    Es de superficie un código de categoría fonética/ortográfica del catálogo O etiquetado por una regla tier=surface."""
    cats = categories if categories is not None else catalog_categories()
    surface_ids = surface_rule_ids or set()
    out, surface = [], 0
    for t in tags:
        if cats.get(t.code) in SURFACE_CATEGORIES or t.rule_id in surface_ids:
            if surface >= max_n:
                continue
            surface += 1
        out.append(t)
    return out


def tag_sentence(doc, es_text: str, rules: list[Rule], lexicons=None, cap: bool = True,
                 categories: dict[str, str] | None = None) -> list[Tag]:
    tags: list[Tag] = []
    done: set[str] = set()
    for rule in rules:
        if rule.code in done:
            continue
        evidence = match_rule(rule, doc, es_text, lexicons)
        if evidence is not None:
            tags.append(Tag(rule.code, rule.id, evidence))
            done.add(rule.code)
    return cap_surface_tags(tags, 3, categories, {r.id for r in rules if r.tier == "surface"}) if cap else tags
