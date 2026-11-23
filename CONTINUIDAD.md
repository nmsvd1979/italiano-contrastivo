# CONTINUIDAD

Registro de avances. Lo más reciente arriba.

## 2026-11-23 (7) — Bloque 3 (parte): tercer distractor, fluidez y revisión nativa
**Hecho:**
1. **Distractores:** las elecciones con 2 opciones bajaron de 2.570 a 1.100 (ahora 2.681 tienen 3). Tercera opción: otra persona del mismo verbo (presente), otra palabra del tema (vocabulario, se distingue por audio) u otra grafía imposible (sonidos). Los códigos sin generador (chiamarsi, piacere, riflessivo, tenere, artículos, género…) siguen con 2: son errores de una sola forma.
2. **Fluidez** (en «Hablar»): tres pasadas de una lectura de una unidad ya completada, a ×0,8, ×1 y ×1,15, la última sin texto; suma a la hebra «Fluidez».
3. **Revisión nativa:** `pipeline/review/native.py` + `scripts/revision_nativo_aplicar.py` leen `docs/revision-nativo.md` ya marcado (✅/✏️/❌), miden la **tasa de error real por origen (IA/Tatoeba)** y con `--registrar` guardan `reviewer="native"`. El documento se regeneró (100 oraciones). Hoy no hay ninguna marca: **la tasa de error real del contenido sigue sin medirse**.
**No hecho:** segunda voz Piper (hay que descargar un modelo: pendiente de tu permiso, y verificar su licencia); textos tipo PLIDA (menú, cartel, horario, sms): no hay fuente abierta verificada y no se inventan.
**Pruebas:** Python 1240 y web 890 en verde; pantalla vista a 375 px (estado vacío de fluidez). **No se probó** el audio acelerado en iPhone.

