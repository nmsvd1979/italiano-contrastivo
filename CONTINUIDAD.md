# CONTINUIDAD

Registro de avances. Lo más reciente arriba.

## 2026-11-24 (5) — Rediseño del frontend, etapas 1 y 2
**Pedido del usuario:** analizar a fondo el frontend y proponer el mejor diseño. Aprobado el diseño (`docs/specs/2026-11-24-rediseno-frontend.md`, maqueta en `docs/specs/2026-11-24-rediseno-frontend-maqueta.html`) y el plan (`docs/plans/2026-11-24-rediseno-frontend-etapas-1-2.md`).
**Hecho (etapas 1 y 2):**
1. Al cambiar de pantalla vuelve arriba (`useScrollTop`); antes el scroll quedaba a mitad de la pantalla nueva.
2. Colores de hebra (`--s-in`, `--s-form`, `--s-out`, `--s-flu`) con prueba de contraste ≥ 4,5:1 en claro y oscuro (en claro se oscurecieron Entender y Producir para pasarla), etiqueta `Tag`, iconos SVG propios.
3. Cinco pestañas: Hoy · Ruta · Practicar · Biblioteca · Progreso. Practicar reúne Repaso, Hablar y Escribir; Progreso (mínimo: semana, Ajustes, Acerca). Se quitó «Práctica libre» de la Ruta.
4. Hoy: sesión con etiqueta de hebra por fila, barra semanal apilada, botón «Empezar»/«Continuar» y salidas «Solo N min» / «Elegir otra cosa».
5. Ruta: módulo en curso destacado con tira de etapas, el resto en filas compactas, método y horas plegados en «Cómo funciona».
**Tras la revisión final (revisor independiente):** se corrigió que «Solo N min» llevaba a pasos bloqueados, que Practicar ocultaba la práctica de recuperación, los toques menores de 44 px y que A2/B1/B2 seguían con el diseño antiguo. «Cómo empezar» queda plegado a propósito.
**Decisiones mías (a revisar):** qué hacen «Solo N min» (bloque pendiente más corto de hasta 5 min) y «Elegir otra cosa» (Practicar); ContrastCard, tabla de conjugación y línea de tiempo pasan a la etapa 3; los pasos de unidad en Hoy no repiten el nombre de la unidad.
**Comprobado:** web 1035 pruebas en verde; recorrido en el navegador a 375 y 320 px, claro y oscuro, sin errores de consola ni desborde horizontal.
**No comprobado:** iPhone real; tsc (no está instalado en web/); Biblioteca y Hablar/Escribir con el menú nuevo solo por pruebas.
**Pendiente / siguiente paso:** etapa 3 (módulo y cápsula: línea de tiempo, ficha contrastiva, acceso directo al paso siguiente), etapa 4 (ejercicio y corrección), etapa 5 (Progreso con «sé hacer»; «Lo que más te cuesta» exige un almacén nuevo de aciertos por tipo de error, que hoy no existe).

## 2026-11-24 (4) — Se cierran los huecos que A1 aún declaraba
**Pedido del usuario:** resolver todos los huecos de A1 sin más iteraciones y dejar el plan completo de A2.
**Hecho:**
1. **Cinco unidades nuevas:** u71 (*mi/ti* vs *me/te*), u72 (*stare + gerundio*), u73 (comunicación y tecnología), u74 (servicios y oficinas), más 16 oraciones de «per + infinitivo» en u70. Generadores `_stare_gerundio` y `_mi_ti`; oraciones de Tatoeba auditadas por IA (todas con 30 o más). Ahora hay 69 unidades A1 en 12 módulos; el 12.º es «Teléfono, correo, trámites y avisos».
2. **Textos propios nuevos (`authored: true`):** rd_telefono, rd_posta, doc_biglietto, doc_etichetta, doc_lista y rd_avvisi (solo audio). Dos juegos de roles nuevos (rp_telefono, rp_posta).
3. **Cobertura:** `syllabus-a1.json` queda con 65 requisitos cubiertos, 1 hueco declarado (entonación: exige audio nativo; Piper no la enseña) y 1 aplazado a B1 (instituciones y vida política: PLIDA le da intensidad baja en A1).
4. **Plan de A2:** `schemas/data/syllabus-a2.json` (48 requisitos asignados a 10 módulos planificados, cada uno con códigos, generadores, fuentes y textos propios), `tests/py/test_cobertura_a2.py` y `docs/plan-a2.md` (receta por módulo, esfuerzos, qué buscar). A2 aún NO está construido. **Siguiente paso:** módulo a2m01 (pasado con avere/essere).
**Sigue pendiente (solo el usuario):** probar en iPhone, escuchar los audios, decidir si las compuertas son muy rígidas.
**Pruebas:** Python 1271 y web 994 en verde. No se probó el recorrido visual del módulo 12 ni el tipado con tsc (no está instalado en web/).

