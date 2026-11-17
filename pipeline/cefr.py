"""Etapa 4: estimación determinista de nivel CEFR (A1–B2) por oración, con confianza."""
import math
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from pipeline.config import RULES_DIR

LEVELS = ["A1", "A2", "B1", "B2"]
_COMBINED_ALWAYS = re.compile(r"glie(lo|la|li|le|ne)")
_COMBINED_PRON = re.compile(r"(me|te|ce|ve|se)(lo|la|li|le|ne)")


@dataclass
class CefrEstimate:
    level: str
    confidence: float
    features: list[str] = field(default_factory=list)


def load_rules(path: Path | None = None) -> dict:
    return yaml.safe_load(Path(path or RULES_DIR / "cefr.yaml").read_text(encoding="utf8"))


def _is_participle(t) -> bool:
    m = t.morph.to_dict()
    return m.get("VerbForm") == "Part" and m.get("Tense") == "Past"


_STARE = {
    "sto", "stai", "sta", "stiamo", "state", "stanno", "stavo", "stavi", "stava", "stavamo", "stavate", "stavano",
    "starò", "starai", "starà", "staremo", "starete", "staranno", "starei", "staresti", "starebbe", "stesse", "stia",
}


def _is_progressive(t) -> bool:
    """stare + gerundio (sto mangiando) es A2, no gerundio absoluto. Los lemas de spaCy no son fiables: se compara el texto."""
    return t.head.lower_ in _STARE or any(c.lower_ in _STARE for c in t.children)


def _is_absolute_gerund(doc, t) -> bool:
    """Gerundio absoluto: gerundio al inicio de cláusula (primera palabra o tras coma), con sufijo -ando/-endo.
    spaCy etiqueta como gerundio presentes en -endo (comprendo) y sus lemas son inservibles; la posición es lo fiable."""
    if not t.lower_.endswith(("ando", "endo")):
        return False
    return t.i == 0 or doc[t.i - 1].text == ","


def _grammar_features(doc, rules: dict) -> list[str]:
    feats: list[str] = []
    add = lambda name: feats.append(name) if name not in feats else None
    text = doc.text.rstrip()
    exclaim = text.endswith("!")
    concessive = set(rules.get("concessive_conjunctions", []))
    words = [t for t in doc if not (t.is_punct or t.is_space)]
    has_sub = has_sub_imp = has_cnd = False
    has_se = any(t.lower_ == "se" for t in words)

    for t in doc:
        m = t.morph.to_dict()
        form, mood, tense = m.get("VerbForm"), m.get("Mood"), m.get("Tense")
        if mood == "Sub":
            has_sub = True
            has_sub_imp = has_sub_imp or tense == "Imp"
        if mood == "Cnd":
            has_cnd = True

        if _is_participle(t):
            for a in t.children:
                # spaCy lematiza mal las formas auxiliares (sarei→"saere", Avendo→"Avendo"): se usa la categoría AUX.
                if not a.dep_.startswith("aux") or a.pos_ != "AUX":
                    continue
                am = a.morph.to_dict()
                if a.dep_ == "aux:pass":
                    add("passivo")
                elif am.get("Mood") == "Sub":
                    add("congiuntivo_trapassato" if am.get("Tense") == "Imp" else "congiuntivo_passato")
                elif am.get("Mood") == "Cnd":
                    add("condizionale_passato")
                elif am.get("VerbForm") == "Ger":
                    add("gerundio_assoluto")
                elif am.get("Mood") == "Ind" and am.get("Tense") in {"Past", "Imp"}:
                    add("trapassato_prossimo")
                else:
                    add("passato_prossimo")
            continue

        aux_of_participle = t.pos_ == "AUX" and _is_participle(t.head)
        if form == "Fin" and not aux_of_participle:
            if mood == "Sub":
                add("congiuntivo")
            elif mood == "Cnd":
                add("condizionale_presente")
            elif mood == "Ind" and tense == "Past":
                add("passato_finito")
            elif mood == "Ind" and tense == "Imp":
                add("imperfetto")
            elif mood == "Ind" and tense == "Fut":
                add("futuro")
            elif mood == "Imp" and exclaim:
                add("imperativo")
        elif form == "Inf" and t.i > 0 and doc[t.i - 1].lower_ == "non" and t.dep_ == "ROOT" and (exclaim or t.i == 1):
            add("imperativo")  # "Non parlare!" o, sin "!", "Non" abre la oración ("Non viziare tuo figlio.")
        elif form == "Ger" and t.pos_ == "VERB" and _is_absolute_gerund(doc, t) and not _is_progressive(t):
            add("gerundio_assoluto")

        low = t.lower_
        if _COMBINED_ALWAYS.fullmatch(low) or (t.pos_ == "PRON" and _COMBINED_PRON.fullmatch(low)):
            add("pronomi_combinati")
        if low == "ne" and t.pos_ == "PRON":
            add("ne_partitivo")

    if has_sub_imp and has_cnd and has_se:
        add("periodo_ipotetico_irreale")
    if has_sub and any(t.lower_ in concessive for t in words):
        add("concessiva_congiuntivo")
    return feats


def _zipf_default(lemma: str) -> float:
    from wordfreq import zipf_frequency

    return zipf_frequency(lemma, "it")


def _percentile(values: list[float], pct: float) -> float:
    ordered = sorted(values)
    return ordered[max(0, math.ceil(pct / 100 * len(ordered)) - 1)]


def estimate(doc, rules: dict | None = None, zipf=None) -> CefrEstimate:
    rules = rules or load_rules()
    zipf = zipf or _zipf_default
    conf = rules["confidence"]
    scored: list[tuple[str, str]] = []  # (nombre, nivel)

    for name in _grammar_features(doc, rules):
        scored.append((name, rules["features"][name]))
    grammar_count = len(scored)

    n_words = sum(1 for t in doc if not (t.is_punct or t.is_space))
    grammar_max = max((LEVELS.index(lv) for _, lv in scored), default=0)
    cap = LEVELS.index(rules.get("length_only_cap", LEVELS[-1]))
    prev_max = 0
    for band in rules["length_bands"]:
        if n_words <= band["max"]:
            if band["level"] != LEVELS[0]:
                lv = LEVELS.index(band["level"])
                if lv > cap and grammar_max < cap:  # largo solo: no pasa del tope sin un rasgo gramatical de ese nivel
                    lv = cap
                scored.append((f"len>{prev_max}", LEVELS[lv]))
            break
        prev_max = band["max"]

    base = max((LEVELS.index(lv) for _, lv in scored), default=0)
    final_features = [n for n, lv in scored if LEVELS.index(lv) == base] if scored else []
    names = [n for n, _ in scored]

    rar = rules["rarity"]
    lemmas = [t.lemma_.lower() for t in doc if t.pos_ in rar["pos"] and t.lemma_.isalpha()]
    if lemmas and base < len(LEVELS) - 1 and _percentile([zipf(lm) for lm in lemmas], rar["percentile"]) < rar["zipf_below"]:
        base += 1
        names.append("rare_lexicon")
        final_features = ["rare_lexicon"]

    if grammar_count == 0 or not any(t.morph.to_dict() for t in doc):
        confidence = conf["low"]
    else:
        confidence = conf["high"] if len(final_features) >= 2 else conf["medium"]
    return CefrEstimate(LEVELS[base], confidence, names)
