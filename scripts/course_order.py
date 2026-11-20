"""Ordena schemas/data/course.json según el currículo A1 aprobado (docs/curriculo-a1.md) y separa el vocabulario opcional.
Se vuelve a correr cada vez que se agrega una unidad: `python scripts/course_order.py`."""
import json
from pathlib import Path

P = Path(__file__).resolve().parents[1] / "schemas/data/course.json"
CORE = """u18 u19 u20 u63 u64 u37 u60 u26 u13
u54 u55 u07 u49 u41 u32 u45 u30
u21 u01 u02 u38 u39 u04
u14 u15 u16 u17 u36 u25 u59 u40 u56
u23 u03 u24 u05 u06 u61 u57
u22 u44 u35 u31 u42 u27 u33
u28 u29
u62 u58""".split()
OPTIONAL = "u34 u43 u46 u47 u48 u50 u51 u52 u53".split()  # vocabulario ampliado: no estaba en el currículo ni cuenta para el hito

c = json.loads(P.read_text(encoding="utf8"))
by = {u["id"]: u for u in c["units"]}
missing = [i for i in CORE + OPTIONAL if i not in by]
unknown = [i for i in by if by[i]["level"].startswith("A1") and i not in CORE + OPTIONAL]
assert not unknown, f"unidades A1 sin lugar en el orden: {unknown}"
for i in OPTIONAL:
    by[i]["level"] = "A1+"
core = [by[i] for i in CORE if i in by]
rest = [u for u in c["units"] if not u["level"].startswith("A1")]
opt = [by[i] for i in OPTIONAL if i in by]
c["units"] = core + rest + opt
if not any(l["id"] == "A1+" for l in c["levels"]):
    k = next(i for i, l in enumerate(c["levels"]) if l["id"] == "A1")
    c["levels"].insert(k + 1, {"id": "A1+", "title": "A1+ · Vocabulario ampliado (opcional)", "guided_hours": "opcional: no cuenta para el examen de hito"})
P.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
print("núcleo", len(core), "opcionales", len(opt), "aún sin crear:", missing)
