"""Habla guiada: juegos de roles con diálogos de libros abiertos, tareas orales con las preguntas del libro y el alfabeto.

Fuente: `schemas/data/speaking.json`. No se escribe italiano propio: los diálogos ya están en `content/readings` y las preguntas y los nombres de las
letras vienen de Piacere! (CC BY-NC-SA). Aquí se valida y se agregan los ids de audio; el paquete queda en `web/public/content/speaking.json`.
"""
import json
from pathlib import Path

from pipeline import config
from pipeline.tts.ids import clip_id

MIN_TURNS_EACH = 2   # un juego de roles necesita al menos dos turnos de cada voz
MIN_QUESTIONS = 3


def load_speaking() -> dict:
    return json.loads((config.ROOT / "schemas" / "data" / "speaking.json").read_text(encoding="utf8"))


def validate(doc: dict, readings: list[dict], unit_ids: set[str]) -> list[str]:
    errs = []
    by_id = {r["id"]: r for r in readings}
    seen = set()
    for rp in doc["roleplays"]:
        if rp["id"] in seen:
            errs.append(f"{rp['id']}: id repetido")
        seen.add(rp["id"])
        r = by_id.get(rp["reading"])
        if not r:
            errs.append(f"{rp['id']}: la lectura {rp['reading']} no existe")
            continue
        n = len(r["sentences"])
        if not 0 <= rp["from"] < rp["to"] < n:
            errs.append(f"{rp['id']}: rango {rp['from']}–{rp['to']} fuera de la lectura ({n} oraciones)")
            continue
        turns = r["sentences"][rp["from"]: rp["to"] + 1]
        if any(not s.get("speaker") for s in turns):
            errs.append(f"{rp['id']}: hay oraciones sin hablante en el rango (narración)")
            continue
        counts: dict[str, int] = {}
        for s in turns:
            counts[s["speaker"]] = counts.get(s["speaker"], 0) + 1
        if len(counts) < 2 or min(counts.values()) < MIN_TURNS_EACH and len(counts) == 2:
            errs.append(f"{rp['id']}: necesita dos voces con {MIN_TURNS_EACH}+ turnos cada una ({counts})")
        for u in rp["after"]:
            if u not in unit_ids:
                errs.append(f"{rp['id']}: la unidad {u} no existe")
    for t in doc["tasks"]:
        if len(t["questions"]) < MIN_QUESTIONS:
            errs.append(f"{t['id']}: menos de {MIN_QUESTIONS} preguntas")
        for k in ("source", "intro_es", "checklist_es", "adaptation"):
            if not t.get(k):
                errs.append(f"{t['id']}: falta {k}")
        for u in t["after"]:
            if u not in unit_ids:
                errs.append(f"{t['id']}: la unidad {u} no existe")
    return errs


def texts(doc: dict) -> list[str]:
    """Textos italianos que necesitan audio: preguntas de las tareas y nombres de las letras."""
    return [q["it"] for t in doc["tasks"] for q in t["questions"]] + [x["name"] for x in doc["alphabet"]["letters"]] + [x["it"] for g in doc.get("phrases", {}).get("groups", []) for x in g["items"]]


def build_pack(pack_dir: Path) -> dict:
    pack_dir = Path(pack_dir)
    doc = load_speaking()
    readings = json.loads((pack_dir / "readings.json").read_text(encoding="utf8"))
    course = json.loads((pack_dir / "course.json").read_text(encoding="utf8"))
    errs = validate(doc, readings, {u["id"] for u in course["units"]})
    from pipeline.exercises.modules import validate_modules
    lib_file = pack_dir / "library.json"
    errs += validate_modules(course, readings, doc, json.loads(lib_file.read_text(encoding="utf8")) if lib_file.exists() else [])
    if errs:
        raise ValueError("Habla guiada inválida:\n" + "\n".join(errs))
    for t in doc["tasks"]:
        for q in t["questions"]:
            q["audio"] = clip_id(q["it"])
    for x in doc["alphabet"]["letters"]:
        x["audio"] = clip_id(x["name"])
    for g in doc.get("phrases", {}).get("groups", []):
        for k in ("source", "items"):
            if not g.get(k):
                raise ValueError(f"Habla guiada inválida: el grupo de frases {g.get('id')} no tiene {k}")
        for x in g["items"]:
            x["audio"] = clip_id(x["it"])
    (pack_dir / "speaking.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return doc
