# Fase 2 — Pipeline del corpus Tatoeba (diseño)

Estado: **borrador para tu revisión**. No hay código de la Fase 2 todavía.

## Objetivo
Convertir Tatoeba en un banco de oraciones ita↔spa con nivel CEFR estimado y códigos de error contrastivo etiquetados, de modo que **solo lo que tú valides** (`validated`) llegue a la app. Entrada: exports públicos de Tatoeba. Salida: paquetes JSON por nivel + archivo de atribuciones.

## Decisiones ya tomadas
| Tema | Decisión |
|---|---|
| Fuente para B1–B2 | Pares directos (A1–A2) **más pivote por inglés** (ita→eng→spa) con `links.tar.bz2` |
| Nivel CEFR | Reglas deterministas (spaCy + frecuencia + rasgos gramaticales); estimación con confianza, no certificación |
| Validación | Filtros automáticos + tú por lotes en una UI local; lo que no puedas juzgar queda `needs_review` y no entra |
| Licencia | Todas las oraciones se marcan CC BY 2.0 FR (conservador: las CC0 son un subconjunto); se guarda id y autor |
| Alcance | Sin audio TTS (Fase 3) y sin generación de ejercicios (Fase 4) |

## Datos reales medidos (descargados el 2026-11-12)
- 991.553 oraciones italianas y 443.166 españolas en los exports por idioma; **19.975 enlaces directos ita→spa = 18.688 oraciones italianas** (1.083 con más de una traducción).
- Largo (palabras): mediana 5, p90 9; ≤8 palabras: 16.290 (87%). Cubre A1–A2; B1–B2 casi no existe en directos.
- Autoría: 11.136 de 18.688 (60%) de un solo usuario; ninguna sin autor; 0 textos duplicados; 158 con dígitos; 7 sin puntuación final.
- El export por idioma **no trae licencia por oración** (de ahí la regla CC BY 2.0 FR para todas).
- **Pivote medido (2026-11-12, `links.tar.bz2` + ids de `eng_sentences.tsv.bz2`, 105 s):** 251.148 pares pivote; **184.028 oraciones italianas nuevas** que no tenían traducción directa (202.716 oraciones italianas con algún par en total). Las nuevas siguen siendo cortas: mediana 5 palabras, p90 8; 17.863 tienen más de 8 palabras, 3.319 más de 12 y 1.392 más de 16. Volumen suficiente para B1 (8–16 palabras); para B2 largo habrá pocas, y la calidad de las traducciones por pivote (no medida aún) se mide en la revisión de 200.
- Para identificar el inglés se necesitó además `eng_sentences.tsv.bz2` (25 MB): `links.tar.bz2` no trae idioma por oración.

## Flujo (7 etapas, cada una un comando idempotente)
`work.db` (SQLite, ignorada por git) guarda el estado intermedio; el resultado de revisión se promueve a la base de autoría de la Fase 1 (`sentences`, `reviews`).

1. **ingest** — carga todas las oraciones ita/spa de los exports por idioma (≈1,4 M filas; la participación en pares se deriva de `pairs`, así el pivote no relee los TSV) y los enlaces directos. Tablas: `raw_sentences(id, lang, text, author, added, modified)`, `pairs(ita_id, spa_id, kind, via_eng_id)`.
2. **pivot** — recorre `links.tar.bz2` en dos pasadas en streaming (ita→eng, eng→spa) y agrega pares `kind='pivot'` con el id del puente. Reporta cuántos pares nuevos y cuántas oraciones italianas nuevas aporta.
3. **filter** — descarta con razón registrada: duplicados (texto normalizado), largo fuera de 2–25 palabras, dígitos/URLs/emails, proporción de largo ita/spa fuera de 0,4–2,5, sin verbo según spaCy, comillas o puntuación desbalanceadas. **Marca sin descartar** (`qa_flags`): avisos de LanguageTool `it` (opcional), traducción pivote, un solo traductor para varias variantes.
4. **annotate** — nivel CEFR + confianza (ver abajo).
5. **tag** — códigos de error con reglas declarativas (ver abajo).
6. **review** — UI local (ver abajo). Único punto que produce `validated`.
7. **export** — escribe solo `validated`: `content/sentences/<A1|A2|B1|B2>.json`, `content/manifest.json` (conteos por nivel y código) y `ATTRIBUZIONI-tatoeba.md` (id, autor, licencia, URL de cada oración).

