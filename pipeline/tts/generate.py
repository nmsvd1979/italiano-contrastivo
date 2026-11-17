"""Generación idempotente de los clips de voz: un mp3 por texto italiano validado + `index.json`.

Layout: `<out_dir>/tts/<id>.mp3` e `<out_dir>/index.json`. Solo se sintetizan textos del paquete de contenido
(oraciones y palabras de léxico), nunca opciones incorrectas.
"""
import json
import os
import tempfile
from pathlib import Path
from typing import Callable

from pipeline.tts.ids import LICENSE, VOICE, clip_id, sha1

MAX_BYTES = 3_000_000
ATTRIBUTION = (
    "# Atribuciones de audio\n\n"
    "## Voz sintética (clips de oraciones y palabras)\n\n"
    "Voz sintética Piper `it_IT-serena-high` (conjunto de datos CC BY 4.0, committa/serena-synthetic-it-27h), "
    "generada automáticamente; no es una grabación de una persona.\n"
)


def texts_for_pack(pack_dir: Path) -> list[str]:
    pack_dir = Path(pack_dir)
    sentences = json.loads((pack_dir / "sentences.json").read_text(encoding="utf8"))
    lexemes = json.loads((pack_dir / "lexemes.json").read_text(encoding="utf8"))
    return sorted({s["it"] for s in sentences} | {l["form"] for l in lexemes})


def plan_clips(texts: list[str], index: list[dict], out_dir: Path) -> dict:
    tts = Path(out_dir) / "tts"
    by_id = {e["id"]: e for e in index}
    ids = {clip_id(t) for t in texts}
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
             to_mp3: Callable[[Path, Path], None], max_bytes: int = MAX_BYTES) -> list[dict]:
    out_dir = Path(out_dir)
    tts = out_dir / "tts"
    tts.mkdir(parents=True, exist_ok=True)
    texts = texts_for_pack(pack_dir)
    plan = plan_clips(texts, _read_index(out_dir), out_dir)
    with tempfile.TemporaryDirectory() as tmp:
        for t in plan["generate"]:
            wav = Path(tmp) / f"{clip_id(t)}.wav"
            synthesize(t, wav)
            to_mp3(wav, tts / f"{clip_id(t)}.mp3")
    for oid in plan["orphans"]:
        (tts / f"{oid}.mp3").unlink(missing_ok=True)
    total = sum(p.stat().st_size for p in tts.glob("*.mp3"))
    if total > max_bytes:
        raise ValueError(f"El peso del audio ({total} bytes) supera el tope de {max_bytes} bytes; decídelo antes de seguir.")
    index = sorted(({"id": clip_id(t), "sha1": sha1(t), "text": t, "voice": VOICE, "license": LICENSE} for t in texts), key=lambda e: e["id"])
    tmp_index = out_dir / "index.json.tmp"
    tmp_index.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    os.replace(tmp_index, out_dir / "index.json")
    return index
