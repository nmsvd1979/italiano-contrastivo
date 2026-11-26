"""Generación idempotente de los clips de voz: un mp3 por texto italiano validado + `index.json`.

Layout: `<out_dir>/tts/<id>.mp3` e `<out_dir>/index.json`. Solo se sintetizan textos del paquete de contenido
(oraciones y palabras de léxico), nunca opciones incorrectas.
"""
import json
import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Callable

from pipeline.tts.ids import LICENSE, LICENSE2, VOICE, VOICE2, clip_id, clip_id2, sha1

MAX_BYTES_A1 = 48_000_000
MAX_BYTES_A2 = 30_000_000   # tope propio de A2 (plan A2 §5.2), aparte del de A1: el audio solo se descarga al usarlo y GitHub Pages admite 1 GB
MAX_BYTES = MAX_BYTES_A1 + MAX_BYTES_A2   # total con A2 en el paquete; (A1 solo: subido de 32 MB el 2026-11-24 (decisión del asistente, por encargo del usuario de cerrar A1): el audio solo se descarga al usarlo y GitHub Pages admite 1 GB; revisar al llegar a A2
_SERENA = (
    "# Atribuciones de audio\n\n"
    "## Voz sintética (clips de oraciones y palabras)\n\n"
    "Voz sintética Piper `it_IT-serena-high` (conjunto de datos CC BY 4.0, committa/serena-synthetic-it-27h), "
    "generada automáticamente; no es una grabación de una persona.\n\n"
    "- Licencia: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)\n"
    "- Conjunto de datos: https://huggingface.co/datasets/committa/serena-synthetic-it-27h\n"
    "- Modelo: https://huggingface.co/rhasspy/piper-voices (it/it_IT/serena/high)\n\n"
    "## Segunda voz (solo diálogos)\n\n"
    "Voz sintética Piper `it_IT-paola-medium` (conjunto de datos CC0, OHF-Voice/voice-datasets), generada automáticamente; no es una grabación de una persona.\n\n"
    "- Licencia: CC0 1.0\n"
    "- Modelo: https://huggingface.co/rhasspy/piper-voices (it/it_IT/paola/medium)\n"
)


def attribution_text(words: list[dict]) -> str:
    out = _SERENA
    if words:
        out += (
            "\n## Grabaciones de hablantes nativos (palabras sueltas)\n\n"
            "Grabaciones de [Lingua Libre](https://lingualibre.org/), publicadas en Wikimedia Commons bajo licencia "
            "[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).\n\n" + "\n".join(w["attribution"] for w in words) + "\n"
        )
    return out


def native_words(lexemes: list[dict], source_dir: Path, dest_dir: Path) -> list[dict]:
    """Por cada palabra con grabación nativa (`<palabra>--<voz>.mp3`) toma la primera voz por orden alfabético y la copia."""
    source_dir, dest_dir = Path(source_dir), Path(dest_dir)
    if not source_dir.exists():
        return []
    lines = {}
    att = source_dir / "ATTRIBUZIONI.md"
    for line in (att.read_text(encoding="utf8").splitlines() if att.exists() else []):
        m = re.match(r"- `([^`]+\.mp3)`", line)
        if m:
            lines[m.group(1)] = line
    out = []
    for form in sorted({l["form"] for l in lexemes}):
        files = sorted(p.name for p in source_dir.glob(f"{form}--*.mp3") if p.name in lines)
        if not files:
            continue
        name = files[0]
        dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_dir / name, dest_dir / name)
        out.append({"form": form, "file": name, "speaker": name[:-4].split("--", 1)[1], "attribution": lines[name]})
    return out


def texts_for_pack(pack_dir: Path) -> list[str]:
    pack_dir = Path(pack_dir)
    sentences = json.loads((pack_dir / "sentences.json").read_text(encoding="utf8"))
    lexemes = json.loads((pack_dir / "lexemes.json").read_text(encoding="utf8"))
    rf = pack_dir / "readings.json"
    readings = json.loads(rf.read_text(encoding="utf8")) if rf.exists() else []
    cf = pack_dir / "course.json"
    words = {w["form"] for u in (json.loads(cf.read_text(encoding="utf8"))["units"] if cf.exists() else []) for w in u.get("words", [])}
    sp = pack_dir / "speaking.json"
    speaking = json.loads(sp.read_text(encoding="utf8")) if sp.exists() else {"tasks": [], "alphabet": {"letters": []}}
    spoken = {q["it"] for t in speaking["tasks"] for q in t["questions"]} | {x["name"] for x in speaking["alphabet"]["letters"]} | {x["it"] for g in speaking.get("phrases", {}).get("groups", []) for x in g["items"]} \
        | {q["it"] for q in (speaking.get("interview") or {}).get("questions", [])}
    # Las frases que dice la segunda voz tienen su propio clip: no se genera además el de la primera (a menos que el mismo texto se use en otro sitio).
    first_voice = {s["it"] for r in readings for s in r["sentences"] if s.get("voice") != 2}
    return sorted({s["it"] for s in sentences} | {l["form"] for l in lexemes} | first_voice | words | spoken)


