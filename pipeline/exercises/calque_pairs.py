"""Pares (oración correcta, versión con calco) del corpus validado, para probar el detector de escritura de la web."""
import json
from pathlib import Path

from pipeline.exercises.calques import CALQUE_CODES, find_calque


def build_pairs(sentences_json: Path) -> list[dict]:
    pairs = []
    for s in json.loads(sentences_json.read_text(encoding="utf8")):
        for code in CALQUE_CODES:
            c = find_calque(code, s["it"])
            if c:
                pairs.append({"code": code, "correct": s["it"], "wrong": s["it"][:c.start] + c.wrong + s["it"][c.end:]})
    return pairs
