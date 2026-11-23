# Revisión pedagógica independiente: ¿la app enseña A1 de verdad? (2026-11-23)

Quién revisa: un revisor externo y adversarial, que no construyó la app. Fue una revisión de **solo lectura**: no ejecuté la app ni la probé en un iPhone.

Qué revisé: `CLAUDE.md`, `CONTINUIDAD.md`, `docs/specs/2026-11-22-plan-maestro.md`, `docs/referencias/a1.md`, `docs/referencias.md`, `docs/curriculo-a1.md` y `docs/dudas-italiano.md`. En `web/public/content/` revisé `course.json` (las 51 unidades A1 completas: títulos, `goal_es`, `ficha_es`, `parts`, `words` y `readings`), `readings.json` (las 38 lecturas), `sentences.json`, `items_by_code.json`, `capsules.json` y `audio/index.json`. También leí `web/src/state/{steps,course,milestone,write,targets,dayplan}.ts` y las pantallas `web/src/ui/{StepScreen,NoticeStep,ReadingStep,WordsStep,CapsuleScreen,SpeakItem,DictationItem,WriteScreen,ReconstructPanel,TodayScreen,PlacementScreen,MilestoneScreen}.tsx` y `items/Write.tsx`.

Cómo conté: hice los recuentos con scripts sobre los JSON publicados y búsquedas con expresiones regulares. Son aproximados: una búsqueda puede contar de más o de menos, y lo indico cuando importa. Las oraciones de ejemplo que cito son reales y las copié del contenido.

**Datos de base medidos**
- **Curso:** 51 unidades del núcleo A1 y 1.897 oraciones distintas, con un promedio de 5,1 palabras por oración. Hay 591 palabras en las listas A1 y 10 unidades «A1+» que son opcionales.
- **Lecturas:** 38 lecturas con unas 4.200 palabras de texto italiano en total.
- **Audio:** 3.552 clips, todos con una sola voz sintética (Piper `it_IT-serena-high`). Solo hay 6 grabaciones nativas, y son de palabras sueltas.

---

## 1. Cobertura de lo que exigen PLIDA y el sillabo A1

Leyenda: ✓ = cubierto con práctica en el contenido real · ◐ = parcial (hay explicación o vocabulario, pero poca práctica o mal enfocada) · ✗ = falta.