## Estimación de nivel CEFR (etapa 4)
Reglas en `pipeline/rules/cefr.yaml` (umbrales editables, no en código). Nivel = **el más alto** entre estos rasgos; luego un ajuste por rareza léxica.

| Rasgo | Nivel mínimo inicial |
|---|---|
| Solo presente, essere/avere, nombres comunes | A1 |
| Passato prossimo, imperfetto, futuro, condizionale presente, imperativo | A2 |
| Congiuntivo presente/imperfetto, passivo, pronombres combinati, ci/ne partitivo | B1 |
| Congiuntivo trapassato, periodo ipotetico irreal, concesivas con congiuntivo, gerundio/participio absoluto | B2 |
| Largo | ≤6 palabras no sube; ≤10: A2; ≤16: B1; >16: B2 |
| Rareza léxica | si el percentil 90 de Zipf (wordfreq `it`) de los lemas cae bajo 3,5, sube un nivel |

La **confianza** es alta si ≥2 rasgos independientes coinciden con el nivel, media con uno, baja si no hay rasgos gramaticales (oraciones simples con vocabulario raro) o spaCy dio morfología vacía. Confianza baja ⇒ va primero a revisión. Los umbrales son un punto de partida: se ajustan con la tabla de acuerdo entre el nivel estimado y el que tú corrijas en la revisión (informe de confusión), no con aprendizaje automático.

## Etiquetado de errores (etapa 5)
Pregunta que responde: *¿qué código de error ejercita esta oración correcta?* Una regla por código en `pipeline/rules/tags/<code>.yaml`, con patrón sobre la oración italiana (spaCy Matcher / morfología / regex) y, cuando importa, sobre la española (p. ej. `ERR_PERSONAL_A`: "a" + complemento directo animado en español y ninguna preposición en italiano). Cada regla lleva **≥3 oraciones positivas y ≥3 negativas** como prueba, tomadas de las fuentes cuando existen.

| Grupo | Códigos | Cómo se detectan |
|---|---|---|
| Estructura gramatical | auxiliares y participio (ERR_AUX_ESSERE, ERR_PARTICIPLE_AGREEMENT, ERR_PARTICIPLE_AGREEMENT_CLITIC, ERR_AUX_OVERGENERALIZATION, ERR_REFLEXIVE_AUX), clíticos (ERR_CLITIC_*, ERR_INDIRECT_PRONOUN_GENDER, ERR_CLITIC_DOUBLING), congiuntivo (ERR_CONGIUNTIVO_*, ERR_MAGARI_TENSE), imperativo negativo, posesivos, artículos (ERR_ARTICLE_ALLOMORPH, ERR_PREP_ARTICLE_CONTRACTION), c'è/ci sono, comparativo con di, preposiciones (ERR_PERSONAL_A, ERR_PREP_PENSARE) | morfología y dependencias de spaCy + disparadores léxicos |
| Basados en léxico | ERR_FALSE_FRIEND, ERR_COLLOCATION_CALQUE, ERR_GENDER_DIVERGENCE, ERR_HETEROTONIC, ERR_PRONOMINAL_VERB, ERR_PREP_FIXED_GOV, ERR_PREP_PLACE, ERR_TENERE_AVERE, ERR_MANCARE, pares mínimos de ERR_GEMINATE | listas curadas (`pipeline/lexicons/*.yaml`, de las fuentes; también son contenido a validar) |
| Ortográficos y fonéticos | ERR_SC_PALATAL, ERR_GLI_PALATAL, ERR_C_G_PALATAL, ERR_Z_AFFRICATE, ERR_GEMINATE_SPELLING, ERR_GEMINATE_NASAL_CONFUSION, ERR_ACCENT_TRANSFER, ERR_POSSESSIVE_SPELLING, ERR_PLURAL_VOWEL | patrones sobre la grafía; muy frecuentes, así que se topan por oración (máx. 3 códigos fonéticos/ortográficos) para no ahogar los gramaticales |
| **No etiquetables** | ERR_LEXICAL_LEAK, ERR_ARTICLE_OMISSION | nacen de lo que *escribe* el aprendiz; los cubrirán ítems escritos en la Fase 4 |

