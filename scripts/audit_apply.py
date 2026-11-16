"""Aplica los veredictos del auditor (data/work/audit/verdicts_*.json) a la base de autoría con reviewer="llm-audit".
Regla de seguridad: el auditor solo puede volver las cosas MÁS conservadoras (rechazar, dudar, quitar códigos, corregir nivel);
nunca convierte un rechazo en aprobación."""
import json
import sqlite3
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.db import store  # noqa: E402
from pipeline.review import batch  # noqa: E402

REVIEWER = "llm-audit"
LEVELS = {"A1", "A2", "B1", "B2"}
auth = store.connect(ROOT / "data" / "work" / "authoring.db")
work = sqlite3.connect(f"file:{ROOT/'data/work/work.db'}?mode=ro", uri=True)
verdicts = [v for f in sorted((ROOT / "data/work/audit").glob("verdicts_*.json")) for v in json.loads(f.read_text(encoding="utf8"))]
items = {i["id"]: i for f in sorted((ROOT / "data/work/audit").glob("items_*.json")) for i in json.loads(f.read_text(encoding="utf8"))}
summary = Counter()
for v in verdicts:
    sid = v["id"]
    if sid not in items:
        summary["id_desconocido"] += 1
        continue
    doc = json.loads(auth.execute("SELECT body FROM sentences WHERE id=?", (sid,)).fetchone()[0])
    status = doc["review_status"]
    verdict = v.get("veredicto")
    note = "auditor IA: " + (v.get("nota") or v.get("traduccion_nota") or "")[:300]
    if status == "rejected":
        summary["ya_rechazada_se_deja"] += 1  # nunca se revierte un rechazo
        continue
    if verdict == "reject":
        batch.record_decision(auth, sid, {"action": "reject", "reason": note}, reviewer=REVIEWER); summary["rechazada"] += 1
    elif verdict == "doubt":
        batch.record_decision(auth, sid, {"action": "doubt", "reason": note}, reviewer=REVIEWER); summary["duda"] += 1
    elif verdict in ("keep", "fix"):
        audited = {c: (x.get("aplica") is True) for c, x in (v.get("codigos") or {}).items()}
        tags = {c: audited.get(c, False) for c in doc.get("error_codes", [])}  # lo que ya no dispara la regla o no se confirma, se quita
        level = v.get("nivel") if v.get("nivel") in LEVELS else doc["cefr_estimate"]
        decision = {"action": "approve", "tags": tags, "cefr": level, "reason": note, "translation_ok": v.get("traduccion_ok") is True}
        if doc.get("translation_kind") == "pivot" and not decision["translation_ok"]:
            batch.record_decision(auth, sid, {"action": "doubt", "reason": note + " [traducción pivote no confirmada]"}, reviewer=REVIEWER); summary["duda_pivote_sin_confirmar"] += 1
            continue
        if status == "validated" and not any(not t for t in tags.values()) and level == doc["cefr_estimate"]:
            summary["confirmada_sin_cambios"] += 1  # no se escribe nada: ya estaba validada igual
            continue
        batch.record_decision(auth, sid, decision, reviewer=REVIEWER); summary["aprobada_con_ajustes" if status == "validated" else "aprobada"] += 1
    else:
        summary["veredicto_invalido"] += 1
print(dict(summary), "| veredictos:", len(verdicts), "de", len(items))
