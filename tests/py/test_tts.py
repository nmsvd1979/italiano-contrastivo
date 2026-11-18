import json
from pathlib import Path

import pytest

from pipeline import config
from pipeline.tts import generate as gen
from pipeline.tts.ids import LICENSE, VOICE, clip_id, normalize

PACK = config.ROOT / "web" / "public" / "content"


def test_clip_id_normaliza_espacios_y_enfasis():
    a = clip_id("Ho fame.")
    assert len(a) == 12 and all(c in "0123456789abcdef" for c in a)
    assert clip_id("  Ho   fame. ") == a
    assert clip_id("Ho *fame*.") == a
    assert clip_id("Ho fame") != a
    assert normalize("  a \n b *c* ") == "a b c"


def test_textos_solo_de_oraciones_y_lexemas_y_nunca_un_distractor():
    texts = gen.texts_for_pack(PACK)
    sentences = {s["it"] for s in json.loads((PACK / "sentences.json").read_text(encoding="utf8"))}
    forms = {l["form"] for l in json.loads((PACK / "lexemes.json").read_text(encoding="utf8"))}
    assert texts and len(texts) == len(set(texts)) and texts == sorted(texts)
    assert set(texts) == sentences | forms
    wrong = {o["text"] for items in json.loads((PACK / "items_by_code.json").read_text(encoding="utf8")).values()
             for it in items for o in it.get("options", [])
             if not o["correct"] and o.get("distractor_kind") != "different_word"}  # en vocabulario la «otra palabra» es italiano válido (otra oración del paquete): el audio la distingue y la UI solo reproduce la correcta
    assert wrong and not (set(texts) & wrong)


def entry(text, voice=VOICE):
    return {"id": clip_id(text), "sha1": gen.sha1(text), "text": text, "voice": voice, "license": LICENSE}


def test_plan_clips(tmp_path):
    (tmp_path / "tts").mkdir()
    for t in ("al día", "cambió de voz", "huérfano"):
        (tmp_path / "tts" / f"{clip_id(t)}.mp3").write_bytes(b"x")
    index = [entry("al día"), entry("cambió de voz", voice="otra"), entry("huérfano"), entry("sin archivo")]
    plan = gen.plan_clips(["al día", "cambió de voz", "sin archivo", "nuevo"], index, tmp_path)
    assert plan["keep"] == ["al día"]
    assert sorted(plan["generate"]) == ["cambió de voz", "nuevo", "sin archivo"]
    assert plan["orphans"] == [clip_id("huérfano")]


def fake_pack(tmp_path, texts):
    p = tmp_path / "pack"
    p.mkdir(parents=True)
    (p / "sentences.json").write_text(json.dumps([{"id": f"s{i}", "it": t} for i, t in enumerate(texts)]), encoding="utf8")
    (p / "lexemes.json").write_text("[]", encoding="utf8")
    return p


def test_generate_idempotente_y_borra_huerfanos(tmp_path):
    out = tmp_path / "audio"
    calls = []
    synth = lambda text, wav: (calls.append(text), wav.write_bytes(b"wav"))
    mp3 = lambda wav, dst: dst.write_bytes(b"mp3-" + wav.read_bytes())
    pack = fake_pack(tmp_path, ["Ho fame.", "Ho sete."])
    idx = gen.generate(pack, out, synth, mp3)
    assert [e["id"] for e in idx] == sorted(e["id"] for e in idx) and len(idx) == 2
    assert all(e["voice"] == VOICE and e["license"] == LICENSE for e in idx)
    assert (out / "tts" / f"{clip_id('Ho fame.')}.mp3").read_bytes() == b"mp3-wav"
    assert json.loads((out / "index.json").read_text(encoding="utf8")) == idx
    assert len(calls) == 2
    gen.generate(pack, out, synth, mp3)
    assert len(calls) == 2  # nada que regenerar
    pack2 = fake_pack(tmp_path / "otro", ["Ho fame."])
    gen.generate(pack2, out, synth, mp3)
    assert not (out / "tts" / f"{clip_id('Ho sete.')}.mp3").exists()
    assert [e["text"] for e in json.loads((out / "index.json").read_text(encoding="utf8"))] == ["Ho fame."]


