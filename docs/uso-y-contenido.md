# Uso y contenido (actualizado 2026-11-17 — ruta guiada)

## Actualizaciones y audio sin conexión (corrección del mismo día)
- **Problema visto:** tras publicar, la app instalada seguía mostrando versiones viejas. Causa: el service worker precacheaba ~326 archivos (con 170+ mp3); su instalación era lenta y se aborta si la app se cierra o falla un archivo, y aun instalada, la página no se recargaba sola.
- **Arreglo:** el precache ahora es solo la app y el contenido (21 archivos, 1,2 MB; `check-precache.mjs` lo exige y prohíbe mp3). El audio va a la caché `audio-v1` (CacheFirst con soporte de rangos): se guarda al escuchar y **Ajustes → «Descargar el audio»** baja todo. La app avisa «Descargando una versión nueva…» y se recarga sola al activarse; busca actualización al volver a abrirla.
- **Ver qué versión es:** pie de página «Versión xxxxxxx» (hash del commit) y Ajustes → «Buscar actualización» / «Reparar la app» (borra la copia guardada, **no** el progreso).
- **Consecuencia:** el audio sin conexión ya no viene incluido: hay que pulsar «Descargar el audio» una vez con internet.

## Ruta guiada (lo nuevo)
- **12 unidades activas** en `schemas/data/course.json` (A1: 7 · A2: 4 · B1: 1) + 9 unidades **«próximamente»** visibles en la ruta con la razón por la que aún no existen (sonidos, consonantes dobles, passato prossimo/imperfetto, imperativo negativo, ci/ne, pronombres combinados, consecutio, concesivas). Una unidad solo es «activa» si tiene ≥18 oraciones validadas utilizables (`pipeline/exercises/course.py`; si no, baja a «próximamente»).
- **Cada unidad = 5 pasos** (ciclo ANTES/DURANTE/DESPUÉS/REVISIÓN de las fuentes): Descubre → Cápsula → Práctica → Escucha → Prueba de la unidad. Se hacen en orden; cada paso se puede dejar para otro día. La prueba usa oraciones **reservadas** (no salen en la práctica); **≥80 % completa la unidad** y abre la siguiente (umbral nuestro). Si no se llega, hay que rehacer la práctica.
- **Hoy**: «Tu unidad» (siguiente paso + minutos) y «Repaso» (+ minutos). **Ruta** (`#/ruta`): completadas ✓, actual ▶, bloqueadas 🔒, próximamente ⋯. **Prueba de ubicación** (`#/ubicacion`): 3 preguntas por unidad; si aciertas las 3 la unidad queda dominada y entra al repaso.
- **Tiempos**: ya no son una fórmula. Cada paso suma segundos por tipo de ejercicio (elección 12, hueco 20, orden 30, traducir 45, dictado 50, descubrimiento 25, tarjeta 15) que son **valores a priori**; la app mide cuánto tardas tú y, con 5 mediciones por tipo, usa tu mediana. Mientras tanto los minutos son estimaciones, no mediciones.
  - Estimación actual por unidad: Descubre ≈2 · Cápsula ≈3 · Práctica ≈6 · Escucha ≈7 · Prueba ≈2–3 min (≈21 min por unidad; ≈4 h en total en las 12).
  - Frente a las fuentes (A1 40–50 h guiadas, A2 90–100 h…) la app cubre una fracción: la ruta lo dice por nivel («En la app hoy: …»).
- Bloques de la sesión de 30 min de las fuentes → pasos disponibles: ① repaso = Repaso; ② gimnasio sintáctico = Cápsula + Práctica; ③ voz = Escucha (**solo dictado con Serena**, sin ASR: no mide geminadas ni acento); ④ intercomprensión/reconstrucción = Descubre (inferencia de significado con el punto clave resaltado) + huecos de la Práctica. **Faltan** ③ real (ASR en el Mac), ④ con textos y los 7 tamices, y B2.