### Funciones comunicativas
| Exigencia (SA1 Tab. 9 / PLIDA p. 7–8) | Estado | Evidencia |
|---|---|---|
| Saludar, despedirse, agradecer, registro tu/Lei | ✓ | u37 (15 palabras, ficha con tu/Lei), rd_ciao, rd_saluti. «Prego» no aparece en ninguna oración de las unidades (0). |
| Presentarse (nombre) | ✓ | u60: unas 45 oraciones con «mi chiamo / come ti chiami». |
| Datos personales: edad, procedencia, domicilio, trabajo | ◐ | «quanti anni» = 0 oraciones y «dove abiti» = 0 en las unidades; «di dove sei» = 0 en las unidades y 2 en las lecturas. Solo están en la ficha de u60 y en las lecturas rd_dovesei y rd_dati. u45 (nacionalidades) sí tiene práctica. |
| Pedir aclaraciones («non ho capito», «può ripetere», «come si dice», «più piano») | ✗ | 0 oraciones con «non ho capito» o «come si dice» en todo el contenido. La propia app la lista en `planned` como no construida («las oraciones del corpus no son de aclaración»). PLIDA la marca como competencia clave. |
| Confirmar o negar («sì, no, forse, non lo so») | ◐ | «non lo so» / «lo so» = 0 oraciones; «forse» = 3. No hay unidad. |
| Preguntar cómo se escribe o qué significa una palabra (deletrear) | ✗ | No hay unidad de alfabeto (descartada en `planned`) y «come si scrive» = 0. |
| Pedir y dar información de lugar: «dov'è…?», indicaciones de calle | ◐ | u57 tiene vocabulario y ficha correctos, pero su práctica casi no da direcciones: de unas 49 oraciones, solo 5 contienen destra/sinistra/dritto, y una de ellas es «Alza la mano sinistra». Solo la lectura rd_poste trae un diálogo real de indicaciones. |
| Pedir un bien o servicio (bar, tienda): «vorrei», «quanto costa», «il conto» | ◐ | Están u65, u35 y u42, pero el contenido no calza con el objetivo. En u65 18 de 56 oraciones son «voglio…» y la **cápsula de u65 practica solo «Voglio…»** («Voglio andare a Tokyo», «Prendo vedere i cavalli» como distractor). La práctica de u35 son casi todo frases sueltas con «tè». «quanto costa» aparece en 7 oraciones y «il conto» en 3. |
| Gustos (mi piace / mi piacciono) | ✓ | u44: unas 42 oraciones bien enfocadas. |
| Describir personas, objetos y lugares | ✓ | u41, u32, u49, u23, u24, y la lectura rd_zaino. |
| Presentar a alguien («questa è Giuditta») | ◐ | Solo en lecturas (rd_bargello); no hay práctica. |
| Situar en el tiempo, hora, días | ✓ | u40, u59, u25. |
| Pedir y conceder permiso («posso…?») | ◐ | u17 (modales): «posso» aparece en 26 oraciones, aunque no como función de permiso. |
| Invitar, aceptar y rechazar | ◐ | Solo en lecturas (rd_stasera, rd_festa, rd_poste); 7 oraciones del tipo «vuoi venire / perché non». |
| Instrucciones (apri, chiudi, vai) | ◐ | u62 trabaja solo el imperativo de «tu». No cubre la forma de Lei («giri», «vada»), que es la que se usa para dar indicaciones. |
| Hablar del tiempo atmosférico («che tempo fa?», «piove») | ◐ | u33 tiene vocabulario y ficha. «che tempo fa» = 0 oraciones y «piove» = 4. Hay una oración dudosa: «C'è caldo qui» (la norma, que la propia ficha enseña, es «fa caldo»). |
| Acciones en curso, planes y rutina | ◐ | u56 (reflexivos), u14–u16 y la ficha de stare + gerundio (u16). |
| Mensajes escritos cortos (sms, e-mail) | ✗ | No hay ninguna tarea de redactar un mensaje. «Mi propio texto» (WriteScreen) es un cuadro en blanco sin consigna. |

### Gramática
| Exigencia | Estado | Evidencia |
|---|---|---|
| Género, número y plural del sustantivo | ✓ | u54, más el artículo en cada palabra (WordsStep). |
| Artículos determinados e indeterminados | ✓ | u07, u55. |
| Adjetivos y concordancia | ✓ | u41, u32, u45. |
| Posesivos | ✓ | u01, u02. |
| Demostrativos | ✓ | u38. |
| Pronombres sujeto | ◐ | Solo de forma implícita en u13–u17; no tienen unidad propia. |
| Pronombres tónicos | ✓ | u61. |
| Pronombres objeto en expresiones fijas («lo so», «mi piace», «a lui») | ◐ | «mi piace» sí (u44); «lo so / non lo so» = 0. |
| Cuantificadores (poco, molto, tutto, niente) | ◐ | u39 cubre molto/poco/troppo/tanto. «tutto» y «niente» no se tratan aunque aparecen en las oraciones. |
| Presente regular e irregular | ✓ | u13, u14, u15, u16. |
| dovere / potere / volere | ✓ | u17. |
| «vorrei» como fórmula | ◐ | u65 existe, pero la práctica y la cápsula refuerzan «voglio» (ver arriba). |
| Passato prossimo (introducción) | ◐ | u58: solo con avere. Las lecturas ya muestran el auxiliar essere antes de enseñarlo (ver §4). |
| Preposiciones simples y articuladas | ✓/◐ | u05 (a/in), u06 (nel/sul); u05 tiene solo 27 oraciones (`KNOWN_GAPS`). |
| Hay: c'è / ci sono | ✓ | u03. |
| Negativas | ◐ | No hay unidad propia. «non» aparece en todo el contenido, y la ficha de u40 trata «non… mai». |
| Interrogativas sí/no y con partícula | ◐ | u30 (chi/dove/quando) ✓. La entonación de pregunta ✗ (en `planned`, sin audio nativo). |
| Impersonal climático (piove, nevica) | ◐ | Solo en la ficha de u33 y en 4 oraciones. |
| Reflexivos (en los libros son A1; en el sillabo, A2) | ✓ | u56, u60. |

