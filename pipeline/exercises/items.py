"""Constructores deterministas de ítems (schemas/item.schema.json) a partir de una oración validada y su calco."""
import random
import zlib

from pipeline.exercises.calques import Calque


def item_id(kind: str, sentence_id: str, code: str) -> str:
    return f"it_{kind}_{sentence_id}_{code}"


def _base(kind: str, sentence: dict, code: str | None) -> dict:
    d = {"id": item_id(kind, sentence["id"], code or "none"), "requires_server": False, "review_status": "validated",
         "sentence_id": sentence["id"]}
    if code:
        d["target_error_codes"] = [code]
    return d


def build_choice(sentence: dict, calque: Calque, seed: int) -> dict:
    it = sentence["it"]
    good = {"text": it, "correct": True}
    bad = {"text": it[:calque.start] + calque.wrong + it[calque.end:], "correct": False,
           "error_code": calque.code, "distractor_kind": calque.kind}
    options = [bad, good] if seed % 2 else [good, bad]
    item = {**_base("choice", sentence, calque.code), "type": "choice_l1_distractor",
            "prompt_es": "Escucha la frase y elige cómo se escribe." if calque.listen else "¿Cuál es la frase correcta en italiano?", "options": options}
    if calque.listen:
        item["listen"] = True
    return item


def build_cloze(sentence: dict, calque: Calque) -> dict | None:
    if calque.correct in calque.wrong:  # el calco solo agrega texto («a Maria»): el hueco no evaluaría el error
        return None
    it = sentence["it"]
    return {**_base("cloze", sentence, calque.code), "type": "cloze",
            "text": it[:calque.start] + "___" + it[calque.end:], "answers": [calque.correct], "hint_es": sentence["es"]}


def build_reorder(sentence: dict, seed: int, code: str | None = None) -> dict | None:
    answer = sentence["it"].split()
    if not 3 <= len(answer) <= 9 or len(set(answer)) < 2:
        return None
    rng = random.Random(zlib.crc32(f"{seed}:{sentence['id']}".encode()))
    tokens = answer[:]
    while tokens == answer:
        rng.shuffle(tokens)
    return {**_base("reorder", sentence, code), "type": "reorder",
            "prompt_es": f"Ordena las palabras: «{sentence['es']}»", "tokens": tokens, "answer": answer}


def build_translate(sentence: dict, code: str | None = None) -> dict:
    return {**_base("translate", sentence, code), "type": "translate_es_it",
            "source_es": sentence["es"], "accepted_it": [sentence["it"]]}
