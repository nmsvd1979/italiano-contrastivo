import json

from pipeline.exercises.readings import voices_of
from pipeline.tts import generate as gen
from pipeline.tts.ids import VOICE2, clip_id, clip_id2


def test_voces_alternan_con_quien_hablaba_antes():
    s = [{"speaker": "A"}, {"speaker": "B"}, {"speaker": "A"}, {"speaker": "C"}, {"speaker": "B"}]
    assert voices_of(s) == {"A": 0, "B": 1, "C": 1}           # C habla tras A (voz 0), por eso toma la contraria; B ya tenía la suya
    assert voices_of([{"speaker": "A"}, {"speaker": "A"}]) == {}   # un solo hablante: sin segunda voz
    assert voices_of([{}, {}]) == {}                            # una lectura sin hablantes


def test_el_clip_de_la_segunda_voz_no_pisa_el_de_la_primera():
    assert clip_id2("Ciao!") != clip_id("Ciao!")
    assert len(clip_id2("Ciao!")) == 12 and clip_id2(" Ciao! ") == clip_id2("Ciao!")


def _pack(tmp_path, voice):
    pack = tmp_path / "pack"
    pack.mkdir()
    (pack / "sentences.json").write_text("[]")
    (pack / "lexemes.json").write_text("[]")
    sents = [{"id": "r1", "it": "Buongiorno.", "es": "x", "speaker": "A", "audio": clip_id("Buongiorno.")},
             {"id": "r2", "it": "Ciao.", "es": "x", "speaker": "B", "audio": clip_id2("Ciao."), **({"voice": 2} if voice else {})}]
    (pack / "readings.json").write_text(json.dumps([{"id": "rd", "sentences": sents}]))
    return pack


def test_generate_crea_los_clips_de_la_segunda_voz_y_los_marca_en_el_indice(tmp_path):
    pack = _pack(tmp_path, voice=True)
    out = tmp_path / "audio"
    made1, made2 = [], []
    idx = gen.generate(pack, out, lambda t, w: (made1.append(t), w.write_bytes(b"w")), lambda w, d: d.write_bytes(b"m"),
                       synthesize2=lambda t, w: (made2.append(t), w.write_bytes(b"w")))
    assert made2 == ["Ciao."] and set(made1) == {"Buongiorno."}   # lo que dice la segunda voz no se sintetiza además con la primera
    by = {e["id"]: e for e in idx}
    assert by[clip_id2("Ciao.")]["voice"] == VOICE2 and by[clip_id2("Ciao.")]["license"] == "CC0 1.0"
    assert (out / "tts" / f"{clip_id2('Ciao.')}.mp3").exists()
    again = []
    gen.generate(pack, out, lambda t, w: again.append(t), lambda w, d: None, synthesize2=lambda t, w: again.append(t))
    assert again == []                                           # idempotente: no se vuelve a sintetizar nada


def test_sin_modelo_de_segunda_voz_falla_en_claro_en_vez_de_dejar_audio_faltante(tmp_path):
    import pytest
    with pytest.raises(ValueError, match="segunda voz"):
        gen.generate(_pack(tmp_path, voice=True), tmp_path / "audio", lambda t, w: w.write_bytes(b"w"), lambda w, d: d.write_bytes(b"m"))