## 2026-11-24 (3) — Programa A1 cubierto, textos propios y hoja de ruta A2–B2
**Pedido del usuario:** «cierra los huecos, busca fuentes y si no, genéralo tú; deja mapeado el objetivo final y cómo llegar más rápido a A2». **Decisión nueva:** cuando no hay fuente abierta, la IA escribe el texto (ver `CLAUDE.md`).
**Hecho:**
1. **Huecos del programa A1 (CILS/PLIDA):** unidades nuevas de **plurales** (`ERR_PLURAL_FORMA`), **mandato negativo** (`ERR_IMPERATIVO_NEG`), **conectores**, **acuerdo y duda** y **preposiciones** (u66–u70); `u08` (auxiliar *essere*) y las 8 unidades de vocabulario ampliado pasan a A1 (ahora 65 unidades en 11 módulos, el 11.º «Contar lo que hiciste y dar órdenes»). Todas con 30 o más oraciones de Tatoeba auditadas por IA.
2. **Textos propios (`scripts/autorales.py`, `authored: true`):** diálogos de bar con caja, tienda, tiempo, aclaraciones («Può ripetere?»), SMS y estación (audio, para el examen); documentos de menú, horario, formulario, carteles y anuncio. Cinco juegos de roles nuevos, una propuesta de mensaje escrito por módulo y textos opcionales por módulo. La pantalla «Acerca» y cada texto declaran que los escribió la IA y que ningún nativo los revisó.
3. **Hito:** suma comprensión auditiva sin ver el texto («In stazione»).
4. **Cobertura:** `schemas/data/syllabus-a1.json` (67 requisitos: la gran mayoría cubiertos; los huecos y parciales declaran cómo cerrarse) y `tests/py/test_cobertura_a1.py`. **Hoja de ruta:** `docs/hoja-de-ruta-a2-b2.md` (criterio de «terminado», método con comandos, fuentes, cuándo generar, módulos A2 propuestos, riesgos).
**Huecos que declara A1:** «per + infinitivo», clíticos átonos, «stare + gerundio» (parcial); billetes/etiquetas/lista de compra (parcial); avisos orales; entonación (necesita audio nativo); áreas «comunicación y medios», «tecnología», «oficinas públicas».
**Sigue sin hacerse:** probar en iPhone y escuchar los audios (los hace el usuario); revisión de un nativo (descartada); seguimiento de puntos calientes con pruebas diferidas.
**Costos:** audio ≈ 42 MB (tope subido a 48 MB); el orden de la ruta cambió otra vez; los textos propios pueden tener errores que nadie revisó.
**Pruebas:** Python y web en verde al cierre.

## 2026-11-24 (2) — Cierre de lo que A1 permitía sin prueba del usuario
**Decisión del usuario:** no hay hablante nativo; se confía en que las fuentes (libros abiertos y Tatoeba) y la auditoría/traducción de la IA bastan. **Sigue siendo validación solo por IA, declarada en la app.**
**Hecho:**
1. **Cantidad:** las nueve unidades de A1 con menos de 30 oraciones (u07, u02, u05, u19, u20, u35, u39, u42, u65) quedan en 30 o más: 161 oraciones nuevas de Tatoeba, elegidas con `scripts/fill_pack.py`, auditadas una por una por la IA (italiano correcto, nivel A1, sin vulgaridades ni modismos) con traducción mía donde Tatoeba no trae español. Se rechazaron algunas por coincidir con otra variante del corpus o por no tener cobertura del revisor de calcos de «Escribir». `KNOWN_GAPS` de `cierreA1.test.ts` queda vacío: cualquier hueco nuevo falla la prueba. Para u65 («pedir con cortesía») Tatoeba no trae pedidos de bar con «prendo»: se usaron frases de «prendere» = tomar (transporte, objetos), declarado en el veredicto.
2. **Salida oral en todos los módulos:** el módulo 3 suma el juego de roles «Hablar de tus estudios y de tu horario» (*Leggiamo*) y el módulo 10 dos tareas orales de *Piacere!* («Tu trabajo» y «Qué hiciste», con las preguntas en presente y con «avere»; las demás se omitieron por nivel). Ya no hay módulos con hueco de salida declarado.
3. **Recorrido real en el navegador:** Entrada (leer, 6 preguntas, pantalla de «completada»), Cierre (lista «sé hacer» y primera pregunta de la prueba) y Salida del módulo 8 se vieron funcionando a 375 px en modo de prueba.
**Sigue sin poder hacerse (requiere tu prueba o no hay fuente):** probar en iPhone (micrófono, grabación, audio, tabla del horario); escuchar los audios; diálogos abiertos de tiempo atmosférico, tienda y hotel; textos reales tipo menú/cartel/SMS; «Può ripetere?» formal; revisión de un nativo; comprobar si los candados entre módulos resultan demasiado rígidos en uso real.
**Pruebas:** Python 1258 y web 913 en verde.

