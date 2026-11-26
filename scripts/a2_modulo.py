"""Integra un módulo de A2 al curso: agrega el módulo y sus unidades a schemas/data/course.json y su Salida (juegos de rol, tarea oral,
preguntas por voz) a schemas/data/speaking.json, a partir de schemas/data/syllabus-a2.json (cápsulas) y schemas/data/speaking-a2.json (textos propios).
Idempotente: si el módulo ya existe, lo reemplaza. No toca nada de A1.
Fichas: salen del catálogo de códigos de error (explicación) y de la ficha del programa (calco y formas válidas); los títulos, de la cápsula.
Uso: python scripts/a2_modulo.py a2m01"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
mod_id = sys.argv[1]
COURSE = ROOT / "schemas/data/course.json"
SPEAK = ROOT / "schemas/data/speaking.json"
SRC = {"book": "Texto escrito por la IA (Claude) para esta app", "authors": "Claude (IA), a pedido del usuario", "url": "https://github.com/nmsvd1979/italiano-contrastivo",
       "license": "Texto propio del proyecto, sin revisión de un hablante nativo"}
# unidades que ya existían en course.json (de A1/A2 anterior) y se reutilizan tal cual
REUSE = {"a2c04": "u09", "a2c13": "u10", "a2c17": "u11"}

syl = json.loads((ROOT / "schemas/data/syllabus-a2.json").read_text(encoding="utf8"))
sp2 = json.loads((ROOT / "schemas/data/speaking-a2.json").read_text(encoding="utf8"))["modules"][mod_id]
course = json.loads(COURSE.read_text(encoding="utf8"))
speak = json.loads(SPEAK.read_text(encoding="utf8"))
m = next(x for x in syl["modulos_planificados"] if x["id"] == mod_id)
catalog = {e["code"]: e for f in ("error-codes", "topic-codes") for e in json.loads((ROOT / f"schemas/data/{f}.json").read_text(encoding="utf8"))}
units = {u["id"]: u for u in course["units"]}
n_mod = sum(1 for x in course["modules"] if x["level"] == "A2") + (0 if any(x["id"] == mod_id for x in course["modules"]) else 1)

# 1) unidades
next_id = max(int(u["id"][1:]) for u in course["units"]) + 1
unit_ids = []
prev = next((x for x in course["modules"] if x["id"] == mod_id), {"units": []})["units"]   # si el módulo ya existe, se reutilizan sus unidades (idempotente)
existing = {units[i]["codes"][0]: i for i in prev}
for c in m["capsulas"]:
    uid = REUSE.get(c["id"]) or existing.get(c["code"])
    if not uid:
        uid = f"u{next_id}"
        next_id += 1
    unit_ids.append(uid)
    if uid in REUSE.values():
        continue
    e = catalog[c["code"]]
    prog = [q["text_es"] for q in syl["requisitos"] if c["id"] in q.get("capsulas", [])]   # lo que pide el programa oficial para esta cápsula
    ficha = (e["explanation_es"] + "\n\nError típico: " + c["calco_es"] + (". Válido y no es error: " + "; ".join(c["formas_validas_es"]) if c.get("formas_validas_es") else "")
             + ("\n\nQué practicas aquí: " + "; ".join(prog) + "." if prog else "") + "\n\nSituación del módulo: " + m["situacion_es"])
    u = {"id": uid, "level": "A2", "title": c["title_es"], "goal_es": c["title_es"] + (" (solo reconocer)" if c.get("productive") is False else ""),
         "codes": [c["code"]], "why_here": m["situacion_es"], "ficha_es": ficha}
    if c.get("productive") is False:
        u["productive"] = False
    units[uid] = u
course["units"] = [units[k] if k in units else u for k, u in ((x["id"], x) for x in course["units"])] + [units[i] for i in unit_ids if i not in {x["id"] for x in course["units"]}]

# 2) módulo
rps = []
for rp in sp2["roleplays"]:
    rps.append({"id": rp["id"], "title": rp["title"], "function_es": rp["function_es"], "reading": rp["reading"], "from": rp["from"], "to": rp["to"], "after": [unit_ids[-1]], "goal_es": rp["goal_es"]})
speak["roleplays"] = [r for r in speak["roleplays"] if r["id"] not in {x["id"] for x in rps}] + rps
t = sp2["task"]
task = {"id": t["id"], "title": t["title"], "function_es": t["function_es"], "level": "A2", "minutes": t["minutes"], "after": [unit_ids[-1]], "source": SRC,
        "intro_es": t["intro_es"], "questions": t["questions"], "adaptation": "Tarea escrita por la IA para este módulo, apoyada en las estructuras del programa CILS/PLIDA A2; sin revisión de un nativo.",
        "checklist_es": ["Respondí todas las preguntas, cada una con una frase completa (sujeto + verbo).", "No leí: hablé de corrido, aunque con pausas.",
                         "Cuidé lo que enseña este módulo: " + "; ".join(c["title_es"] for c in m["capsulas"][:3]) + ".", "Me escuché: la pronunciación y las dobles sonaron como en el modelo."]}
speak["tasks"] = [x for x in speak["tasks"] if x["id"] != task["id"]] + [task]
iv = speak.setdefault("interview", {}).setdefault("questions", [])
speak["interview"]["questions"] = [q for q in iv if q.get("module") != mod_id] + sp2["interview"]

mod = {"id": mod_id, "level": "A2", "title": m["title_es"], "can_do_es": m["can_do_es"], "units": unit_ids, "entry_reading": m["entrada"]["id"], "roleplays": [r["id"] for r in rps],
       "tasks": [task["id"]], "phrase_groups": [], "library": m["library"], "library_task_es": m["library_task_es"], "writing_es": sp2["writing"]["texto_es"],
       "writing_short_es": sp2["writing"]["mensaje_es"],
       "extra_readings": [r for r in sp2["readings"] if r.startswith(("ls_", "doc_"))] + [f"vh_{mod_id}"]}
course["modules"] = [x for x in course["modules"] if x["id"] != mod_id] + [mod]
COURSE.write_text(json.dumps(course, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
SPEAK.write_text(json.dumps(speak, ensure_ascii=False, indent=1) + "\n", encoding="utf8")   # speaking.json usa sangría de 1 espacio
print(mod_id, "unidades:", unit_ids, "| módulo número", n_mod)
