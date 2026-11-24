# Pistas para empezar A2 (escritas el 2026-11-24, al cerrar A1)

**Para quién es:** la conversación que planifique y construya A2. Aquí no hay un plan hecho: hay lo que la auditoría de A1 (`docs/auditoria-2026-11-24-a1-y-niveles.md`) encontró que A2 va a necesitar, con archivo y función para que no haya que volver a buscarlo, y las decisiones que quedan abiertas. Léelo junto con `docs/plan-a2.md` (qué contenido) y `docs/hoja-de-ruta-a2-b2.md` (método y fuentes).

Los números de línea cambian con cada edición: busca por el nombre de la función.

## Paso 0 (obligatorio antes del primer módulo de A2): el nivel está fijo en «A1» en el código

Si hoy se agregara `a2m01` a `schemas/data/course.json`, pasaría esto: al terminar el módulo 12, `moduleViews` deja el módulo de A2 «en curso» sin mirar el nivel, y como Hoy ofrece el paso del módulo antes que el hito, **el examen de hito A1 nunca se ofrecería**. La Ruta, además, dibujaría los módulos de A2 bajo A1. Sitios a revisar:

| Dónde | Qué pasa hoy |
|---|---|
| `web/src/state/modules.ts` → `moduleViews`, `currentModule` | Encadena todos los módulos en una sola lista (`previousDone`) sin separar por nivel. |
| `web/src/state/session.ts` → `planToday` (campo `milestone`) | Solo calcula el hito de `"A1"`, y solo cuando todos los módulos A1 están completos. |
| `web/src/ui/TodayScreen.tsx` → `nextAction` | El paso del módulo va antes que el hito. |
| `web/src/ui/RouteScreen.tsx` | `level.id === "A1" ? modules.map(...)` y la fila del hito; la apertura del hito mira *todos* los módulos. |
| `web/src/App.tsx` | Solo existe la dirección `#/hito/A1`. |
| `web/src/state/milestone.ts` → `HITO` | Pesos y tamaños se llaman `HITO.A1` y se aplican a cualquier nivel (40 preguntas, 35 % léxico, 12 frases, 6 dictados). |
| `web/src/state/targets.ts` | Horas y minutos objetivo «de A1». |
| `scripts/autorales.py` | `"level": "A1"` fijo al crear textos. |
| `web/src/ui/CorrectionPanel.tsx`, `LibraryScreen.tsx` | `"A1"` como valor inicial (esto es solo comodidad). |

**Qué hay que decidir y hacer:** que el nivel sea un parámetro; que el hito de un nivel sea el paso obligatorio entre el último módulo de ese nivel y el primero del siguiente; que la Ruta agrupe por `module.level`; que `HITO` tenga una entrada por nivel. **Prueba que lo sostiene:** ampliar `web/src/state/ruta.test.ts` con un curso de ejemplo de dos niveles (A1 pequeño + un módulo A2) y comprobar que Hoy ofrece el hito A1 antes de a2m01. `docs/plan-a2.md` solo dice «copiando `milestone.ts`»: no menciona nada de esto.

## Tamaño: dos topes se rompen dentro de A2

- **Contenido:** `web/public/content/items_by_code.json` pesa 4,47 MB (74 códigos, unos 60 KB por código) y el tope por archivo del precache es 6 MiB (`web/vite.config.ts`, `maximumFileSizeToCacheInBytes`). Unos 25–30 códigos más lo superan. El precache total va en 9,39 MB de un máximo de 11 (`web/scripts/check-precache.mjs`). Además, `loadContent` (`web/src/content/load.ts`) carga **todo** al arrancar. Opciones: partir los ejercicios por nivel o por módulo y cargarlos al abrirlos; o generar los ejercicios de práctica con una variante más compacta. Decide antes de crear los primeros 30 códigos nuevos.
- **Audio:** hay 43 MB y el tope es `MAX_BYTES = 48_000_000` en `pipeline/tts/generate.py` (A2 sumaría unos 15 MB, según `docs/hoja-de-ruta-a2-b2.md`). Subirlo a mano otra vez no escala hasta B2: habrá que cargar el audio por nivel.
- **`web/public/content/ATTRIBUZIONI-tatoeba.md`** (615 KB) entra en el precache por el patrón `**/*.{…,md,…}` de `vite.config.ts`; se puede excluir (sigue disponible en línea al abrirla).

## Respaldo y reproducibilidad

`data/work/` (incluido `data/work/capsules/verdicts.json`, los veredictos oración por oración) y `data/raw/` están en `.gitignore`; `data/` pesa unos 2 GB. Si se pierde el disco, se pierde la trazabilidad de qué auditó la IA. Propuesta: copiar `verdicts.json` (que es pequeño) a una carpeta versionada, y anotar en el README de datos cómo reconstruir el resto.

## Datos y esquemas