## 2026-11-24 — Ruta por módulos (etapas 1–4 del plan `docs/specs/2026-11-24-plan-modulos.md`)
**Hecho:**
1. **Datos:** 10 módulos de A1 en `schemas/data/course.json` (`modules`): título, «sé hacer», unidades (cápsulas), texto de entrada, juegos de roles, tareas, frases, sugerencia de Biblioteca y hueco declarado. `pipeline/exercises/modules.py` valida que cada unidad esté en exactamente un módulo y que todo lo referenciado exista; la ruta (`course.units`) sigue el orden de los módulos. Nuevo juego de roles de moda (`rp_moda`). Los verbos en -are (u14) están en el módulo 2 para no retrasar el habla.
2. **Estado:** `web/src/state/modules.ts` (`moduleViews`): módulos y unidades con bloqueos (la Entrada abre las cápsulas si no empezaste ninguna; un módulo se abre al completar el anterior; la ubicación puede saltar un módulo entero). Progreso de pasos del módulo en el mismo almacén con id `mod:mNN`.
3. **Pantallas:** Ruta por módulos, pantalla de módulo, pasos Entrada / Salida (juego de roles o tarea oral + mensaje escrito con revisión de calcos; el hueco se declara si el módulo no tiene diálogo) / Fluidez / Cierre («sé hacer» + 12 frases escritas, 80 %, sin autoaprobación). «Hoy» y la sesión proponen el paso del módulo. El examen de hito pide todos los módulos completos.
4. **Limpieza:** pestañas Hoy · Ruta · Repaso · Biblioteca · Ajustes; «Hablar» y «Escribir» quedan como «Práctica libre» en la Ruta; el paso Lectura no se repite en unidades cuya lectura es la entrada del módulo.
**Costos declarados:** el orden cambia otra vez; con progreso anterior, cada módulo con todas sus unidades hechas pide aún Salida, Fluidez y Cierre. Los módulos 3 y 10 no tienen juego de roles ni tarea oral propios (no hay fuente abierta). El tamaño de los módulos (4–6 cápsulas) y los «sé hacer» son criterio mío, no medidos.
**Pruebas:** Python 1258 y web 912 en verde; ruta y módulo vistos a 375 px. **No se probó** el recorrido completo de un módulo en el navegador, ni en iPhone.
**Siguiente (fuera de este plan):** seguimiento de puntos calientes y pruebas diferidas; comprobar si hay material real para A2 y construir A2 con este molde; B1–B2.

## 2026-11-23 (11) — Investigación de métodos y veredicto sobre la estructura de la app
**Pregunta del usuario:** ¿la app se está dispersando en «otros modos»? ¿Debe seguir lo construido, su propuesta original (módulos en cápsulas) u otra cosa? Informe completo en `docs/metodos-y-estructura-de-la-app.md` (5 frentes de investigación; varias fuentes clásicas quedaron sin verificar por bloqueos y se declaran).
**Veredicto (deducido de principios y de cómo están hechos sílabos y manuales; ningún estudio compara estas arquitecturas directamente):**
- La sospecha es correcta en lo esencial: los ingredientes de «Hablar» y «Escribir» son los correctos, pero **viven fuera de la ruta y son opcionales**, y la ruta practica oraciones sueltas ordenadas por código de error, no por situación comunicativa.
- Desproporción: 51 unidades en A1 y 5 más allá, cuando los cursos para hispanohablantes dan a A1+A2 cerca de un tercio de las horas.
- Estructura recomendada: **unas 10 unidades temáticas por nivel** (situación + función), cada una con 4–5 sesiones cortas y un ciclo de 9 pasos (texto real → notar → palabras → 1–3 cápsulas de contraste → práctica en bloque y mezclada → escucha → tarea de salida escrita y oral → fluidez → cierre «sé hacer» + prueba). Las unidades atómicas actuales pasan a ser **cápsulas dentro de módulos temáticos**: es el esqueleto de la propuesta original con el ciclo actual. Fuera de la ruta quedan solo Repaso, Biblioteca y Consulta/Progreso.
- Dejar de hacer: abrir modos nuevos, sumar unidades sueltas de A1, medir avance por unidades cerradas.
**Pendiente de decisión del usuario:** aprobar el rediseño. Antes de planificar B1–B2 hay que comprobar si existe material real suficiente (no inventado) para unidades temáticas en esos niveles.

