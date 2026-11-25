# Auditoría adversarial de A1 (2026-11-25)

**Pregunta:** si completas todo lo que la ruta obliga en A1, ¿llegas de verdad a A1 (MCER 2020, CILS A1 y PLIDA A1)? ¿Qué falta para dejarlo listo?

**Cómo se hizo.** Hubo dos revisiones separadas:
- **La mía (Claude, sesión principal):** leí las auditorías anteriores (23 y 24 de noviembre) y medí el estado actual con scripts sobre `web/public/content`, usando `tests/py/ruta_obligatoria.py`.
- **La de un agente independiente:** no tuvo acceso a mis conclusiones. Armó su propia lista de lo que exige A1 *antes* de leer `syllabus-a1.json` y la comparó con los datos.

Comprobé en el código los hallazgos del agente que uso aquí. Ninguno de los dos abrió la app, escuchó el audio ni la probó en un iPhone.

## Veredicto

**A1 está cerrado como código, pero solo en parte como competencia.** Quien termine la ruta probablemente alcanza A1 en tres cosas:
- lectura;
- escritura controlada (frases sueltas);
- precisión gramatical en los contrastes con el español, donde incluso puede superar A1.

Hay dos destrezas que la app no entrena lo suficiente ni comprueba:
- **entender voces reales al oído;**
- **conversar sin guion.**

Las dos están en el centro de la definición de A1. El problema no es la cantidad de horas (unas 72 h, más el repaso, es razonable para un hispanohablante). El problema es **cómo se reparten esas horas**:
- cerca del 45 % es foco en la forma;
- cerca del 10 % es entrada con sentido;
- cerca del 5 % es producción libre.

Nation recomienda alrededor de un 25 % para cada una de las cuatro hebras.

Las dos revisiones llegaron a esta conclusión por separado.

## Qué ya está bien (medido hoy)
- Las pruebas de cobertura pasan (`test_cobertura_a1.py` y `test_modulos.py`: 18 de 18). De los 67 requisitos: 63 «covered», 2 «partial» (imperativo de «voi» y subordinadas), 1 «gap» (entonación) y 1 «deferred».
- La ruta obligatoria tiene:
  - 69 cápsulas;
  - 12 módulos;
  - 55 lecturas, con unas 4.900 palabras;
  - 18 juegos de rol;
  - 7 tareas orales.
- Se corrigió buena parte de lo que señalaron las auditorías anteriores:
  - m01 empieza saludando;
  - las funciones que faltaban (aclaraciones, bar, tienda, clima, SMS, formularios) ahora tienen juegos de rol y textos;
  - se muestra quién habla en los diálogos;
  - la autoaprobación está limitada (un comodín en la prueba de la cápsula, ninguno en el Cierre ni en el hito);
  - hay un tope de 12 palabras nuevas al día;
  - el hito tiene cinco partes.
- El repaso espaciado (FSRS de palabras, códigos y correcciones) es sólido.

## Lo que falta, por prioridad

### (a) Corregir antes de dar A1 por terminado

