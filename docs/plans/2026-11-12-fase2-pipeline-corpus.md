# Fase 2 — Pipeline del corpus Tatoeba: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir los exports de Tatoeba en un banco de oraciones ita↔spa con nivel CEFR y códigos de error etiquetados, donde solo lo que el usuario valide en una UI local llega al export.

**Architecture:** Siete etapas idempotentes (`ingest → pivot → filter → annotate → tag → review → export`) que escriben en `data/work/work.db`; los candidatos se promueven como `needs_review` a la base de autoría de la Fase 1 (`pipeline/db/store.py`), donde la UI de revisión produce `validated`. Reglas de nivel y de etiquetado son YAML con sus propias pruebas.

**Tech Stack:** Python 3.12/3.13 (`.venv`), `spacy==3.8.*` + `it_core_news_md`, `wordfreq==3.1.1`, `PyYAML`, pytest, `http.server` (stdlib), HTML+JS sin framework; opcional `language-tool-python`.

**Spec:** `docs/specs/2026-11-12-fase2-pipeline-corpus-design.md` (leerlo antes de empezar; el plan no repite sus tablas de reglas).

## Global Constraints
- Licencia de toda oración de Tatoeba: `"CC BY 2.0 FR"`; siempre con `source_id` (id Tatoeba) y `author`.
- Filtros: largo **2–25 palabras**; proporción de largo ita/spa **0,4–2,5**; razones: `length`, `digits_url`, `ratio`, `no_verb`, `punct_unbalanced`, `duplicate`.
- CEFR: nivel = el más alto entre rasgos; largo ≤6 no sube, ≤10: A2, ≤16: B1, >16: B2; si el percentil 90 de Zipf (wordfreq `it`) de los lemas es <3,5 sube un nivel. Umbrales en `pipeline/rules/cefr.yaml`, no en código.
- Etiquetado: máximo **3** códigos fonéticos/ortográficos por oración; cada regla con **≥3 positivos y ≥3 negativos**; `ERR_LEXICAL_LEAK` y `ERR_ARTICLE_OMISSION` no se etiquetan.
- Revisión: lotes de **20**; cobertura por defecto **20 validadas por código y 300 por nivel**; servidor solo en `127.0.0.1:8765`; pares `pivot` exigen marcar "traducción correcta".
- Nada llega a `validated` sin una fila en `reviews`; nada sin id, autor y licencia llega al export.
- Texto de la UI en español neutro con tuteo; sin servicios de pago, cuentas ni rastreo.
- Contenido en italiano: no inventar. Los ejemplos de reglas salen del corpus real (`tatoeba:<id>`) o de las fuentes (`fuente:<id NotebookLM>`); cualquier otra cosa va a `docs/dudas-italiano.md`.
- Pedir permiso al usuario **antes** de descargar `links.tar.bz2` (150 MB) y `it_core_news_md` (~40 MB).
- Git: ramas `feat/…`, commits en español, un tema por commit; nunca push a `main` (el repo aún no tiene remoto).

## Review Focus
1. Texto con Unicode descompuesto (`è` como `e`+acento), apóstrofos curvos y comillas dobles dentro de la oración: el parser TSV no debe truncar y `normalize` debe dar la misma forma (NFC) para deduplicar.
2. Una oración italiana con varias traducciones españolas: el par primario debe elegirse de forma determinista (mismo resultado en cada corrida).
3. Oraciones de 2–3 palabras (`Sono andato.`) donde spaCy devuelve morfología vacía o dudosa: el nivel no debe romperse; baja la confianza.
4. Decisiones repetidas o interrumpidas en la UI (recargar a mitad de lote, aprobar dos veces, reiniciar el servidor): la última decisión gana y el historial en `reviews` se conserva.
5. Export con cero oraciones validadas, o modelo spaCy ausente: archivos vacíos pero válidos, y un mensaje claro (no un traceback) que diga qué falta.

