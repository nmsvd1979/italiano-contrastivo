# Revisión adversarial (2026-11-22)

Hecha sobre el estado `a280090` de `main`. Tests: 756 web y 800 Python en verde (399 omitidos); se construyó la app y se abrió en el navegador a 375 px sin errores de consola. No se probó en iPhone ni se recorrió una unidad completa.

## Veredicto
La app funciona y declara sus límites, pero es un curso A1 de reconocimiento, no la app contrastiva de habla y escritura que se planteó. Las ≈46 h de A1 son estimación sin medir y A2–B2 casi no existe.

## Desvíos frente al diseño original
| Planteado | Hoy |
|---|---|
| Cada ejercicio ataca un calco del español | 15 de 49 códigos con unidad; 50 de 65 unidades son temas genéricos; 382 de 4.562 distractores son calcos (8 %) |
| 7 tamices EuroComRom | No existen (campo `sieve` vacío en los 49 códigos) |
| Habla y escritura precisas | Sin producción corregida: traducir no se califica, hablar es autoevaluación, escribir detecta 8 patrones |
| Servidor en el Mac | No existe `server/`; el Mac (8 GB, sin GPU) no corre el modelo previsto |
| Repaso calibrado por tipo léxico | 795 palabras entran como «neutras»; solo 32 falsos amigos usan la calibración |
| Ruta A1→B2 | A1: 51 unidades · A2: 4 · B1: 1 · B2: 0 |

## Problemas de contenido
- La unidad 1 usa en su prueba frases de nivel B2 («Magari avessi saputo…») y en el dictado «ci sono stati due omicidi».
- Búsqueda aproximada: 47 oraciones con imperfecto, 18 con subjuntivo y 3 con condicional dentro de unidades A1 (anteriores a u58).
- «Error típico: Io abito a Parighi» es un error inventado; el real es de pronunciación y no se mide.
- El vocabulario muestra «latte = la leche» sin artículo italiano (il latte): refuerza la falsa transparencia.
- Falsos amigos sin marcar en listas (camera, topo, mancia).
- Traducciones que no calzan («Lei non sa cosa fare» → «No sabe lo que está haciendo»); en otra, respuesta «quisiera» con frase «Quiero…».
- Lecturas: 4.170 palabras en todo A1; varias de 18–40 palabras cuentan como «tiene lectura».
- 63 % de las oraciones son de un autor de Tatoeba; mediana de 5 palabras.

## Evaluación débil
- Prueba de unidad: 6 oraciones reservadas; preguntas de 2 opciones en gramática y sonidos.
- Examen de hito: 40 preguntas de reconocimiento; no mide escuchar, leer, escribir ni hablar.
- Ubicación: 3 preguntas por unidad; adivinando se salta una de cada 8 en las de 2 opciones.
- Repaso de palabras: solo IT→ES y autoevaluado.

## Tiempo
Los minutos salen de valores supuestos por ejercicio y cada paso se rellena hasta la meta, así que el total coincide por construcción. Estimación mía (sin medir): el A1 real ronda 20–30 h, no 46.

## Pendientes abiertos
Revisión por nativo (el paquete existe y nadie lo revisó), prueba en iPhone real, entonación, pedir aclaraciones, passato prossimo/imperfetto, ci/ne, plan para B1–B2 (Tatoeba directo no alcanza y el pivote está vetado), licencia del repositorio (Piacere! exige compartir lo derivado con la misma licencia).

## Siguiente paso
Ver `docs/specs/2026-11-22-plan-maestro.md`.
