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
    by_id = {r["id"]: r for r in readings}
    # Clave «unidad:lectura»: una misma lectura puede asignarse a dos unidades y el hueco cae en el punto de divergencia de cada una.
    result = {f"{u['id']}:{rid}": items_for_reading(by_id[rid], u["codes"][0]) for u in course["units"] for rid in u.get("readings", []) if rid in by_id}
    # Relatos (cloze_text) de passato prossimo/imperfetto: viajan con la unidad de ese código, solo si su módulo ya está en el curso; no entran a `itemsByCode`
    # (así quedan fuera del repaso espaciado y del estudio de puntos débiles: no son una frase con un calco).
    relatos_file = Path(__file__).resolve().parents[2] / "content" / "relatos" / "a2.json"
    if relatos_file.exists():
        from pipeline.exercises.relatos import relato_item

        rels = [r for r in json.loads(relatos_file.read_text(encoding="utf8"))["relatos"] if not r.get("exam")]
        for u in course["units"]:
            if u["codes"][0] == "ERR_PP_VS_IMPERFETTO" and any(u["id"] in m["units"] for m in course["modules"]):
                result[f"{u['id']}:relatos"] = [relato_item(r, r["id"], u["codes"][0]) for r in rels]
    # Relatos de examen (`exam: true`) del hito del nivel: viajan con la clave «hito:<nivel>:relatos» solo cuando el hito está abierto.
    if relatos_file.exists() and any(l["id"] == "A2" and l.get("milestone") for l in course.get("levels", [])):
        from pipeline.exercises.relatos import relato_item

        exam = [r for r in json.loads(relatos_file.read_text(encoding="utf8"))["relatos"] if r.get("exam")]
        if exam:
            result["hito:A2:relatos"] = [relato_item(r, r["id"]) for r in exam]
    (pack_dir / "reading_items.json").write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    return result