Que un código sea detectable no garantiza que se detecte bien. La **precisión de cada regla se mide** durante la revisión (en la UI cada código etiquetado se acepta o se rechaza) y se publica en el informe.

## Revisión humana (etapa 6)
- Servidor local en la biblioteca estándar de Python (`python -m pipeline.review`, `http://127.0.0.1:8765`), HTML+JS sin framework, sin autenticación (solo escucha en localhost).
- Lotes de 20, ordenados por **déficit de cobertura**: objetivo por defecto 20 oraciones validadas por código (cuando existan) y 300 por nivel, configurable en `pipeline/rules/coverage.yaml`; dentro de eso, primero confianza baja.
- Por oración se muestra: italiano, español, tipo de traducción (directa/pivote), autor, nivel estimado y confianza, códigos con la evidencia que los activó y los `qa_flags`.
- Acciones: **aprobar**, **rechazar** (con motivo), **duda**, corregir el nivel y aceptar/rechazar cada código. Para pares pivote, aprobar exige marcar aparte "la traducción es correcta".
- Atajos de teclado; cada decisión se guarda al instante en `reviews` y actualiza `review_status`. Lo que quede en `duda` o sin tocar nunca llega al export.
- Honestidad sobre la limitación: tu italiano está aprendiendo, así que la UI te da las señales de calidad (autor, avisos, tipo de traducción) y un enlace por oración a Tatoeba. Si prefieres un revisor externo más adelante, `export` puede volcar un CSV sin cambiar el resto.

## Cambios al contrato de la Fase 1
Campos nuevos opcionales en `sentence`: `translation_kind` (`direct`|`pivot`), `pivot_via` (id Tatoeba del puente), `cefr_confidence` (0–1), `qa_flags` (lista de strings), `tag_rules` (código → id de regla). Se regeneran los tipos TS y los modelos Pydantic (`npm run schemas`); los fixtures actuales siguen siendo válidos.

## Dependencias y permisos
- Python: `spacy==3.8.x` + `it_core_news_md` (~40 MB, descarga desde GitHub), `wordfreq==3.1.1`, `PyYAML`; `language-tool-python` es **opcional** (tienes Java 16; las versiones recientes de LanguageTool pueden pedir 17+; sin él se omiten esos avisos y el pipeline sigue).
- Descargas pendientes que **pediré antes de hacerlas**: `links.tar.bz2` (150 MB) y el modelo de spaCy.
- Nada de esto lleva servicios de pago, cuentas ni rastreo.

## Verificación y criterios de aceptación
1. Prueba de aceptación sobre datos reales: las 3 oraciones de los fixtures de la Fase 1 (719442, 3255442, 3860754) deben salir del pipeline con los códigos esperados (`ERR_AUX_ESSERE`; `ERR_POSSESSIVE_ARTICLE`; `ERR_POSSESSIVE_ARTICLE` + `ERR_GEMINATE`) y nivel plausible.
2. Cada etapa imprime su conteo (entrada, descartes por razón, salida); repetir el pipeline sobre los mismos datos produce el mismo hash de salida.
3. Cada regla de etiquetado y de CEFR tiene sus pruebas positivas/negativas en pytest.
4. Ninguna oración sin id, autor y licencia llega al export; ninguna entra como `validated` sin una fila en `reviews`.
5. **Compuerta antes de escalar:** revisas una muestra de 200 candidatos y el informe entrega (a) precisión por regla de etiquetado, (b) acuerdo nivel estimado vs. corregido y (c) tasa de rechazo de pares pivote. Con esos números se decide si se ajustan reglas o se cambia el enfoque antes de revisar más.

## Riesgos abiertos
- Rendimiento y ruido del pivote: desconocidos hasta medir en la etapa 2.
- Calidad de la morfología de spaCy en oraciones de 2–5 palabras (suelen fallar): se mide en la muestra de 200.
- Un solo autor domina los directos (60%): el estilo de las oraciones será homogéneo; se reporta en el manifest.
- Las listas léxicas salen de fuentes con errores conocidos (`docs/dudas-italiano.md`): nada de ellas se usa sin pasar la misma revisión.
