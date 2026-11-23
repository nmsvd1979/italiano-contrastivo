# Plan de A2 ejecutable (escrito el 2026-11-24)

Complementa `docs/hoja-de-ruta-a2-b2.md` (método y fuentes) con el trabajo concreto, módulo por módulo. La lista de requisitos está en `schemas/data/syllabus-a2.json` y la vigila `tests/py/test_cobertura_a2.py`: cada requisito pertenece a un módulo planificado y declara qué falta. **Es un plan, no contenido hecho: A2 aún no existe en la app** (solo u09–u12, sin módulo).

Límite honesto: los requisitos están redactados desde los programas CILS/PLIDA y la hoja de ruta, no copiados de los PDF; hay que cotejarlos antes de cerrar el nivel. Los esfuerzos son estimaciones mías.

## Orden y por qué

Orden de adquisición (Pavia): passato prossimo → imperfetto → ambos juntos → pronombres → comparar → futuro y cortesía → imperativo → viajes → trabajo/vida diaria → opinar. Cada módulo se termina entero (entrada, cápsulas, salida, fluidez, cierre) antes de empezar el siguiente.

## Receta repetible por módulo (la misma de A1)

1. Código nuevo en `schemas/data/topic-codes.json` (explicación en español) y, si es mecánico, generador en `pipeline/exercises/calques.py` con su prueba en `tests/py/test_calques.py`; si es vocabulario, tema en `pipeline/vocab/` (yaml + tamiz).
2. `python scripts/fill_pack.py CODIGO 60` → auditar una por una → `data/work/capsules/verdicts.json` → `python scripts/capsule_apply.py`. Meta: ≥ 30 oraciones por unidad.
3. Añadir las unidades y el módulo a `schemas/data/course.json` (con ficha, `can_do_es`, entrada, juegos de roles, tareas, `writing_es`).
4. Textos propios en `scripts/autorales.py` (`authored: true`) si no hay fuente abierta; clasificar palabras nuevas en `reading_words.json`.
5. Reconstruir: `python -m pipeline export`, `capsules`, `readings`, `tts` (con `ESPEAK_DATA_PATH`), regenerar `web/src/writing/calque-pairs.json`.
6. Pruebas Python y web, actualizar el estado en `syllabus-a2.json`, registrar en `CONTINUIDAD.md`, commits pequeños a `main`. **Probar en el iPhone al cerrar cada módulo** (lo hace el usuario).

## Paquetes de trabajo

| Módulo | Cápsulas nuevas (≈) | Generador / método | Fuente | Textos propios | Esfuerzo |
|---|---|---|---|---|---|
| a2m01 Pasado con avere/essere | 4 (+u09) | Mecánico: ausiliare y participios irregulares | Piacere!, Giornate u.6, Tatoeba | 2 | medio |
| a2m02 Imperfetto | 3 | Mecánico: imperfetto regular e irregular; «da/fa» | Piacere!, Tutt\* a tavola! v.2 | 2 | medio |
| a2m03 Pasado vs imperfetto | 2–3 | **Sin generador**: oraciones auditadas con pista de contexto | Tutt\* a tavola! v.2 cap.8, Giornate u.7 | 2–3 | alto (lo más difícil) |
| a2m04 Pronombres | 4 (+u71) | Mecánico: clíticos directos/indirectos y posición; ci/ne a mano | Piacere!, Tatoeba | 1 | alto |
| a2m05 Comparar | 3 (+u11) | Mecánico: superlativo e irregulares | Piacere!, Tatoeba | 1 | bajo |
| a2m06 Futuro y cortesía | 3 | Mecánico: futuro, condicional de cortesía | Piacere!, Giornate u.8 y 11 | 2 | medio |
| a2m07 Instrucciones y permisos | 3 | Extiende los generadores de imperativo | Piacere!, Wikivoyage | 1 | bajo |
| a2m08 Viajar | 3 vocab. (+u10) | Vocabulario (tres temas) | Giornate u.9, Wikivoyage | 4 | medio |
| a2m09 Trabajo y vida diaria | 3 vocab. | Vocabulario | Piacere!, Leggiamo | 3 | medio |
| a2m10 Opinar (reconocer) | 1–2 (+u12) | Solo oraciones auditadas «che + congiuntivo» | Piacere! | 1 | bajo |

Total aproximado: 30 cápsulas nuevas y ≈ 20 textos propios, con 10 módulos. El orden recomendado es el de la tabla; si se quiere acortar, a2m09 y a2m10 pueden pasar al inicio de B1 sin romper la secuencia.

## Qué buscar antes de empezar cada módulo (una sola pasada)

- Entrada y diálogos: capítulo correspondiente de la fuente indicada, leído en el navegador integrado (los lectores automáticos reciben 403). Copiar solo listas de frases y preguntas, citando libro y capítulo en `source`.
- Oraciones: `fill_pack.py` con la palabra clave del código (p. ej. «ho + participio» para a2m01); si Tatoeba no alcanza 30 utilizables, ampliar con la forma contraria (mismo tiempo, otros verbos) y no bajar la meta.
- Si no hay fuente abierta: la IA escribe el texto (ver §5 de la hoja de ruta), marcado `authored`, y una segunda pasada independiente (subagente) audita el italiano.

## Cierre de A2

(1) todos los requisitos de `syllabus-a2.json` en «covered» salvo los declarados; `cierre: true` y el 80 % exigido por la prueba; (2) hito A2 con las cinco partes (copiando `milestone.ts`); (3) el usuario completa los módulos. Más allá de A2, el mismo método sirve para B1 y B2; antes de planificarlos hay que confirmar qué material abierto hay de verdad (hoja de ruta §8).
