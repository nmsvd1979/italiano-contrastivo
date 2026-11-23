"""Ruta guiada: reparte las oraciones utilizables de cada unidad en los pasos del ciclo (descubre, práctica, escucha, prueba).
La prueba usa oraciones reservadas (no aparecen en Práctica); todo es determinista."""
import json
import re
from pathlib import Path

from pipeline import config
from pipeline.audit_rules import italian_issue, length_issue, spanish_issue
from pipeline.exercises import vocab
from pipeline.exercises.calques import find_calque
from pipeline.exercises.capsules import usable_sentences

TEST_SIZE = 6
LARGE_TEST_SIZE = 8   # unidades con suficientes oraciones: una prueba de 6 frases deja pasar demasiado por azar o autoaprobación
LARGE_UNIT = 34
DISCOVER_SIZE = 4
LISTEN_SIZE = 8
MIN_USABLE = TEST_SIZE + 12  # prueba + práctica mínima


def load_course() -> dict:
    return json.loads((config.ROOT / "schemas" / "data" / "course.json").read_text(encoding="utf8"))


A1_LEVELS = ("A1", "A1+")


SOUND_CODES = {"ERR_C_G_PALATAL", "ERR_SC_PALATAL", "ERR_GLI_PALATAL", "ERR_GN_Z_SPELLING", "ERR_CONSONANTE_DOPPIA"}
SOUND_MAX_WORDS = 7  # las unidades de sonidos son lo primero que ve un principiante: frases cortas, sin gramática que aún no vio
_ENCLITIC = re.compile(r"\b\w{3,}(?:ar|er|ir|ur|rr)(?:ci|ne|lo|la|li|le|gli|ce|cela|cene|glielo)\b|\b(?:farcela|cela|cene)\b|\bce (?:la|ne)\b", re.I)  # «pensarci», «vederlo», «farcela» (sin los reflexivos -si/-mi, que sí se enseñan)
_AUX_ESSERE_PP = re.compile(r"\b(?:sono|sei|è|siamo|siete)\s+(?:stat[oiae]|andat[oiae]|venut[oiae]|nat[oiae]|arrivat[oiae]|usc[ie]t[oiae]|partit[oiae]|rimast[oiae]|diventat[oiae]|morti|morto|morta)\b|\b(?:mi|ti|si|ci|vi)\s+(?:sono|sei|è|siamo|siete)\s+\w+(?:at|it|ut)[oaie]\b", re.I)  # passato prossimo con essere: A2 (u08)


def fit_for_level(s: dict, level: str, code: str | None = None) -> bool:
    """En unidades A1 solo entran oraciones que pasan el prefiltro de auditoría (sin tiempos de A2+, demasiado largas, temas
    inadecuados). Antes la prueba tomaba las oraciones más largas y difíciles, y a A1 llegaban imperfetto, congiuntivo y frases de 20 palabras."""
    if level not in A1_LEVELS:
        return True
    if _ENCLITIC.search(s["it"]) or _AUX_ESSERE_PP.search(s["it"]) or (code in SOUND_CODES and len(s["it"].split()) > SOUND_MAX_WORDS):  # «pensarci», «farcela»: pronombres enclíticos y ci/ne son de A2+
        return False
    return not (italian_issue(s["it"], "A1") or spanish_issue(s.get("es")) or length_issue(s["it"], s.get("es")))


