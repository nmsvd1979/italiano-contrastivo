"""La auditoría IA de las frases de prueba y reserva A1 (content/audits/2026-11-25-pruebas.json) sigue aplicada en el paquete."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIT = json.loads((ROOT / "content/audits/2026-11-25-pruebas.json").read_text(encoding="utf8"))["veredictos"]
SENTS = {s["id"]: s for s in json.loads((ROOT / "web/public/content/sentences.json").read_text(encoding="utf8"))}


def test_las_rechazadas_no_estan_en_el_paquete():
    rejected = [v["id"] for v in AUDIT if v["v"] == "reject"]
    assert len(rejected) >= 40
    assert [i for i in rejected if i in SENTS] == []


def test_las_corregidas_llevan_el_espanol_nuevo_marcado_como_ia():
    for v in AUDIT:
        if v["v"] == "fix" and v["id"] in SENTS:
            s = SENTS[v["id"]]
            assert s["es"] == v["es"] and s["translation_kind"] == "llm" and "es_source_id" not in s, v["id"]


def test_alternativa_descartada_no_vuelve():
    for v in AUDIT:
        if v["v"] == "drop_alt":
            assert v["alt"] not in SENTS[v["id"]].get("alt", []), v["id"]
