# Rediseño del frontend (2026-11-24)

Maqueta de referencia: `docs/specs/2026-11-24-rediseno-frontend-maqueta.html` (siete pantallas con contenido real del módulo 1; es estática, no es la app). Complementa `docs/specs/2026-11-17-diseno-ui.md` (sistema visual vigente) y `docs/specs/2026-11-24-plan-modulos.md` (estructura de módulos). No los reemplaza.

## Intención

Que cada pantalla responda una sola pregunta («¿qué hago ahora?», «¿dónde estoy?», «¿qué me falta?») y que el contraste español–italiano, que es el método de la app, tenga una forma visual propia y reconocible. La lógica de contenido, progreso, repaso y pruebas no cambia.

## Qué se encontró (recorrido a 375 px, 2026-11-24)

1. Ruta, Hablar y Biblioteca abren con párrafos de método, avisos de fuentes y horas estimadas; lo útil queda bajo el pliegue.
2. Tres listas anidadas antes de un ejercicio: Ruta → Módulo (5 pasos) → Unidad (7 pasos), todas tarjetas iguales con «Hacer».
3. Vocabulario que se pisa: «unidad» y «cápsula» nombran lo mismo; «Cápsula» es además un paso. «Hoy» muestra bloques en orden ④ ① ④ ② ② y usa nombres internos («Gimnasio sintáctico»).
4. El contraste no tiene forma: la ficha es un párrafo, las conjugaciones van dentro de una frase y el error típico sale en gris pequeño.
5. Jerarquía plana: todas las tarjetas pesan igual, iconos mezclados (emoji y símbolos), media pantalla vacía en ejercicios con las opciones lejos del pulgar.
6. El avance cuenta pasos («0 de 73 cápsulas»), no capacidades; «sé hacer» solo aparece al cerrar un módulo.
7. Error: al cambiar de pantalla el desplazamiento no vuelve arriba (se vio al abrir una unidad).

## Objetivos, no objetivos, antiobjetivos

**Objetivos:** una acción obvia por pantalla; módulo entero visible sin desplazarse; contraste ES→IT como componente repetido; avance medido en «sé hacer» y minutos reales; todo el texto largo sigue disponible pero plegado.
**No objetivos:** cambiar el contenido, los datos, el repaso espaciado, el examen de hito, la medición de minutos ni el esquema de progreso guardado; mascotas, vidas, ligas, notificaciones.
**Antiobjetivos (fallaría aunque «funcione»):** perder los avisos de honestidad (texto IA sin revisar por nativo, sin prueba en iPhone) o esconderlos donde nadie los encuentre; que una racha rota se anuncie con castigo; que se rompan las ~1.000 pruebas web.

## Decisiones

- **Pestañas (4, desde 2026-11-24 tarde):** Hoy · Ruta · Biblioteca · Progreso. Practicar salió de la barra: Repaso, Refuerzo, Salida (hablar y escribir) y la Fluidez van dentro del plan de Hoy y del módulo; las pantallas de práctica libre se conservan y se abren desde «Práctica extra (opcional)» en Progreso. Ajustes y Acerca se abren desde un engranaje en Progreso. Iconos de trazo propios (SVG), sin emoji.
- **Hoy (plan por contenido, 2026-11-24 tarde):** encabezado «A1 · Módulo N · Cápsula i de k»; el plan del día en el orden real —Repaso, Refuerzo (solo si hay temas débiles; una vez al día) y TODOS los pasos que faltan de la cápsula— sin recorte por tiempo ni minutos por fila; una línea «Hoy llevas X de 15 min» (referencia diaria, no bloquea); un solo botón principal sin minutos; sin «Solo N min» ni «Elegir otra cosa»; la semana como una barra apilada; racha discreta y sin aviso al cortarse. Las tandas de ejercicios son fijas (no dependen de los tiempos medidos). «Cómo empezar» solo en el primer uso y plegable.
- **Ruta:** solo el módulo en curso va destacado (tira de sus 5 etapas + botón). Los demás son filas de una línea: número + lo que sabrás hacer. Horas de referencia, método y avisos van a «Cómo funciona» plegado.
- **Módulo:** línea de tiempo vertical con Entrada, Cápsulas, Salida, Fluidez y Cierre; cada cápsula con sus pasos como puntos; tocar la cápsula actual lleva directo a su siguiente paso (la pantalla intermedia de siete tarjetas deja de ser parada obligada); un botón fijo abajo.
- **Cápsula / ficha:** tarjeta de contraste reutilizable (ES gris → IT en serif grande, lo que cambia resaltado, regla en una línea), tabla de conjugación, pasos como tira horizontal. Se abre desde cualquier ejercicio con «Ver ficha».
- **Ejercicio y corrección:** lo que se quiere decir (frase en español) grande al centro, respuestas abajo; la corrección muestra «Dijiste / Se dice» y el porqué en una línea a la vista, con Escuchar y Ver ficha. Contador «8 / 24» en vez de «Ejercicio 8 de 24 · quedan ≈ 11 min». Se conserva el reencolado de errores y la nota por primer intento.
- **Color:** cuatro colores de hebra (entender, estudiar la forma, producir, fluidez) iguales en toda la app; terracota solo para la acción principal y lo que hay que notar. Se mantienen la paleta de papel/tinta, el serif para el italiano y el modo oscuro.
- **Progreso:** «Ya sabes hacer» (de los `can_do_es` de cada módulo), tiempo real por semana (calendario de 4 semanas) y la barra por hebra. «Lo que más te cuesta» queda como etapa posterior (ver abajo).

