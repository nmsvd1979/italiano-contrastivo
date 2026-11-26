"""Currículo, cápsulas y paquete de contenido para la PWA (M1). Todo determinista y sin LLM."""
import glob
import json
import re
from pathlib import Path

import yaml

from pipeline import config
from pipeline.exercises.calques import CALQUE_CODES, find_calque
from pipeline.tts.ids import clip_id
from pipeline.exercises.items import build_choice, build_cloze, build_meaning, build_reorder, build_translate
from pipeline.exercises.vocab import VOCAB_CODES, find_vocab

LEVELS = ["A1", "A2", "B1", "B2"]
CATEGORY_PRIORITY = ["PHONETIC", "ORTHOGRAPHIC", "L1_SINTACTIC_CALQUE", "GENDER_NUMBER_AGREEMENT",
                     "PREPOSITIONAL_GOVERNANCE", "LEXICAL_CHOICE", "L1_FALSE_FRIEND"]
MIN_SENTENCES = 3
NO_CAPSULE = f"menos de {MIN_SENTENCES} oraciones utilizables"


def curriculum_order(codes: list[dict]) -> list[str]:
    """Por nivel y luego por categoría (los `sieve` del catálogo son todos null, así que no se usan) y por código."""
    def key(c: dict):
        cat = c["category"]
        return LEVELS.index(c["cefr_min"]), CATEGORY_PRIORITY.index(cat) if cat in CATEGORY_PRIORITY else len(CATEGORY_PRIORITY), c["code"]
    return [c["code"] for c in sorted(codes, key=key)]


def usable_sentences(code: str, sentences: list[dict]) -> list[dict]:
    """Oraciones etiquetadas con el código en las que el generador de calco encuentra su patrón, de la más fácil
    (nivel y largo) a la más difícil; desempata por id para que el resultado sea estable."""
    ok = (s for s in sentences if code in s.get("error_codes", []) and find_calque(code, s["it"]))
    ordered = sorted(ok, key=lambda s: (LEVELS.index(s["cefr_estimate"]), len(s["it"]), s["id"]))
    seen, out = set(), []
    for s in ordered:  # «Ci sono fiori.» y «Ci sono fiori?» cuentan como una sola
        k = re.sub(r"\W+", "", s["it"].lower())
        if k not in seen:
            seen.add(k)
            out.append(s)
    return out


def build_capsule(code: dict, sentences: list[dict]) -> dict | None:
    c = code["code"]
    usable = usable_sentences(c, sentences)
    if len(usable) < MIN_SENTENCES:
        return None
    trigger, rest = usable[0], usable[1:]
    # Pasada p: una oración recibe el tipo (i+p) mod 3, así los 6 ítems mezclan elección, hueco y orden.
    builders = [
        lambda s, i: build_choice(s, find_calque(c, s["it"]), seed=i),
        lambda s, i: build_cloze(s, find_calque(c, s["it"])),
        lambda s, i: build_reorder(s, seed=i, code=c),
    ]
    rounds = [[builders[(i + p) % 3](s, i) for i, s in enumerate(rest)] for p in range(3)]
    retrieval = [it for rnd in rounds for it in rnd if it][:6]
    if len(retrieval) < 4:
        return None
    return {"id": f"cap_{c.lower()}", "cefr": code["cefr_min"], "target_error_codes": [c],
            "trigger": build_translate(trigger, code=c), "explanation": {"text_es": code["explanation_es"]},
            "retrieval": retrieval, "estimated_seconds": min(300, max(180, 75 + 25 * len(retrieval))), "review_status": "validated"}


def _dump(path: Path, obj) -> None:
    # los archivos de ejercicios son los más grandes del precache: compactos (sin sangrías) para no pasar el tope por archivo del service worker
    compact = path.name.startswith("items_")
    path.write_text(json.dumps(obj, ensure_ascii=False, sort_keys=True, **({"separators": (",", ":")} if compact else {"indent": 2})) + "\n", encoding="utf8")


ITEM_LEVELS = ("A1", "A2", "B1", "B2")


def split_items_by_level(items_by_code: dict, course: dict, catalog: dict[str, dict]) -> dict[str, dict]:
    """Reparte los ejercicios por nivel: el de la unidad que usa el código (A1+ cuenta como A1) o, si ninguna lo usa, el `cefr_min` del código.
    Cada nivel va en su propio archivo (`items_A1.json`, `items_A2.json`…): el de A1 no cambia al construir A2 y ninguno pasa el tope por archivo del precache."""
    owner = {}
    for u in course["units"]:
        owner.setdefault(u["codes"][0], u["level"].rstrip("+"))
    out: dict[str, dict] = {}
    for code, items in items_by_code.items():
        level = owner.get(code) or catalog[code].get("cefr_min", "A1")
        out.setdefault(level if level in ITEM_LEVELS else "A1", {})[code] = items
    return out