- No hay JSON Schema para `course.json` ni para `syllabus-aN.json`, aunque `CLAUDE.md` dice que los esquemas son la fuente de verdad. Crearlos antes de que A2 duplique la estructura.
- Los nombres de área de los requisitos difieren entre niveles: A1 usa `gramatica / lexico / funcion / texto / fonologia`; A2 usa `gramatica / funciones / lessico / testi / pronuncia`. Unificar (y corregir las pruebas de cobertura que dependan de ellos).
- `course.json → levels` declara un nivel «A1+» sin unidades propias (las opcionales llevan `level` «A1+») y `u09`–`u12` (A2/B1) viajan en el paquete bloqueadas: decidir si pasan a sus módulos o se sacan.
- `RouteScreen` conserva la rama antigua «por unidades» (`milestoneOpen`) para cursos sin módulos: se puede retirar cuando haya módulos en todos los niveles.
- `web/src/state/targets.ts` y los textos «unidades de A1» de `Hoy`/`Ruta` mencionan A1 en prosa.

## Lo que A2 hereda ya resuelto (hecho el 2026-11-24, para no rehacerlo)

- **Cupo diario de palabras nuevas** (`NEW_WORDS_PER_DAY = 12` en `web/src/state/session.ts`; cuenta en `DayProgress.newWords`). Sirve igual para A2 sin tocar nada.
- **Frases reservadas** (`reserveParts` en `web/src/content/load.ts`): 3 por unidad se apartan de la práctica al cargar y solo las ven el Cierre del módulo y el hito; cada reintento rota la lista (`UnitProgress.tries`). **Mejora pendiente:** moverlo al pipeline (`assign_parts` en `pipeline/exercises/course.py`) para que el contenido publicado ya lo traiga. Una unidad con menos de 20 frases de práctica no aparta reserva (queda `[]` y cae a las frases de la prueba).
- **Mínimo de producción:** la escritura de la Salida pide 20 palabras (`OWN_TEXT_MIN_WORDS`) y la tarea oral del hito rota por intento. No hay corrección automática del italiano; el módulo sigue basándose en autoevaluación.
- **Pruebas de ruta y de cobertura** (`web/src/state/ruta.test.ts`, `tests/py/ruta_obligatoria.py`) ya son genéricas por nivel salvo lo del Paso 0.

## Hallazgos de la segunda auditoría que A2 hereda
- `g16` (subordinadas perché/quando/per + infinitivo) y `g13` (imperativo de «voi») quedaron «partial» en `syllabus-a1.json`: son candidatos a cápsulas de A2.
- `f10` (invitar, pedir permiso) y `l07` (emociones) están «covered» pero débiles; revisarlos al cotejar con los PDF.
- Conviene que `tests/py/test_cobertura_aN.py` compruebe contenido (por ejemplo, que haya frases con la estructura pedida), no solo que el id exista.
- El cupo de palabras nuevas ya se ajusta solo (12 al día, 18 si esperan más de 40: `newWordsCap`). Si A2 trae mucho más vocabulario por unidad, revisar los valores; más allá de 18 al día el atraso sigue creciendo.

## Lo que no se hizo en A1 y A2 puede heredar como riesgo

- La prueba de una cápsula usa solo sus 6–8 frases fijas (se rota el orden en el Cierre y el hito, no en la prueba de la cápsula).
- Los juegos de rol cuentan al terminarlos, sin umbral. Hablar no se mide más allá del dictado.
- Para escuchar solo hay voz sintética (Piper, `it_IT-serena-high`); los textos «solo escuchar» son 2.
- El italiano lo validó casi todo una IA (`manifest.json → reviewers`: `llm-audit` ≫ revisión propia). Cada módulo nuevo agrega textos escritos por la IA y obligatorios (`authored: true`).
- Nada se ha probado en un iPhone real.

## Decisiones que debe tomar la conversación de A2

1. ¿El hito bloquea de verdad el paso de nivel (hay que aprobarlo para abrir A2) o es solo una marca? La auditoría recomienda que bloquee, pero es tu decisión.
2. ¿Cómo se parte el paquete de contenido (por nivel, por módulo) y cómo se carga offline sin romper la regla de precache?
3. ¿Qué pasa con `u09`–`u12`: se integran a módulos de A2/B1 o se retiran?
4. ¿A2 mantiene 10 módulos o se acorta (la hoja de ruta sugiere 8–10)?
5. ¿El módulo de «pasado vs imperfetto» (el más difícil, sin generador) justifica un tipo de ejercicio nuevo o se resuelve con oraciones auditadas?

## Para B1 y B2 (solo anotado; no se planifica ahora)

El modelo actual es «una unidad = un código de error = frases sueltas» (`codes[0]` lo usan la prueba, el hito y el repaso; las lecturas tienen una mediana de unas 110 palabras). B1–B2 va a necesitar: lecturas largas con párrafos; escucha larga auténtica (la hoja de ruta ya reconoce que no hay fuente abierta verificada); una tarea de escritura extensa con rúbrica apoyada en `web/src/state/correctionPrompt.ts`; unidades «de discurso» (conectores, argumentar, narrar) que no sean un único error; y comprobar de verdad qué material abierto existe **antes** de planificar esos niveles.