## Estructura de archivos
```
pipeline/
  config.py            rutas y constantes (LICENSE, RAW_DIR, WORK_DB, AUTHORING_DB, RULES_DIR)
  workdb.py            esquema de work.db y connect()
  ingest.py  pivot.py  filters.py  nlp.py  cefr.py  promote.py  export.py  report.py  cli.py  __main__.py
  tagging/engine.py    DSL de reglas, load_rules(), tag_sentence()
  review/batch.py      select_batch(), record_decision()
  review/server.py     make_server(); review/static/index.html
  rules/cefr.yaml  rules/coverage.yaml  rules/shortfall.yaml
  rules/tags/{grammar,lexical,orthographic}.yaml
  lexicons/*.yaml
  mine.py              ayuda: imprime candidatos del corpus para un patrón
tests/py/            test_ingest.py test_pivot.py test_filters.py test_cefr.py test_engine.py
                     test_rules_examples.py test_rule_coverage.py test_stages.py test_review.py
                     test_export.py test_report.py test_acceptance_real.py
```
Corrección al spec: `ingest` carga **todas** las oraciones de los exports por idioma (≈1,4 M filas) y la participación en pares se deriva de `pairs`; así el pivote no vuelve a leer los TSV.

---

### Task 1: Entorno y base de trabajo
**Files:** Create `requirements-pipeline.txt`, `pipeline/config.py`, `pipeline/workdb.py`, `pipeline/nlp.py`, `pytest.ini`; Test `tests/py/test_workdb.py`.

**Interfaces — Produces:**
`config.RAW_DIR, WORK_DB, AUTHORING_DB: Path`; `config.LICENSE: str`; `workdb.connect(path: Path | str = WORK_DB) -> sqlite3.Connection` con tablas `raw_sentences(id INTEGER PRIMARY KEY, lang, text, author, added, modified)`, `pairs(ita_id, spa_id, kind CHECK IN ('direct','pivot'), via_eng_id, PRIMARY KEY(ita_id, spa_id))`, `candidates(ita_id PRIMARY KEY, spa_id, kind, status CHECK IN ('ok','rejected'), reasons TEXT, flags TEXT)`, `annotations(ita_id PRIMARY KEY, cefr, confidence REAL, features TEXT)`, `tags(ita_id, code, rule_id, evidence TEXT, PRIMARY KEY(ita_id, code))`; `nlp.get_nlp() -> spacy.Language`; `nlp.ModelMissingError(RuntimeError)`.

- [ ] **Step 1: Test** `test_connect_creates_all_tables` (las 5 tablas existen en `:memory:`) y `test_pairs_rejects_unknown_kind` (insertar `kind='x'` lanza `sqlite3.IntegrityError`).
- [ ] **Step 2: Run** `.venv/bin/python -m pytest tests/py/test_workdb.py -v` → FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `config.py` y `workdb.py` con las firmas de arriba; `pytest.ini` con `pythonpath = .` y el marcador `realdata`.
- [ ] **Step 4: Run** el mismo comando → PASS.
- [ ] **Step 5: PEDIR PERMISO al usuario** para instalar dependencias y descargar `it_core_news_md` (~40 MB, GitHub). Con el sí: `.venv/bin/pip install -r requirements-pipeline.txt` y `.venv/bin/python -m spacy download it_core_news_md`. Si spaCy no soporta Python 3.13, crear `.venv` con 3.12 y decirlo.
- [ ] **Step 6: Implement** `nlp.get_nlp()` (carga `it_core_news_md` una sola vez, cacheada); si falta, lanza `ModelMissingError` con el comando exacto para instalarlo. Test `test_get_nlp_parses_sentence`: `get_nlp()("Sono andato a Roma.")` da `token.pos_` de `andato` = `VERB` y `Tense=Past` en su morfología; run → PASS.
- [ ] **Step 7: Commit** `git commit -m "Fase 2: entorno, base de trabajo y carga de spaCy"`.

### Task 2: Contrato — campos nuevos y tablas de revisión
**Files:** Modify `schemas/sentence.schema.json`, `pipeline/db/schema.sql`; Test `tests/schemas.test.mjs`, `tests/py/test_store.py`.

