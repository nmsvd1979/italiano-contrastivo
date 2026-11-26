"""Voz humana de Tatoeba en la app: cada audio tiene licencia y atribución, y cada módulo A1 tiene su dictado con voz humana."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "web/public/audio"
PACK = ROOT / "web/public/content"


def test_cada_audio_humano_existe_y_tiene_licencia_y_atribucion():
    rows = json.loads((AUDIO / "human.json").read_text(encoding="utf8"))
    attr = (AUDIO / "ATTRIBUZIONI-voz-humana.md").read_text(encoding="utf8")
    assert len(rows) > 250
    for r in rows:
        assert (AUDIO / "human" / r["file"]).exists(), r["file"]
        assert r["license"] in ("CC BY 4.0", "CC BY-SA 4.0", "CC0 1.0") and r["speaker"], r
        assert f"human/{r['file']}" in attr, r["file"]
    assert len({r["form"] for r in rows}) == len(rows)


def test_banco_del_dictado_aprobado_y_con_audio():
    bank = json.loads((PACK / "listening_human.json").read_text(encoding="utf8"))
    audit = {v["id"]: v for f in ("2026-11-25-voz-humana.json", "2026-11-26-voz-humana-a2.json") for v in json.loads((ROOT / "content/audits" / f).read_text(encoding="utf8"))["veredictos"]}
    voiced = {r["form"] for r in json.loads((AUDIO / "human.json").read_text(encoding="utf8"))}
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    for s in bank:
        assert audit[s["id"]]["v"] == "keep" and s["it"] in voiced, s["id"]
    for m in course["modules"]:
        if m["level"] == "A1":
            assert f"vh_{m['id']}" in m.get("extra_readings", []), m["id"]
            assert any(s["module"] == m["id"] for s in bank), m["id"]