def load_items(pack_dir: Path) -> dict[str, list]:
    """Los ejercicios de todos los niveles, unidos, tal como los publica el paquete (un archivo por nivel según `manifest.item_files`)."""
    pack_dir = Path(pack_dir)
    files = json.loads((pack_dir / "manifest.json").read_text(encoding="utf8")).get("item_files") or {"all": "items_by_code.json"}
    out: dict[str, list] = {}
    for name in files.values():
        out.update(json.loads((pack_dir / name).read_text(encoding="utf8")))
    return out


def _catalog() -> list[dict]:
    out = []
    for name in ("error-codes.json", "topic-codes.json"):  # errores contrastivos + objetivos de tema (presente, etc.)
        d = json.loads((config.ROOT / "schemas" / "data" / name).read_text(encoding="utf8"))
        out += d if isinstance(d, list) else d["error_codes"]
    return out


SENTENCE_FIELDS = ("id", "it", "es", "author", "es_author", "license", "source_id", "es_source_id", "translation_kind", "cefr_estimate")


def build_pack(content_dir: Path, out_dir: Path) -> dict:
    content_dir, out_dir = Path(content_dir), Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    sentences = [s for f in sorted(glob.glob(str(content_dir / "sentences" / "*.json"))) for s in json.loads(Path(f).read_text(encoding="utf8"))]
    sentences = [s for s in sentences if s.get("translation_kind") != "pivot"]
    export_manifest = json.loads((content_dir / "manifest.json").read_text(encoding="utf8"))
    catalog = {c["code"]: c for c in _catalog()}

    caps, items_by_code, codes_info, used = {}, {}, {}, set()
    for code in CALQUE_CODES:
        usable = usable_sentences(code, sentences)
        cap = build_capsule(catalog[code], sentences)
        codes_info[code] = {"usable": len(usable), "capsule": cap is not None, "reason": None if cap else NO_CAPSULE}
        if cap:
            caps[code] = cap
            items_by_code[code] = [it for i, s in enumerate(usable) for it in
                                   (build_choice(s, find_calque(code, s["it"]), seed=i), build_cloze(s, find_calque(code, s["it"])),
                                    build_reorder(s, seed=i, code=code)) if it]
            if code in VOCAB_CODES:  # vocabulario: además, el significado de la palabra del tema
                for i, s in enumerate(usable):
                    hit = find_vocab(code, s["it"])
                    items_by_code[code].append(build_meaning(s, hit[2], code, hit[4], hit[5], seed=i))
            used |= {s["id"] for s in usable}
    ordered = [caps[c] for c in curriculum_order([catalog[c] for c in caps])]

    fa = yaml.safe_load((config.LEXICONS_DIR / "false_friends.yaml").read_text(encoding="utf8"))["entries"]
    lexemes = [{"id": f"lx_{e['form']}", "form": e["form"], "gloss_es": e["gloss_es"], "lexical_type": "false_friend", "source": e["source"],
                "audio": clip_id(e["form"])}
               for e in sorted(fa, key=lambda e: e["form"])]
    from pipeline.exercises import alternatives
    alts = alternatives.load(content_dir)   # otras traducciones de Tatoeba: solo para aceptar respuestas al escribir
    used_sentences = [{**{k: s[k] for k in SENTENCE_FIELDS if k in s}, "audio": clip_id(s["it"]),
                       **({"alt": [a["it"] for a in alts[s["id"]]]} if s["id"] in alts else {})} for s in sentences if s["id"] in used]

    from pipeline.exercises.course import write_course  # import local: course.py usa usable_sentences de este módulo
    course = write_course(out_dir, sentences, catalog)
    _dump(out_dir / "capsules.json", ordered)
    for stale in out_dir.glob("items_*.json"):
        stale.unlink()   # ni el archivo único de antes ni niveles que ya no tienen ejercicios
    item_files = {}
    for level, part in split_items_by_level(items_by_code, course, catalog).items():
        item_files[level] = f"items_{level}.json"
        _dump(out_dir / item_files[level], part)
    _dump(out_dir / "lexemes.json", lexemes)
    _dump(out_dir / "sentences.json", used_sentences)
    (out_dir / "ATTRIBUZIONI-tatoeba.md").write_text((content_dir / "ATTRIBUZIONI-tatoeba.md").read_text(encoding="utf8").rstrip("\n") + "\n"
                                                    + alternatives.attribution(alts, used), encoding="utf8")
    manifest = {"capsules": [c["id"] for c in ordered], "item_files": item_files, "codes": codes_info, "levels": export_manifest["levels"],
                "reviewers": export_manifest["reviewers"], "sentences_used": len(used_sentences),
                "translation_kind": {k: sum(1 for s in used_sentences if s.get("translation_kind") == k)
                                     for k in ("direct", "llm") if any(s.get("translation_kind") == k for s in used_sentences)}}
    _dump(out_dir / "manifest.json", manifest)
    return manifest