| # | Hallazgo | Evidencia (verificada) | Qué hacer | ¿Lo puedo hacer yo? |
|---|---|---|---|---|
| A1 | **Las pruebas traen frases fuera de nivel o absurdas.** En las pruebas de la ruta hay 60 frases A2 y 5 B1, y en la práctica 228 A2 y 23 B1. La prueba de u18, que se hace en el módulo 1, incluye «I ratti abbondano nella discarica municipale» y «Io ne ho visti tantissimi di concerti». En la práctica aparecen frases como «Tu sei drogato da quando sei nato» y «Mio padre ha solo quindici anni». | `cefr_estimate` en `sentences.json` y `parts.prueba` de `course.json` | Sacar de las pruebas y de las reservas toda frase por encima de A1. Crear un filtro de temas inadecuados o absurdos. Agregar una prueba automática que impida que se cuelen otra vez. | **Sí**, con un script y una prueba. Algunas cápsulas podrían quedar cortas: hay que medirlo. |
| A2 | **La corrección de traducciones tiene falsos negativos.** Se compara con una sola traducción de Tatoeba, y en el Cierre y el hito no hay comodín. Además hay desajustes entre el español y el italiano. Ejemplos: `s_1702261`, donde el español dice «compramos» y el italiano «prendiamo»; `s_13186007`, donde «a menudo» corresponde a «di solito». De las 512 frases de prueba, 183 tienen el español traducido por IA. | `gradeWrite` y `translation_kind` | (1) Aceptar varias respuestas: Tatoeba suele tener varias traducciones al italiano de la misma frase. (2) Que un auditor IA revise una por una las frases de prueba y de reserva para detectar desajustes entre ES e IT, marcando las dudas. | **Sí**, las dos partes. Sigue sin ser una verificación nativa. |
| A3 | **El Cierre reutiliza frases.** La mitad de sus frases ya se escribieron en la prueba de la cápsula, así que mide en parte memoria. | `modules.ts:142` (`seen` + `fresh`) | Usar solo frases de reserva en el Cierre. Ampliar las reservas donde no alcancen. | **Sí.** |
| A4 | **Contradicción de nivel con essere.** u08 está en A1 (m11), pero su ficha empieza con «En A2 aprendes…». 4 lecturas A2 son obligatorias en A1: `rd_lavoro`, `rd_giornatabrutta`, `rd_gonna` y `rd_ristorante2`. | `course.json` | Corregir la ficha. Decidir si esas lecturas se quedan como entrada «un poco por encima» (declarado) o pasan a A2. | **Sí**, pero **la decisión es tuya**. |
| A5 | **Casi no hay escucha sin texto.** Solo `rd_avvisi` (y `rd_stazione` en el examen) se escuchan sin leer. Todo el audio es sintético: Piper, con dos voces. | `readings.json` | Agregar al menos una escucha por módulo sin texto y con preguntas, con las dos voces y velocidad normal. | **Sí** con voz sintética. Con voz humana depende de las fuentes (ver c). |

### (b) Conviene corregir (sube la calidad, no bloquea)
- **Interacción sin guion.** Hoy los juegos de rol consisten en leer tu parte de un diálogo fijo y ponerte nota tú mismo. La propuesta es un modo nuevo: la app hace preguntas por voz en orden al azar, respondes sin guion y te grabas. A eso se suma una conversación por módulo con una IA de voz gratuita fuera de la app, con sus minutos registrados. *Lo puedo construir.*
- **Más entrada.** Pasar de unas 5.000 a 15.000 palabras de lectura en A1 o más, y que los minutos de Biblioteca (audio humano externo) cuenten en el plan. *Para eso hay que buscar fuentes (c).*
- **Huecos de contenido:**
  - irregulares que aparecen poco: «dici» 0 veces, «dai» 0, «esce» 1;
  - números grandes, años y precios: «duemila» 0 veces, «mille» 2;
  - imperativo de «voi»;
  - subordinadas con perché, quando y per;
  - concordancia de adjetivos (`g03` dice que no se exige en A1; el agente no está de acuerdo y yo tampoco).

  *Lo puedo hacer:* corpus primero y texto propio marcado si no hay.
- **Italiano menos «Tatoeba»:**
  - 19 % de las frases empiezan con un pronombre sujeto innecesario («Io ho sete»);
  - 146 frases llevan Tom o Mary.

  Conviene preferir otras frases cuando las haya. *Lo puedo hacer.*
- **Los sonidos se evalúan escribiendo frases que no tienen relación con el sonido.** Por ejemplo, la prueba de u64 (dobles) trae «Tom vuole andare in Giappone». Esas pruebas deberían usar frases con el sonido objetivo y ejercicios de discriminación. *Lo puedo hacer.* Con pares mínimos grabados, depende de (c).
- **Cifra de horas contradictoria:** `course.json` dice «40–50 h», `targets.ts` dice 50 h y lo medido son unas 72 h más el repaso. Hay que unificarla. *Trivial.*
- **Nota de `speaking.json`:** dice que «la app no escribe italiano propio», pero 7 juegos de rol usan diálogos escritos por la IA. Hay que corregir la nota. *Trivial.*

