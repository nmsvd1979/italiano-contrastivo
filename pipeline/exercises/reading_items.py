"""Ejercicios derivados de las lecturas y diálogos de libros abiertos (Fase B del plan de cierre de A1).

Cada oración del texto original (italiano del libro, sin cambios) produce hasta tres ítems: traducir del español (traducción de IA marcada),
ordenar las palabras y completar un hueco. Si el código de la unidad encuentra su punto de divergencia en la oración, el hueco cae ahí;
si no, en una palabra de contenido. No se inventa italiano: todo sale del texto del libro.
"""
import json
import re
import zlib
from pathlib import Path

from pipeline.exercises.calques import Calque, find_calque
from pipeline.exercises.items import build_cloze, build_reorder, build_translate

_WORD = re.compile(r"[A-Za-zÀ-ÿ]+(?:'[A-Za-zÀ-ÿ]+)?")
MIN_WORDS_TRANSLATE, MAX_WORDS_TRANSLATE = 3, 14


def _blank(it: str, code: str | None, seed: int) -> Calque | None:
    c = find_calque(code, it) if code else None
    if c and c.correct not in c.wrong:
        return c
    words = [m for m in _WORD.finditer(it) if len(m.group(0)) >= 4 and not (m.group(0)[0].isupper() and m.start() > 0)]
    if not words:
        return None
    m = words[zlib.crc32(f"{seed}:{it}".encode()) % len(words)]
    return Calque(code or "none", m.start(), m.end(), m.group(0), "", "omission")


def items_for_reading(reading: dict, code: str | None) -> list[dict]:
    out: list[dict] = []
    for k, s in enumerate(reading["sentences"]):
        n = len(re.findall(r"\w+", s["it"]))
        sent = {"id": s["id"], "it": s["it"], "es": s["es"]}
        if MIN_WORDS_TRANSLATE <= n <= MAX_WORDS_TRANSLATE:
            out.append(build_translate(sent, code))
        reorder = build_reorder(sent, k, code)
        if reorder:
            out.append(reorder)
        b = _blank(s["it"], code, k)
        if b and n >= 3:
            cloze = build_cloze(sent, b)
            if cloze:
                out.append(cloze)
    return out


def build_pack(pack_dir: Path, course_file: Path) -> dict[str, list[dict]]:
    pack_dir = Path(pack_dir)
    readings = json.loads((pack_dir / "readings.json").read_text(encoding="utf8"))
    course = json.loads(Path(course_file).read_text(encoding="utf8"))
    code_of = {rid: u["codes"][0] for u in course["units"] for rid in u.get("readings", [])}
    result = {r["id"]: items_for_reading(r, code_of.get(r["id"])) for r in readings}
    (pack_dir / "reading_items.json").write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    return result
