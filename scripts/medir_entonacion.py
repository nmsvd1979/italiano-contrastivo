"""¿Serena sube el tono al final de una pregunta? Compara la pendiente de F0 en el último tramo de la frase dicha como pregunta («?») y como afirmación («.»)."""
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.tts import piper_lote  # noqa: E402

MODEL = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads" / "it_IT-serena-high.onnx"
FRASES = ["Hai fame", "Vieni con me", "Parla italiano", "Sei stanco", "Ha un gatto", "Mangiamo la pizza", "Vai a casa", "Il treno parte alle otto", "Tom è italiano", "Vuoi un caffè"]


def f0_track(x, sr, fmin=70, fmax=400, win=0.04, hop=0.01):
    n, h = int(sr * win), int(sr * hop)
    out = []
    for s in range(0, len(x) - n, h):
        fr = x[s : s + n] * np.hanning(n)
        if np.sqrt((fr**2).mean()) < 0.01:
            out.append(np.nan)
            continue
        ac = np.correlate(fr, fr, "full")[n - 1 :]
        lo, hi = int(sr / fmax), int(sr / fmin)
        k = lo + int(np.argmax(ac[lo:hi]))
        out.append(sr / k if ac[k] > 0.3 * ac[0] else np.nan)
    return np.array(out)


def pendiente_final(path):
    with wave.open(str(path)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768.0
    f = f0_track(x, sr)
    v = f[~np.isnan(f)]
    if len(v) < 12:
        return None
    last = v[-12:]
    return float(12 * np.log2(last[-4:].mean() / last[:4].mean()))  # semitonos entre el comienzo y el final del último tramo


def main():
    synth = piper_lote.make_synthesizer(MODEL)
    rows = []
    with tempfile.TemporaryDirectory() as d:
        for fr in FRASES:
            r = {}
            for sign, name in (("?", "pregunta"), (".", "afirmacion")):
                p = Path(d) / f"{name}.wav"
                synth(fr + sign, p)
                r[name] = pendiente_final(p)
            rows.append((fr, r["pregunta"], r["afirmacion"]))
            print(f"{fr:28s} pregunta {r['pregunta']!s:>22}  afirmación {r['afirmacion']!s:>22}")
    ok = [x for x in rows if x[1] is not None and x[2] is not None and x[1] - x[2] >= 2]
    print(f"\nFrases en que la pregunta sube ≥2 semitonos más que la afirmación: {len(ok)} de {len(rows)}")


if __name__ == "__main__":
    main()