**Interfaces — Produces:** campos opcionales en `sentence`: `translation_kind` (`direct|pivot`), `pivot_via` (string), `cefr_confidence` (number 0–1), `qa_flags` (array de string), `tag_rules` (objeto código→id de regla). Tablas nuevas en `pipeline/db/schema.sql`: `tag_reviews(sentence_id, code, rule_id, accepted INTEGER, reviewed_at)` y `level_reviews(sentence_id, estimated, corrected, reviewed_at)`.

- [ ] **Step 1: Test (JS)** `sentence acepta los campos nuevos y rechaza translation_kind inválido` (un `translation_kind: "x"` falla; `cefr_confidence: 1.5` falla).
- [ ] **Step 2: Test (py)** `test_review_tables_exist` (las dos tablas existen tras `store.connect()`).
- [ ] **Step 3: Run** `npm test` → FAIL en los dos tests nuevos.
- [ ] **Step 4: Implement** los campos en el esquema (sin `additionalProperties` nuevos) y las tablas; `npm run schemas`.
- [ ] **Step 5: Run** `npm test && npm run typecheck` → todo PASS (los fixtures actuales siguen válidos).
- [ ] **Step 6: Commit** `git commit -m "Fase 2: campos de procedencia/nivel en sentence y tablas de revisión"`.

### Task 3: Ingesta
**Files:** Create `pipeline/ingest.py`; Test `tests/py/test_ingest.py`.

**Interfaces — Consumes:** `workdb.connect`. **Produces:** `ingest.ingest(con, raw_dir: Path) -> dict[str, int]` con claves `ita`, `spa`, `pairs`; lee `ita_sentences_detailed.tsv`, `spa_sentences_detailed.tsv`, `ita-spa_links.tsv` (ya descomprimidos) con `csv.reader(..., delimiter="\t", quoting=csv.QUOTE_NONE)`; inserta pares `kind='direct'` solo si ambos ids existen; idempotente (`INSERT OR REPLACE`).

- [ ] **Step 1: Test** con TSV mínimos en `tmp_path`: `test_ingest_counts` (2 ita, 2 spa, 2 enlaces → `{"ita":2,"spa":2,"pairs":2}`), `test_ingest_keeps_double_quotes` (una oración `Dice "ciao" a tutti.` se guarda íntegra), `test_ingest_skips_dangling_link` (enlace a id inexistente no crea par), `test_ingest_is_idempotent` (correr dos veces no duplica).
- [ ] **Step 2: Test real** `@pytest.mark.realdata test_real_counts`: con `data/raw` presente, `pairs == 19975` y `COUNT(DISTINCT ita_id) == 18688` (cifras medidas en el spec); se omite si falta `data/raw`.
- [ ] **Step 3: Run** `pytest tests/py/test_ingest.py -v` → FAIL.
- [ ] **Step 4: Implement** `ingest`.
- [ ] **Step 5: Run** → PASS, incluida `test_real_counts`.
- [ ] **Step 6: Commit** `git commit -m "Fase 2: ingesta de exports Tatoeba"`.

### Task 4: Pivote por inglés
**Files:** Create `pipeline/pivot.py`; Test `tests/py/test_pivot.py`.

**Interfaces — Consumes:** tablas `raw_sentences`, `pairs`. **Produces:** `pivot.pivot(con, links_tar: Path) -> dict[str, int]` con `new_pairs`, `new_ita`; recorre `links.csv` dentro del `tar.bz2` en streaming y dos pasadas (ita→eng, eng→spa); agrega pares `kind='pivot'` con `via_eng_id` = el id inglés **menor** si hay varios puentes; no agrega un par que ya sea `direct`; no carga inglés a memoria más allá de los ids puente.

- [ ] **Step 1: Test** con un `links.tar.bz2` sintético (helper `make_links_tar(tmp_path, rows)`): `test_pivot_creates_pair_via_english` (ita 1→eng 100, eng 100→spa 7 ⇒ par (1,7) `pivot`, `via_eng_id=100`), `test_pivot_prefers_lowest_bridge` (puentes 100 y 90 ⇒ `via_eng_id=90`), `test_pivot_skips_existing_direct`, `test_pivot_ignores_non_ita_spa_ends`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: PEDIR PERMISO** y descargar `https://downloads.tatoeba.org/exports/links.tar.bz2` (150 MB) a `data/raw/`; correr `pivot` real y **anotar en `docs/specs/2026-11-12-fase2-pipeline-corpus-design.md` (sección Datos reales) cuántos pares y oraciones nuevas aportó**. Si aporta menos de 2.000 oraciones italianas nuevas, parar y consultar al usuario (el spec lo marca como riesgo).
- [ ] **Step 6: Commit** `git commit -m "Fase 2: pivote ita→eng→spa y medición de su rendimiento"`.