### (c) Necesita investigar o buscar fuentes (puedo hacerlo, con tu permiso para descargar)
1. **Audio humano con licencia abierta**, para escucha y pares mínimos. Opciones: Lingua Libre (CC BY-SA), las grabaciones de Tatoeba con licencia abierta, y si Piacere! o Leggiamo publican audio.
2. **Materiales de muestra de CILS (Unistrasi) y PLIDA:** si su licencia permite usarlos como escucha y modelo de examen.
3. **Más textos A1 abiertos**, para subir la entrada: los capítulos que no se usaron de Piacere!, Leggiamo y Tutt* a tavola, y otros libros CC.
4. **Si el dictado (Web Speech) funciona en la PWA instalada en el iPhone.** Ya existe `DictationTestScreen`, pero esto **solo lo puedes probar tú** en el teléfono.
5. **El patrón real de errores de pronunciación del yeísmo chileno** (duda 14 de `docs/dudas-italiano.md`).

### (d) No se puede con las restricciones (gratis, sin servidor), y la mejor alternativa
- **Evaluar de forma fiable el habla libre y la pronunciación.** Alternativas:
  - el dictado del iPhone como prueba de inteligibilidad: si transcribe bien tu frase, se te entiende;
  - grabarte y comparar con el modelo;
  - IA de voz gratuita como opinión, sin que decida la nota;
  - un intercambio con nativos de vez en cuando (Tandem, HelloTalk).
- **Corregir de forma fiable la escritura libre.** Alternativas: el detector propio (8 códigos), LanguageTool (gratis, en línea) y una IA externa.
- **Verificación por un nativo.** Hoy hay 3.352 revisiones de IA y 27 tuyas, y el formulario de `docs/revision-nativo.md` tiene 0 de 64 casillas marcadas. Alternativa: pedir una revisión gratuita de los 18 textos propios y de las pruebas en HiNative, r/italianlearning o un intercambio. Mientras tanto, mantener la advertencia que ya muestra la app.

## Orden recomendado
1. **A1 + A3 + A2(1):** limpiar las pruebas, que el Cierre use solo reservas y aceptar varias respuestas. Es código y datos, lo puedo hacer ya. Afecta lo que mide «aprobado».
2. **A2(2):** auditoría IA de los desajustes ES↔IT en las frases de prueba.
3. **A4:** tu decisión sobre las 4 lecturas A2; después, las correcciones triviales (ficha de u08, cifra de horas, nota de `speaking.json`).
4. **A5 + interacción sin guion:** escuchas por módulo y el modo «preguntas al azar».
5. **(c) Fuentes de audio humano y textos:** investigar, y después integrar.
6. **Tu prueba en el iPhone:** dictado, audio sin conexión y uso real.

Con 1–4 hechos, A1 queda **listo como material**. Con 5, queda **listo para la escucha**. La interacción real con personas queda siempre fuera de la app (d).

## Qué no se comprobó
- No abrí la app ni escuché el audio.
- No la probé en un iPhone.
- La calidad del italiano la juzgaron dos IA sobre una muestra de unas 70 frases. No hubo un nativo.
- Las horas se calcularon con los tiempos a priori de `timing.ts` y `targets.ts`, no con uso real.

## Qué quedó resuelto (2026-11-25, misma jornada)
- **A1, resuelto:** las pruebas y reservas A1 ya no traen frases B1. Las A2 quedan solo en u58 y u67, donde la estructura enseñada está marcada A2. Hay pruebas automáticas que lo vigilan. Las frases absurdas que no detecta un filtro de temas se revisarán en la auditoría IA (A2 parte 2).
- **A2 parte 1, resuelto:** el corrector acepta las traducciones alternativas de Tatoeba (286 frases).
- **A3, resuelto:** el Cierre usa solo frases de reserva.
- **Corrección a este informe:** el corrector ya toleraba el pronombre sujeto io/tu/noi/voi, así que los falsos negativos eran menos de lo que estimó el agente.
- **A2 parte 2, resuelto:** auditoría IA de 716 frases de prueba y reserva, más las que entraron de reemplazo: 46 rechazadas, 59 con el español corregido y 1 alternativa descartada (`content/audits/2026-11-25-pruebas.json`). El corrector ahora tolera lui/lei cuando el español dice él/ella. Sigue sin ser una revisión nativa.
- **A4, resuelto (tu decisión: dejar y avisar):** las 4 lecturas A2 se quedan con un aviso visible de nivel y las fichas de u08 y u58 ya no se contradicen.
