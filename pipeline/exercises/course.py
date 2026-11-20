"""Ruta guiada: reparte las oraciones utilizables de cada unidad en los pasos del ciclo (descubre, práctica, escucha, prueba).
La prueba usa oraciones reservadas (no aparecen en Práctica); todo es determinista."""
import json
from pathlib import Path

from pipeline import config
from pipeline.exercises.calques import find_calque
from pipeline.exercises.capsules import usable_sentences

TEST_SIZE = 6
DISCOVER_SIZE = 4
LISTEN_SIZE = 8
MIN_USABLE = TEST_SIZE + 12  # prueba + práctica mínima


def load_course() -> dict:
    return json.loads((config.ROOT / "schemas" / "data" / "course.json").read_text(encoding="utf8"))


def assign_parts(usable: list[dict], codes: list[str]) -> dict:
    """`usable` viene de la más fácil a la más difícil. Prueba = las más difíciles, reservadas."""
    test, pool = usable[-TEST_SIZE:], usable[:-TEST_SIZE]
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


def build_course(sentences: list[dict], catalog: dict[str, dict]) -> dict:
    """Devuelve el curso para la app. Una unidad sin oraciones suficientes baja a `planned` con la razón (nunca se inventa)."""
    raw = load_course()
    units, planned = [], [dict(p) for p in raw["planned"]]
    for u in raw["units"]:
        usable = {c: usable_sentences(c, sentences) for c in u["codes"]}
        total = sum(len(v) for v in usable.values())
        if len(u["codes"]) != 1 or total < MIN_USABLE:  # una unidad = un objetivo atómico (un código)
            planned.append({"level": u["level"], "title": u["title"], "reason": f"Solo {total} oraciones validadas utilizables (se necesitan {MIN_USABLE})."})
            continue
        code = u["codes"][0]
        parts = assign_parts(usable[code], u["codes"])
        by_id = {s["id"]: s for s in usable[code]}
        from pipeline.exercises import vocab
        from pipeline.tts.ids import clip_id
        words = [{"form": e.form, "gender": e.gender, "num": e.num, "gloss": e.gloss, "audio": clip_id(e.form)} for e in vocab.topics().get(code, [])]
        units.append({**u, **({"words": words} if words else {}), "status": "active", "explanation_es": catalog[code]["explanation_es"], "parts": parts,
                      "divergences": [_divergence(code, by_id[i]) for i in parts["descubre"]]})
    return {"version": raw["version"], "levels": raw["levels"], "units": units, "planned": planned}


def write_course(out_dir: Path, sentences: list[dict], catalog: dict[str, dict]) -> dict:
    course = build_course(sentences, catalog)
    (Path(out_dir) / "course.json").write_text(json.dumps(course, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return course