def test_generate_que_falla_a_medias_no_deja_indice(tmp_path):
    out = tmp_path / "audio"
    pack = fake_pack(tmp_path, ["Uno.", "Dos.", "Tres."])
    n = []

    def synth(text, wav):
        n.append(text)
        if len(n) == 2:
            raise RuntimeError("piper murió")
        wav.write_bytes(b"w")

    with pytest.raises(RuntimeError):
        gen.generate(pack, out, synth, lambda w, d: d.write_bytes(b"m"))
    assert not (out / "index.json").exists()


def test_generate_con_exceso_de_peso_lanza_y_no_escribe_indice(tmp_path):
    out = tmp_path / "audio"
    pack = fake_pack(tmp_path, ["Uno.", "Dos."])
    with pytest.raises(ValueError, match="peso"):
        gen.generate(pack, out, lambda t, w: w.write_bytes(b"w"), lambda w, d: d.write_bytes(b"x" * 20), max_bytes=10)
    assert not (out / "index.json").exists()


def test_cli_tts_sin_modelo_falla_claro_y_sin_indice(tmp_path, capsys):
    from pipeline import cli

    rc = cli.main(["tts", "--tts-model", str(tmp_path / "no_existe.onnx"), "--audio-dir", str(tmp_path / "audio")])
    assert rc != 0
    assert "no_existe.onnx" in capsys.readouterr().err
    assert not (tmp_path / "audio" / "index.json").exists()


def test_lame_to_mp3_sin_lame_da_error_claro(tmp_path, monkeypatch):
    from pipeline.tts import piper_lote

    monkeypatch.setattr(piper_lote.shutil, "which", lambda _: None)
    with pytest.raises(RuntimeError, match="lame"):
        piper_lote.lame_to_mp3(tmp_path / "a.wav", tmp_path / "a.mp3")


def _source(tmp_path):
    src = tmp_path / "old"
    src.mkdir()
    for f in ("burro--zed.mp3", "burro--ana.mp3", "caldo--bo.mp3", "gatto--cy.mp3"):
        (src / f).write_bytes(b"mp3-" + f.encode())
    (src / "ATTRIBUZIONI.md").write_text(
        "# Atribuciones de audio\n\n- `burro--ana.mp3` — «burro», voz de Ana — https://c/ana\n"
        "- `burro--zed.mp3` — «burro», voz de Zed — https://c/zed\n- `caldo--bo.mp3` — «caldo», voz de Bo — https://c/bo\n"
        "- `gatto--cy.mp3` — «gatto», voz de Cy — https://c/cy\n", encoding="utf8")
    return src


def test_native_words_elige_la_primera_voz_copia_y_atribuye(tmp_path):
    src, dest = _source(tmp_path), tmp_path / "words"
    got = gen.native_words([{"form": "burro"}, {"form": "caldo"}, {"form": "pronto"}], src, dest)
    assert [(w["form"], w["file"], w["speaker"]) for w in got] == [("burro", "burro--ana.mp3", "ana"), ("caldo", "caldo--bo.mp3", "bo")]
    assert (dest / "burro--ana.mp3").read_bytes() == b"mp3-burro--ana.mp3"
    assert not (dest / "burro--zed.mp3").exists() and not (dest / "gatto--cy.mp3").exists()
    assert "https://c/ana" in got[0]["attribution"] and "voz de Bo" in got[1]["attribution"]


def test_native_words_sin_carpeta_origen_no_falla(tmp_path):
    assert gen.native_words([{"form": "burro"}], tmp_path / "no_existe", tmp_path / "w") == []


def test_native_words_reales_tienen_atribucion_y_licencia():
    src = Path("/Users/administrador/Desktop/Claude/Italiano/.claude/worktrees/italian-learning-app-rebuild-8bb9f0/public/audio")
    if not src.exists():
        pytest.skip("no está la carpeta de grabaciones de la app anterior")
    lex = json.loads((PACK / "lexemes.json").read_text(encoding="utf8"))
    import tempfile

    with tempfile.TemporaryDirectory() as d:
        got = gen.native_words(lex, src, Path(d))
        assert {w["form"] for w in got} == {"allora", "burro", "caldo", "guardare", "pronto", "salire"}
        assert all(w["attribution"].startswith("- `") and (Path(d) / w["file"]).exists() for w in got)
    assert "CC BY-SA 4.0" in gen.attribution_text(got)
    assert "it_IT-serena-high" in gen.attribution_text([])


