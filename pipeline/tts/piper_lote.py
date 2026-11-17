"""Síntesis con Piper (modelo cargado una sola vez) y conversión wav → mp3 con lame."""
import shutil
import subprocess
import wave
from pathlib import Path
from typing import Callable


def make_synthesizer(model: Path) -> Callable[[str, Path], None]:
    from piper import PiperVoice  # import tardío: solo la etapa `tts` necesita Piper

    voice = PiperVoice.load(str(model))

    def synthesize(text: str, wav_path: Path) -> None:
        with wave.open(str(wav_path), "wb") as w:
            voice.synthesize_wav(text, w)

    return synthesize


def lame_to_mp3(wav: Path, mp3: Path) -> None:
    """mp3 mono 24 kHz ~40 kbps (como los clips de la app anterior)."""
    if not shutil.which("lame"):
        raise RuntimeError("Falta `lame` para convertir el audio (brew install lame).")
    subprocess.run(["lame", "--quiet", "-m", "m", "--resample", "24", "-b", "40", str(wav), str(mp3)], check=True)
