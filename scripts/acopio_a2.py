"""Acopio de candidatas de A2: para cada cápsula del programa (schemas/data/syllabus-a2.json) junta las oraciones sin usar de la base de autoría
que podrían servirle, las filtra con las reglas de A2, quita casi-duplicados y exceso de «Tom/Mary», y cuenta cuántas quedan frente al mínimo.

Reproducible: sin argumentos recorre las 36 cápsulas; con `--capsula a2c05` solo esa. Escribe:
  data/work/acopio/<cápsula>.json    candidatas únicas, ordenadas (directas primero, fáciles primero), con su origen (generador/vocabulario/patrón)
  data/work/acopio/informe.json      el resumen que usa docs/acopio-a2.md
Criterio de paso (plan §7, Fase 2): ≥ 45 candidatas únicas utilizables por cápsula. «Utilizable» = hay generador, tema de vocabulario o variante a mano posible:
  - con generador o vocabulario: la frase ya produce su ejercicio sin trabajo manual;
  - con método manual: la frase coincide con el patrón del requisito y hay que escribirle la variante errónea (se pide el doble, ≥ 80).
Uso: python scripts/acopio_a2.py [--capsula a2c05] [--max 150]"""
import argparse
import json
import random
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.exercises import vocab  # noqa: E402
from pipeline.exercises.calques import find_calque  # noqa: E402
from pipeline.exercises.course import MAX_PER_WORD, fit_for_level  # noqa: E402

OUT = ROOT / "data/work/acopio"
MIN_UNICAS = 45
MIN_MANUAL = 80            # con método manual hace falta el doble: hay que escribir y auditar cada variante
MAX_TOM_MARY = 0.20
MAX_PROPIAS = 30           # tope de frases escritas por la IA (authored) para completar una cápsula; más es cambiar de método
WORDS = (3, 12)
NAMES = {"tom", "mary", "maria", "marco", "giovanni", "john", "anna", "luca", "paolo", "giulia", "carlo", "sara", "ken", "mike", "bob", "paul", "jane", "luisa", "roberto", "andrea",
         "luis", "jack", "ana", "michele", "elena", "marta", "lucia", "laura", "chiara", "alice", "lisa", "david", "tanaka", "yamada", "ken", "manuel", "francesca", "alessandro"}
PERSON = {"io", "tu", "lui", "lei", "noi", "voi", "loro"}


def skeleton(it: str) -> list[str]:
    toks = re.findall(r"[\wàèéìòù']+", it.lower())
    return ["N" if t in NAMES else "P" if t in PERSON else re.sub(r"\d+", "0", t) for t in toks]


def near_duplicate(a: list[str], b: list[str]) -> bool:
    sa, sb = set(a), set(b)
    return len(sa & sb) / max(1, len(sa | sb)) >= 0.75


def load_syllabus() -> dict:
    return json.loads((ROOT / "schemas/data/syllabus-a2.json").read_text(encoding="utf8"))


def capsule_specs(doc: dict) -> dict[str, dict]:
    """id → {code, metodo, scope, regexes}: los patrones salen de la evidencia de los requisitos que citan la cápsula."""
    out = {}
    for m in doc["modulos_planificados"]:
        for c in m["capsulas"]:
            out[c["id"]] = {"id": c["id"], "module": m["id"], "code": c["code"], "metodo": c["metodo"], "scope": c["scope"], "title": c["title_es"], "regexes": []}
    for q in doc["requisitos"]:
        ev = q.get("evidence")
        if ev and ev.get("acopio", True):
            for cid in q.get("capsulas", []):
                out[cid]["regexes"].append(ev["regex"])
    return out


def load_pool() -> list[dict]:
    """Oraciones que podrían servir a A2: no rechazadas, A1–B1, 3–12 palabras y que NO se usan ya en A1 (ni en sus pruebas, reservas o escuchas)."""
    used = {s["id"] for s in json.loads((ROOT / "web/public/content/sentences.json").read_text(encoding="utf8"))}
    db = sqlite3.connect(f"file:{ROOT/'data/work/authoring.db'}?mode=ro", uri=True)
    reviewed_rejected = {r[0] for r in db.execute("SELECT entity_id FROM reviews WHERE entity='sentences' AND verdict='rejected'")} if _has_verdict(db) else set()
    pool = []
    for sid, status, body in db.execute("SELECT id, review_status, body FROM sentences WHERE review_status != 'rejected' AND cefr_estimate IN ('A1','A2','B1')"):
        if sid in used or sid in reviewed_rejected:
            continue
        d = json.loads(body)
        n = len(d["it"].split())
        if not WORDS[0] <= n <= WORDS[1]:
            continue
        pool.append({"id": sid, "it": d["it"], "es": d.get("es"), "kind": d.get("translation_kind", "direct"), "level": d.get("cefr_estimate"), "status": status})
    return pool


def _has_verdict(db) -> bool:
    return "verdict" in {r[1] for r in db.execute("PRAGMA table_info(reviews)")}