## Verificado contra los datos

- **Frase en español en ejercicios de elección: sí se puede.** El ítem `choice_l1_distractor` solo trae `prompt_es` genérico («¿Cuál es la frase correcta…?»), pero tiene `sentence_id` y cada frase de `sentences.json` trae `es` (Tatoeba, con autor e id). Se obtiene por búsqueda, sin cambiar los datos. Los `cloze` ya traen `hint_es` en parte de los casos; los `reorder` traen `prompt_es`. Se revisará caso por caso qué mostrar si falta la frase.
- **Aciertos por tipo de error: hoy NO se guardan.** `ReviewLog` solo tiene tarjeta, nota, fecha y origen; el ejecutor de ejercicios devuelve respuestas por ítem pero no se guardan por código de error. Por eso «Lo que más te cuesta» no entra en las primeras etapas: requiere un almacén nuevo (y es el «seguimiento de puntos calientes» que ya figura como siguiente paso en `2026-11-24-plan-modulos.md`).

## Enfoques considerados

1. **Solo repintar** (estilos y colores, misma estructura): rápido, pero no toca las listas anidadas ni el contraste invisible.
2. **Reorganizar pantallas y componentes sin tocar la lógica (elegido):** ataca los siete hallazgos, conserva progreso guardado y pruebas, se entrega en etapas con capturas.
3. **Rehacer la interfaz desde cero:** rompe pruebas y progreso guardado sin ganar nada que el enfoque 2 no dé.

## Etapas (cada una deja la app usable, con pruebas en verde y capturas a 375 px antes de seguir)

1. **Base visual:** tokens de hebra, iconos SVG, componentes `ContrastCard`, `ConjugationTable`, `CompactRow`, `Timeline`; corrección del scroll al cambiar de ruta.
2. **Hoy y Ruta** (+ nueva `TabBar` de 5 pestañas y pantalla Practicar con lo que ya existe).
3. **Módulo y cápsula:** línea de tiempo, pasos como puntos, ficha contrastiva, acceso directo al paso siguiente.
4. **Ejercicio y corrección:** frase en español al centro, «Dijiste / Se dice», «Ver ficha».
5. **Progreso:** «sé hacer» + tiempo real. «Lo que más te cuesta» solo cuando exista el almacén de puntos calientes (etapa aparte, con su propio diseño).

## Lo que queda a criterio del constructor

Nombres exactos de los componentes, animaciones (se mantienen sobrias y respetan `prefers-reduced-motion`), y el texto de cada etiqueta, siempre en español neutro con tuteo. Las rutas `#/…` actuales se conservan para no romper pruebas ni marcadores; «Repaso», «Hablar» y «Escribir» siguen respondiendo en sus rutas.

## Riesgos y límites

- Tocar `TabBar`, `RouteScreen`, `TodayScreen`, `ModuleScreen`, `UnitScreen` y los ítems obliga a adaptar sus pruebas (no a eliminarlas).
- Pendiente de ti: probar en iPhone real (no se ha hecho) y confirmar la nueva distribución de pestañas.
- La investigación de interfaz para apps de idiomas es débil (casos y opinión de expertos, no experimentos); se apoya sobre todo en carga cognitiva, coherencia y segmentación (Mayer) y en la evidencia de método que ya está en `docs/metodos-y-estructura-de-la-app.md`. Las cifras de la maqueta son de ejemplo.