def assign_parts(usable: list[dict], codes: list[str]) -> dict:
    """`usable` viene de la más fácil a la más difícil. «Descubre» = las más fáciles; la prueba (reservada) se reparte
    de forma pareja por todo el resto, para medir la dificultad real de la unidad y no solo su extremo más duro."""
    n_test = LARGE_TEST_SIZE if len(usable) >= LARGE_UNIT else TEST_SIZE
    rest = usable[DISCOVER_SIZE:]
    step = len(rest) / n_test
    picked = {int(step * i + step / 2) for i in range(n_test)}
    test = [s for i, s in enumerate(rest) if i in picked]
    pool = usable[:DISCOVER_SIZE] + [s for i, s in enumerate(rest) if i not in picked]
    step = max(1, len(pool) // LISTEN_SIZE)
    listen = [pool[i] for i in range(0, len(pool), step)][:LISTEN_SIZE]
    return {
        "descubre": [s["id"] for s in pool[:DISCOVER_SIZE]],
        "practica": [s["id"] for s in pool],
        "escucha": [s["id"] for s in listen],
        "prueba": [s["id"] for s in test],
    }


def _divergence(code: str, s: dict) -> dict:
    c = find_calque(code, s["it"])
    return {"id": s["id"], "start": c.start, "end": c.end, "wrong": c.wrong}


def _with_contrast(w: dict) -> dict:
    """Artículo italiano del sustantivo, y avisos: género distinto del español (il latte / la leche) y falso amigo (fuentes leídas)."""
    out = dict(w)
    art = vocab.it_article(w["form"], w["gender"], w["num"], w["gloss"])
    if art:
        out["art"] = art
    if vocab.gender_differs(w["form"], w["gender"], w["gloss"]):
        out["gdiv"] = True
    s = vocab.sieves().get(w["form"])
    if s:
        out["sieve"] = s["k"]
        if s.get("r"):
            out["rule"] = s["r"]
        if s.get("n"):
            out["note"] = s["n"]
    if w["form"].lower() in vocab.false_friend_forms() or (s or {}).get("ff"):
        out["ff"] = True
    return out


MAX_PER_WORD = 12  # una palabra del tema no debe dominar la unidad (u42 tenía 28 de 35 oraciones con «soldi»)


def balance_by_word(usable: list[dict], code: str, cap: int = MAX_PER_WORD, floor: int = MIN_USABLE) -> list[dict]:
    """En unidades de vocabulario, como mucho `cap` oraciones por palabra del tema (las más fáciles). Si así quedan menos de `floor`,
    se reponen las descartadas hasta llegar a `floor`: mejor una unidad algo desbalanceada que ninguna."""
    if code not in vocab.VOCAB_CODES:
        return usable
    seen: dict[str, int] = {}
    keep, spare = [], []
    for s in usable:
        hit = vocab.find_vocab(code, s["it"])
        w = hit[2].lower() if hit else ""
        seen[w] = seen.get(w, 0) + 1
        (keep if seen[w] <= cap else spare).append(s)
    keep += spare[: max(0, floor - len(keep))]
    keep_ids = {s["id"] for s in keep}
    return [s for s in usable if s["id"] in keep_ids]


def build_course(sentences: list[dict], catalog: dict[str, dict]) -> dict:
    """Devuelve el curso para la app. Una unidad sin oraciones suficientes baja a `planned` con la razón (nunca se inventa)."""
    raw = load_course()
    units, planned = [], [dict(p) for p in raw["planned"]]
    for u in raw["units"]:
        usable = {c: balance_by_word([s for s in usable_sentences(c, sentences) if fit_for_level(s, u["level"], c)], c) for c in u["codes"]}
        total = sum(len(v) for v in usable.values())
        if len(u["codes"]) != 1 or total < MIN_USABLE:  # una unidad = un objetivo atómico (un código)
            planned.append({"level": u["level"], "title": u["title"], "reason": f"Solo {total} oraciones validadas utilizables (se necesitan {MIN_USABLE})."})
            continue
        code = u["codes"][0]
        parts = assign_parts(usable[code], u["codes"])
        by_id = {s["id"]: s for s in usable[code]}
        from pipeline.tts.ids import clip_id
        verbal = code in ("ERR_VOC_VORREI",)  # formas verbales: sin género ni número que mostrar
        words = [{"form": e.form, "gender": "x" if verbal else e.gender, "num": "x" if verbal else e.num, "gloss": e.gloss, "audio": clip_id(e.form)} for e in vocab.topics().get(code, [])]
        words = words or [{**w, "audio": clip_id(w["form"])} for w in u.get("words", [])]  # unidades de sonidos: palabras clave definidas en el curso
        words = [_with_contrast(w) for w in words]
        units.append({**u, **({"words": words} if words else {}), "status": "active", "explanation_es": catalog[code]["explanation_es"], "parts": parts,
                      "divergences": [_divergence(code, by_id[i]) for i in parts["descubre"]]})
    active = {u["id"] for u in units}
    modules = [{**m, "units": [x for x in m["units"] if x in active]} for m in raw.get("modules", [])]  # una unidad que baja a `planned` sale de su módulo (nunca se inventa)
    return {"version": raw["version"], "levels": raw["levels"], "modules": modules, "units": units, "planned": planned}


def write_course(out_dir: Path, sentences: list[dict], catalog: dict[str, dict]) -> dict:
    course = build_course(sentences, catalog)
    (Path(out_dir) / "course.json").write_text(json.dumps(course, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return course
