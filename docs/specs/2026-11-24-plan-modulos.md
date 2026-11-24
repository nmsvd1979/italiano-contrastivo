# Plan: reagrupar A1 en módulos temáticos hechos de cápsulas

(El plan maestro anterior quedó guardado en `docs/specs/2026-11-22-plan-maestro.md`; este lo sustituye como plan vigente.)

## Contexto

La investigación de métodos (`docs/metodos-y-estructura-de-la-app.md`) confirmó tu sospecha: los ingredientes de «Hablar» y «Escribir» son correctos, pero viven fuera de la ruta y son opcionales, y la ruta está ordenada por código de error y practica oraciones sueltas. Además A1 tiene 51 unidades y el resto del camino 5.

Objetivo de este plan: que la **ruta principal** sea el único camino, organizada en **10 módulos temáticos de A1**, cada uno con una situación comunicativa, un texto real de entrada, sus cápsulas (las unidades actuales) y una tarea de salida escrita y hablada obligatoria. Es tu idea original (módulos divididos en cápsulas) con el ciclo de pasos ya construido.

Límite honesto: ningún estudio compara estas arquitecturas; se deduce de principios y de cómo están hechos los manuales. Los números (10 módulos, 4–7 cápsulas) son órdenes de magnitud.

## Decisión de diseño

**Una capa de módulos por encima de las unidades, sin rehacerlas.** Las 51 unidades conservan su id, sus oraciones y su progreso guardado; solo cambia quién las agrupa y qué pasos nuevos las rodean.

Comparé dos caminos:
- *Rehacer las unidades como módulos grandes*: más limpio, pero rompe el progreso guardado, las ~2.100 pruebas y obliga a regenerar todo el contenido.
- *Capa de módulos (elegida)*: reutiliza todo lo construido, se puede entregar por etapas y cada etapa deja la app usable.

## El mapa: 10 módulos de A1

Cada módulo: situación → texto de entrada (diálogo real ya existente) → cápsulas → salida (rol + tarea oral + escritura) → fluidez → cierre.

| # | Módulo (qué sabrás hacer) | Cápsulas (unidades actuales) | Texto de entrada | Salida |
|---|---|---|---|---|
| 1 | Saludar y presentarte | u37 saludos, u60 mi chiamo, u18 sonidos c/g, u13 essere/avere | `rd_saluti` | roles `rp_saluti_formale`, `rp_conoscersi`; frases de cortesía |
| 2 | Dar tus datos: origen, edad, deletrear | u45 nacionalidades, u26 números, u54 género, u55 un/uno/una | `rd_dovesei` | roles `rp_dove_sei`, `rp_dati`; tarea «Mi presento»; alfabeto |
| 3 | La clase y tus cosas | u07 il/lo/l', u19 sonidos sc, u49 objetos, u38 questo/quello, u32 colores | `rd_zaino` | frases de clase («Come si dice…?», «Non capisco, puoi ripetere?») |
| 4 | Tu familia y cómo es la gente | u21 familia, u01 y u02 posesivos, u41 adjetivos, u20 sonido gli | `rd_incontro` | tareas «Descrizioni» y «La famiglia e la casa» |
| 5 | Tu rutina y tu semana | u14 verbos -are, u15 -ere/-ire, u25 días y meses, u59 la hora, u56 reflexivos, u40 adverbios de tiempo | `rd_routine` | tarea «La mia settimana» |
| 6 | Tiempo libre y planes | u16 irregulares, u17 modales, u36 tiempo libre, u30 preguntar, u63 sonidos gn/z | `rd_stasera` | rol `rp_stasera` |
| 7 | Tu casa y moverte por la ciudad | u23 casa, u03 c'è/ci sono, u24 ciudad, u05 a/in, u06 nel/sul, u57 direcciones | `rd_poste` | roles `rp_poste`, `rp_albergo`; tarea «La mia città ideale» |
| 8 | Comer y beber fuera | u22 comida, u44 mi piace, u35 bar, u65 vorrei, u04 ho fame, u64 consonantes dobles | `rd_trattoria` | roles `rp_trattoria`, `rp_bere`; frases de bar y restaurante |
| 9 | Comprar: ropa, precios, cantidades | u31 ropa, u42 dinero, u39 molto/poco, u61 con me/per te | `rd_moda` | rol nuevo sobre `rd_moda`; frases de tienda |
| 10 | El cuerpo, el tiempo, el trabajo y contar lo que hiciste | u27 cuerpo, u33 clima, u28 animales, u29 trabajo, u62 imperativo, u58 passato prossimo | `rd_viaggio` | frases del tiempo; tarea oral del pasado (pendiente de fuente) |