### Task 5: Normalización y filtros
**Files:** Create `pipeline/filters.py`; Test `tests/py/test_filters.py`.

**Interfaces — Produces:** `filters.normalize(text: str) -> str` (NFC, espacios colapsados, strip; apóstrofo curvo → `'`); `@dataclass PairCheck(reasons: list[str], flags: list[str])`; `filters.check_pair(it: str, es: str, has_verb: bool | None) -> PairCheck`; `filters.run_filters(con, nlp) -> dict[str, int]` llena `candidates` con **un par primario por oración italiana**: prefiere `direct`, luego el menor `spa_id`; marca `duplicate` (mismo texto normalizado, se queda el menor `ita_id`); flags: `pivot`, `multi_translation`.

- [ ] **Step 1: Test** `test_normalize_nfc_and_apostrophe` (`"è"` y `"è"` normalizan igual; `l’amore` → `l'amore`), y por razón: `test_rejects_too_short` (1 palabra), `test_rejects_too_long` (26 palabras), `test_accepts_2_and_25_words`, `test_rejects_digits_and_urls`, `test_rejects_ratio_outside_0_4_2_5`, `test_rejects_no_verb` (`has_verb=False`), `test_rejects_unbalanced_quotes`, `test_run_filters_picks_direct_over_pivot_deterministically` (dos corridas = mismas filas), `test_run_filters_marks_duplicates`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (cuenta de palabras con `re.findall(r"\w+")`; `has_verb` sale de `any(t.pos_ in {"VERB","AUX"})`). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "Fase 2: normalización y filtros con razones registradas"`.

### Task 6: Estimador de nivel CEFR
**Files:** Create `pipeline/cefr.py`, `pipeline/rules/cefr.yaml`; Test `tests/py/test_cefr.py`.

**Interfaces — Produces:** `@dataclass CefrEstimate(level: str, confidence: float, features: list[str])`; `cefr.load_rules(path: Path | None = None) -> dict`; `cefr.estimate(doc: spacy.tokens.Doc, rules: dict | None = None) -> CefrEstimate`. `features` guarda los nombres de rasgos que dispararon (`passato_prossimo`, `congiuntivo_presente`, `len>10`, `rare_lexicon`…). Confianza: **0,9** si ≥2 rasgos independientes coinciden con el nivel final, **0,6** con uno, **0,3** si no hay rasgos gramaticales o la morfología está vacía.

- [ ] **Step 1: Test** con oraciones reales de las fuentes y fixtures (nivel esperado): `Vedi il mio libro?` → A1; `Sono andato a Roma.` → A2; `Credo che Giovanni abbia ragione.` → B1; `Se avessi saputo la verità, non sarei venuto.` → B2. Más: `test_confidence_low_when_no_grammar_features` (`Sono andato.` no baja de A2 y su confianza ≤0,6), `test_rare_vocab_raises_one_level`, `test_empty_doc_does_not_crash` (`nlp("")`), `test_length_bands` (12 palabras de presente simple → B1 por largo).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** leyendo la tabla de rasgos del spec desde `cefr.yaml` (rasgo → nivel mínimo; bandas de largo; umbral Zipf 3,5; wordfreq `zipf_frequency(lemma, "it")`, percentil 90 de los lemas con `pos_` ∈ NOUN/VERB/ADJ/ADV). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "Fase 2: estimador CEFR por reglas con confianza"`.

### Task 7: Motor de etiquetado y arnés de reglas
**Files:** Create `pipeline/tagging/engine.py`, `pipeline/mine.py`, `pipeline/rules/shortfall.yaml`; Test `tests/py/test_engine.py`, `tests/py/test_rules_examples.py`, `tests/py/test_rule_coverage.py`.

