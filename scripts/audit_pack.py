"""Prepara el paquete para el auditor independiente (IA): las oraciones ya revisadas, SIN la decisión humana
(para no anclar), con los códigos y el nivel actuales del pipeline. Escribe data/work/audit/."""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
OUT = ROOT / "data" / "work" / "audit"
OUT.mkdir(parents=True, exist_ok=True)
auth = sqlite3.connect(f"file:{ROOT/'data/work/authoring.db'}?mode=ro", uri=True)
work = sqlite3.connect(f"file:{ROOT/'data/work/work.db'}?mode=ro", uri=True)
catalog = {c["code"]: c for c in json.loads((ROOT / "schemas/data/error-codes.json").read_text(encoding="utf8"))}

ids = [r[0] for r in auth.execute("SELECT DISTINCT entity_id FROM reviews WHERE entity='sentences' ORDER BY entity_id")]
items = []
for sid in ids:
    d = json.loads(auth.execute("SELECT body FROM sentences WHERE id=?", (sid,)).fetchone()[0])
    ita = int(d["source_id"])
    codes = [r[0] for r in work.execute("SELECT code FROM tags WHERE ita_id=? ORDER BY code", (ita,))]
    est = work.execute("SELECT cefr, features FROM annotations WHERE ita_id=?", (ita,)).fetchone()
    items.append({
        "id": sid, "italiano": d["it"], "espanol": d["es"], "traduccion": d.get("translation_kind", "direct"),
        "codigos": [{"codigo": c, "explicacion": catalog[c]["explanation_es"], "ejemplo_erroneo": catalog[c]["example_wrong"], "ejemplo_correcto": catalog[c]["example_right"]} for c in codes],
        "nivel_estimado_por_reglas": est[0] if est else d["cefr_estimate"], "rasgos_del_nivel": json.loads(est[1]) if est else [],
    })
half = (len(items) + 1) // 2
for n, part in enumerate((items[:half], items[half:]), 1):
    (OUT / f"items_{n}.json").write_text(json.dumps(part, ensure_ascii=False, indent=1), encoding="utf8")
print(len(items), "oraciones →", [len(items[:half]), len(items[half:])])