## 2026-11-23 (10) — Capítulos pendientes: diálogo de trattoria y frases de clase, tiempo, restaurante y tienda
**Hallazgos (leídos en el navegador, licencia citada de la página):**
- ***Tutt\* a tavola! vol. 2*** (UMass, CC BY-NC 4.0), cap. 11, ejercicio B: **diálogo real en una trattoria** (Cameriere, Tommaso, Madison): pedir entrada, primero, segundo y bebida, cambiar el pedido y pedir la cuenta. Entra como lectura `rd_trattoria` (13 réplicas, 6 preguntas, 29 palabras clasificadas) y como **juego de roles** «Ordenar en una trattoria y pedir la cuenta» (con las dos voces Piper). Se omitieron réplicas de nivel mayor y se declara.
- ***Giornate italiane*** (UT Austin, CC BY-NC-SA 4.0; Bush y Luongo): listas de frases verbatim → 4 grupos nuevos en «Hablar → Frases»: **en clase** («Come si dice…?», «Non capisco, puoi ripetere?», «Ho una domanda…»), **el tiempo y las estaciones** (Che tempo fa?, fa caldo, piove, nevica, c'è il sole… 19 ítems), **pedir en bar/restaurante** (Posso avere il conto, per favore?, Ho una prenotazione per…) y **tienda de ropa** (Come posso aiutarla?, Quanto costa?, È caro.).
**Cierra:** «puoi ripetere» (informal) y «Come si dice…?» ya tienen fuente; el bar/restaurante ya tiene un diálogo completo; el tiempo tiene vocabulario verbatim. **«Può ripetere?» (formal) sigue sin fuente.** El tiempo atmosférico **sigue sin diálogo** (solo lista); tienda e hotel siguen sin diálogo. *Cotto e mangiato* (Haverford bloqueado) y el libro de Kennesaw no se pudieron revisar.
**Técnico:** las frases que dice la segunda voz ya no se sintetizan además con Serena (el presupuesto de audio de 32 MB se había pasado por 237 KB: se resolvió quitando duplicados, sin subir el tope); el audio queda en ≈32 MB.
**Pruebas:** Python 1245 y web 893 en verde. Todo el italiano nuevo es de libros abiertos; traducciones IA sin revisar por un nativo.

## 2026-11-23 (9) — Investigación de fuentes abiertas e integración de lo verificado
**Investigación:** 5 investigadores (diálogos funcionales, tiempo/números/horarios, textos tipo PLIDA, audio y datasets, catálogo de libros y corpus); 4 se cortaron por un corte de red y se reanudaron, así que **la cobertura es parcial**. Informe completo en `docs/fuentes-abiertas-a1-a2.md`. Conclusiones: no hay fuente abierta verificada de menús, carteles, SMS ni diálogos de tiempo/tienda/hotel; PLIDA, CILS y CERTIT son de derechos reservados (solo enlazar o imitar el formato); el audio nativo abierto es de oraciones sueltas (Tatoeba NM1, 1.591 clips CC BY 4.0) y palabras (Lingua Libre), nunca de diálogos; los datasets de diálogos de Hugging Face son sintéticos (descartados).
**Integrado:**
1. **Frases**, ahora en tres grupos en «Hablar → Frases para no quedarte callado»: *Piacere!* (aclarar y ser cortés), **bar** (OpenLearn, «Desidera?», «Mi dica.», «E per Lei?», «Vorrei…», «Per me…», «Scusi!», «Allora…», «Ecco!» y los carteles «Si prega di pagare alla cassa.» / «…fare lo scontrino alla cassa.») y **Wikivoyage** (CC BY-SA: «Non capisco.», «Parli più lentamente, per favore.», «Cosa significa?», «Il conto, per favore.», «Scusi, cameriere?»). Verificadas por mí en las páginas. La fuente de OpenLearn tiene **licencia contradictoria** (la web dice «All rights reserved», el PDF dice CC BY-NC-SA 4.0): se declara en pantalla. **No es un diálogo:** el transcripto del audio no se pudo leer.
2. ***Diciannove***: 4 oraciones de Tatoeba (374685, 5738845, 10978888, 10978889) con atribución, auditoría IA (no nativo) y audio; ahora aparece 4 veces en las unidades.
**Sigue pendiente:** diálogo de bar completo (el transcripto de OpenLearn está tras un widget; el PDF se descarga y no lo abrí), tiempo atmosférico en diálogo, menú/cartel/SMS reales, «Può ripetere?» y «Come si dice…?» ya salen del libro *Piacere!* solo la segunda; leer en el navegador capítulos de *Giornate italiane*, *Tutt* a tavola!* vol. 2, *Cotto e mangiato* y Kennesaw (licencias verificadas, capítulos no abiertos); condiciones de redistribución de Common Voice.
**Pruebas:** Python 1245 y web 893 en verde.

## 2026-11-23 (8) — Lectura no vista en el hito y texto tipo «horario»
**Hecho:** el hito A1 ahora tiene **cinco partes** (reconocimiento, escribir, escuchar, **leer** y hablar). La parte de lectura usa dos textos que **ninguna unidad usa** y se muestran **sin traducción ni tamices**: «La giornata di Valentina» (14 oraciones, *Tutt* a tavola!* cap. 3, CC BY-NC) y un **documento tipo PLIDA**, «L'orario di Valentina» (agenda semanal con las celdas tal cual del libro; 5 preguntas en español). Hay que acertar ≥50 % en cada parte. Nuevo tipo de lectura `documento` (tabla) y marca `exam` en `content/readings/`; 33 palabras nuevas clasificadas en `reading_words.json`; 14 audios (Serena).
**Fuentes:** leídas en el navegador integrado (el lector automático recibe 403). Revisé también *Leggiamo* y *Piacere!*: **no hay diálogo de bar ni de tiempo atmosférico** (solo vocabulario y la frase «prendo sempre un caffè al bar»).
**Sigue pendiente (sin fuente abierta accesible):** diálogo de bar completo, diálogo de tiempo atmosférico, menú/cartel/sms tipo PLIDA, y *diciannove* (la base solo trae «diciannovesimo»). La revisión por un nativo no es posible (decisión del usuario): la tasa de error real del contenido validado por IA queda sin medir y la app debe seguir declarándolo.
**Pruebas:** Python 1245 y web 893 en verde. **No se vio** la tabla del horario en el navegador (solo pruebas) ni se probó en iPhone.

## 2026-11-23 (7) — Bloque 3 (parte): tercer distractor, fluidez y revisión nativa
**Hecho:**
1. **Distractores:** las elecciones con 2 opciones bajaron de 2.570 a 1.100 (ahora 2.681 tienen 3). Tercera opción: otra persona del mismo verbo (presente), otra palabra del tema (vocabulario, se distingue por audio) u otra grafía imposible (sonidos). Los códigos sin generador (chiamarsi, piacere, riflessivo, tenere, artículos, género…) siguen con 2: son errores de una sola forma.
2. **Fluidez** (en «Hablar»): tres pasadas de una lectura de una unidad ya completada, a ×0,8, ×1 y ×1,15, la última sin texto; suma a la hebra «Fluidez».
3. **Revisión nativa:** `pipeline/review/native.py` + `scripts/revision_nativo_aplicar.py` leen `docs/revision-nativo.md` ya marcado (✅/✏️/❌), miden la **tasa de error real por origen (IA/Tatoeba)** y con `--registrar` guardan `reviewer="native"`. El documento se regeneró (100 oraciones). Hoy no hay ninguna marca: **la tasa de error real del contenido sigue sin medirse**.
**Segunda voz (autorizada y hecha):** Piper `it_IT-paola-medium` (CC0 según su ficha; 63 MB en `~/Downloads`, no se versiona). 148 frases de diálogos de las lecturas la usan, alternando con quien habló antes (`voices_of`); clip distinto (`clip_id2`) para no pisar el de Serena. Ambas son voces **femeninas**: se distinguen poco (la masculina, riccardo, es x_low y su licencia dice «ver enlace»). Los juegos de roles reproducen por texto, así que una línea idéntica a una oración del corpus suena con Serena.
**No hecho:** textos tipo PLIDA (menú, cartel, horario, sms): no hay fuente abierta verificada y no se inventan.
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
