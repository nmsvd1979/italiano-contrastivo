"""Informe de la compuerta de 200: precisión por regla, acuerdo de nivel y rechazo del pivote."""
import json

LATEST_REVIEW = (
    "SELECT r.entity_id, r.status FROM reviews r WHERE r.entity = 'sentences' "
    "AND r.id = (SELECT MAX(id) FROM reviews WHERE entity = 'sentences' AND entity_id = r.entity_id)"
)


def build_report(auth) -> dict:
    latest = dict(auth.execute(LATEST_REVIEW).fetchall())  # la última decisión de cada oración gana
    decisions = {"validated": 0, "rejected": 0, "doubt": 0}
    for status in latest.values():
        decisions["doubt" if status == "needs_review" else status] += 1

    # Precisión de cada regla: solo cuenta lo que el revisor aceptó/rechazó explícitamente (última vez por oración y código).
    precision = {}
    for rule_id, code, accepted in auth.execute(
        "SELECT rule_id, code, accepted FROM tag_reviews WHERE rowid IN (SELECT MAX(rowid) FROM tag_reviews GROUP BY sentence_id, code)"
    ):
        e = precision.setdefault(rule_id, {"code": code, "accepted": 0, "rejected": 0})
        e["accepted" if accepted else "rejected"] += 1
    for e in precision.values():
        e["precision"] = e["accepted"] / (e["accepted"] + e["rejected"])

    # Acuerdo de nivel: solo sentencias cuya última decisión es validar (un nivel corregido en algo rechazado no importa).
    matrix, agree, total = {}, 0, 0
    for sid, est, cor in auth.execute(
        "SELECT sentence_id, estimated, corrected FROM level_reviews WHERE rowid IN (SELECT MAX(rowid) FROM level_reviews GROUP BY sentence_id)"
    ):
        if latest.get(sid) != "validated":
            continue
        matrix.setdefault(est, {})[cor] = matrix.get(est, {}).get(cor, 0) + 1
        total += 1
        agree += est == cor

    pivot = [latest[sid] for sid, in auth.execute("SELECT id FROM sentences WHERE json_extract(body, '$.translation_kind') = 'pivot'")
             if latest.get(sid) in ("validated", "rejected")]
    return {
        "reviewed": len(latest),
        "decisions": decisions,
        "tag_precision": dict(sorted(precision.items())),
        "level_agreement": {"matrix": matrix, "agreement": agree / total if total else 0.0},
        "pivot_rejection_rate": pivot.count("rejected") / len(pivot) if pivot else 0.0,
    }


def format_report(r: dict) -> str:
    lines = [f"revisadas: {r['reviewed']}  (validadas {r['decisions']['validated']}, rechazadas {r['decisions']['rejected']}, dudas {r['decisions']['doubt']})", "", "precisión por regla:"]
    for rule_id, e in sorted(r["tag_precision"].items(), key=lambda kv: (kv[1]["precision"], kv[0])):
        lines.append(f"  {rule_id} ({e['code']}): {e['precision']:.0%}  [{e['accepted']} aceptados, {e['rejected']} rechazados]")
    la = r["level_agreement"]
    lines += ["", f"acuerdo de nivel: {la['agreement']:.0%}"]
    for est, row in sorted(la["matrix"].items()):
        lines.append(f"  estimado {est} → corregido: " + ", ".join(f"{k}={v}" for k, v in sorted(row.items())))
    lines += ["", f"rechazo del pivote: {r['pivot_rejection_rate']:.0%}", "", json.dumps(r, ensure_ascii=False, indent=2, sort_keys=True)]
    return "\n".join(lines)
