"""Etapa final: paquetes JSON por nivel con SOLO lo validado por una persona, más atribuciones (CC BY)."""
import json
from collections import Counter
from pathlib import Path

LEVELS = ["A1", "A2", "B1", "B2"]
URL = "https://tatoeba.org/en/sentences/show/{}"
HEADER = (
    "# Atribuciones de Tatoeba\n\n"
    "Las oraciones de esta carpeta provienen de [Tatoeba](https://tatoeba.org) y se usan bajo la licencia "
    "CC BY 2.0 FR. Cada línea indica la oración italiana y su traducción española, con su autor y su enlace.\n\n"
)


def _write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf8")


def _has_attribution(d: dict) -> bool:
    # En las traducciones generadas por IA no hay oración española de Tatoeba que citar.
    if d.get("source") == "authored":   # escrita por la IA para la app: no hay autor ni id de Tatoeba que citar, pero sí quién la escribió y bajo qué condición
        return all(d.get(k) for k in ("author", "license"))
    needed = ("author", "license", "source_id") if d.get("translation_kind") == "llm" else ("author", "es_author", "license", "source_id", "es_source_id")
    return all(d.get(k) for k in needed)


def export(auth, out_dir: Path) -> dict:
    """Escribe sentences/<nivel>.json, manifest.json y ATTRIBUZIONI-tatoeba.md. Solo entra lo `validated` que tiene
    una fila de revisión `validated` y atribución completa (autor del italiano y del español, licencia, ids)."""
    out = Path(out_dir)
    (out / "sentences").mkdir(parents=True, exist_ok=True)
    rows = auth.execute(
        "SELECT body FROM sentences s WHERE s.review_status = 'validated' AND EXISTS ("
        "SELECT 1 FROM reviews r WHERE r.entity = 'sentences' AND r.entity_id = s.id AND r.status = 'validated') ORDER BY s.id"
    ).fetchall()
    docs = [json.loads(r[0]) for r in rows]
    # Los pares por pivote pierden género, número y persona: nunca se exportan, aunque alguien los haya validado.
    excluded_pivot = [d["id"] for d in docs if d.get("translation_kind") == "pivot"]
    docs = [d for d in docs if d.get("translation_kind") != "pivot"]
    excluded = [d["id"] for d in docs if not _has_attribution(d)]
    docs = [d for d in docs if _has_attribution(d)]

    by_level: dict[str, list[dict]] = {lv: [] for lv in LEVELS}
    for d in docs:
        by_level[d["cefr_estimate"]].append(d)
    for lv in LEVELS:
        _write_json(out / "sentences" / f"{lv}.json", by_level[lv])

    manifest = {
        "levels": {lv: len(by_level[lv]) for lv in LEVELS},
        "codes": dict(sorted(Counter(c for d in docs for c in d.get("error_codes", [])).items())),
        "translation_kind": dict(sorted(Counter(d.get("translation_kind", "direct") for d in docs).items())),
        "authors": dict(sorted(Counter(d["author"] for d in docs).items())),
        # Quién tomó la última decisión validante: permite distinguir lo revisado por una persona de lo auditado por IA.
        "reviewers": dict(sorted(Counter(
            auth.execute("SELECT reviewer FROM reviews WHERE entity='sentences' AND entity_id=? AND status='validated' ORDER BY id DESC LIMIT 1", (d["id"],)).fetchone()[0]
            for d in docs).items())),
        "excluded_missing_attribution": excluded,
        "excluded_pivot": excluded_pivot,
    }
    _write_json(out / "manifest.json", manifest)

    lines = [
        f"- {d['id']}: oración escrita por IA para esta app (no es de Tatoeba ni de un libro); no la revisó un hablante nativo — {d['license']}" if d.get("source") == "authored" else
        f"- {d['id']}: italiano #{d['source_id']} por {d['author']} ({URL.format(d['source_id'])}); "
        + (f"español: traducción generada por IA a partir del italiano — {d['license']}" if d.get("translation_kind") == "llm"
           else f"español #{d['es_source_id']} por {d['es_author']} ({URL.format(d['es_source_id'])}) — {d['license']}")
        for d in docs
    ]
    (out / "ATTRIBUZIONI-tatoeba.md").write_text(HEADER + "\n".join(lines) + ("\n" if lines else ""), encoding="utf8")
    return manifest
