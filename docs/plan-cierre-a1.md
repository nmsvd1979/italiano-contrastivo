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
3. Lectura o diálogo de un libro abierto (las unidades de sonidos llevan palabras clave con audio verificado en vez de lectura).
4. Paso «Palabras» y repaso espaciado si es de vocabulario.
5. Minutos estimados ≥ 90 % del objetivo de la unidad.
6. Ningún texto en español con voseo ni «vosotros» (oraciones, traducciones, fichas, glosas, preguntas).
7. Toda atribución visible y todo clip de audio presente.
Más: examen de hito y prueba de ubicación probados con las 48 unidades.

## Fases (en este orden; cada una termina con tests en verde y un commit)
**A. Herramienta de auditoría automática (una vez, sirve para A2/B1).** `pipeline/audit_rules.py`: prefiltro que rechaza solo, con motivo, lo que siempre rechazo a mano (voseo, «vosotros», passato remoto, imperfetto, condicional, subjuntivo, nombres propios, vulgaridades, traducciones desproporcionadas, duplicados). Yo audito solo lo ambiguo. Reduce el trabajo manual a la mitad o menos y lo vuelve consistente.

**B. Práctica derivada de las lecturas (una vez).** De cada lectura/diálogo se generan huecos, orden y traducción con el texto original del libro (traducción de IA marcada). Sube los minutos de práctica sin inventar italiano y sin depender de Tatoeba. Además sirve de motor para las unidades funcionales que no tienen error generable.

**S. Sonidos con medición (ver sección propia).**

**C. Lecturas y diálogos que faltan (en lote).** Leer en una pasada los capítulos pendientes de Leggiamo, Tutt* a tavola y Piacere!, y asignar un texto a cada unidad sin lectura. Para sonidos (u18–u20 y las nuevas): palabras clave con audio en vez de lectura.

**D. Unidades funcionales pendientes con el motor de B.** Pedir aclaraciones y vorrei, a partir de los diálogos de Piacere! («I saluti») y Tutt* a tavola.

**E. Oraciones de las 14 unidades cortas.** Una sola tanda de candidatas con prefiltro (A) para todas, y auditoría en lote.

**F. Cierre:** test de «A1 cerrado», rehacer hito y ubicación, paquete de revisión para un nativo (fichas, lecturas traducidas y 100 oraciones en un solo documento), PR único.

## Sonidos dentro de A1 (decisión del usuario, 2026-11-20)
Se incluyen gn/z, consonantes dobles y entonación en A1, primero con la voz Serena que ya usamos; solo si no alcanza, con audio nativo. No se decide a ojo: se mide.

**Fase S (después de A, antes de C).**
1. *Banco de prueba:* ≈60 pares mínimos de consonantes simples/dobles (pala/palla, caro/carro, pena/penna, nono/nonno, sete/sette, fato/fatto…), palabras con gn y con z (gnocchi, lasagne, pizza, zio, grazie…) y ≈30 frases en pregunta y afirmación.
2. *Medición objetiva en Serena:* duración de la consonante doble frente a la simple (cierre de las oclusivas y duración de nasales/líquidas), y pendiente de F0 al final de la frase para pregunta/afirmación.
3. *Referencia nativa:* las mismas palabras en Lingua Libre (grabaciones de hablantes nativos, CC BY-SA 4.0, ya usadas en el proyecto) para fijar el rango real de un nativo.
4. *Regla de decisión:* si en ≥ 90 % de los pares Serena produce una razón doble/simple dentro del rango nativo (≥ ≈1,5), las consonantes dobles se construyen con Serena. Si no llega, los pares se hacen con grabaciones nativas (Lingua Libre por palabra; Common Voice italiano, CC0, solo una muestra filtrada por votos y acento, confirmando licencia y que las voces sean nativas). Lo mismo para entonación (F0) y para gn/z (revisión espectral del sonido).
5. *Unidades:* «Sonidos: gn y z» (error: «ñ» por gn, z simple por doble: lasaña, piza), «Consonantes dobles» (escucha y elige entre palabra y no palabra o pares mínimos con audio verificado) y «Entonación: afirmación o pregunta». Cada una con ficha, palabras clave con audio y el mismo test de cierre.
6. *Honestidad:* aunque pase la medición, se declara en la app que la voz es sintética y que no mide tu pronunciación; la verificación de un nativo sigue pendiente.

## Fuera de A1 (declarado, con motivo)
Solo el alfabeto/vocales: no tiene un error específico para hispanohablantes (las vocales coinciden).

## Qué evita nuevas pasadas
El test de cierre falla si algo falta; el prefiltro hace consistente la auditoría; el motor de B resuelve a la vez horas, práctica y unidades funcionales; y el paquete de revisión concentra en una sola ronda las correcciones de un nativo.

## Para A2 (misma maquinaria)
Currículo A2 con el mismo formato (fuentes: sillabo A2, PLIDA A2, Cotto e mangiato 2, Piacere!), definición de «cerrado» y fases A–F ya listas.
