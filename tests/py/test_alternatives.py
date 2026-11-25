"""Traducciones alternativas de Tatoeba: solo para aceptar respuestas al escribir (auditoría 2026-11-25)."""
import json
from pathlib import Path

from pipeline.exercises import alternatives as A

PACK = Path(__file__).resolve().parents[2] / "web/public/content"


def _raw(tmp: Path, links: list[tuple[str, str]], ita: list[tuple[str, str, str]]) -> Path:
    (tmp / "ita-spa_links.tsv").write_text("".join(f"{i}\t{s}\n" for i, s in links), encoding="utf8")
    (tmp / "ita_sentences_detailed.tsv").write_text("".join(f"{i}\tita\t{t}\t{a}\t\\N\t\\N\n" for i, t, a in ita), encoding="utf8")
    return tmp


def test_build_junta_otras_traducciones_y_filtra_las_que_cambian_persona_o_son_arcaicas(tmp_path):
    content = tmp_path / "content"
    (content / "sentences").mkdir(parents=True)
    base = {"id": "s_1", "it": "È il tuo dovere studiare.", "es": "Tu deber es estudiar.", "source_id": "1", "es_source_id": "100", "translation_kind": "direct"}
    llm = {"id": "s_9", "it": "Ciao.", "es": "Hola.", "source_id": "9", "es_source_id": "900", "translation_kind": "llm"}
    (content / "sentences" / "A1.json").write_text(json.dumps([base, llm]), encoding="utf8")
    raw = _raw(tmp_path, [("1", "100"), ("2", "100"), ("3", "100"), ("4", "100"), ("5", "100"), ("6", "100"), ("90", "900")],
               [("1", "È il tuo dovere studiare.", "a"), ("2", "Studiare è il tuo dovere.", "b"), ("3", "È il vostro dovere studiare.", "c"),
                ("4", "Ella studia.", "d"), ("5", "È il tuo dovere studiare!", "e"), ("6", "Il tuo dovere sarà studiare.", "f"), ("90", "Salve.", "g")])
    out = A.build(raw, content)
    assert out == {"s_1": [{"id": "2", "it": "Studiare è il tuo dovere.", "author": "b"}]}   # vostro: otra persona; ella: arcaico; «!»: misma frase; futuro: fuera de A1
    assert A.load(content) == out
    assert "#2 por b" in A.attribution(out, {"s_1"}) and A.attribution(out, set()) == ""


def test_cada_alternativa_del_paquete_tiene_atribucion():
    sents = json.loads((PACK / "sentences.json").read_text(encoding="utf8"))
    attr = (PACK / "ATTRIBUZIONI-tatoeba.md").read_text(encoding="utf8")
    with_alt = [s for s in sents if s.get("alt")]
    assert len(with_alt) > 200
    for s in with_alt:
        assert s.get("translation_kind") == "direct", s["id"]
        assert attr.count(f"- {s['id']} (alternativa)") == len(s["alt"]), s["id"]