def _built(tmp_path, texts=("Ho fame.", "Ho sete.")):
    out = tmp_path / "audio"
    pack = fake_pack(tmp_path, list(texts))
    gen.generate(pack, out, lambda t, w: w.write_bytes(b"w"), lambda w, d: d.write_bytes(b"mp3"))
    return pack, out


def test_mp3_parcial_no_queda_como_bueno(tmp_path):
    out = tmp_path / "audio"
    pack = fake_pack(tmp_path, ["Uno."])

    def to_mp3(wav, dst):
        dst.write_bytes(b"PARCIAL")
        raise RuntimeError("lame falló")

    with pytest.raises(RuntimeError):
        gen.generate(pack, out, lambda t, w: w.write_bytes(b"w"), to_mp3)
    assert not (out / "tts" / f"{clip_id('Uno.')}.mp3").exists()
    assert gen.plan_clips(["Uno."], [], out)["generate"] == ["Uno."]


def test_exceso_de_peso_deja_indice_y_archivos_anteriores_intactos(tmp_path):
    pack, out = _built(tmp_path)
    before = (out / "index.json").read_text(encoding="utf8")
    pack2 = fake_pack(tmp_path / "otro", ["Ho fame.", "Texto nuevo largo."])
    with pytest.raises(ValueError, match="peso"):
        gen.generate(pack2, out, lambda t, w: w.write_bytes(b"w"), lambda w, d: d.write_bytes(b"x" * 50), max_bytes=40)
    assert (out / "index.json").read_text(encoding="utf8") == before
    assert (out / "tts" / f"{clip_id('Ho sete.')}.mp3").exists()  # el huérfano aún no se borra


def _cli_audio(tmp_path):
    from pipeline import cli

    pack, out = _built(tmp_path)
    (pack / "lexemes.json").write_text(json.dumps([{"id": "lx_burro", "form": "burro", "audio": clip_id("burro")}]), encoding="utf8")
    (out / "words").mkdir()
    (out / "words" / "burro--ana.mp3").write_bytes(b"n")
    (out / "words" / "viejo--zed.mp3").write_bytes(b"n")
    (out / "words.json").write_text(json.dumps([{"form": "burro", "file": "burro--ana.mp3", "speaker": "ana",
                                                  "attribution": "- `burro--ana.mp3` — «burro», voz de Ana — https://c/ana"}]), encoding="utf8")
    return cli, pack, out


def test_tts_sin_native_dir_conserva_palabras_y_atribuciones(tmp_path):
    cli, pack, out = _cli_audio(tmp_path)
    # el texto «burro» aún no tiene clip: se pide el modelo solo si hay algo que generar → damos un modelo falso que falla
    gen.generate(pack, out, lambda t, w: w.write_bytes(b"w"), lambda w, d: d.write_bytes(b"mp3"))
    rc = cli.main(["tts", "--pack-dir", str(pack), "--audio-dir", str(out), "--tts-model", str(tmp_path / "no_hace_falta.onnx")])
    assert rc == 0
    assert "https://c/ana" in (out / "ATTRIBUZIONI-audio.md").read_text(encoding="utf8")
    assert (out / "words" / "burro--ana.mp3").exists()
    assert not (out / "words" / "viejo--zed.mp3").exists()  # sin atribución → no se distribuye
    assert [w["form"] for w in json.loads((out / "words.json").read_text(encoding="utf8"))] == ["burro"]


def test_tts_con_native_dir_inexistente_falla_y_no_toca_nada(tmp_path, capsys):
    cli, pack, out = _cli_audio(tmp_path)
    before = (out / "words.json").read_text(encoding="utf8")
    rc = cli.main(["tts", "--pack-dir", str(pack), "--audio-dir", str(out), "--native-dir", str(tmp_path / "no_existe"),
                   "--tts-model", str(tmp_path / "x.onnx")])
    assert rc != 0 and "no_existe" in capsys.readouterr().err
    assert (out / "words.json").read_text(encoding="utf8") == before


def test_atribucion_de_serena_enlaza_licencia_y_fuentes():
    t = gen.attribution_text([])
    for url in ("https://creativecommons.org/licenses/by/4.0/", "huggingface.co/datasets/committa/serena-synthetic-it-27h", "huggingface.co/rhasspy/piper-voices"):
        assert url in t
