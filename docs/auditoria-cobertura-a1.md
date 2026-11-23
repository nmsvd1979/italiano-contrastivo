# Auditoría: ¿la app cubre A1 y permite aprenderlo bien? (2026-11-23)

Estado auditado: `main` en `a294d66` (ya publicado). Tres fuentes de evidencia: **(1)** mediciones mías sobre los datos publicados, **(2)** una revisión pedagógica independiente de solo lectura (`docs/auditoria-a1-revisor-independiente.md`, hecha por un subagente de IA que no construyó la app) y **(3)** un recorrido de pantallas en el navegador. Ninguna es la opinión de un hablante nativo ni de un estudiante real: el veredicto es una hipótesis hasta que alguien la use.

## Veredicto
**Parcialmente.** Cubre bien la **gramática y el léxico** de A1 con un método sólido (recuperación, repetición espaciada con calibración, foco contrastivo, escribir frases enteras). **No cubre lo que define a un A1**: poder *hacer cosas* con la lengua (pedir aclaraciones, presentarse con preguntas y respuestas, pedir en el bar, preguntar y entender una dirección). Quien la termine hoy reconocerá y escribirá frases A1, pero probablemente no sostendrá una conversación simple.

## Lo que medí (verificado con datos)
| Hallazgo | Dato |
|---|---|
| Vocabulario frecuente | De las 1.000 formas más frecuentes del italiano (lista web), el contenido A1 incluye el 66 %; de las 500, el 81 %; de las 100, el 100 %. Muchas ausentes no son A1 (política, presidente). |
| Meses | Solo 5 de 12 aparecen en el contenido (faltan enero, febrero, mayo, agosto, septiembre, octubre, noviembre). |
| Números | Faltan 14, 17, 19 y 60–90 (la lista de u26 llega a venti, trenta…cento sin la regla 21–99). |
| Verbo *dire* | 1 de 6 formas del presente; faltan además *lavorare*, *mettere*, *partire*, *pensare*, *credere*. |
| Personas verbales | En u14 (-are): 0 oraciones con *tu*, 0 con *noi*, 0 con *voi*; en todo el bloque de presente *voi* casi no aparece (1 de ~190). La ficha dice «tu parli, voi parlate» pero no se practica. |
| Pedir aclaraciones | 0 oraciones con «non ho capito», «come si dice»; está en `planned` sin construir. |
| Orden | Las 5 primeras unidades son solo de sonidos (≈5 h) antes de «ciao» (u37 es la 6.ª); los verbos regulares (u14) llegan en la posición 24 de 51. |
| Primer día | «Hoy» propone «Tienes 3 para repasar» (3 falsos amigos como burro) antes de haber estudiado nada. |
| Evaluación | Hito: 40 ítems de reconocimiento de 2–3 opciones, sin escuchar, leer un texto nuevo, escribir ni hablar. Prueba de unidad: 6 frases con «mi versión también es correcta» activo (la nota la decide el estudiante). |

## Lo que añade la revisión independiente (y verifiqué los tres puntos más graves)
- **El campo `speaker` de los diálogos no se muestra** (0 apariciones en `web/src`; 18 de 18 oraciones de rd_poste lo tienen) → preguntas imposibles de responder desde el texto.
- **La cápsula de u65 («vorrei») practica «Voglio…»** (verificado en `capsules.json`).
- **En la lectura el audio solo aparece al desplegar la traducción**: no se puede escuchar antes de leer el español.
- Una sola voz sintética para 3.552 clips; sin audio nativo de frases.
- Lecturas por encima de la gramática enseñada (rd_giornatabrutta, rd_routine, rd_ristorante).
- La prueba de u18 (lo primero que hace un principiante) trae frases de nivel B1 («farcela», «pensarci»).
- Funciones solo «de nombre»: direcciones (u57: 5 de 49 oraciones las practican), pedir en el bar (u35, u65), datos personales (preguntas «quanti anni hai», «dove abiti»: 0).

## Qué está bien (se conserva)
Fichas contrastivas claras y dirigidas a calcos reales; práctica de recuperación y producción; FSRS con tarjetas por palabra (ES→IT con artículo), por punto gramatical y por errores corregidos; tamices; reconstrucción de memoria; honestidad sobre IA, voz sintética y revisión; medición de minutos reales.

## Plan para cerrar A1 de forma óptima (por impacto y esfuerzo)
**Bloque 1 — Arreglos rápidos, alto impacto (esfuerzo bajo/medio)**
1. **Reordenar la ruta:** saludar (u37) y presentarte (u60) primero, luego essere/avere, números y artículos; verbos regulares (u14) hacia la posición ~10; una unidad de sonidos cada 4–5 unidades.
2. **Sonidos y primer día:** oraciones de las unidades de sonidos ≤7 palabras y solo con gramática ya vista; que el primer «Hoy» no proponga repaso de falsos amigos antes de la primera lección.
3. **Lecturas:** mostrar el hablante en los diálogos; separar el audio de la traducción y añadir «Escuchar todo»; mover rd_giornatabrutta a A2 y rd_routine a u56.
4. **Prueba de unidad:** quitar o limitar la autoaprobación (que cuente medio punto y se registre) y llegar a ≥12 frases en unidades con contenido suficiente.
5. **Huecos de contenido medibles:** meses completos, números 0–100 con la regla 21–99, conjugación de *dire* y verbos frecuentes ausentes, y las personas tu/noi/voi/loro en las unidades de presente (oraciones nuevas con el prefiltro de auditoría).
6. **Prueba automática de alineación:** ≥60 % de las oraciones de práctica, prueba y cápsula de cada unidad contienen la forma objetivo; corregir u65, u57, u35, u33.

**Bloque 2 — Lo que hace que sirva para *hablar* (esfuerzo medio/alto)**
7. *(2026-11-23: hecho en parte como pestaña «Hablar»; faltan bar completo y tiempo atmosférico por falta de fuente)* **Unidades funcionales con diálogos de los libros abiertos** (no de Tatoeba): pedir aclaraciones, alfabeto y deletreo, datos personales (preguntar y responder), tiempo atmosférico, direcciones con la forma de Lei, pedir en el bar completo. Ejercicios a mano, marcados `needs_review`.
8. *(hecho: 5 tareas orales + 8 juegos de roles)* **Una «tarea hablada» por unidad funcional:** guion con turnos, grabarse respondiendo, comparar con el modelo y encargo listo para el modo de voz de una IA gratuita, con registro de minutos.
9. *(hecho salvo la lectura de un texto no visto)* **Hito en 4 partes:** lectura de un texto no visto, escucha, 12 frases ES→IT sin autoaprobación y una tarea oral con rúbrica.

**Bloque 3 — Calidad a mediano plazo**
10. Segunda voz Piper italiana (verificar licencia) para diálogos; paso de fluidez (releer/reescuchar a velocidad creciente); textos tipo PLIDA (menú, cartel, horario, sms); distractores de 3–4 opciones con calcos reales; revisión nativa por muestreo.

## Cosas que no sé
Si el orden nuevo reduce de verdad el abandono; si 5 de 6 es buena vara en la prueba; cuánto tardará un estudiante real; la calidad del italiano de cada ficha (juzgada sin ser nativo); el audio (nadie lo escuchó entero).