Total: 51 unidades, ninguna se pierde. Las 9 de vocabulario opcional («A1+») siguen aparte. Las lecturas que hoy cuelgan de una unidad y no son el texto de entrada quedan como lectura extra del módulo.

## Qué cambia en cada pantalla

- **Ruta:** muestra módulos (título = lo que sabrás hacer) y, dentro, sus pasos. Se avanza en orden dentro del módulo.
- **Módulo (pantalla nueva):** Entrada → Cápsulas → Textos reales (solo si el módulo los tiene) → Salida → Fluidez → Cierre.
- **Textos reales (obligatorio, desde 2026-11-24 tarde):** los documentos y mensajes del módulo (`extra_readings`: carteles, menús, horarios, billetes…) se leen sin traducción y se responden; cada uno queda marcado (`texto:<id>` en el progreso del módulo) y con todos leídos la etapa queda hecha. Antes eran opcionales y 8 requisitos de A1 se cubrían solo con ellos.
- **Cápsula:** la unidad actual, con sus mismos pasos. Si su lectura pasó a ser la entrada del módulo, ese paso se quita para no verlo dos veces.
- **Salida (obligatoria):** TODOS los juegos de roles y tareas orales del módulo (desde 2026-11-24 tarde; antes bastaba uno, y 5 funciones del programa solo se practicaban en juegos concretos; cada uno se marca con `salida:habla:<id>`) (pantallas ya hechas en «Hablar») más una tarea escrita: reconstruir el texto de entrada de memoria y escribir tus propias respuestas a las preguntas de la tarea, con el detector de calcos y el encargo para la IA externa (ya hechos en «Escribir»).
- **Cierre:** lista «sé hacer» (marcas tú), prueba mezclada con frases de todas las cápsulas del módulo, y una sugerencia de 10 minutos de la Biblioteca.
- **Barra inferior:** Hoy · Ruta · Repaso · Biblioteca · Ajustes. «Hablar» y «Escribir» dejan de ser pestañas; quedan accesibles como «Práctica libre» desde la Ruta.
- **Hoy:** propone el siguiente paso del módulo en curso y muestra el avance por «sé hacer», no por unidades cerradas.

## Etapas (cada una deja la app usable y con pruebas en verde)

1. **Datos del mapa.** `modules` en `schemas/data/course.json` (id, nivel, título, `can_do_es`, unidades, lectura de entrada, roles, tarea, grupos de frases, recurso de Biblioteca). Validación en `pipeline/exercises/course.py`: cada unidad A1 en exactamente un módulo; todo lo referenciado existe. Se exporta al paquete. Nuevo rol sobre `rd_moda` en `schemas/data/speaking.json`.
2. **Ruta por módulos.** `web/src/state/modules.ts` (estado del módulo derivado del progreso de sus unidades + pasos propios); `RouteScreen` agrupada; pantalla de módulo; «Hoy» apunta al módulo. El orden de la ruta pasa a ser el del mapa.
3. **Pasos de módulo.** Entrada (reutiliza `ReadingStep`), Salida (reutiliza `RolePlayRun` y `TaskRun` de `SpeakingScreen.tsx`, `ReconstructPanel` y `CorrectionPanel` de «Escribir»), Fluidez (reutiliza `FluencyRun`), Cierre («sé hacer» + prueba mezclada con `testItems` de `state/steps.ts`). Progreso guardado en el mismo almacén de unidades con ids `mod:m01…` (igual que hoy `hito:A1`).
4. **Limpieza.** Quitar el paso Lectura duplicado; barra inferior de 5 pestañas; «Práctica libre»; textos de «Cómo empezar»; `CLAUDE.md` y `CONTINUIDAD.md`.

