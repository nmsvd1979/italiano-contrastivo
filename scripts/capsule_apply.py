"""Aplica veredictos de data/work/capsules/verdicts.json (lista de {id, codigo, veredicto, espanol?, nota?}).
Aprobadas: la oración queda con SOLO el código auditado (las etiquetas automáticas sin confirmar se descartan), reviewer="llm-audit".
Las de pivote se pasan a translation_kind=llm con el español generado desde el italiano (el del pivote se descarta).
Rechazo o duda se registran tal cual; nada entra sin veredicto 'keep'."""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline import filters  # noqa: E402
from pipeline.db import store  # noqa: E402
from pipeline.exercises import calques  # noqa: E402
from pipeline.exercises.calques import find_calque  # noqa: E402
from pipeline.review import batch  # noqa: E402

REVIEWER = "llm-audit"
auth = store.connect(ROOT / "data" / "work" / "authoring.db")
from pipeline.promote import ensure_catalog  # noqa: E402
ensure_catalog(auth)  # los códigos de tema también deben existir en la base (clave foránea)
auth.commit()
verdicts = json.loads((Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data/work/capsules/verdicts.json").read_text(encoding="utf8"))  # ruta opcional: otra tanda
words = lambda t: len(re.findall(r"\w+", t))
summary = Counter()
for v in verdicts:
    sid, code = v["id"], v["codigo"]
    row = auth.execute("SELECT body FROM sentences WHERE id=?", (sid,)).fetchone()
    doc = json.loads(row[0])
    if doc["review_status"] != "needs_review" or auth.execute("SELECT 1 FROM reviews WHERE entity='sentences' AND entity_id=?", (sid,)).fetchone():
        summary["ya_revisada_se_deja"] += 1
        continue
    note = "auditor IA en línea: " + (v.get("nota") or "italiano correcto; el calco del español es un error real")[:300]
    if v["veredicto"] != "keep":
        batch.record_decision(auth, sid, {"action": "reject" if v["veredicto"] == "reject" else "doubt", "reason": note}, reviewer=REVIEWER)
        summary[v["veredicto"]] += 1
        continue
    if not find_calque(code, doc["it"]):
        # Cápsulas de método manual (A2): el veredicto trae la variante errónea y la segunda pasada (audit2) la confirmó; se guarda en manual_calques.json.
        if not (v.get("correcto") and v.get("errado") and v.get("kind")):
            raise SystemExit(f"{sid}: el generador de {code} no encuentra su patrón y el veredicto no trae variante a mano (correcto/errado/kind)")
        entry = {"it": doc["it"], "correct": v["correcto"], "wrong": v["errado"], "kind": v["kind"], "audit2": v.get("audit2", "")}
        problems = calques.validate_manual_entry(entry)
        if problems:
            raise SystemExit(f"{sid}: variante a mano rechazada ({'; '.join(problems)})")
        table = json.loads(calques.MANUAL_FILE.read_text(encoding="utf8")) if calques.MANUAL_FILE.exists() else {}
        table.setdefault(code, [])
        table[code] = [e for e in table[code] if e["it"] != doc["it"]] + [entry]
        calques.MANUAL_FILE.write_text(json.dumps(table, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
        calques.manual_table.cache_clear()
        summary["variante_a_mano"] += 1
    new = dict(doc)
    if doc.get("translation_kind") == "pivot":
        new = {k: val for k, val in doc.items() if k not in ("es_source_id", "pivot_via")}
        es = filters.normalize(v.get("espanol") or "")
        if not es or not 0.4 <= words(es) / max(1, words(doc["it"])) <= 2.5:
            raise SystemExit(f"{sid}: falta traducción desde el italiano o es desproporcionada")
        new.update(es=es, translation_kind="llm", es_author="IA (Claude)", qa_flags=[f for f in doc.get("qa_flags", []) if f != "pivot"] + ["llm"])
    new.update(error_codes=[code], tag_rules={code: "capsule_calque"})
    store.upsert(auth, "sentences", new)
    batch.record_decision(auth, sid, {"action": "approve", "reason": note, "cefr": v.get("nivel") or doc["cefr_estimate"], "tags": {code: True}}, reviewer=REVIEWER)
    summary["aprobada"] += 1
auth.commit()
print(dict(summary), "| veredictos:", len(verdicts))
