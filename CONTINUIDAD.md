# CONTINUIDAD

Registro de avances. Lo más reciente arriba.

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
