"""Pares (oración correcta, versión con calco) del corpus validado, para probar el detector de escritura de la web."""
import json
from pathlib import Path

from pipeline.exercises.calques import find_calque

# Códigos que el detector de escritura de la web (web/src/writing/detect.ts) sabe reconocer.
DETECTOR_CODES = ("ERR_AUX_ESSERE", "ERR_PREP_PLACE", "ERR_CE_AGREEMENT", "ERR_PERSONAL_A", "ERR_POSSESSIVE_ARTICLE",
                  "ERR_PREP_ARTICLE_CONTRACTION", "ERR_COMPARATIVE_DI", "ERR_TENERE_AVERE")
# Las reglas de A2 del detector (mi ho, ho stato, lo che…) se prueban con casos escritos en detect.test.ts: sus formas erróneas son muchas más
# de las que una regla de riesgo casi nulo reconoce («abbiamo sempre stato», «sei già cenato»), así que no se exige que cubra todos los pares generados.


def build_pairs(sentences_json: Path) -> list[dict]:
    pairs = []
    for s in json.loads(sentences_json.read_text(encoding="utf8")):
        for code in DETECTOR_CODES:
            c = find_calque(code, s["it"])
            if c:
                pairs.append({"code": code, "correct": s["it"], "wrong": s["it"][:c.start] + c.wrong + s["it"][c.end:]})
    return pairs