**Interfaces — Produces:** `@dataclass Rule(id, code, it: list[dict], es: list[dict], tier: str, examples: dict)`; `@dataclass Tag(code, rule_id, evidence: dict)`; `engine.load_rules(dir: Path = RULES_DIR/"tags") -> list[Rule]`; `engine.tag_sentence(doc, es_text: str, rules: list[Rule]) -> list[Tag]`; `engine.cap_surface_tags(tags, max_n=3) -> list[Tag]` (los códigos `PHONETIC`/`ORTHOGRAPHIC` del catálogo ocupan como máximo 3, en el orden de aparición de las reglas). **Formato de regla (YAML):** `id`, `code`, `tier` (`grammar|lexical|surface`), `it` y/o `es`: listas de patrones, cada uno `{regex: "…"}` **o** `{matcher: [token-dicts spaCy]}` **o** `{lemmas: nombre-de-léxico}`; una oración dispara la regla si **todos los lados presentes** (it y es) tienen ≥1 patrón que coincide; `examples: {positive: [{text, es?, source}], negative: [...]}` con `source` = `tatoeba:<id>` o `fuente:<id>`.
`mine.py`: `python -m pipeline.mine '<regex>' [--es '<regex>'] [-n 20]` imprime `id | italiano | español` de candidatos de `work.db`.

- [ ] **Step 1: Test (engine)** con reglas en `tmp_path`: `test_regex_rule_matches_it_side`, `test_matcher_rule_matches_morphology`, `test_both_sides_required` (regla con `it` y `es`: falla si falta uno), `test_lexicon_lemmas_pattern`, `test_cap_surface_tags_keeps_grammar_and_max_3_surface`.
- [ ] **Step 2: Test (arnés, parametrizado sobre todas las reglas de `rules/tags/`)** `test_rule_examples`: cada positivo dispara la regla y cada negativo no. `test_example_provenance`: todo `tatoeba:<id>` existe en `work.db` con el mismo `text` (se omite sin datos reales). `test_rule_coverage[grupo]` para los tres grupos de las Tasks 8–10: cada código del grupo tiene regla, **≥3 positivos y ≥3 negativos**, salvo que `rules/shortfall.yaml` lo liste con `reason` y la cantidad hallada. Los conjuntos `GROUPS` se copian de la tabla del spec (28 gramaticales, 10 léxicos, 9 de superficie = 47; los 2 no etiquetables se excluyen).
- [ ] **Step 3: Run** `pytest tests/py/test_engine.py -v` → FAIL. **Step 4: Implement** el motor y `mine.py`. **Step 5: Run** → los tests de engine PASS; los de cobertura fallan hasta las Tasks 8–10 (marcarlos `xfail(strict=False)` con motivo solo mientras falten, y quitarlos al cerrar cada grupo).
- [ ] **Step 6: Commit** `git commit -m "Fase 2: motor de reglas de etiquetado y arnés de ejemplos"`.

### Task 8: Reglas gramaticales (28 códigos)
**Files:** Create `pipeline/rules/tags/grammar.yaml`; Modify `tests/py/test_rule_coverage.py` (quitar el `xfail` del grupo).

**Códigos:** los 28 de la fila "Estructura gramatical" del spec. **Flujo por código (repetir):** (a) `python -m pipeline.mine '<patrón>'` para sacar 3+ positivos y 3+ negativos reales del corpus; (b) escribir la regla; (c) `pytest tests/py/test_rules_examples.py tests/py/test_rule_coverage.py -k grammar -v`. Casos que exigen el lado español: `ERR_PERSONAL_A` (es: `a` + complemento directo animado; it: verbo transitivo sin `a`), `ERR_CLITIC_DOUBLING` (es: `a (mí|ti|él|ella|nosotros|ustedes) (me|te|le|nos|les)`).

