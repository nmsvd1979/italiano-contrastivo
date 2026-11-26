"""Voz humana de Tatoeba (usuario NM1, CC BY 4.0) para la app.

1. Junta qué audios hacen falta: los de las frases aprobadas en content/audits/2026-11-25-voz-humana.json (dictado con voz humana) y los de
   cualquier texto que la app ya usa (oraciones, lecturas, preguntas por voz) que coincida con una frase grabada.
2. Baja los que falten a data/raw/tatoeba_audio/mp3/ (una vez; no se versiona) y los recomprime a web/public/audio/human/ (mono, 40 kbps).
3. Escribe web/public/audio/human.json (texto → archivo, con autor y licencia), web/public/audio/ATTRIBUZIONI-voz-humana.md y
   web/public/content/listening_human.json (el banco del dictado por módulo).
Solo se usa audio con licencia declarada en el índice (si el campo está vacío, Tatoeba no permite reutilizarlo).
Uso: python scripts/voz_humana.py [carpeta data/raw]"""
import csv
import glob
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "raw"
MP3 = RAW / "tatoeba_audio" / "mp3"
PACK = ROOT / "web" / "public" / "content"
AUDIO = ROOT / "web" / "public" / "audio"
OK_LICENSES = {"CC BY 4.0", "CC BY-SA 4.0", "CC0 1.0"}
MAX_HUMAN_BYTES = 8_000_000   # tope propio de la voz humana (aparte de los 48 MB de Piper): se baja solo al usarla; revisar en A2


def key(t: str) -> str:
    return re.sub(r"[^\w]+", " ", t.lower()).strip()


def main() -> None:
    csv.field_size_limit(10**7)
    ita = {}
    with open(RAW / "ita_sentences_detailed.tsv", encoding="utf8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            ita[p[0]] = p[2]
    rec = {}
    with open(RAW / "tatoeba_audio" / "sentences_with_audio.csv", encoding="utf8") as f:
        for r in csv.reader(f, delimiter="\t"):
            if r[0] in ita and len(r) >= 4 and r[3] in OK_LICENSES:
                rec.setdefault(r[0], {"audio": r[1], "user": r[2], "license": r[3], "url": r[4] if len(r) > 4 else ""})
    by_text = {}
    for sid in sorted(rec, key=int):
        by_text.setdefault(key(ita[sid]), sid)

    sentences = [s for f in sorted(glob.glob(str(ROOT / "content" / "sentences" / "*.json"))) for s in json.loads(Path(f).read_text(encoding="utf8"))]
    exported = {s["id"]: s for s in sentences}
    audit = json.loads((ROOT / "content" / "audits" / "2026-11-25-voz-humana.json").read_text(encoding="utf8"))["veredictos"]
    bank = []
    for v in audit:
        s = exported.get(v["id"])
        if v["v"] != "keep" or not s or s["source_id"] not in rec:
            continue
        bank.append({"id": s["id"], "module": v["module"], "it": s["it"], "es": s["es"], "tatoeba": s["source_id"]})

    texts = [s["it"] for s in json.loads((PACK / "sentences.json").read_text(encoding="utf8"))]
    texts += [x["it"] for r in json.loads((PACK / "readings.json").read_text(encoding="utf8")) for x in r["sentences"]]
    sp = json.loads((PACK / "speaking.json").read_text(encoding="utf8"))
    texts += [q["it"] for q in sp.get("interview", {}).get("questions", [])] + [q["it"] for t in sp["tasks"] for q in t["questions"]]
    texts += [b["it"] for b in bank]
    wanted = {}
    for t in texts:
        sid = by_text.get(key(t))
        if sid:
            wanted[t] = sid

    MP3.mkdir(parents=True, exist_ok=True)
    (AUDIO / "human").mkdir(parents=True, exist_ok=True)
    rows, downloaded = [], 0
    for text, sid in sorted(wanted.items()):
        r = rec[sid]
        src = MP3 / f"{r['audio']}.mp3"
        if not src.exists():
            req = urllib.request.Request(f"https://tatoeba.org/audio/download/{r['audio']}", headers={"User-Agent": "italiano-contrastivo (uso personal)"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                if resp.headers.get("Content-Type", "").split(";")[0] != "audio/mpeg":
                    raise SystemExit(f"{sid}: no es mp3 ({resp.headers.get('Content-Type')})")
            src.write_bytes(data)
            downloaded += 1
            time.sleep(0.3)
        dest = AUDIO / "human" / src.name
        if not dest.exists():   # mismo formato que los clips de la app: mono, 24 kHz, 40 kbps (el original es estéreo a 64 kbps)
            subprocess.run(["lame", "--quiet", "--mp3input", "-m", "m", "--resample", "24", "-b", "40", str(src), str(dest)], check=True)
        rows.append({"form": text, "file": src.name, "speaker": r["user"], "license": r["license"], "tatoeba": sid,
                     "attribution_url": r["url"] or f"https://tatoeba.org/en/sentences/show/{sid}"})
    keep = {r["file"] for r in rows}
    for f in (AUDIO / "human").glob("*.mp3"):
        if f.name not in keep:
            f.unlink()
    (AUDIO / "human.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    lines = [f"- `human/{r['file']}` — «{r['form']}», voz de {r['speaker']} ({r['license']}) — https://tatoeba.org/en/sentences/show/{r['tatoeba']}" for r in rows]
    (AUDIO / "ATTRIBUZIONI-voz-humana.md").write_text(
        "# Voz humana (Tatoeba)\n\nGrabaciones de frases de [Tatoeba](https://tatoeba.org) hechas por personas, con la licencia que indica cada línea. "
        "La app las usa en lugar de la voz sintética cuando el texto coincide.\n\n" + "\n".join(lines) + "\n", encoding="utf8")
    (PACK / "listening_human.json").write_text(json.dumps(bank, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    size = sum(f.stat().st_size for f in (AUDIO / "human").glob("*.mp3"))
    if size > MAX_HUMAN_BYTES:
        raise SystemExit(f"La voz humana pesa {size / 1e6:.1f} MB, más que el tope de {MAX_HUMAN_BYTES / 1e6:.0f} MB")
    print(f"audios: {len(rows)} (bajados ahora: {downloaded}), {size / 1e6:.1f} MB; banco del dictado: {len(bank)} frases")


if __name__ == "__main__":
    main()