### Léxico (SA1 Tab. 13 / temas PLIDA)
| Campo | Estado | Evidencia |
|---|---|---|
| Familia, casa, objetos, ropa, comida, animales, escuela y trabajo, cuerpo, nacionalidades, colores, tiempo libre, clima | ✓ | u21, u23, u49, u31, u22/u35, u28, u29, u27, u45, u32, u36, u33. |
| Números | ◐ | La lista de u26 tiene 18 palabras y le faltan zero, uno, sei, 14, 16–19 y 60–90 (solo están en la ficha). |
| Transportes, tiendas, salud, higiene | ◐ | Existen como unidades **opcionales A1+** (u34, u47, u43, u48) que no cuentan para el hito. Sin embargo, PLIDA pone estación, bus, taxi, farmacia y tiendas entre los dominios A1. |
| Religiones, oficinas públicas | ✗ | Descartado a propósito; para este usuario me parece razonable. |
| Mobiliario | ◐ | Dentro de u23. |

### Fonología y ortografía
| Exigencia | Estado | Evidencia |
|---|---|---|
| c/g, sc, gli, gn/z, consonantes dobles | ✓ | u18, u19, u20, u63, u64. Hay que matizarlo: solo se oyen con voz sintética y el ejercicio central es «elige cómo se escribe» con 2 opciones. |
| Entonación de afirmación y de pregunta | ✗ | En `planned`. |
| Acento tónico (sílaba tónica en las tarjetas) | ✗ | Pendiente de importar Wiktionary (CONTINUIDAD). |
| Alfabeto y deletreo | ✗ | Descartado en `planned`. |

**Resumen §1:** la gramática y el léxico del sillabo están cubiertos en buena medida. La parte que el propio sillabo considera más importante en A1, «saber hacer» tareas comunicativas, es la más débil: tiene dos ✗ en funciones clave (aclaraciones y deletreo) y varias funciones solo de nombre (direcciones, pedir en el bar, datos personales).

---

## 2. Las cuatro destrezas

