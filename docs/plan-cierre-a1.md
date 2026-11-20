# Plan para cerrar A1 sin repetir pasadas (2026-11-20)

## Estado medido (núcleo A1: 48 unidades)
- 16 unidades sin lectura: u18, u19, u20, u54, u55, u07, u49, u39, u16, u17, u61, u44, u27, u33, u28, u62.
- 14 unidades con menos de 30 oraciones auditadas (el mínimo aprobado era ≈40): u37, u60, u54, u55, u41, u38, u59, u40, u56, u35, u31, u42, u33, u58.
- Falta ≈8 h de pasos frente al objetivo por unidad; el resto de A1 son 6 unidades «próximamente».
- Cuello de botella: el corpus (Tatoeba) ya no da más oraciones útiles para varios temas, y cada auditoría manual es lenta.

## Definición de «A1 cerrado» (se comprueba con un test, no con impresiones)
Cada unidad del núcleo cumple TODO:
1. ≥ 30 oraciones auditadas con audio, o su equivalente en ejercicios derivados de textos de libros (ver B).
2. Ficha de enseñanza con fuente.
3. Lectura o diálogo de un libro abierto (excepto las de sonidos, que llevan «palabras clave»).
4. Paso «Palabras» y repaso espaciado si es de vocabulario.
5. Minutos estimados ≥ 90 % del objetivo de la unidad.
6. Ningún texto en español con voseo ni «vosotros» (oraciones, traducciones, fichas, glosas, preguntas).
7. Toda atribución visible y todo clip de audio presente.
Más: examen de hito y prueba de ubicación probados con las 48 unidades.

## Fases (en este orden; cada una termina con tests en verde y un commit)
**A. Herramienta de auditoría automática (una vez, sirve para A2/B1).** `pipeline/audit_rules.py`: prefiltro que rechaza solo, con motivo, lo que siempre rechazo a mano (voseo, «vosotros», passato remoto, imperfetto, condicional, subjuntivo, nombres propios, vulgaridades, traducciones desproporcionadas, duplicados). Yo audito solo lo ambiguo. Reduce el trabajo manual a la mitad o menos y lo vuelve consistente.

**B. Práctica derivada de las lecturas (una vez).** De cada lectura/diálogo se generan huecos, orden y traducción con el texto original del libro (traducción de IA marcada). Sube los minutos de práctica sin inventar italiano y sin depender de Tatoeba. Además sirve de motor para las unidades funcionales que no tienen error generable.

**C. Lecturas y diálogos que faltan (en lote).** Leer en una pasada los capítulos pendientes de Leggiamo, Tutt* a tavola y Piacere!, y asignar un texto a cada unidad sin lectura. Para sonidos (u18–u20): lista de «palabras clave» con audio en vez de lectura.

**D. Unidades funcionales pendientes con el motor de B.** Pedir aclaraciones y vorrei, a partir de los diálogos de Piacere! («I saluti») y Tutt* a tavola.

**E. Oraciones de las 14 unidades cortas.** Una sola tanda de candidatas con prefiltro (A) para todas, y auditoría en lote.

**F. Cierre:** test de «A1 cerrado», rehacer hito y ubicación, paquete de revisión para un nativo (fichas, lecturas traducidas y 100 oraciones en un solo documento), PR único.

## Fuera de A1 (declarado, con motivo)
Sonidos gn/z, consonantes dobles y entonación: requieren audio de hablantes nativos verificado (Common Voice o Lingua Libre, con licencia confirmada). Pasan a un módulo de fonética propio, antes de B1. El alfabeto/vocales no tiene error específico para hispanohablantes.

## Qué evita nuevas pasadas
El test de cierre falla si algo falta; el prefiltro hace consistente la auditoría; el motor de B resuelve a la vez horas, práctica y unidades funcionales; y el paquete de revisión concentra en una sola ronda las correcciones de un nativo.

## Para A2 (misma maquinaria)
Currículo A2 con el mismo formato (fuentes: sillabo A2, PLIDA A2, Cotto e mangiato 2, Piacere!), definición de «cerrado» y fases A–F ya listas.
