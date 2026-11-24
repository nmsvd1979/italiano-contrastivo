"""Qué es OBLIGATORIO en la ruta de un nivel: lo único que la app exige a quien solo sigue «Hoy» (la ruta es el camino único).

- Cápsulas (unidades) de los módulos del nivel y sus lecturas.
- Por módulo: el texto de entrada, los textos reales (paso «Textos reales»), y TODOS los juegos de rol y tareas orales (la Salida los pide todos,
  con la lectura de cada juego de rol).
- NO es obligatorio: los grupos de frases útiles («opcional» en la Salida), la Biblioteca externa y las unidades sueltas fuera de los módulos.
Un requisito del programa «covered» debe apoyarse en algo de este conjunto; si no, se puede terminar el nivel sin haberlo practicado."""
import json
from pathlib import Path

PACK = Path(__file__).resolve().parents[2] / "web/public/content"


def obligatorio(level: str) -> dict[str, set[str]]:
    course = json.loads((PACK / "course.json").read_text(encoding="utf8"))
    sp = json.loads((PACK / "speaking.json").read_text(encoding="utf8"))
    roleplays = {r["id"]: r for r in sp["roleplays"]}
    mods = [m for m in course["modules"] if m["level"] == level]
    in_mods = {u for m in mods for u in m["units"]}
    units = {u["id"]: u for u in course["units"] if u["id"] in in_mods}
    readings = {m["entry_reading"] for m in mods} | {x for m in mods for x in m.get("extra_readings", [])}
    readings |= {r for u in units.values() for r in u.get("readings", [])}
    readings |= {roleplays[rp]["reading"] for m in mods for rp in m["roleplays"]}
    return {
        "units": set(units),
        "modules": {m["id"] for m in mods},
        "readings": readings,
        "roleplays": {rp for m in mods for rp in m["roleplays"]},
        "tasks": {t for m in mods for t in m["tasks"]},
        "phrase_groups": set(),
    }
