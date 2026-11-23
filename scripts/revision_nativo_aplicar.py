"""Lee docs/revision-nativo.md ya marcado por un hablante nativo, imprime la tasa de error por origen y, con --registrar, guarda las
decisiones en la base de autoría con reviewer="native" (el export las desglosa aparte de «llm-audit»).

  python scripts/revision_nativo_aplicar.py            # solo mide
  python scripts/revision_nativo_aplicar.py --registrar
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.db import store  # noqa: E402
from pipeline.review import batch, native  # noqa: E402

rows = native.parse_sentence_rows((ROOT / "docs/revision-nativo.md").read_text(encoding="utf8"))
if not rows:
    raise SystemExit("No hay filas marcadas en la sección C de docs/revision-nativo.md (marca cada fila con ✅, ✏️ o ❌).")
for src, r in native.error_rates(rows).items():
    pct = "—" if r["tasa"] is None else f"{r['tasa']:.0%}"
    print(f"{src:8} revisadas {r['revisadas']:3}  con error {r['con_error']:3}  tasa {pct}")
if "--registrar" in sys.argv:
    con = store.connect(ROOT / "data" / "work" / "authoring.db")
    for sid, d in native.decisions(rows):
        batch.record_decision(con, sid, d, reviewer="native")
    con.commit()
    print(f"{len(rows)} decisiones registradas con reviewer=native")
