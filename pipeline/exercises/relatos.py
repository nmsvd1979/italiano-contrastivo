"""Relatos para el ejercicio `cloze_text` (passato prossimo o imperfetto): validador y constructor del ítem.

Un relato es un texto corto en primera persona con 4–8 huecos de dos opciones. Reglas de escritura (plan A2 §5.3), todas comprobadas aquí:
- los marcadores {1}…{n} aparecen una vez, en orden, y hay un hueco por marcador;
- cada hueco tiene, en las 5 palabras que lo preceden dentro de su frase, un disparador inequívoco que coincide con el tiempo correcto
  (mentre, di solito, da piccolo → imperfetto; all'improvviso, a un tratto, alle 9 in punto → passato prossimo);
- en los huecos no van verbos de estado, modales, sapere/conoscere, meteorológicos ni de doble auxiliar (el tiempo correcto sería discutible);
- las dos opciones se distinguen por el tiempo (una passato prossimo, otra imperfetto);
- 40–110 palabras y traducción al español.
Además, antes de usarse, dos agentes lo rellenan sin ver la clave y todo hueco con discrepancia se reescribe (se registra en el relato: `prueba_a_ciegas`)."""
import re

MARKER = re.compile(r"\{(\d+)\}")
WORDS = (40, 110)
# Disparadores que cada hueco debe tener justo antes (≤ 5 palabras). Solo los que no admiten el otro tiempo en esa posición.
TRIGGER_IMPERFETTO = re.compile(r"\b(mentre|di solito|da piccol[oa]|da bambin[oa]|ogni (?:giorno|sera|mattina|estate|domenica|settimana)|tutti i giorni|tutte le (?:sere|mattine|estati)|sempre|spesso)\b", re.I)
TRIGGER_PASSATO = re.compile(r"\b(all'improvviso|a un tratto|ad un tratto|improvvisamente|questa volta|quella volta|una volta sola|alle \w+ in punto|alle \d+ in punto)\b", re.I)
# Formas que no se admiten en las opciones (estado, modales, sapere/conoscere, meteo, doble auxiliar).
_BLOCK = re.compile(
    r"\b(ero|eri|era|eravamo|eravate|erano|sono stat[oaie]|è stat[oa]|siamo stat[ie]|ho avuto|avevo|aveva|"
    r"potevo|poteva|ho potuto|volevo|voleva|ho voluto|dovevo|doveva|ho dovuto|sapevo|sapeva|ho saputo|conoscevo|conosceva|ho conosciuto|"
    r"piove|pioveva|è piovuto|ha piovuto|nevicava|ha nevicato|faceva|"
    r"cominciava|ho cominciato|è cominciat[oa]|finiva|ho finito|è finit[oa]|passava|è passat[oa]|ho passato|cambiava|è cambiat[oa]|correva|ho corso|è corso|"
    r"salivo|sono salit[oa]|vivevo|ho vissuto|durava|è durat[oa]|ho cambiato)\b", re.I)
_PASSATO = re.compile(r"^(?:non )?(?:ho|hai|ha|abbiamo|avete|hanno|sono|sei|è|siamo|siete|mi sono|ti sei|si è|ci siamo|vi siete|si sono)\s+\w+", re.I)
_IMPERFETTO = re.compile(r"\b\w{3,}(?:avo|avi|ava|avamo|avate|avano|evo|evi|eva|evamo|evate|evano|ivo|ivi|iva|ivamo|ivate|ivano)\b", re.I)


def option_tense(opt: str) -> str | None:
    """«passato», «imperfetto» o None si no se reconoce."""
    if _PASSATO.search(opt.strip()):
        return "passato"
    if _IMPERFETTO.search(opt):
        return "imperfetto"
    return None


def _words_before(text: str, pos: int, n: int = 5) -> str:
    """Hasta n palabras antes de `pos`, sin pasar el inicio de la frase (otros huecos {k} cuentan como palabras vacías)."""
    head = re.split(r"[.!?]", text[:pos])[-1]
    return " ".join(re.sub(r"\{\d+\}", " ", head).split()[-n:])


def validate_relato(r: dict) -> list[str]:
    """Defectos del relato (vacío = válido). Campos: text, gaps [{options, answer, why_es}], translation_es."""
    errs = []
    text, gaps = r.get("text", ""), r.get("gaps", [])
    marks = [int(m.group(1)) for m in MARKER.finditer(text)]
    if marks != list(range(1, len(gaps) + 1)):
        errs.append(f"los marcadores {marks} no son {{1}}…{{{len(gaps)}}} en orden, una vez cada uno")
    if not 4 <= len(gaps) <= 8:
        errs.append(f"{len(gaps)} huecos: deben ser 4–8")
    n_words = len(re.findall(r"\w+", MARKER.sub("x", text)))
    if not WORDS[0] <= n_words <= WORDS[1]:
        errs.append(f"{n_words} palabras: deben ser {WORDS[0]}–{WORDS[1]}")
    if not r.get("translation_es", "").strip():
        errs.append("falta la traducción al español")
    for i, (g, m) in enumerate(zip(gaps, MARKER.finditer(text)), 1):
        opts = g.get("options", [])
        if len(opts) != 2 or opts[0].strip().lower() == opts[1].strip().lower():
            errs.append(f"hueco {i}: necesita dos opciones distintas")
            continue
        if g.get("answer") not in (0, 1):
            errs.append(f"hueco {i}: `answer` debe ser 0 o 1")
            continue
        if not g.get("why_es", "").strip():
            errs.append(f"hueco {i}: falta why_es")
        for o in opts:
            if _BLOCK.search(o):
                errs.append(f"hueco {i}: «{o}» es verbo de estado, modal, sapere/conoscere, meteorológico o de doble auxiliar")
        tenses = [option_tense(o) for o in opts]
        if set(tenses) != {"passato", "imperfetto"}:
            errs.append(f"hueco {i}: las opciones deben ser una passato prossimo y una imperfetto (son {tenses})")
            continue
        correct = tenses[g["answer"]]
        near = _words_before(text, m.start())
        ends = {"imperfetto": [x.end() for x in TRIGGER_IMPERFETTO.finditer(near)], "passato": [x.end() for x in TRIGGER_PASSATO.finditer(near)]}
        last = {k: max(v) for k, v in ends.items() if v}
        if not last:
            errs.append(f"hueco {i}: sin disparador inequívoco justo antes ({near!r})")
        else:
            asks = max(last, key=last.get)   # manda el disparador más cercano al hueco («mentre … all'improvviso {2}» pide passato)
            if asks != correct:
                errs.append(f"hueco {i}: el disparador pide {'imperfetto' if asks == 'imperfetto' else 'passato prossimo'} pero la respuesta es {correct}")
    return errs


def relato_item(r: dict, item_id: str, code: str | None = None) -> dict:
    """Ítem `cloze_text` (schemas/item.schema.json) a partir de un relato válido."""
    errs = validate_relato(r)
    if errs:
        raise ValueError("; ".join(errs))
    item = {"id": item_id, "type": "cloze_text", "requires_server": False, "review_status": "needs_review", "text": r["text"],
            "gaps": [{"options": g["options"], "answer": g["answer"], "why_es": g["why_es"]} for g in r["gaps"]],
            "translation_es": r["translation_es"], "authored": True}
    if r.get("exam"):
        item["exam"] = True
    if code:
        item["target_error_codes"] = [code]
    return item