| Destreza | Qué hace realmente el estudiante | Volumen aproximado en A1 | Qué falta |
|---|---|---|---|
| **Comprender al oír** | «Escucha» (6 dictados de frases sueltas + repetición); elegir entre 2 opciones tras oír la frase (`listen: true`); audio de cada oración en las lecturas. | Unos 300 dictados en todo A1 (6 × 51). El resto es audio de frases de unas 5 palabras. | **Una sola voz sintética para todo**, incluidos los diálogos de varios personajes, y 0 audio nativo de frases. No hay habla conectada ni a velocidad natural, ni ruido, acentos u otras voces. **En la lectura, el audio solo aparece al desplegar la traducción** (`ReadingStep.tsx`, línea 61: `shown.has(i) && … s.es … <SpeakButton>`), así que no se puede escuchar primero sin leer el español. No hay botón para oír el texto completo ni preguntas de comprensión sobre audio sin texto. |
| **Leer** | Una lectura por unidad (de 3 a 30 oraciones), con traducción por oración, capa de tamices y unas 5 preguntas de opción múltiple en español. | Unas 4.200 palabras en todo A1: unos 20–30 minutos de lectura real. | El volumen es muy bajo para la hebra de input de Nation. Las preguntas son de detalle literal. **El campo `speaker` de los diálogos nunca se muestra** (no aparece en `web/src`), así que hay preguntas que no se pueden responder desde el texto: rd_poste pregunta «¿Qué lugar busca la señora Winfrey?» y ese nombre no aparece en pantalla; en rd_ciao, «¿Cómo se llama quien responde?» exige deducir los turnos. Faltan los textos de tipo PLIDA (menús, carteles, horarios, anuncios, sms). |
| **Escribir** | Traducción ES→IT de frases completas (una por oración en la práctica; 6 en la prueba); huecos; reconstruir de memoria (pestaña Escribir); texto libre con detector de 8 patrones y encargo para una IA externa. | Unas 1.900 frases traducibles. Escribir frases sí es abundante. | No hay **tareas comunicativas escritas**: completar un formulario con datos, escribir un sms para quedar, una postal, presentarse en 5 líneas. La corrección compara con **una sola** respuesta de Tatoeba y el botón «Mi versión también es correcta» está activo **también en la prueba de unidad** (`Write.tsx`, `allowOverride` = true por defecto), así que la nota la decide el propio estudiante. |
| **Hablar** | Repetir en voz alta (shadowing), grabarse y autoevaluarse con «Bien / Casi / Otra vez»; comprobar con el dictado del teclado si el teléfono te entiende (opcional, plegado). | Unas 8 frases por unidad. | **No hay ninguna tarea de producción oral propia ni de interacción.** No existen el rol, el monólogo cronometrado ni el guion para la IA de voz que pide el plan maestro (busqué «monólogo / guion / role» en `web/src` y no aparecen). Todo lo oral es repetir un modelo sintético. |

**¿Puede alguien, tras usar la app, hacer estas tareas?**
- **Presentarse:** en parte. Sabe «mi chiamo», «sono cileno» y «ho … anni» (por u04 y u13). No ha practicado preguntar ni responder «quanti anni hai / dove abiti / che lavoro fai», ni en una interacción ni oralmente.
- **Pedir un café:** probablemente dirá «vorrei un caffè» porque está en la ficha de u35 y u65, pero la práctica empujó hacia «voglio». No ha practicado el intercambio completo (saludar → pedir → «altro?» → «quanto pago?» → pagar → despedirse) ni lo ha oído con voz real.
- **Preguntar una dirección:** reconocerá destra, sinistra y dritto, y oyó el diálogo rd_poste. No ha producido «scusi, dov'è…?» en contexto ni entendido instrucciones sin texto escrito. Sin la forma de Lei («giri», «vada») que se usa en la calle, entender la respuesta será frágil.
- **Decir que no entendió y pedir que repitan:** no; la app no lo enseña.

---

## 3. Calidad del método frente a la evidencia

**Lo que está bien hecho**
- **Práctica de recuperación:** casi todo exige recordar o producir, no releer. La práctica va de elegir a completar huecos, a ordenar y a traducir ES→IT (`steps.ts`, `ORDER`).
- **Repetición espaciada:** FSRS con tarjetas por palabra (dirección ES→IT y con artículo), por punto gramatical y para errores corregidos por la IA (`writing_fix`). Además tiene la calibración por tamiz (cognado / opaca / falso amigo). Es sólida.
- **Interleaving:** el repaso rellena con ítems de unidades ya completadas (`session.ts`, `filler`). Dentro de cada unidad la práctica es en bloque (un solo código), lo que está bien para adquirir pero no para discriminar.
- **Foco en la forma contrastivo:** las fichas son claras, correctas en lo que revisé y bien dirigidas a calcos reales del hispanohablante (u01, u03, u05, u06, u54, u61). Las tarjetas «Fíjate» de Descubre aplican bien la Noticing Hypothesis.
- **Honestidad:** la app declara la IA, la voz sintética y la falta de revisión nativa. Mide minutos reales por hebra en lugar de inventarlos.
- La reconstrucción de memoria con diferencias es una buena técnica de salida que no necesita IA.