## Contenido
- **267 oraciones validadas utilizables** (de 35 al inicio del día), **299 clips** de Serena (3,4 MB de audio aprox.), 12 cápsulas, 32 falsos amigos.
- Códigos con generador: 12 de 47 (se agregaron ARTICLE_ALLOMORPH, PARTICIPLE_AGREEMENT [solo siamo/siete: con sono/sei/è el participio en -o puede ser válido], POSSESSIVE_SPELLING, CONGIUNTIVO_OPINION [lista cerrada, solo 3.ª persona: se rechazaron oraciones con sujeto de 1.ª/2.ª]).
- Auditoría IA (`scripts/capsule_pack.py` + `scripts/capsule_apply.py`): 258 revisadas en total, 232 aprobadas. **No es verificación nativa.**

## A1 casi completo (2026-11-18, tarde)
- **30 unidades activas (25 A1 · 4 A2 · 1 B1)** + **Examen de hito A1** (40 preguntas: 35 % léxico / 65 % gramática y sonidos; aprueba con ≥65 % total y ≥50 % en cada parte, como piden las fuentes; se abre al completar A1, o en modo de prueba). 758 oraciones, 790 clips.
- **10 unidades de vocabulario** (`pipeline/vocab/vocab_a1.yaml`, ≈270 palabras): familia, comida, casa, ciudad y naturaleza, tiempo, cuerpo, animales, escuela/trabajo, números e interrogativos. Cada oración tiene exactamente una palabra del tema; ejercicios: escucha y elige (la palabra se cambia por otra del tema con el mismo género, número y artículo), hueco, orden y «¿qué significa?». Las glosas son traducciones básicas escritas por el proyecto (no de un diccionario); las oraciones salen de Tatoeba y se auditaron con IA.
- **Prueba de ubicación adaptativa** (`#/ubicacion`): 3 preguntas por unidad en el orden de la ruta; se detiene tras dos unidades seguidas sin dominar; marca como completadas las dominadas y dice dónde empiezas. Mide solo lo que enseña la app, NO el nivel CEFR (para eso, un test externo).
- **Sigue faltando para A1 completo:** plural y género como reglas, colores, consonantes dobles, gn y z, números 21+ y hora/fecha, comprensión lectora con textos, producción hablada medida, y volumen (≈9 h de pasos frente a las 40–50 h guiadas de las fuentes).

## A1 en construcción (2026-11-18)
- **20 unidades activas (15 A1 · 4 A2 · 1 B1), ≈7 h de pasos**, 517 oraciones, 549 clips. Orden A1: sonidos (c/g, sc, gli) → essere/avere → tener (ho fame) → verbos en -are → -ere/-ire → irregulares (andare, fare, stare, venire) → modales → posesivo con artículo → mio/tuo/suo → il/lo → c'è/ci sono → a/in → nel/sul.
- **Unidades de presente** (`pipeline/exercises/present.py`): el error se genera solo con pronombre explícito delante («tu parli» → «tu parlas» calcado del español; o una persona que no concuerda). Tablas cerradas de gramática estándar (13 irregulares, 59 regulares sin -iare). Objetivos de tema en `schemas/data/topic-codes.json` (aparte del catálogo de errores de las fuentes).
- **Unidades de sonidos** (`phonetics.py`): «escucha y elige»: suena la frase correcta y se elige entre ella y otra con UNA palabra mal escrita; solo se ofrece como error una forma que no es palabra italiana ni española (wordfreq = 0). La calidad de la voz de Serena no está verificada por un nativo.
- **Modo de prueba** (Ajustes): abre todas las unidades y pasos con el progreso en otra base de datos (el real no se toca) para revisar el contenido sin esperar a desbloquearlo.
- Tope de audio subido a 20 MB y del precache a 5 MB (el contenido crece; el audio sigue fuera del precache).
- **Falta para dar A1 por listo:** vocabulario por temas (~700 palabras), plural y género, interrogativos, números/hora/fecha, consonantes dobles, gn y z, y el examen de hito A1. Hoy equivale a una fracción de las 40–50 h guiadas de las fuentes.
- Auditoría IA acumulada: 454 oraciones revisadas, 426 aprobadas (no es verificación de un nativo).

