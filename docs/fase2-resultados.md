# Fase 2 — Resultados de la corrida real

Corrida del 2026-11-12 sobre los exports de Tatoeba (`python -m pipeline all --no-pivot`, 7 min 30 s; el pivote se midió antes, 105 s).
Estado de la compuerta de 200: **pendiente de tu revisión** (ver al final).

## Conteos por etapa
| Etapa | Resultado |
|---|---|
| ingest | 991.553 oraciones ita, 443.166 spa, 19.975 pares directos (18.688 oraciones ita) |
| pivot | 251.148 pares pivote; 184.028 oraciones ita nuevas (202.716 con algún par) |
| filter | 202.716 entradas → **190.246 ok** (17.415 directas, 172.831 pivote); 12.470 rechazadas |
| rechazos | no_verb 8.184 · length 2.134 · digits_url 1.752 · ratio 651 · duplicate 15 · punct_unbalanced 15 (una oración puede tener varias razones) |
| annotate | A1 94.435 · A2 74.521 · B1 19.313 · B2 1.977 |
| tag | 162.298 oraciones con algún código; 357.705 códigos asignados |
| promote | 190.246 oraciones `needs_review` en la base de autoría (todas con `es_author`) |

## Qué hay para revisar
- **Nivel × tipo de traducción:** A1 9.149 directas / 85.286 pivote · A2 6.308 / 68.213 · B1 1.711 / 17.602 · B2 247 / 1.730.
- **El 91% de los candidatos son por pivote** (traducción indirecta, no medida todavía): la revisión de 200 debe mezclar directas y pivote para estimar su tasa de rechazo.
- **Confianza del nivel:** 0,3 en 128.305 oraciones (67%: sin rasgos gramaticales, por diseño del spec), 0,6 en 45.965 y 0,9 en 15.976.
- **Cobertura de códigos** (meta: 20 validadas por código): 46 de 47 códigos etiquetables tienen ≥20 oraciones disponibles. Los más escasos: `ERR_MAGARI_TENSE` 7 (no alcanza la meta), `ERR_CONGIUNTIVO_CONCESSIVE` 24, `ERR_CLITIC_CE_NE` 47, `ERR_CONGIUNTIVO_SUPERLATIVE` 63, `ERR_HETEROTONIC` 64, `ERR_CLITIC_DOUBLING` 111. `ERR_LEXICAL_LEAK` y `ERR_ARTICLE_OMISSION` no son etiquetables (se cubrirán con ítems escritos).
- Los patrones de superficie dominan el etiquetado (`ERR_GEMINATE_SPELLING` 100.681, `ERR_C_G_PALATAL` 57.295); el tope de 3 por oración evita que tapen los gramaticales.

## Límites conocidos (de la ejecución)
- Los ejemplos de las reglas se eligieron leyendo coincidencias del corpus; los positivos coinciden por construcción. **La precisión real de cada regla es desconocida hasta tu revisión.**
- spaCy tiene límites con oraciones de 2–5 palabras y con lemas de formas auxiliares y gerundios (ver ledger: gerundio absoluto solo al inicio de cláusula; imperativo solo con "!").
- La regla de rareza léxica del spec (percentil 90 de Zipf < 3,5) dispara en ~3% de la muestra; se revisa con la compuerta.
- Interfaz de revisión verificada en el navegador del panel con una base de demostración; **no** probada sobre la base real de 190 mil oraciones ni en otro navegador/iPhone.

## Compuerta de 200 (pendiente)
1. `python -m pipeline review` y abrir http://127.0.0.1:8765. Revisa **200 oraciones** (10 lotes de 20); el orden ya prioriza cobertura y baja confianza, pero cuida que entren directas y pivote.
2. `python -m pipeline report` entrega: precisión por regla, acuerdo de nivel y tasa de rechazo del pivote.
3. Con esos números se decide si se ajustan reglas, umbrales CEFR o el enfoque del pivote **antes** de revisar más.

_Números de la compuerta: (se llenan tras tu revisión)_