def second_voice_texts(pack_dir: Path) -> list[str]:
    """Frases de diálogos que dice la segunda voz (marcadas `voice: 2` en readings.json)."""
    rf = Path(pack_dir) / "readings.json"
    readings = json.loads(rf.read_text(encoding="utf8")) if rf.exists() else []
    return sorted({s["it"] for r in readings for s in r["sentences"] if s.get("voice") == 2})


def plan_clips2(texts2: list[str], index: list[dict], out_dir: Path) -> list[str]:
    """Textos de la segunda voz que faltan o cambiaron."""
    tts = Path(out_dir) / "tts"
    by_id = {e["id"]: e for e in index}
    return [t for t in texts2 if not ((e := by_id.get(clip_id2(t))) and e["sha1"] == sha1(t) and e["voice"] == VOICE2 and (tts / f"{clip_id2(t)}.mp3").exists())]


def plan_clips(texts: list[str], index: list[dict], out_dir: Path, texts2: list[str] | None = None) -> dict:
    tts = Path(out_dir) / "tts"
    by_id = {e["id"]: e for e in index}
    ids = {clip_id(t) for t in texts} | {clip_id2(t) for t in (texts2 or [])}
    keep, generate = [], []
    for t in texts:
        e = by_id.get(clip_id(t))
        ok = e and e["sha1"] == sha1(t) and e["voice"] == VOICE and (tts / f"{clip_id(t)}.mp3").exists()
        (keep if ok else generate).append(t)
    on_disk = {p.stem for p in tts.glob("*.mp3")} if tts.exists() else set()
    return {"keep": keep, "generate": generate, "orphans": sorted((set(by_id) | on_disk) - ids)}


def _read_index(out_dir: Path) -> list[dict]:
    f = Path(out_dir) / "index.json"
    return json.loads(f.read_text(encoding="utf8")) if f.exists() else []


def generate(pack_dir: Path, out_dir: Path, synthesize: Callable[[str, Path], None],
             to_mp3: Callable[[Path, Path], None], max_bytes: int = MAX_BYTES, synthesize2: Callable[[str, Path], None] | None = None) -> list[dict]:
    out_dir = Path(out_dir)
    tts = out_dir / "tts"
    tts.mkdir(parents=True, exist_ok=True)
    texts = texts_for_pack(pack_dir)
    texts2 = second_voice_texts(pack_dir)
    plan = plan_clips(texts, _read_index(out_dir), out_dir, texts2)
    pending2 = plan_clips2(texts2, _read_index(out_dir), out_dir)
    if pending2 and synthesize2 is None:
        raise ValueError(f"Faltan {len(pending2)} clips de la segunda voz y no hay modelo para generarlos.")
    with tempfile.TemporaryDirectory() as tmp:
        for t in pending2:
            wav = Path(tmp) / f"{clip_id2(t)}.wav"
            partial = tts / f"{clip_id2(t)}.mp3.tmp"
            synthesize2(t, wav)
            try:
                to_mp3(wav, partial)
                os.replace(partial, tts / f"{clip_id2(t)}.mp3")
            finally:
                partial.unlink(missing_ok=True)
        for t in plan["generate"]:
            wav = Path(tmp) / f"{clip_id(t)}.wav"
            partial = tts / f"{clip_id(t)}.mp3.tmp"
            synthesize(t, wav)
            try:
                to_mp3(wav, partial)
                os.replace(partial, tts / f"{clip_id(t)}.mp3")  # un mp3 a medias nunca queda con el nombre final
            finally:
                partial.unlink(missing_ok=True)
    orphans = set(plan["orphans"])
    total = sum(p.stat().st_size for p in tts.glob("*.mp3") if p.stem not in orphans)
    if total > max_bytes:
        raise ValueError(f"El peso del audio ({total} bytes) supera el tope de {max_bytes} bytes; decídelo antes de seguir.")
    index = sorted([{"id": clip_id(t), "sha1": sha1(t), "text": t, "voice": VOICE, "license": LICENSE} for t in texts]
                   + [{"id": clip_id2(t), "sha1": sha1(t), "text": t, "voice": VOICE2, "license": LICENSE2} for t in texts2], key=lambda e: e["id"])
    tmp_index = out_dir / "index.json.tmp"
    tmp_index.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    os.replace(tmp_index, out_dir / "index.json")
    for oid in plan["orphans"]:  # solo después de escribir el índice: disco e índice quedan coherentes
        (tts / f"{oid}.mp3").unlink(missing_ok=True)
    return index
