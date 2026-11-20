"""Mide si la voz Serena distingue consonantes simples y dobles (Fase S del plan de cierre de A1).

Sintetiza pares mínimos y compara, para cada par, (a) la duración de la palabra recortada y (b) en las oclusivas, el silencio de cierre
(el tramo más largo de energía muy baja dentro de la palabra). Una geminada real alarga el cierre ≈ 1,6–2 veces.
Uso: python scripts/medir_serena.py [modelo.onnx]"""
import json
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.tts import piper_lote  # noqa: E402

MODEL = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads" / "it_IT-serena-high.onnx"
# (simple, doble, tipo): «stop» mide el cierre; el resto solo la duración total
PAIRS = [("fato", "fatto", "stop"), ("tuta", "tutta", "stop"), ("sete", "sette", "stop"), ("capelli", "cappelli", "stop"), ("nono", "nonno", "nasal"),
         ("pena", "penna", "nasal"), ("pala", "palla", "lateral"), ("caro", "carro", "vibrante"), ("casa", "cassa", "fricativa"), ("beta", "betta", "stop"),
         ("eco", "ecco", "stop"), ("sano", "sanno", "nasal")]


def read(path):
    with wave.open(str(path)) as w:
        sr, n = w.getframerate(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64)
    return x / 32768.0, sr


def envelope(x, sr, win_ms=5):
    k = int(sr * win_ms / 1000)
    n = len(x) // k
    return np.sqrt((x[: n * k].reshape(n, k) ** 2).mean(axis=1) + 1e-12), win_ms


def measure(path):
    x, sr = read(path)
    env, step = envelope(x, sr)
    db = 20 * np.log10(env / env.max())
    voiced = np.where(db > -40)[0]
    a, b = voiced[0], voiced[-1]
    seg = db[a : b + 1]
    dur = int((b - a + 1) * step)
    low = seg < -30  # silencio de cierre: muy por debajo del pico
    best = run = 0
    for i, v in enumerate(low):
        if v and 0 < i < len(low) - 1:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return dur, int(best * step)


def main():
    synth = piper_lote.make_synthesizer(MODEL)
    rows = []
    with tempfile.TemporaryDirectory() as d:
        for simple, double, kind in PAIRS:
            res = {}
            for w in (simple, double):
                p = Path(d) / f"{w}.wav"
                synth(w, p)
                res[w] = measure(p)
            (ds, cs), (dd, cd) = res[simple], res[double]
            rows.append({"par": f"{simple}/{double}", "tipo": kind, "dur_simple_ms": ds, "dur_doble_ms": dd, "razon_duracion": round(dd / ds, 2),
                         "cierre_simple_ms": cs, "cierre_doble_ms": cd, "razon_cierre": round(cd / cs, 2) if cs else None})
    for r in rows:
        print(r)
    ok = [r for r in rows if r["razon_duracion"] >= 1.15]
    print(f"\nPares con la palabra doble ≥15 % más larga: {len(ok)} de {len(rows)}")
    (ROOT / "data/work/medicion-serena.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf8")


if __name__ == "__main__":
    main()