- [ ] **Step 1:** correr `test_rule_coverage[grammar]` sin `xfail` → FAIL listando los códigos sin regla.
- [ ] **Step 2:** autorar las reglas en bloques de ~7 códigos (auxiliares/participio; clíticos; congiuntivo; resto), corriendo el arnés tras cada bloque; si un código no alcanza 3 positivos en el corpus, registrarlo en `shortfall.yaml` con la cantidad real y `reason`.
- [ ] **Step 3:** `pytest tests/py -k "rules_examples or rule_coverage" -v` → PASS para el grupo.
- [ ] **Step 4: Commit** `git commit -m "Fase 2: reglas de etiquetado gramaticales"`.

### Task 9: Reglas léxicas y léxicos (10 códigos)
**Files:** Create `pipeline/rules/tags/lexical.yaml`, `pipeline/lexicons/{false_friends,collocations,gender_divergence,heterotonic,pronominal_verbs,prep_fixed,places,tener_avere,geminate_pairs}.yaml`.

Los léxicos se alimentan **solo** de `schemas/data/error-codes.json` (`explanation_es`, `example_*`, `notes`) y de las fuentes ya leídas (`docs/dudas-italiano.md` lista lo que no se debe copiar: p. ej. no usar la fila atmosfera/atmósfera, adesso/adrede, siete/sette). Cada entrada de léxico lleva `source`.

- [ ] **Step 1:** `test_rule_coverage[lexical]` sin `xfail` → FAIL.
- [ ] **Step 2: Test** `test_lexicon_entries_have_source_and_no_blacklisted` (toda entrada tiene `source`; ninguna es `atmosfera`, `adesso`/`adrede` como falso amigo ni `telefono` como heterotónica).
- [ ] **Step 3:** crear léxicos y reglas `lemmas:`; ejemplos reales vía `mine.py`.
- [ ] **Step 4:** `pytest tests/py -k "lexicon or lexical or rules_examples" -v` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Fase 2: léxicos y reglas léxicas con fuente por entrada"`.

### Task 10: Reglas de superficie (9 códigos)
**Files:** Create `pipeline/rules/tags/orthographic.yaml`.

Patrones de grafía: `sc` ante i/e, `gli`, `c`/`g` ante e/i, `z`, consonante doble, `nn`/`gn`, vocal final acentuada, posesivo `mio/mia…`, plural en -i/-e. Las IPA que aparezcan en `explanation_es` no se vuelven a escribir aquí.

- [ ] **Step 1:** `test_rule_coverage[orthographic]` sin `xfail` → FAIL.
- [ ] **Step 2: Test** `test_surface_cap_applies_in_tag_sentence`: una oración con 5 patrones de superficie devuelve como máximo 3 de ese tipo y conserva todos los gramaticales.
- [ ] **Step 3:** autorar reglas con `tier: surface`; ejemplos reales vía `mine.py`.
- [ ] **Step 4:** `pytest tests/py -v` → PASS (cobertura de los tres grupos completa o en `shortfall.yaml`).
- [ ] **Step 5: Commit** `git commit -m "Fase 2: reglas de superficie y tope de 3 por oración"`.

### Task 11: Etapas annotate / tag / promote y CLI
**Files:** Create `pipeline/promote.py`, `pipeline/cli.py`, `pipeline/__main__.py`; Test `tests/py/test_stages.py`.

**Interfaces — Consumes:** Tasks 3–10. **Produces:** `cli.annotate(con, nlp)`, `cli.tag(con, nlp)` (guardan en `annotations` y `tags` solo para `candidates.status='ok'`); `promote.promote(work_con, authoring_con) -> dict[str, int]` (arma un documento `sentence` con `id=f"s_{ita_id}"`, `source="tatoeba"`, `source_id=str(ita_id)`, `author`, `license=config.LICENSE`, `es`, `es_source_id`, `translation_kind`, `pivot_via`, `cefr_estimate`, `cefr_confidence`, `qa_flags`, `error_codes`, `tag_rules`, `review_status="needs_review"` y lo inserta con `store.upsert`; **no pisa** filas ya `validated`/`rejected`); CLI `python -m pipeline <ingest|pivot|filter|annotate|tag|promote|review|export|report|all>` imprimiendo entrada/descartes por razón/salida de cada etapa.