## 2026-11-23 (6) — Bloque 2: habla guiada, hito de cuatro partes y números que faltaban
**Hecho:**
1. **Números:** 27 oraciones nuevas (13, 15, 16, 18, 20, 30, 40, 50; auditoría IA, no nativo) y `sedici`/`diciotto` agregados al vocabulario. Medido: ahora aparecen 13, 15, 20, 30, 40, 50 (2–6 veces). **Sigue en 0: *diciannove*** (en la base solo hay «diciannovesimo»).
2. **Pestaña «Hablar»** (`#/hablar`, 6.ª pestaña): 8 **juegos de roles** sobre diálogos de libros abiertos ya en las lecturas (saludar con Lei/tu, presentarte, datos personales, boletería, **direcciones con Lei**, hotel, planes, pedir de beber): la app dice una voz con audio y tú respondes la otra viendo solo el español, te grabas (el audio no sale del teléfono), ves el modelo y te autoevalúas. 5 **tareas orales** con las preguntas de *Piacere!* (Conversazione: Mi presento, Descrizioni, La famiglia e la casa, La mia settimana, La mia città ideale), con rúbrica y **encargo copiable para el modo de voz de una IA gratuita**. **Alfabeto** con el nombre de las 21 letras de la tabla del libro y deletreo de tu nombre. **Frases de supervivencia** del libro (*Come si dice…?*, *Cosa vuol dire…?*, *Come si scrive?*, *Scusi*, *Mi dispiace*…). Todo suma tiempo a «Escribir y hablar».
3. **Hito A1 de cuatro partes:** 40 de reconocimiento + **12 frases escritas desde el español (sin «mi versión también es correcta»)** + **6 dictados** + **tarea oral autoevaluada** con rúbrica (hay que cumplir la mitad). Cada parte exige ≥50 %.
**Fuentes y honestidad:** el italiano nuevo sale de *Piacere!* (CC BY-NC-SA, leído en el navegador porque el lector automático recibe 403) y de diálogos ya presentes; se corrigió la errata «Quani»→«Quanti» y se omitieron preguntas dudosas, declarado en cada tarea. Traducciones y rúbricas: IA. **«Può ripetere?» y «Non capisco» no están en el libro: no se incluyeron** (los cubre la Biblioteca).
**No cubierto (sigue pendiente):** un diálogo propio de bar completo (café, *Quant'è?*) y de **tiempo atmosférico** (no se encontró fuente accesible), lectura de un texto no visto dentro del hito, segunda voz para los diálogos (hoy todas las voces son la misma), y verificación por un nativo.
**Pruebas:** Python 1233 y web 888 en verde; recorrido a 375 px del juego de roles en el navegador. **No se probó** en iPhone (grabación, micrófono, audio) ni se escucharon los audios nuevos; `tsc` no disponible.
**Siguiente:** probar Hablar en el iPhone; completar bar y tiempo con fuente; Bloque 3 (segunda voz, fluidez, textos tipo PLIDA, distractores de 3–4 opciones).

## 2026-11-23 (5) — Bloque 1 de la auditoría de A1 (arreglos rápidos)
**Hecho (sin prueba de nivel inicial en la app, por decisión del usuario; la ubicación solo sirve para saltar unidades que ya sabes):**
1. Ruta de A1 reordenada: saludar y presentarte primero, verbos regulares en la posición 11, sonidos intercalados cada 4–8 unidades.
2. Unidades de sonidos y primer día: frases de ≤7 palabras, sin enclíticos (*pensarci*), sin passato con *essere* ni gramática futura; sin repaso de falsos amigos hasta completar dos unidades.
3. Lecturas: se ve quién habla, «Escuchar todo» sin traducción y cuatro lecturas pasan a su unidad.
4. Prueba de unidad: un solo comodín de autoaprobación, 8 frases en unidades grandes; la ubicación exige 4 aciertos por unidad.
5. u65 sin «voglio»; tope de 12 oraciones por palabra en vocabulario (`balance_by_word`) con pruebas que lo vigilan.
6. Huecos de contenido: 275 oraciones nuevas (meses, números, personas tu/noi/voi/loro) auditadas por IA (`reviewer="llm-audit"`, **no** por un nativo), 292 audios nuevos con Piper, 17 tamices nuevos. `scripts/gap_pack.py` elige candidatos por palabra objetivo.
**Medido tras el cambio:** los 12 meses aparecen (1–8 veces cada uno); tu/noi/voi/loro 60–87 veces. **Sigue faltando:** 13, 15, 16, 19, 20, 30, 40 y 50 no aparecen en ninguna oración.
**Costos declarados:** `KNOWN_GAPS` ahora incluye u19, u20, u39, u35, u65, u42 (bajo 30 oraciones: escasez real en Tatoeba); u47 pasó a «planificada»; u65 tiene 18 oraciones; el audio pesa ≈35 MB.
**Pruebas:** Python 1225 y web 871 en verde. No se corrió `tsc` ni se probó en iPhone ni se escucharon los audios nuevos.
**Siguiente:** Bloque 2 (unidades funcionales con diálogos de libros abiertos: aclaraciones, deletreo, datos personales, hora, direcciones, bar; tareas orales; hito de 4 destrezas) y completar los números faltantes.

## 2026-11-23 (4) — Auditoría de cobertura de A1 (veredicto: «parcialmente»)
Informe en `docs/auditoria-cobertura-a1.md` (+ revisión independiente de IA en `docs/auditoria-a1-revisor-independiente.md`). Cubre gramática y léxico; **no cubre las funciones comunicativas** (aclaraciones, datos personales, direcciones, pedir en el bar), ni producción oral, ni evalúa con las cuatro destrezas. Hallazgos medidos: faltan 7 meses, números 14/17/19/60–90, el verbo *dire*, *lavorare/mettere/partire/pensare/credere*, y las personas tu/noi/voi casi no se practican; las 5 primeras unidades son solo de sonidos; el primer «Hoy» propone repaso de falsos amigos sin haber estudiado; el campo `speaker` de los diálogos no se muestra; la cápsula de u65 practica «voglio». Plan en 3 bloques (arreglos rápidos → funciones y habla → calidad) dentro del informe. **Siguiente:** el usuario elige por dónde empezar (recomendado: Bloque 1).

## 2026-11-23 (3) — Fase 4: Biblioteca de recursos externos
**Hecho:** nueva pestaña «Biblioteca» (`#/biblioteca`, 5.ª pestaña) con **23 recursos externos verificados el 2026-11-23**, filtrables por nivel (por defecto el de tu unidad actual) y tipo. Cada uno trae qué es, idioma en que explica, costo, una **tarea de 10 minutos**, una advertencia honesta y un botón «Registrar el tiempo que le dediqué» (5/10/20/30 min) que suma a la hebra que corresponde en «Tu semana» (entender/estudiar la lengua/fluidez). Enlaces siempre `target=_blank rel=noopener`. Datos en `web/public/content/library.json` (a mano; la tubería no lo toca); «Tu semana» enlaza a la Biblioteca.
**Cómo se verificó:** 3 subagentes con acceso web + yo con el navegador integrado (sin simular un navegador: WordReference, Forvo y Reverso bloquean lectores automáticos y los abrí como lo haría una persona). **Excluí** lo que no pude verificar: Coffee Break Italian (niveles no confirmados), Italiano Automatico (cursos de pago), Learn Italian with Lucrezia (sin URL oficial), Le giornate italiane, italiana.esteri.it (no abrió) y CILS (la página de ejemplos devolvió error 500). RaiPlay/RaiPlay Sound responden, pero el video puede estar bloqueado fuera de Italia: va con advertencia (no verificado desde Chile).
**Límites:** los niveles recomendados y las tareas son criterio mío (no un dato del sitio); los sitios cambian (la pantalla muestra la fecha de verificación); no revisé la calidad del italiano de cada recurso; los libros abiertos están en inglés.
**Verificado:** web 872 pruebas (datos válidos, nivel por defecto, filtros, registro de minutos), app construida (precache 6,9 MB) y recorrido a 375 px (5 pestañas caben). **No verificado:** en iPhone.
**Siguiente (decide el usuario):** Fase 5 (construir A2) o cerrar pendientes (oraciones nuevas para u07/u02/u05, Wiktionary para acento tónico).

## 2026-11-23 (2) — Fase 3: capa de tamices dentro de las lecturas
**Hecho:** en el paso «Lectura», la casilla «Ver el parentesco con el español (tamices)» convierte cada frase en palabras tocables coloreadas (verde = se parece al español, punteada = cambio regular, sombreada = opaca); al tocar una se ve su glosa en contexto, el tamiz, la regla y, si aplica, la nota de falso amigo; «Traducción» muestra la frase. Glosario de las **1.105 palabras distintas de las 38 lecturas** en `pipeline/vocab/reading_words.json` (la tubería lo copia al paquete y FALLA si una lectura trae una palabra sin glosa): 482 transparentes, 174 regulares, 449 opacas, 24 falsos amigos.
**Cómo se hizo (límites):** 6 subagentes de IA glosaron y clasificaron cada palabra con su frase de contexto y una lista cerrada de reglas; yo revisé una muestra de 35 (sin errores graves; hay notas imprecisas, p. ej. «trucco» o «costa» como falso amigo es discutible). **No es verificación de un nativo ni de un diccionario.** Los falsos amigos de las lecturas que no están en el catálogo del cuaderno NO tienen fuente propia.
**Verificado:** web 867 y Python 1.222 pruebas; app construida (precache 6,9 MB de 9); recorrido a 375 px (la palabra «studentessa» muestra «estudiante (mujer) · cambio regular… e- protética»). **No verificado:** en iPhone.
**Falta de la Fase 3:** importar Wiktionary para el acento tónico y conjugaciones; revisar con una fuente los falsos amigos y glosas dudosos.

## 2026-11-23 — Fase 3: vocabulario por tamices y repaso español → italiano
**Hecho:**
- **Tamices de las 752 palabras distintas (795 entradas):** cada palabra es *transparente* (se parece al español; 288), *regular* (cambio regular con su regla, p. ej. «ch → tt (noche → notte)»; 192) u *opaca* (hay que aprenderla; 315), más 9 falsos amigos (los 7 del catálogo + `bugia` y `vasca` que marcó la IA, sin fuente: revisar). Datos en `pipeline/vocab/sieves.json`; en el curso cada palabra trae `sieve`, `rule`, `note`. En «Palabras» se ve el chip de cada palabra (las opacas destacadas).
- **Calibración FSRS por tipo** (la que el diseño original pedía y no se usaba): transparente/regular → tarjeta «cognado» (ΔD −1,5, γs 1,8: intervalos más largos), opaca → neutral, falso amigo → «falso amigo» (intervalos cortos). Solo para tarjetas NUEVAS; las ya creadas siguen «neutral».
- **Repaso de palabras en dirección español → italiano (`WordRecall`):** ves la glosa y escribes la palabra CON artículo («il latte»); sin artículo o con acento mal = «difícil», con el artículo equivocado = fallo (es la trampa de género), y «mi respuesta también es válida» para sinónimos. Los falsos amigos del catálogo siguen en la dirección italiano → español.
**Cómo se clasificó (límite importante):** 4 subagentes de IA, con una lista cerrada de reglas, y yo muestreé ~70 palabras (vi pocos errores, p. ej. «chi/che» como «otro» es discutible). **No es verificación de un hablante nativo ni de un diccionario etimológico.** La lista de falsos amigos del catálogo manda; los 2 extra de la IA (`bugia`, `vasca`) no tienen fuente en el cuaderno.
**Verificado:** web 865 y Python 1.220 pruebas (con la base real), app construida, y recorrido en el navegador a 375 px (chips en Palabras; repaso «Escribe en italiano: «la boca»»). **No verificado:** en iPhone; ni cuánto cuesta escribir con artículo en el repaso real.
**Falta de la Fase 3:** capas de tamices al tocar una palabra dentro de las LECTURAS (hoy los chips solo están en «Palabras»), importar Wiktionary para acento tónico y conjugaciones, y clasificar las palabras de las lecturas (no solo las de las listas).

## 2026-11-22 (noche, 8) — Errores corregidos por IA → repaso espaciado
**Pregunta del usuario: ¿el cambio de unidad se mide por contenido o por tiempo?** Ya es por contenido: una unidad se completa aprobando la prueba escrita (≥80 %, `applyTest` en `course.ts`) y sus pasos van en orden; ningún paso exige haber estudiado X minutos. El tiempo solo dimensiona cuántos ítems trae cada paso y se muestra como estimación; lo medido va en «Tu semana». Si algún día se cambia el relleno, será por contenido (p. ej. práctica hasta N aciertos seguidos) y con datos.
**Hecho:** en «Mi propio texto → Pedir corrección», al pegar la respuesta de la IA aparece «Guardar N correcciones para repasarlas». Cada oración corregida se vuelve una tarjeta de repaso espaciado (FSRS) con un hueco con lo que cambió y de pista lo que habías escrito («Antes escribiste: «ho»»); si solo sobraba una palabra (p. ej. «a» personal), se elige entre la versión correcta y la escrita. `web/src/state/fixes.ts`; esquema `card.schema.json` con subject `writing_fix` y `payload` (tipos TS y Python regenerados); el ejercicio viaja dentro de la tarjeta, así entra solo a la copia de seguridad. Máximo 6 por corrección; no se duplican.
**Verificado:** web 858 y Python 818 pruebas en verde (incluye guardar → aparecer en el repaso → calificar → FSRS); la app se construye. **No verificado:** mirarlo en pantalla (solo prueba automática de interfaz) ni con una corrección real de una IA.
**Nota del usuario:** la IA no será su método principal de corrección; esta función es un complemento (por eso es mínima).

## 2026-11-22 (noche, 7) — Tiempo real por hebra («Tu semana») en lugar de reformar el relleno
**Decisión (mía, a explicar):** no reformé el «relleno por minutos» todavía. Rellenar cada paso hasta un tiempo objetivo repite la misma oración en varios formatos (práctica de recuperación, no solo relleno); lo dañino era *afirmar* «62 min por unidad = 50 h» con tiempos supuestos. Cambiarlo sin datos de uso real sería otra suposición. Primero se mide.
**Hecho:**
- La app registra el **tiempo activo real** (pantalla visible y tocada en los últimos 2 min) por hebra de Nation y por día: `web/src/state/strands.ts` y `web/src/ui/kit/useStrandTimer.ts`; mapa de pasos: descubre/palabras/cápsula/práctica = estudiar la lengua; lectura = entender; escucha = fluidez; prueba y pestaña Escribir = escribir y hablar; repaso = estudiar la lengua. Se guarda en el día (`DayProgress.seconds`); las copias de seguridad existentes siguen valiendo.
- **Hoy → «Tu semana»** (`WeekCard`): minutos por hebra en 7 días y cuál trabajas menos, con la salvedad de que la guía de reparto es orientativa y de que entender y fluidez se completan fuera de la app.
- Ruta: «≈ X de pasos según tiempos supuestos…» y las horas de referencia ahora se dicen «de blogs de academias, no un dato medido». «Cómo empezar» ya no dice «5 pasos».
- **Retirado** el criterio de cierre «minutos estimados ≥ 90 % del objetivo» (el test «aprobaba» por construcción): `cierreA1.test.ts` y `docs/plan-cierre-a1.md`.
**Verificado:** 851 pruebas web; en el navegador, tras ≈10 s en Escribir apareció «Escribir y hablar <1 min» en Hoy. **No verificado:** el conteo con uso real largo (si el límite de 2 min de inactividad es adecuado para leer), ni en el iPhone.
**Cuándo reformar el relleno:** tras ≈2 semanas de uso, comparar los minutos medidos con los estimados (valores a priori en `timing.ts`) y decidir con datos.
**Siguiente:** más percepción con voces nativas, registro de errores de la IA al repaso, y luego la Fase 3 (vocabulario por tamices).

## 2026-11-22 (noche, 6) — Dato del usuario: el reconocimiento del navegador da «aborted»
El usuario probó el botón 🎙 (reconocimiento propio de Safari) en su iPhone y salió `aborted` muchas veces. Causas posibles (sin confirmar): el audio del modelo sonando al iniciar, un reconocimiento anterior sin abortar (mi código no lo hacía: corregido), o que la app instalada (modo standalone) no mantiene el micrófono para esa API. La prueba nueva aborta lo anterior y detiene el audio antes de escuchar, y el mensaje de `aborted` sugiere repetirla abriendo la página en Safari sin instalar. Hasta que se confirme, el reconocimiento del navegador NO es una opción fiable en ese teléfono; no cambia la decisión (el dictado del teclado cubre la comprensibilidad).

## 2026-11-22 (noche, 5) — Resultado del dictado y decisión sobre el habla
**Resultado (iPhone, iOS 18, app instalada):** teclado: 8 de 10 frases exactas (fallaron «Forse non è giovane»→«Giovanni» y «È carne di scimmia»→«I carni di skin mia», justo sonidos g/sc que la app enseña); pares simple/doble: 4 fieles y 2 confundidos («il nono»→«il nonno», «una pala»→«una palla»). El reconocimiento del navegador existe pero no se probó.
**Decisión:** el dictado sirve para saber si te entienden, no para corregir consonantes dobles. Se agregó a «escuchar y repetir» un bloque plegable «¿Te entiende el teléfono?» (dictas, comparas y ves qué palabras no aparecieron), con el límite dicho en pantalla. Whisper en navegador queda descartado por ahora. Las geminadas se trabajan con percepción (pares mínimos con audio) y *shadowing*. Muestra pequeña (una persona, 16 ejercicios): indicio, no prueba definitiva.
**Siguiente:** reemplazar el relleno por minutos y migrar las unidades al ciclo de cuatro hebras; percepción con más voces nativas; registro de errores de la IA al repaso.

## 2026-11-22 (noche, 4) — Prueba técnica del dictado (resultado arriba)
**Hecho:** pantalla `#/prueba-dictado` (enlace en Ajustes). Mide dos cosas con 16 ejercicios (10 frases de las unidades de sonidos y 6 pares simple/doble: «il nonno / il nono», «una palla / una pala», «la penna / la pena», en las dos direcciones): (1) si el dictado del teclado del iPhone entiende frases en italiano; (2) si distingue consonante simple de doble o la «corrige» hacia la palabra más probable. Si el navegador ofrece reconocimiento de voz propio (`webkitSpeechRecognition`), un botón 🎙 lo prueba aparte. Al final da un veredicto por método y «Copiar resultados». Lógica en `web/src/state/dictationTest.ts`.

**Decisión que depende del resultado:** si entiende frases Y distingue simple/doble → se construye «habla» con el dictado como comprobador; si solo entiende frases → sirve para saber si te entienden, no para corregir geminadas, y la pronunciación se trabaja con percepción + *shadowing* + comparación con audio nativo; si no entiende → el habla se hace fuera de la app (guion para IA con voz) y la app solo registra minutos.

**Verificado:** 843 pruebas web en verde; recorrido en el navegador a 375 px. **No verificado:** todo lo del iPhone (es el objetivo de la prueba). Para probar en el iPhone hay que publicar la app (subir `main` a GitHub despliega por Pages): pendiente de OK del usuario.

## 2026-11-22 (noche, 3) — Fase 2: reconstruir de memoria y pedir corrección
**Hecho (pestaña «Escribir», ahora con dos modos):**
- **Reconstruir un texto:** eliges una de las 38 lecturas, lees y escuchas un fragmento de 3 frases, lo tapas y lo escribes de memoria; la app compara en orden (`web/src/state/align.ts`, subsecuencia común más larga, con acentos) y dice «recuperaste X de Y palabras», marcando lo que faltó y lo que sobró. Sin IA ni servidor.
- **Mi propio texto → Pedir corrección:** además de la revisión local de 8 patrones, la app arma un encargo (nivel, «corrige solo errores», explica el calco, di si dudas, termina con «TEXTO CORREGIDO:») para pegar en Claude/ChatGPT/Gemini gratuitos (`web/src/state/correctionPrompt.ts`); al pegar la respuesta muestra qué cambió.
- Arreglo de diseño: el botón principal quedaba tapado por la barra de pestañas (`above-tabs`).

**Verificado:** web 837 pruebas en verde, app construida y recorrida a 375 px (reconstruir con resultado; panel de corrección hasta el cuadro de pegado). **No verificado:** el flujo completo con una IA real (que respete la marca «TEXTO CORREGIDO:» y el nivel), el botón de copiar en iOS, y si 3 frases es el tamaño adecuado de fragmento.

**No hecho aún:** que los errores que señala la IA entren al repaso espaciado (hoy solo se ven en pantalla; exige un tipo de tarjeta nuevo en el esquema). Tampoco se registran los minutos de este modo.

**Siguiente (Fase 2):** dictado del iPhone como comprobador de pronunciación (primero una prueba técnica en tu teléfono), reemplazar el relleno por minutos y migrar las unidades al ciclo de cuatro hebras.

## 2026-11-22 (noche, 2) — Fase 2, primer paso: «Escribe en italiano»
**Hecho:** nuevo ejercicio que muestra la frase en español y se escribe en italiano (`web/src/ui/items/Write.tsx`, corrección en `web/src/state/write.ts`). Se corrige comparando con la traducción guardada y tolera mayúsculas, puntuación, apóstrofo con espacio y el pronombre io/tu/noi/voi; NO perdona acentos (avisa «solo falta el acento»). Como la respuesta guardada es una de varias posibles, el botón «Mi versión también es correcta» deja que decidas tú.
- **Prueba de unidad = 6 frases escritas** (antes 10 ítems de elección/hueco/orden con 2 opciones); ≈5 min; sigue pasando con ≥80 %. Ubicación y examen de hito siguen con reconocimiento (`recognitionItems`).
- **La práctica** suma una versión escrita por oración.
- **Arreglo de un error latente:** las 497 frases de traducir derivadas de las lecturas podían caer en la práctica y mostraban «ejercicio no disponible»; ahora tienen pantalla.

**Verificado:** web 826 pruebas en verde, app construida y probada en el navegador a 375 px (respuesta con calco → marca «mezza» y muestra lo escrito). **No verificado:** que 5 de 6 sea una vara razonable con uso real, ni el teclado del iPhone (autocorrección, acentos). **Declarado:** el minuto de u62 «se resolvió» solo porque escribir se estima en 45 s (valor a priori).

**Siguiente (Fase 2):** reconstrucción de memoria con diferencias, «Pedir corrección» (encargo para IA gratuita) y registro de errores al repaso, dictado del iPhone como comprobador, y reemplazar el relleno por minutos.

## 2026-11-22 (noche) — Fase 1: traducciones y vocabulario con artículo
**Traducciones:** 5 subagentes revisaron las 2.204 oraciones usadas en unidades (italiano→español): marcaron 53 (2,4 %); más 11 cambios mecánicos de vocabulario de España («coche»→«auto», «gafas»→«lentes»). 64 oraciones retraducidas con `scripts/retranslate.py` (quedan `translation_kind=llm`, marcadas) y re-exportadas. Lo más grave eran los «vorrei» traducidos «quiero» (ahora «quisiera»), «vosotros» y la persona/género. Una muestra mía de 45 pares sin marcar no halló errores de sentido; la auditoría es de IA, **no de un nativo**, y pudo dejar pasar casos. Respaldo de la base: `data/work/authoring.pre-traducciones.db` (fuera de git).

**Vocabulario (paso Palabras y Repaso):** el sustantivo se muestra con su artículo italiano (580 de 795 palabras: «il latte», «l'acqua»); 23 llevan aviso «género distinto del español» (solo palabras parientes: latte/leche, sangue/sangre…); 7 falsos amigos del catálogo avisan en la lista (+ `topo`, de la tabla de la fuente 3285814c). Género/número añadidos a mano a 60 sustantivos de las unidades de sonidos en `schemas/data/course.json`. El género de las 795 palabras lo escribió el proyecto antes y solo revisé terminaciones inusuales: sin verificar por un nativo. Quedan 194 palabras sin artículo (adjetivos, verbos, adverbios).

**Pruebas:** Python 1.217 (con la base de datos real enlazada) y web 757 en verde; se construye la app. Sigue sin correr `tsc`.

**Fuera de este paso (decidido):** «quitar el relleno por minutos» se mueve a la Fase 2, porque es parte del rediseño del ciclo de unidad (cuatro hebras), no un arreglo suelto. Falta aún: oraciones nuevas para u07, u02, u05.

## 2026-11-22 (tarde) — Fase 1, primer paso: oraciones y pruebas de A1
**Hecho:** el generador del curso (`pipeline/exercises/course.py`) ahora filtra las oraciones de unidades A1 con el prefiltro de auditoría (quita imperfetto, congiuntivo, condicional, >14 palabras, temas inadecuados): 70 de 2.591 oraciones salieron de las unidades. Causa raíz de la «unidad 1 difícil»: la prueba reservaba a propósito las 6 oraciones MÁS difíciles; ahora se reparte por todo el rango. En las unidades de sonidos el texto «Error típico de hispanohablantes» pasó a «Así no se escribe (no sonaría igual)», porque esas grafías las arma el generador y no son errores documentados. Reconstruir el contenido es determinista (se comprobó que reproduce lo publicado byte a byte antes de cambiar nada).

**Pruebas:** web 756 y Python 801 en verde; la app se construye y se vio en el navegador. **No se pudo correr el chequeo de tipos** (`tsc` no está instalado en este entorno).

**Costos declarados:**
- u07, u02 y u05 bajaron de 30 oraciones (27, 29 y 27): quedan en `KNOWN_GAPS` de `cierreA1.test.ts`. Faltan oraciones nuevas.
- El bloque de voz de u08 y u11 (A2) quedó en ≈8 min (antes ≥9): se bajó el mínimo de la prueba a 8 min; es límite de contenido.
- La prueba de cada unidad sigue siendo de 6 oraciones y de 2 opciones (se cambia en la Fase 2).

**Siguiente:** artículo italiano en cada sustantivo del vocabulario y marcar falsos amigos; corregir las traducciones que no calzan; quitar el relleno por minutos; nuevas oraciones para u07, u02, u05.

## 2026-11-22 — Revisión adversarial y plan maestro
**Hecho:** revisión completa de lo construido (`docs/revision-adversarial-2026-11-22.md`); lectura de las tres fuentes de diseño del cuaderno NotebookLM y búsquedas externas; plan maestro aprobado (`docs/specs/2026-11-22-plan-maestro.md`); `CLAUDE.md` corregido.

**Decisiones del usuario:**
- Uso solo personal (permite libros abiertos de licencia no comercial).
- Todo gratis: sin API de pago. La corrección de escritura y habla se resuelve por capas (reconstrucción con diferencias, traducción inversa, detector propio, IA gratuita fuera de la app con encargo preparado, dictado del iPhone como comprobador).
- Meta: B2 en 18–24 meses a ritmo flexible, para hablar, entender y escribir bien (no para un examen). La app debe recomendar exposición externa.
- Sin personas (tutor/nativo) por ahora; la app declara que nada está verificado por un nativo.
- Se evoluciona lo construido, no se rehace.

**Cambio de diseño:** de 7 pasos de reconocimiento a cuatro hebras (entrada, foco en la forma, salida, fluidez) según Nation.

**Pendiente:** Fase 0 (pruebas técnicas en el iPhone: sin conexión, dictado del teclado en italiano, reconocimiento de voz en navegador; leer fuentes del cuaderno aún sin leer: EOI Zamora, guías UGR/UPO, shadowing, Partículas, componente fónico; archivo de licencias).

**Siguiente paso:** Fase 1, reparar A1 (empezar por u18–u20 con el prefiltro `pipeline/audit_rules.py`).

**Notas:**
- Las consultas con IA al cuaderno se agotan por tiempo; se lee el texto de las fuentes con `source_get_content`.
- Los enlaces y licencias marcados «verificar» en el plan no están confirmados.
- Las duraciones de las fases son estimaciones de trabajo, no mediciones.
