"""CLI del pipeline: `python -m pipeline <etapa>`. Cada etapa imprime sus conteos."""
import argparse
import json
import sys
from pathlib import Path

from pipeline import cefr, config, filters, ingest, nlp, pivot, promote, workdb
from pipeline.db import store
from pipeline.tagging import engine

STAGES = ["ingest", "pivot", "filter", "annotate", "tag", "promote", "all", "review"]


def _ok_candidates(con):
    return con.execute(
        "SELECT c.ita_id, i.text, s.text FROM candidates c "
        "JOIN raw_sentences i ON i.id = c.ita_id JOIN raw_sentences s ON s.id = c.spa_id "
        "WHERE c.status = 'ok' ORDER BY c.ita_id"
    ).fetchall()


def _parsed(con, spacy):
    rows = _ok_candidates(con)
    docs = spacy.pipe((filters.normalize(r[1]) for r in rows), batch_size=256, disable=["ner"])
    for (ita_id, _, es), doc in zip(rows, docs):
        yield ita_id, doc, filters.normalize(es)


def annotate_and_tag(con, spacy) -> tuple[dict[str, int], dict[str, int]]:
    """Una sola pasada de spaCy para annotate y tag (el CLI `all` la usa para no parsear dos veces)."""
    rules, cefr_rules = engine.load_rules(), cefr.load_rules()
    ann: dict[str, int] = {"input": 0}
    tgs: dict[str, int] = {"input": 0, "tagged": 0, "tags": 0}
    for ita_id, doc, es in _parsed(con, spacy):
        est = cefr.estimate(doc, cefr_rules)
        con.execute("INSERT OR REPLACE INTO annotations VALUES (?,?,?,?)", (ita_id, est.level, est.confidence, json.dumps(est.features)))
        ann["input"] += 1
        ann[est.level] = ann.get(est.level, 0) + 1
        found = engine.tag_sentence(doc, es, rules)
        con.execute("DELETE FROM tags WHERE ita_id=?", (ita_id,))
        con.executemany("INSERT INTO tags VALUES (?,?,?,?)", [(ita_id, t.code, t.rule_id, json.dumps(t.evidence, ensure_ascii=False)) for t in found])
        tgs["input"] += 1
        tgs["tagged"] += bool(found)
        tgs["tags"] += len(found)
        for t in found:
            tgs[f"tags_{t.code}"] = tgs.get(f"tags_{t.code}", 0) + 1
    con.commit()
    return ann, tgs


def annotate(con, spacy) -> dict[str, int]:
    cefr_rules = cefr.load_rules()
    counts: dict[str, int] = {"input": 0}
    for ita_id, doc, _ in _parsed(con, spacy):
        est = cefr.estimate(doc, cefr_rules)
        con.execute("INSERT OR REPLACE INTO annotations VALUES (?,?,?,?)", (ita_id, est.level, est.confidence, json.dumps(est.features)))
        counts["input"] += 1
        counts[est.level] = counts.get(est.level, 0) + 1
    con.commit()
    return counts


def tag(con, spacy) -> dict[str, int]:
    rules = engine.load_rules()
    counts: dict[str, int] = {"input": 0, "tagged": 0, "tags": 0}
    for ita_id, doc, es in _parsed(con, spacy):
        found = engine.tag_sentence(doc, es, rules)
        con.execute("DELETE FROM tags WHERE ita_id=?", (ita_id,))
        con.executemany("INSERT INTO tags VALUES (?,?,?,?)", [(ita_id, t.code, t.rule_id, json.dumps(t.evidence, ensure_ascii=False)) for t in found])
        counts["input"] += 1
        counts["tagged"] += bool(found)
        counts["tags"] += len(found)
        for t in found:
            counts[f"tags_{t.code}"] = counts.get(f"tags_{t.code}", 0) + 1
    con.commit()
    return counts


LABELS = {"input": "entrada", "ok": "ok", "rejected": "rechazadas", "promoted": "promovidas", "skipped": "omitidas (ya revisadas)",
          "tagged": "oraciones con códigos", "tags": "códigos asignados", "ita": "oraciones ita", "spa": "oraciones spa",
          "pairs": "pares directos", "new_pairs": "pares pivote", "new_ita": "oraciones ita solo-pivote"}


def report(stage: str, counts: dict[str, int]) -> None:
    print(f"== {stage} ==")
    for k, v in counts.items():
        if k.startswith("rejected_"):
            print(f"  rechazadas ({k[len('rejected_'):]}): {v}")
        elif k.startswith("tags_"):
            print(f"  {k[5:]}: {v}")
        else:
            print(f"  {LABELS.get(k, k)}: {v}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m pipeline", description=__doc__)
    ap.add_argument("stage", choices=STAGES)
    ap.add_argument("--raw-dir", type=Path, default=config.RAW_DIR)
    ap.add_argument("--work-db", type=Path, default=config.WORK_DB)
    ap.add_argument("--authoring-db", type=Path, default=config.AUTHORING_DB)
    ap.add_argument("--model", default=nlp.MODEL_NAME)
    ap.add_argument("--port", type=int, default=8765, help="puerto del servidor de revisión (solo localhost)")
    ap.add_argument("--no-pivot", action="store_true", help="en `all`, omite el pivote por inglés")
    args = ap.parse_args(argv)

    work = workdb.connect(args.work_db)
    try:
        stages = ["ingest", "pivot", "filter", "annotate", "tag", "promote"] if args.stage == "all" else [args.stage]
        if args.stage == "all" and args.no_pivot:
            stages.remove("pivot")
        done: set[str] = set()
        for st in stages:
            if st in done:
                continue
            if st == "ingest":
                report(st, ingest.ingest(work, args.raw_dir))
            elif st == "pivot":
                eng = pivot.load_eng_ids(args.raw_dir / "eng_sentences.tsv.bz2")
                report(st, pivot.pivot(work, args.raw_dir / "links.tar.bz2", eng))
            elif st == "filter":
                report(st, filters.run_filters(work, nlp.get_nlp(args.model)))
            elif st == "annotate" and args.stage == "all":
                ann, tgs = annotate_and_tag(work, nlp.get_nlp(args.model))
                report("annotate", ann)
                report("tag", tgs)
                done |= {"annotate", "tag"}
            elif st == "annotate":
                report(st, annotate(work, nlp.get_nlp(args.model)))
            elif st == "tag":
                report(st, tag(work, nlp.get_nlp(args.model)))
            elif st == "promote":
                auth = store.connect(args.authoring_db)
                report(st, promote.promote(work, auth))
            elif st == "review":
                from pipeline.review import server

                srv = server.make_server(args.work_db, args.authoring_db, port=args.port)
                print(f"Revisión en http://127.0.0.1:{srv.server_address[1]}  (Ctrl+C para salir)")
                try:
                    srv.serve_forever()
                except KeyboardInterrupt:
                    pass
                finally:
                    srv.server_close()
    except nlp.ModelMissingError as e:
        print(str(e), file=sys.stderr)
        return 2
    return 0