- [ ] **Step 1: Test** `test_stages_end_to_end_on_tiny_corpus` (TSV de juguete → `ingest→filter→annotate→tag→promote` deja oraciones `needs_review` válidas según el esquema), `test_promote_does_not_overwrite_validated`, `test_stages_are_idempotent` (hash SHA-1 del volcado ordenado de `sentences` igual en dos corridas), `test_cli_reports_counts` (stdout incluye `rechazadas` por razón).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "Fase 2: etapas annotate/tag/promote y CLI"`.

### Task 12: Revisión humana (lotes, decisiones, servidor y UI)
**Files:** Create `pipeline/review/{batch.py,server.py}`, `pipeline/review/static/index.html`, `pipeline/rules/coverage.yaml`; Test `tests/py/test_review.py`.

**Interfaces — Produces:** `batch.select_batch(work_con, authoring_con, size: int = 20, coverage: dict | None = None) -> list[dict]`: candidatos `needs_review`, ordenados por **déficit** = Σ por código `max(0, per_code − validadas_del_código)` + `max(0, per_level − validadas_del_nivel)`, y a igual déficit por `cefr_confidence` ascendente; cada ítem trae `id, it, es, translation_kind, author, source_url, cefr, cefr_confidence, tags:[{code, rule_id, evidence}], qa_flags`. `batch.record_decision(authoring_con, sentence_id: str, decision: dict, reviewer: str = "me") -> None` con `decision = {action: "approve"|"reject"|"doubt", reason?: str, cefr?: str, tags?: {code: bool}, translation_ok?: bool}`: escribe en `reviews`, `tag_reviews`, `level_reviews`, actualiza `sentences.review_status` y el `body` (códigos aceptados, nivel corregido); `approve` en un par `pivot` sin `translation_ok=True` lanza `ValueError`. `server.make_server(work_db, authoring_db, host="127.0.0.1", port=8765) -> http.server.HTTPServer` con `GET /api/batch`, `POST /api/decision` (400 si `ValueError`), `GET /` sirve `index.html`.

- [ ] **Step 1: Test** `test_batch_orders_by_deficit_then_low_confidence` (datos sintéticos), `test_batch_skips_decided`, `test_approve_requires_translation_ok_for_pivot`, `test_approve_sets_validated_and_writes_review_row`, `test_decision_twice_last_wins_and_history_kept` (2 filas en `reviews`, estado final = la segunda), `test_doubt_stays_needs_review`, `test_tag_rejection_recorded`, `test_server_binds_localhost_only` (`server_address[0] == "127.0.0.1"`), `test_post_decision_400_on_invalid` (usa `http.client` contra un servidor en puerto 0).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** lógica y servidor. **Step 4: Run** → PASS.
- [ ] **Step 5: Implement `index.html`**: una oración a la vez (it, es, tipo de traducción, autor, nivel+confianza, códigos con su evidencia, `qa_flags`, enlace a `https://tatoeba.org/sentences/show/<id>`), botones Aprobar/Rechazar/Duda, selector de nivel, casilla por código y la casilla "la traducción es correcta" visible solo en pares pivote; atajos `a`/`r`/`d`; textos en español con tuteo.
- [ ] **Step 6: Verify en el navegador:** `python -m pipeline review` y abrir `http://127.0.0.1:8765` en el panel del navegador; comprobar que carga un lote, que aprobar un `pivot` sin la casilla muestra error, y que tras recargar la oración decidida ya no aparece. Anotar lo observado; no declararlo verificado si no se probó.
- [ ] **Step 7: Commit** `git commit -m "Fase 2: UI local de revisión con lotes por déficit de cobertura"`.

### Task 13: Exportación
**Files:** Create `pipeline/export.py`; Test `tests/py/test_export.py`.

**Interfaces — Produces:** `export.export(authoring_con, out_dir: Path) -> dict` escribe `sentences/<A1|A2|B1|B2>.json` (lista de documentos `sentence` validados), `manifest.json` (`{levels: {A1: n…}, codes: {código: n}, translation_kind: {direct: n, pivot: n}, authors: {usuario: n}}`) y `ATTRIBUZIONI-tatoeba.md` (una línea por oración: id, autor, `CC BY 2.0 FR`, `https://tatoeba.org/sentences/show/<id>`); devuelve el manifest. Solo `review_status='validated'` **con fila en `reviews`**.