## Sesión de 4 bloques (2026-11-18)
- «Hoy» muestra la **sesión de hoy** con los bloques de las fuentes y sus minutos: ① Repaso (5) · ② Gimnasio sintáctico (cápsula + práctica + prueba) · ③ Sonidos y voz (8) · ④ Lectura y reconstrucción (7). Cada paso de la unidad es un bloque; se listan los pasos que siguen hasta llenar ≈25–30 min, respetando el ciclo (lectura → gimnasio → voz → prueba). Cada bloque se puede hacer por separado.
- **④ Lectura y reconstrucción** = tarjetas con el punto clave resaltado + preguntas de significado + huecos solo en el punto de divergencia (andamiaje inverso), llenado a ≈7 min por ítems × segundos.
- **③ Sonidos y voz** = 5 dictados + **escuchar y repetir** (te grabas en el teléfono, te escuchas y te autoevalúas; la grabación no sale ni se guarda). **No mide pronunciación** (no hay análisis de voz); la nota es del usuario y no cuenta para la prueba.
- **① Repaso** se llena a ≈5 min con práctica de recuperación de unidades ya completadas; si aún no hay ninguna, dura lo que dura (honesto: no inventa relleno).
- Sin verificar: grabación con micrófono en iPhone real (permisos de Safari/PWA), tiempos reales hasta medirlos con uso.

## Estado anterior (sigue vigente en lo no reemplazado)
## Qué hay
- **8 cápsulas** (AUX_ESSERE, PREP_PLACE, CE_AGREEMENT, PERSONAL_A, POSSESSIVE_ARTICLE, PREP_ARTICLE_CONTRACTION, COMPARATIVE_DI, TENERE_AVERE), **179 oraciones** (de 35), 32 falsos amigos, **211 clips** de Serena (2,2 MB de audio).
- Pantallas: Hoy · Repaso (FSRS) · Escribir (detector local de los 8 errores) · Ajustes (copia de seguridad) · Acerca de.
- Ritmo: una cápsula nueva cada día dura ≈8 días; después el contenido nuevo depende de validar más oraciones/códigos. Los repasos (cápsulas + falsos amigos) siguen indefinidamente.

## Cómo se amplió el contenido (y qué NO es)
- `scripts/capsule_pack.py` elige oraciones de Tatoeba donde un generador de calcos encuentra su patrón; yo (IA) audité italiano, calco, nivel y traducción; `scripts/capsule_apply.py` aplica el veredicto (reviewer `llm-audit`; las etiquetas automáticas sin confirmar se descartan).
- 162 revisadas: 144 aprobadas, 17 rechazadas, 1 en duda. Las de pivote se tradujeron desde el italiano (`translation_kind: llm`).
- **No es verificación de un hablante nativo.** La única persona humana que revisó no sabe italiano. Auditor único (la propia IA), sin acuerdo entre auditores.
- Se corrigió el generador de «a» personal: ya no toma reflexivos («mi chiamo Ludwig»), clíticos («lo ama Mary») ni «New York».

## Robustez añadida
- Copia de seguridad: Ajustes → «Guardar copia» (JSON; hoja de compartir en iPhone) y «Restaurar» (valida todo antes de borrar nada; reemplaza el progreso).
- `navigator.storage.persist()` al arrancar (el sistema puede ignorarlo; la copia es la protección real).
- Si falla un guardado en repaso o cápsula, se avisa y se puede reintentar (antes el botón quedaba muerto); «Terminar» reintentado no duplica la tarjeta.
- «Hoy» se recalcula al volver a la app (cambio de día); el audio se detiene al pasar al ítem siguiente; el italiano lleva `lang="it"`; primera vez muestra «Cómo empezar».

## Sigue SIN verificar
- Uso en iPhone real (instalación, audio al tocar, sin conexión real, tamaño 2,6 MB precacheado).
- Que un nativo apruebe las 144 oraciones nuevas y las explicaciones.
- Clips nuevos (144) no escuchados; solo se escucharon 10 de los 67 anteriores.
- Detector de escritura: solo probado con oraciones propias y del corpus.

## Límites conocidos pendientes
- Códigos sin generador (47 − 8): sin cápsula. Candidatos seguros siguientes: ERR_ARTICLE_ALLOMORPH, ERR_PARTICIPLE_AGREEMENT.
- Cierre de cápsula en varias transacciones de IndexedDB (no atómico; el reintento es seguro).
- Capsules repiten una oración en dos tipos de ítem; disparadores compartidos.