**Lo que es débil**
- **Producción comunicativa (Swain):** la salida consiste en traducir frases descontextualizadas. No hay que expresar significados propios con una necesidad comunicativa.
- **Retroalimentación:** la corrección es binaria contra una sola referencia. Además hay 371 traducciones hechas por LLM y la autoaprobación está permitida en la prueba. El estudiante ve qué está mal, pero el motivo es la ficha genérica de la unidad, no una explicación del error concreto.
- **Input comprensible:** el input es poco (unas 4.200 palabras) y fragmentado (oraciones de Tatoeba de 5 palabras sin relación entre sí). Las oraciones de Tatoeba tienen temas erráticos: «Questo mese ci sono stati due omicidi» aparece en u18, la primera unidad.
- **Variedad de voces:** ninguna. Una voz sintética para 3.552 clips. Para la percepción de geminadas y la comprensión auditiva real, este es el punto más débil frente a la evidencia.
- **Distractores:** siguen siendo de 2 opciones (50 % de acierto adivinando) e incluyen algunos que el plan maestro dijo eliminar: «Io pensiamo a te», «Io amiamo l'amore» (ERR_PRESENT_ARE). Algunos no tienen sentido, como «Prendo vedere i cavalli». En ERR_VOC_VORREI el ítem «Vorrei andare con te» figura como opción incorrecta: solo se distingue por el audio, y la frase es italiano correcto.
- **Evaluación:** el examen de hito son 40 ítems `choice_l1_distractor` de 2 opciones, solo de reconocimiento (`milestone.ts`, línea 21). La ubicación también son ítems de 2 opciones (`PlacementScreen.tsx`). La prueba de unidad son 6 frases (el plan pide ≥12) con autoaprobación posible. Ninguna evaluación mide comprensión auditiva de discurso, lectura de un texto no visto, escritura de un mensaje ni habla. Esto contradice el propio plan: «examen de hito con las cuatro destrezas» y «sin preguntas de 2 opciones».
- **Fluidez (cuarta hebra):** no hay actividad de fluidez propiamente tal, es decir, material ya dominado a velocidad creciente o una relectura cronometrada. Lo más cercano es el shadowing.

---

## 4. Problemas de secuencia

1. **Las primeras 5 unidades son solo de sonidos** (u18, u19, u20, u63, u64): unas 5 horas a unos 60 minutos por unidad antes de aprender «ciao» (u37 es la 6.ª). Además, las oraciones de esas unidades se eligieron porque contienen una letra, no por su nivel ni por su tema. **La prueba de u18, que es lo primero que hace un principiante absoluto, le pide escribir en italiano desde el español:** «È il più diligente dei due», «È difficile comprendere la sua teoria», «Io non voglio pensarci», «Posso farcela senza questo». Eso incluye el clítico «ci» y «farcela», que son de nivel B1. Con un 80 % exigido, el primer día un principiante solo puede aprobar con la autoaprobación. Es el problema de carga cognitiva más grave del primer día.
2. **Los verbos regulares (u14) llegan en la posición 24 de 51.** Antes vienen posesivos, demostrativos, cuantificadores y «tenere/avere». Durante 23 unidades el estudiante no puede decir «abito», «lavoro», «studio», «parlo», que son la base para hablar de sí mismo. Piacere! y Leggiamo los introducen en los capítulos 2–4.
3. **Hay lecturas por encima de la gramática enseñada:**
   - rd_routine (en u55, posición 11) está llena de reflexivos («mi sveglio», «mi rado», «ti trucchi») que se enseñan en u56 (posición 32).
   - rd_giornatabrutta (nivel A2, en u56) es passato prossimo con essere y reflexivos («mi sono svegliato», «sono uscito») antes de u58, y el auxiliar essere está en A2 (u08).
   - rd_ristorante (en u22, posición 40) narra en passato prossimo («ha incontrato», «li hanno letti»).
   - rd_zaino (en u13) usa «nello zaino ci sono», antes de u03 y u06.

   Con traducción esto se puede tolerar como input, pero rd_giornatabrutta es claramente de otro nivel.
