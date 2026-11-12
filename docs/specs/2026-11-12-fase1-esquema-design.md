# Fase 1 — Esquema de datos (diseño)

Estado: implementado y probado en local; **pendiente de tu revisión** antes de la Fase 2.

## Decisiones tomadas
- Arquitectura híbrida Mac + PWA (PWA sola offline; con el Mac, evaluación de escritura y habla).
- Contenido por pipeline con revisión: nada entra a la app sin `review_status: validated`.
- Repo nuevo; la app anterior sigue intacta en su URL.
- Se empieza por el esquema de datos (no por el motor de lecciones): códigos de error, corpus y tarjetas dependen de él.

## Contrato
`schemas/*.schema.json` (JSON Schema 2020-12) es la fuente de verdad. Salen de ahí:
- Tipos TS: `npm run schemas:ts` → `web/src/generated/<esquema>.d.ts` (uno por archivo; los tipos compartidos se re-emiten).
- Modelos Pydantic: `npm run schemas:py` → `pipeline/models/`.
- DDL SQLite de autoría: `pipeline/db/schema.sql` (columnas escalares para filtrar + `body` JSON con el documento completo) y `pipeline/db/store.py` (valida al entrar y al salir; por defecto exporta solo `validated`).
- Estado del usuario (tarjetas, logs, eventos de error): IndexedDB; solo sus esquemas viven aquí.

| Esquema | Para qué |
|---|---|
| `error-code` + `data/error-codes.json` | Catálogo de 15 códigos de error contrastivo con ejemplo, nivel, detector y fuente |
| `lexeme` | Léxico con `lexical_type` (cognate/neutral/false_friend), heterotónica, geminada |
| `sentence` | Oración Tatoeba/OPUS/propia; Tatoeba exige `source_id`, autor y licencia |
| `item` | 7 tipos de ejercicio; todo distractor lleva `error_code` y `distractor_kind` |
| `capsule` | trigger → explicación → 4–6 ítems de recuperación, 180–300 s |
| `card`, `review-log`, `error-event` | Estado del usuario; `card.fsrs` = ts-fsrs **6.0.0** serializado |
| `slm-feedback` | Salida estricta del SLM, alineada con el esquema de la fuente |
| `data/calibration.json` | ΔD/γs por tipo léxico (cognado −1,5/1,8; falso amigo +2,5/0,5; neutral 0/1) |

## Qué se verificó (y cómo)
- `npm test`: 20 pruebas JS (ajv) + 10 pytest. Incluyen: ida y vuelta fixtures → Pydantic → SQLite → export → re-validación; integridad referencial de códigos y lexemas; rechazo de distractor sin código, cloze sin/con 2 huecos, cápsula con 3 o 7 ítems, Tatoeba sin atribución; estado real de `ts-fsrs` (tarjeta nueva y repasada) valida contra `card`.
- `npm run typecheck`: los fixtures calzan con los tipos generados; control negativo confirmado.
- Ids, autor y traducción directa de las 3 oraciones Tatoeba (719442, 3255442, 3860754) se leyeron de la API de Tatoeba.

## Límites que debes conocer
1. **Taxonomía parcial.** Las consultas a NotebookLM (`notebook_query`) se agotaron por tiempo; los 15 códigos salen de leer el texto crudo de **2 de las 99 fuentes** (5f4ef3d8 y 79103ab3). Falta revisar el resto (p. ej. preposiciones, artículos, falsos amigos más allá de la tabla).
2. **Todo el contenido está `needs_review`.** Nada se marcó `validated`; los niveles CEFR de 5 códigos son estimaciones (anotado en `notes`).
3. **Errores en las fuentes**, listados en `docs/dudas-italiano.md` (acentos invertidos en atmosfera, adesso/adrede, "Penso a questo"…). No se copiaron.
4. Un cambio al diseño inicial: la fuente trae un esquema de SLM más completo que el mío; se adoptó el de la fuente. El servidor debe además comprobar que `flagged_tokens == text_evaluated[start:end]` (JSON Schema no puede).
5. ts-fsrs 6.0.0 ya no serializa `elapsed_days` (opcional) y agrega `learning_steps`; la versión queda fijada en `package.json`.

## Pendiente para fases siguientes
- Fase 2: pipeline Tatoeba/OPUS (etiquetado CEFR y por código, cola de revisión).
- Fase 3: HTTPS iPhone→Mac (Tailscale `serve` vs mkcert); cuándo aplicar el sesgo FSRS (la fuente lo aplica a tarjetas nuevas y a lapsos de falsos amigos).
- Fase 4: exámenes de hito y bancos A1–B2.
