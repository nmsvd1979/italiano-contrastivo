"""Etapa 3: normalización y filtros de calidad; elige un par primario por oración italiana."""
import json
import re
import unicodedata
from dataclasses import dataclass, field

MIN_WORDS, MAX_WORDS = 2, 25
MIN_RATIO, MAX_RATIO = 0.4, 2.5

_WORD = re.compile(r"\w+")
_DIGITS_URL = re.compile(r"\d|https?://|www\.|\S+@\S+")


@dataclass
class PairCheck:
    reasons: list[str] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", text).strip()


def _words(text: str) -> int:
    return len(_WORD.findall(text))


def _balanced(text: str) -> bool:
    return text.count('"') % 2 == 0 and text.count("«") == text.count("»") and text.count("(") == text.count(")")


def check_pair(it: str, es: str, has_verb: bool | None) -> PairCheck:
    out = PairCheck()
    n_it, n_es = _words(it), _words(es)
    if not MIN_WORDS <= n_it <= MAX_WORDS:
        out.reasons.append("length")
    if _DIGITS_URL.search(it) or _DIGITS_URL.search(es):
        out.reasons.append("digits_url")
    if n_es == 0 or not MIN_RATIO <= n_it / n_es <= MAX_RATIO:
        out.reasons.append("ratio")
    if has_verb is False:
        out.reasons.append("no_verb")
    if not _balanced(it):
        out.reasons.append("punct_unbalanced")
    return out


def _primary_pairs(con) -> dict[int, tuple[int, str, int]]:
    """ita_id -> (spa_id, kind, n_traducciones). Prefiere 'direct'; luego el menor spa_id."""
    best: dict[int, tuple[int, str]] = {}
    count: dict[int, int] = {}
    for ita_id, spa_id, kind in con.execute(
        "SELECT ita_id, spa_id, kind FROM pairs ORDER BY ita_id, (kind = 'direct') DESC, spa_id"
    ):
        count[ita_id] = count.get(ita_id, 0) + 1
        best.setdefault(ita_id, (spa_id, kind))
    return {i: (s, k, count[i]) for i, (s, k) in best.items()}


def run_filters(con, nlp) -> dict[str, int]:
    primary = _primary_pairs(con)
    ids = sorted(primary)
    text = lambda i: normalize(con.execute("SELECT text FROM raw_sentences WHERE id=?", (i,)).fetchone()[0])
    it_text = {i: text(i) for i in ids}
    es_text = {i: text(primary[i][0]) for i in ids}

    first_seen: dict[str, int] = {}
    reasons: dict[int, list[str]] = {i: [] for i in ids}
    flags: dict[int, list[str]] = {i: [] for i in ids}
    checks: dict[int, PairCheck] = {}
    for i in ids:
        key = it_text[i].lower()
        dup = key in first_seen
        first_seen.setdefault(key, i)
        checks[i] = check_pair(it_text[i], es_text[i], None)
        reasons[i] = list(checks[i].reasons) + (["duplicate"] if dup else [])
        if primary[i][1] == "pivot":
            flags[i].append("pivot")
        if primary[i][2] > 1:
            flags[i].append("multi_translation")

    # spaCy solo sobre lo que aún no fue rechazado (ahorra tiempo en el corpus completo).
    survivors = [i for i in ids if not reasons[i]]
    docs = nlp.pipe((it_text[i] for i in survivors), batch_size=256, disable=["parser", "ner"])
    for i, doc in zip(survivors, docs):
        if not any(t.pos_ in {"VERB", "AUX"} for t in doc):
            reasons[i].append("no_verb")

    rows = [
        (i, primary[i][0], primary[i][1], "rejected" if reasons[i] else "ok", json.dumps(reasons[i]), json.dumps(flags[i]))
        for i in ids
    ]
    con.executemany("INSERT OR REPLACE INTO candidates VALUES (?,?,?,?,?,?)", rows)
    con.commit()

    out = {"input": len(ids), "ok": sum(1 for r in rows if r[3] == "ok"), "rejected": sum(1 for r in rows if r[3] == "rejected")}
    for i in ids:
        for r in reasons[i]:
            out[f"rejected_{r}"] = out.get(f"rejected_{r}", 0) + 1
    return out