Fuera de este plan (siguientes, en este orden): seguimiento de puntos calientes y pruebas diferidas; comprobar si hay material real para A2 y construir A2 con este mismo molde; B1–B2.

## Lo que se conserva sin tocar

Oraciones, cápsulas, audio, repaso espaciado (FSRS), examen de hito de cinco partes, medición de minutos por hebra, Biblioteca, y el progreso que ya tengas (las unidades completadas siguen completadas; un módulo con todas sus unidades hechas solo pide sus pasos nuevos).

## Costos y riesgos

- El orden de la ruta cambia otra vez (tercera vez); si ya empezaste, verás las unidades reagrupadas, sin perder avance.
- El módulo 10 no tiene tarea oral del pasado con fuente verificada, y los módulos 3 y 10 no tienen juego de roles propio: quedan declarados, no se inventa italiano.
- La tarea escrita se corrige con las capas actuales (diferencias, detector, IA externa): ninguna tiene eficacia medida para italiano.
- Sigue sin revisión de un nativo y sin prueba en iPhone hasta que la hagas tú.

## Archivos clave

- Datos: `schemas/data/course.json`, `schemas/data/speaking.json`, `pipeline/exercises/course.py`, `web/src/content/load.ts`.
- Estado: nuevo `web/src/state/modules.ts`; `web/src/state/course.ts`, `store.ts` (nuevos pasos de módulo), `session.ts`.
- Pantallas: `web/src/ui/RouteScreen.tsx`, nuevo `ModuleScreen.tsx` y `ModuleStepScreen.tsx`, `TodayScreen.tsx`, `kit/TabBar.tsx`, `App.tsx`; se exportan para reutilizar `RolePlayRun`, `FluencyRun` (`SpeakingScreen.tsx`), `ReconstructPanel`, `CorrectionPanel`.
- Pruebas: `tests/py/test_course.py`, `web/src/ui/route.test.tsx`, nuevas `modules.test.ts(x)`, `web/src/state/cierreA1.test.ts`.

## Verificación

- Pruebas de Python y web en verde en cada etapa; test nuevo que exige que cada unidad A1 esté en un módulo y que cada módulo tenga texto de entrada, «sé hacer» y al menos una tarea de salida (o un hueco declarado).
- Test de migración: con progreso antiguo (unidades completadas), el módulo calcula bien su estado y nada se pierde.
- Recorrido de un módulo completo en la vista previa a 375 px, con capturas para ti antes de seguir a la etapa siguiente.
- Commits pequeños en `main`, un tema por commit; subir a GitHub solo cuando lo pidas.

## La ruta como camino único (2026-11-24 tarde)
Quien solo siga «Hoy» debe poder completar A1 (y luego cada nivel). Reglas: (1) con módulos definidos, ninguna unidad fuera de ellos se ofrece (A2/B1 sueltas quedan bloqueadas, «en construcción»); (2) con todos los módulos del nivel completos, el siguiente tramo de Hoy es el examen de hito; (3) todo requisito «covered» de `syllabus-aN.json` debe apoyarse en algo **obligatorio** (cápsulas, texto de entrada o real, juegos de rol y tareas de la Salida; no las frases útiles ni la Biblioteca): lo comprueba `tests/py/ruta_obligatoria.py` desde `test_cobertura_a1.py` (y desde `test_cobertura_a2.py` al cerrar A2); (4) `web/src/state/ruta.test.ts` recorre A1 entero siguiendo solo lo que ofrece Hoy. Hoy muestra la tira de etapas del módulo y «Módulo N de 12 · A1».
