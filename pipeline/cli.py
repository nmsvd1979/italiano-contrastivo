"""CLI del pipeline: `python -m pipeline <etapa>`. Cada etapa imprime sus conteos."""
import argparse
import json
import sys
from pathlib import Path

from pipeline import cefr, config, export, filters, ingest, nlp, pivot, promote, report as report_mod, workdb
from pipeline.db import store
from pipeline.tagging import engine

STAGES = ["ingest", "pivot", "filter", "annotate", "tag", "promote", "all", "review", "export", "report", "capsules", "tts"]


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
    ap.add_argument("--out-dir", type=Path, default=config.ROOT / "content", help="carpeta de salida del export")
    ap.add_argument("--pack-dir", type=Path, default=config.ROOT / "web" / "public" / "content", help="salida del paquete de la app")
    ap.add_argument("--tts-model", default=str(Path.home() / "Downloads" / "it_IT-serena-high.onnx"), help="modelo Piper para la etapa tts")
    ap.add_argument("--native-dir", type=Path, default=None, help="carpeta con grabaciones nativas existentes (<palabra>--<voz>.mp3 + ATTRIBUZIONI.md); sin ella se conservan las palabras ya copiadas")
    ap.add_argument("--audio-dir", type=Path, default=config.ROOT / "web" / "public" / "audio", help="salida de los clips de la etapa tts")
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
            elif st == "export":
                m = export.export(store.connect(args.authoring_db), args.out_dir)
                report(st, {**{f"nivel {k}": v for k, v in m["levels"].items()}, "excluidas sin atribución": len(m["excluded_missing_attribution"])})
            elif st == "capsules":
                from pipeline.exercises import capsules

                m = capsules.build_pack(args.out_dir, args.pack_dir)
                for code, info in m["codes"].items():
                    print(f"  {code}: {info['usable']} utilizables → {'cápsula' if info['capsule'] else 'sin cápsula (' + info['reason'] + ')'}")
                print(f"  cápsulas: {len(m['capsules'])}, oraciones usadas: {m['sentences_used']}")
            elif st == "tts":
                from pipeline.tts import generate as tg, piper_lote

                if args.native_dir is not None and not args.native_dir.exists():
                    print(f"No encuentro la carpeta de grabaciones nativas {args.native_dir}.", file=sys.stderr)
                    return 2
                texts = tg.texts_for_pack(args.pack_dir)
                index_file = args.audio_dir / "index.json"
                prev = json.loads(index_file.read_text(encoding="utf8")) if index_file.exists() else []
                pending = len(tg.plan_clips(texts, prev, args.audio_dir)["generate"])
                model = Path(args.tts_model)
                if pending and not model.exists():
                    print(f"No encuentro el modelo de voz {model}. Indícalo con --tts-model <ruta a it_IT-serena-high.onnx>.", file=sys.stderr)
                    return 2
                idx = tg.generate(args.pack_dir, args.audio_dir, piper_lote.make_synthesizer(model) if pending else None, piper_lote.lame_to_mp3)
                lexemes = json.loads((args.pack_dir / "lexemes.json").read_text(encoding="utf8"))
                words_file = args.audio_dir / "words.json"
                if args.native_dir is not None:
                    words = tg.native_words(lexemes, args.native_dir, args.audio_dir / "words")
                else:  # sin carpeta de origen se conservan las ya copiadas que sigan en el paquete
                    forms = {l["form"] for l in lexemes}
                    words = [w for w in (json.loads(words_file.read_text(encoding="utf8")) if words_file.exists() else []) if w["form"] in forms]
                keep = {w["file"] for w in words}
                for f in (args.audio_dir / "words").glob("*.mp3"):  # sin atribución no se distribuye
                    if f.name not in keep:
                        f.unlink()
                words_file.write_text(json.dumps(words, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
                (args.audio_dir / "ATTRIBUZIONI-audio.md").write_text(tg.attribution_text(words), encoding="utf8")
                print(f"  clips generados: {pending} de {len(idx)}; palabras nativas: {len(words)}; carpeta {args.audio_dir}")
            elif st == "report":
                print(report_mod.format_report(report_mod.build_report(store.connect(args.authoring_db))))
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
