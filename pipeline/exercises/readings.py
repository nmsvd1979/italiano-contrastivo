"""Lecturas y diálogos de libros abiertos: validación y paquete `readings.json`.

Fuente: `content/readings/<id>.json` (texto italiano tomado tal cual del libro, traducción IA marcada y preguntas en español).
No se inventa italiano: cada oración conserva el texto original y las preguntas van en español.
"""
import json
import re
from pathlib import Path

from pipeline import config
from pipeline.tts.ids import clip_id

MIN_QUESTIONS = 4
KINDS = {"lectura", "dialogo"}


def validate(r: dict) -> list[str]:
    errs, sents = [], r.get("sentences") or []
    for k in ("id", "title", "level", "kind", "source", "translation"):
        if not r.get(k):
            errs.append(f"{r.get('id', '?')}: falta {k}")
    if r.get("kind") not in KINDS:
        errs.append(f"{r.get('id')}: kind inválido")
    for k in ("book", "authors", "url", "license"):
        if not (r.get("source") or {}).get(k):
            errs.append(f"{r.get('id')}: falta source.{k}")
    ids = [s.get("id") for s in sents]
    if len(set(ids)) != len(ids):
        errs.append(f"{r.get('id')}: ids de oración repetidos")
    for s in sents:
        if not s.get("it") or not s.get("es"):
            errs.append(f"{s.get('id')}: falta it o es")
    qs = r.get("questions") or []
    if len(qs) < MIN_QUESTIONS:
        errs.append(f"{r.get('id')}: menos de {MIN_QUESTIONS} preguntas")
    for q in qs:
        if not 0 <= q.get("answer", -1) < len(q.get("options", [])):
            errs.append(f"{r.get('id')}: respuesta fuera de rango en «{q.get('prompt_es')}»")
        if len(set(q.get("options", []))) != len(q.get("options", [])):
            errs.append(f"{r.get('id')}: opciones repetidas en «{q.get('prompt_es')}»")
        if "evidence" in q and not 0 <= q["evidence"] < len(sents):
            errs.append(f"{r.get('id')}: evidence fuera de rango en «{q.get('prompt_es')}»")
    return errs


def load_readings(src_dir: Path) -> list[dict]:
    out = [json.loads(p.read_text(encoding="utf8")) for p in sorted(Path(src_dir).glob("*.json"))]
    errs = [e for r in out for e in validate(r)]
    if errs:
        raise ValueError("Lecturas inválidas:\n" + "\n".join(errs))
    return out


READING_WORDS = config.ROOT / "pipeline" / "vocab" / "reading_words.json"
_WORD = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]+")


def tokens(text: str) -> list[str]:
    """Palabras de una frase en minúscula; «l'amico» da «l» y «amico»."""
    return [m.group(0).lower() for m in _WORD.finditer(text)]


def build_reading_words(readings: list[dict]) -> dict[str, dict]:
    """Glosa y tamiz (parentesco con el español) de cada palabra que aparece en las lecturas. Clasificado por IA; falla si falta alguna."""
    src = json.loads(READING_WORDS.read_text(encoding="utf8"))
    used = sorted({t for r in readings for s in r["sentences"] for t in tokens(s["it"])})
    missing = [t for t in used if t not in src]
    if missing:
        raise ValueError(f"Faltan {len(missing)} palabras de las lecturas en reading_words.json: {missing[:15]}")
    return {t: src[t] for t in used}


def build_pack(src_dir: Path, pack_dir: Path) -> list[dict]:
    readings = load_readings(src_dir)
    pack = []
    for r in readings:
        d = {k: r[k] for k in ("id", "title", "level", "kind", "source", "translation", "questions")}
        d["sentences"] = [{"id": s["id"], "it": s["it"], "es": s["es"], **({"speaker": s["speaker"]} if s.get("speaker") else {}),
                          "audio": clip_id(s["it"])} for s in r["sentences"]]
        pack.append(d)
    pack_dir = Path(pack_dir)
    (pack_dir / "readings.json").write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    (pack_dir / "reading_words.json").write_text(json.dumps(build_reading_words(readings), ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf8")
    return pack