4. **u07 usa rd_medici** (parentescos de los Medici, «nipoti», «zii») antes de la unidad de familia (u21).
5. **Fugas de nivel en las oraciones:** son pocas gracias al prefiltro. Conté unas 38 oraciones con participio antes de u58, algunas falsas alarmas (participios usados como adjetivos), por ejemplo «Mi sono alzato presto come al solito» en u06 o «Ci sono stati molti omicidi l'anno scorso» en u18.
6. **Lo que sí está bien ordenado:** artículos → sustantivos → adjetivos, posesivos junto a familia, c'è junto a casa, a/in y nel/sul junto a ciudad, gustos antes del bar. La lógica de pegar cada calco a la unidad donde aparece su estructura es buena.

---

## 5. Los 10 mayores riesgos o vacíos (de mayor a menor impacto)

| # | Riesgo o vacío | Acción concreta | Esfuerzo |
|---|---|---|---|
| 1 | **No hay producción oral ni interacción.** Un A1 se define por interactuar de forma simple, y la app solo hace repetir frases sintéticas con autoevaluación. | Añadir a cada unidad funcional (u37, u60, u45, u57, u35/u65, u42, u33) una «tarea hablada»: guion de rol con turnos (pedir un café, presentarse, preguntar el camino), grabarse respondiendo a la parte del otro personaje, comparar con el modelo, y copiar un encargo para el modo de voz de una IA gratuita, con registro de minutos. | Medio |
| 2 | **Funciones clave ausentes:** pedir aclaraciones, deletrear, «non lo so», «che tempo fa», datos personales en pregunta y respuesta. | Construir 3–4 unidades funcionales con diálogos tomados de Piacere!/Leggiamo/Tutt* a tavola (no de Tatoeba): aclaraciones, alfabeto y deletreo, datos personales, tiempo atmosférico. Ejercicios hechos a mano y marcados `needs_review`. | Alto (contenido italiano por verificar) |
| 3 | **La práctica no calza con el objetivo de la unidad,** porque las oraciones se eligen por palabra clave. Pasa en u65 (cápsula 100 % «voglio»), u57 (casi sin direcciones), u35 (frases con «tè»), u18 (oraciones al azar). | Añadir una prueba automática: «≥60 % de las oraciones de práctica, prueba y cápsula contienen la forma objetivo». Revisar a mano las unidades que fallen, empezando por u65, u57, u35 y u33. En u65, sacar «voglio» de la cápsula. | Medio |
| 4 | **La comprensión auditiva es pobre:** una voz sintética, sin diálogos a varias voces, y el audio de la lectura atado a la traducción. | (a) Separar el botón de audio de la traducción en ReadingStep y añadir «Escuchar todo» antes de leer. (b) Usar una segunda voz Piper italiana (verificar cuáles hay y su licencia) para los turnos según `speaker`. (c) En la Biblioteca, tareas de escucha nativa por unidad (p. ej. Easy Italian) con preguntas. | Bajo (a), medio (b, c) |
| 5 | **La evaluación no mide A1:** el hito son 40 ítems de 2 opciones; la prueba de unidad son 6 frases con autoaprobación. | El hito debería tener 4 partes: lectura de un texto no visto, dictado o escucha, 12 frases ES→IT sin autoaprobación, y una tarea oral grabada con rúbrica de autoevaluación. En la prueba de unidad, desactivar «Mi versión también es correcta» o hacer que cuente como medio punto, y llegar a ≥12 frases (lo que dice el plan). | Medio |
| 6 | **Primer día y secuencia inicial:** 5 unidades de sonidos con pruebas de nivel B1 antes de saludar, y verbos regulares en la posición 24. | Reordenar: u37 → u60 → u13 → u26 → u55/u07 → u14 al principio, e intercalar una unidad de sonidos cada 4–5 unidades. Limitar las oraciones de las unidades de sonidos (y sobre todo sus pruebas) a ≤7 palabras y solo con gramática ya vista o transparente. | Bajo (orden), medio (filtro) |
| 7 | **Defectos en las lecturas:** el hablante no se muestra, hay preguntas imposibles y hay lecturas fuera de nivel. | Mostrar `speaker` en ReadingStep (el dato ya existe en 315 de 521 oraciones). Revisar las preguntas que dependen del turno. Mover rd_giornatabrutta a A2 y rd_routine a u56. | Bajo |
| 8 | **Muy poco input comprensible y nada de fluidez:** unas 4.200 palabras de lectura en todo A1. | Añadir 1–2 textos o diálogos más por unidad desde los libros abiertos. Añadir un paso de «fluidez»: releer y reescuchar el texto de unidades anteriores a velocidad normal, con tiempo. Incluir textos de tipo PLIDA (menú, cartel, horario, sms). | Medio–alto |
| 9 | **La retroalimentación de escritura es frágil:** una sola referencia, 371 traducciones por LLM y autoaprobación. El estudiante puede «aprender» a aprobarse solo. | Aceptar varias respuestas (Tatoeba tiene a menudo varias traducciones italianas de la misma frase en español; enlazarlas). Mostrar qué parte del error corresponde al punto de la unidad. Registrar cuántas veces se usa la autoaprobación y mostrarlo en «Tu semana». | Medio |
| 10 | **Siguen ítems de baja calidad:** elección de 2 opciones (50 % adivinando), distractores de persona que nadie comete («Io pensiamo»), distractores absurdos («Prendo vedere i cavalli»), oraciones dudosas («C'è caldo qui») y ninguna verificación nativa. | Filtrar `distractor_kind` en los códigos de presente, pasar a 3–4 opciones con calcos reales y anotar las dudas en `docs/dudas-italiano.md`. A mediano plazo, una revisión nativa por muestreo (p. ej. un intercambio en LangCorrect o Tandem) de las 51 pruebas de unidad. | Bajo–medio |

Otros vacíos menores:
- La lista de números está incompleta (u26).
- Transportes, tiendas y salud son opcionales (A1+) aunque PLIDA los pide en A1.
- Falta la sílaba tónica en las tarjetas.
- Hay una contradicción documental: `docs/dudas-italiano.md` (punto 8) dice que «avere fame» no es un calco del español, pero u04 está construida sobre ese supuesto calco («tengo fame»). Puede ser un error real de hispanohablantes, pero no está documentado con fuente; lo dejo como duda.

---

## 6. Veredicto

**Parcialmente.** La app cubre bien la gramática y el léxico del sillabo A1 con un foco contrastivo de calidad, práctica de recuperación y repetición espaciada. Pero no entrena las funciones comunicativas e interactivas que definen el A1: pedir aclaraciones, preguntar y entender una dirección, completar una compra o pedir en el bar, conversar. Tampoco la comprensión auditiva con voces reales, y no lo evalúa con producción. Alguien que la termine reconocerá y escribirá frases A1, pero lo más probable es que aún no pueda sostener una conversación sencilla.

### Qué no comprobé
- No ejecuté la app ni la recorrí en pantalla.
- No escuché el audio.
- No revisé una por una las 1.897 oraciones ni las 38 lecturas completas: muestreé unas 9 lecturas y unas 10 unidades a fondo.
- Los recuentos con expresiones regulares son aproximados.
- La corrección del italiano de las fichas la juzgo como no nativo.