- [ ] **Step 1: Test** `test_export_only_validated_with_review_row`, `test_export_empty_is_valid` (cero validadas ⇒ 4 listas vacías y manifest en ceros), `test_export_every_sentence_has_author_license_source_id`, `test_attribution_lists_every_exported_id`, `test_export_is_deterministic` (mismo hash en dos corridas), `test_export_skips_validated_without_review_row` (marcada a mano sin `reviews`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (orden estable por `id`). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "Fase 2: exportación con atribuciones y manifest"`.

### Task 14: Informe y aceptación sobre datos reales
**Files:** Create `pipeline/report.py`; Test `tests/py/test_report.py`, `tests/py/test_acceptance_real.py`.

**Interfaces — Produces:** `report.build_report(authoring_con) -> dict` con `tag_precision: {rule_id: {accepted, rejected, precision}}`, `level_agreement: {matrix: {estimado: {corregido: n}}, agreement: float}`, `pivot_rejection_rate: float`, `reviewed: int`.

- [ ] **Step 1: Test (report)** con revisiones sintéticas: `test_tag_precision_per_rule`, `test_level_confusion_matrix_and_agreement`, `test_pivot_rejection_rate`, `test_report_with_no_reviews_is_zeroed`.
- [ ] **Step 2: Test (real, `@pytest.mark.realdata`)** `test_fixture_sentences_through_real_pipeline`: tras `ingest→filter→annotate→tag` sobre `data/raw`, los ids **719442, 3255442, 3860754** están como `ok` y sus códigos incluyen `ERR_AUX_ESSERE`; `ERR_POSSESSIVE_ARTICLE`; `ERR_POSSESSIVE_ARTICLE` y `ERR_GEMINATE`, respectivamente; `test_real_rerun_same_hash`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement** `report.py`. **Step 5: Run** → PASS; si un fixture no sale con su código, **corregir la regla** (no el test) y explicarlo.
- [ ] **Step 6: Commit** `git commit -m "Fase 2: informe de precisión y aceptación con datos reales"`.

### Task 15: Corrida real y compuerta de 200 (proceso)
**Files:** Create `docs/fase2-resultados.md`.

- [ ] **Step 1:** `python -m pipeline all` sobre los datos reales; copiar a `docs/fase2-resultados.md` el conteo de cada etapa, el rendimiento del pivote y la distribución por nivel y por código.
- [ ] **Step 2:** `python -m pipeline review`; **pedir al usuario** revisar una muestra de 200 (lotes de 20; mezcla de niveles y de pares directos/pivote).
- [ ] **Step 3:** `python -m pipeline report` → pegar los tres números de la compuerta (precisión por regla, acuerdo de nivel, rechazo del pivote) en `docs/fase2-resultados.md`.
- [ ] **Step 4:** proponer ajustes (reglas con baja precisión, umbrales CEFR) o decir que no hacen falta; **no seguir revisando más hasta que el usuario decida**.
- [ ] **Step 5: Commit** `git commit -m "Fase 2: resultados de la corrida real y de la compuerta de 200"`.

---

## Autorrevisión (resultado)
- **Cobertura del spec:** ingesta (T3), pivote (T4), filtros y flags (T5), CEFR (T6), etiquetado y tope de 3 (T7–T10), UI y lotes por déficit (T12), export + atribución (T13), cambios al contrato (T2), informe y compuerta (T14–T15), aceptación con las 3 oraciones (T14), permisos de descarga (T1, T4).
- **Consistencia de firmas:** `workdb.connect`, `filters.run_filters`, `cefr.estimate`, `engine.tag_sentence`, `promote.promote`, `batch.select_batch/record_decision` y `export.export` se usan con los mismos nombres en todas las tareas.
- **Proporción:** el plan define decisiones (rutas, firmas, valores, pruebas) y deja los cuerpos al implementador; las tablas de reglas viven en el spec.