def analyze(spec: dict, pool: list[dict], limit: int) -> tuple[dict, list[dict]]:
    code = spec["code"]
    manual = any(k in spec["metodo"] for k in ("manual", "variante", "frases propias", "relato"))
    rx = [re.compile(r, re.I) for r in spec["regexes"]]
    is_vocab = code in vocab.VOCAB_CODES
    raw = fit = 0
    cands = []
    for s in pool:
        gen = bool(find_calque(code, s["it"])) if not is_vocab else bool(vocab.find_vocab(code, s["it"]))
        pat = any(r.search(s["it"]) for r in rx)
        if not (gen or pat):
            continue
        raw += 1
        d = {"id": s["id"], "it": s["it"], "es": s["es"] if s["kind"] != "pivot" else None, "cefr_estimate": s["level"]}
        if not fit_for_level(d, "A2", code):
            continue
        fit += 1
        cands.append({**s, "origen": "generador" if gen else "patron", "gen": gen})
    # variedad: más fáciles y con español directo primero; el orden es determinista
    rng = random.Random(7)
    order = {"A1": 0, "A2": 1, "B1": 2}
    cands.sort(key=lambda c: (c["kind"] == "pivot", not c["gen"], order.get(c["level"], 9), len(c["it"]), rng.random()))
    unicas, skels = [], []
    per_word: Counter = Counter()
    for c in cands:
        sk = skeleton(c["it"])
        if any(near_duplicate(sk, o) for o in skels[-400:]):
            continue
        if is_vocab:   # una palabra del tema no llena la cápsula
            w = vocab.find_vocab(code, c["it"])[2].lower()
            if per_word[w] >= MAX_PER_WORD:
                continue
            per_word[w] += 1
        unicas.append(c)
        skels.append(sk)
    # Tom/Mary: como mucho el 20 % del conjunto elegido (si sobran frases sin nombre propio)
    tm = [c for c in unicas if any(t in NAMES for t in skeleton(c["it"]) if t == "N")]
    sin = [c for c in unicas if c not in tm]
    keep_tm = tm[: max(0, int(MAX_TOM_MARY * len(unicas)))] if len(sin) >= 0.8 * len(unicas) else tm
    final = [c for c in unicas if c in sin or c in keep_tm]
    gen_n = sum(1 for c in final if c["gen"])
    if gen_n >= MIN_UNICAS and not is_vocab:   # con generador suficiente, las frases «solo por patrón» (más ruido, medido el 2026-11-26) no se ofrecen
        final = [c for c in final if c["gen"]]
    # Con generador suficiente no hace falta trabajo manual; si no, la cápsula depende de variantes a mano y se pide el doble.
    usable = len(final) if is_vocab else gen_n if gen_n >= MIN_UNICAS or not manual else len(final)
    need = MIN_UNICAS if (is_vocab or gen_n >= MIN_UNICAS or not manual) else MIN_MANUAL
    rep = {"capsula": spec["id"], "modulo": spec["module"], "code": code, "scope": spec["scope"], "metodo": spec["metodo"], "titulo": spec["title"],
           "brutas": raw, "tras_filtro_a2": fit, "unicas": len(final), "con_generador": gen_n, "con_espanol_directo": sum(1 for c in final if c["kind"] != "pivot"),
           "tom_mary": sum(1 for c in final if c in tm), "necesarias": need, "utilizables": usable,
           "propias_necesarias": max(0, MIN_UNICAS - len(final)) if "frases propias" in spec["metodo"] else 0,
           "pasa": usable >= need or ("frases propias" in spec["metodo"] and MIN_UNICAS - len(final) <= MAX_PROPIAS)}
    return rep, final[:limit]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--capsula")
    ap.add_argument("--max", type=int, default=150)
    a = ap.parse_args()
    doc = load_syllabus()
    specs = capsule_specs(doc)
    pool = load_pool()
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"{len(pool)} oraciones en el fondo (sin las ya usadas en A1)")
    informe = []
    for cid, spec in specs.items():
        if a.capsula and cid != a.capsula:
            continue
        rep, cands = analyze(spec, pool, a.max)
        (OUT / f"{cid}.json").write_text(json.dumps(cands, ensure_ascii=False, indent=1), encoding="utf8")
        informe.append(rep)
        print(f"{cid} {spec['code']:34s} brutas={rep['brutas']:6d} A2={rep['tras_filtro_a2']:6d} únicas={rep['unicas']:5d} gen={rep['con_generador']:5d} directas={rep['con_espanol_directo']:4d} "
              f"{'OK' if rep['pasa'] else 'NO'} ({rep['utilizables']}/{rep['necesarias']}{', propias ' + str(rep['propias_necesarias']) if rep['propias_necesarias'] else ''})")
    if not a.capsula:
        (OUT / "informe.json").write_text(json.dumps(informe, ensure_ascii=False, indent=1), encoding="utf8")


if __name__ == "__main__":
    main()
