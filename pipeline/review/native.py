"""Intake de la revisión de un hablante nativo (docs/revision-nativo.md, generado por scripts/paquete_revision.py).

La persona marca cada fila con ✅ (correcto), ✏️ (corregir: escribe la forma correcta) o ❌ (quitar). Aquí se leen esas marcas y se mide la
tasa de error REAL del contenido validado por IA, por origen de la traducción; es el único dato que dice cuánto vale la validación sin nativo.
"""
import re
from collections import Counter

OK, FIX, DROP = "✅", "✏️", "❌"
_ROW = re.compile(r"^\|\s*(s_\d+)\s*\|(.+)\|\s*(IA|Tatoeba)\s*\|\s*(.*?)\s*\|\s*$")


def parse_sentence_rows(text: str) -> list[dict]:
    """Filas de la sección C con una marca: {id, source, mark, correction}. Las filas sin marcar se ignoran (aún no revisadas)."""
    out = []
    for line in text.splitlines():
        m = _ROW.match(line)
        if not m or not m.group(4):
            continue
        cell = m.group(4)
        mark = FIX if FIX in cell else DROP if DROP in cell else OK if OK in cell else None
        if mark:
            out.append({"id": m.group(1), "source": m.group(3), "mark": mark, "correction": cell.replace(FIX, "").replace(DROP, "").replace(OK, "").strip()})
    return out


def error_rates(rows: list[dict]) -> dict:
    """Tasa de error (✏️ + ❌) por origen de la traducción y total. Sin filas revisadas no hay tasa: None, nunca 0."""
    out: dict = {}
    for src in ("IA", "Tatoeba", "total"):
        sel = [r for r in rows if src == "total" or r["source"] == src]
        bad = sum(r["mark"] != OK for r in sel)
        out[src] = {"revisadas": len(sel), "con_error": bad, "tasa": (bad / len(sel)) if sel else None}
    return out


def decisions(rows: list[dict]) -> list[tuple[str, dict]]:
    """Decisiones para `batch.record_decision(..., reviewer="native")`: ✅ aprueba, ❌ rechaza y ✏️ queda en duda con la corrección como motivo."""
    mapping = {OK: "approve", DROP: "reject", FIX: "doubt"}
    return [(r["id"], {"action": mapping[r["mark"]], "reason": ("nativo: " + (r["correction"] or r["mark"]))[:300]}) for r in rows]
