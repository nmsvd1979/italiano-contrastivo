# Rediseño del frontend, etapa 5 (Progreso): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que «Progreso» responda «¿estoy aprendiendo?» con lo que ya sabes hacer (los `can_do_es` de cada módulo), tu constancia de las últimas 4 semanas y el tiempo real por tipo de práctica.

**Architecture:** Dos módulos de estado nuevos y puros (`state/cando.ts`, `state/calendar.ts`), la lista de «sé hacer» de la pantalla de Cierre pasa a guardarse en el progreso del módulo (`done["sabe:<clave>"]`, sin cambiar el esquema), y `ProgressScreen` se rehace sobre ellos. «Lo que más te cuesta» NO entra: exige un almacén de aciertos por tipo de error que hoy no existe.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library. `npm --prefix web test`.

**Spec:** `docs/specs/2026-11-24-rediseno-frontend.md` (etapa 5). Maqueta: pantalla 7 de `docs/specs/2026-11-24-rediseno-frontend-maqueta.html`.

## Global Constraints

- Español neutro con tuteo; toques ≥ 44 px; claro y oscuro con tokens; el estado nunca solo en color; sin emoji en iconos.
- Honestidad: lo «probado» (módulo completado con la prueba ≥ 80 % o por ubicación) y lo «marcado por ti» (autoevaluación) se distinguen siempre; ninguna de las dos cosas se presenta como verificada por un nativo.
- Las cifras de la maqueta eran de ejemplo: la pantalla usa solo datos reales; sin datos muestra un estado vacío que explica cómo se llena.
- No se cambia el esquema de progreso: las marcas viven en `UnitProgress.done` del módulo (`mod:<id>`), como ya viven las partes `salida:*`. Copias de seguridad y restauración siguen valiendo.
- Se conservan rutas, `WeekCard` (detallada), la racha y las pruebas existentes (se adaptan, no se eliminan).
- Línea base: 1097 pruebas web en verde. Commits pequeños en español con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; sin `--force`.

## Review Focus

1. Curso sin módulos o módulo sin `can_do_es`: «Ya sabes hacer» no aparece y nada falla.
2. Módulo completado por la prueba de ubicación: sus «sé hacer» cuentan como probados.
3. Desmarcar en el Cierre quita la marca guardada.
4. Días antiguos sin `seconds` pero con estudio (`isActive`) cuentan como día de estudio; días con segundos y sin pasos también.
5. El calendario respeta la fecha local (no UTC) y no pinta días futuros de la semana en curso como estudiados.

---

### Task 1: «Sé hacer» (estado puro)

**Files:**
- Create: `web/src/state/cando.ts`
- Test: `web/src/state/cando.test.ts`

**Interfaces:**
- Consumes: `ModuleView` (`state/modules.ts`), `UnitProgress` (`state/store.ts`).
- Produces:
  - `canDoKey(text: string): string` → `` `sabe:${hash}` `` con un hash corto y estable (djb2 en base 36) del texto; el mismo texto da siempre la misma clave.
  - `setCanDo(p: UnitProgress, text: string, on: boolean, now: Date): UnitProgress` → añade `done[canDoKey(text)] = now.toISOString()` o la quita; no toca nada más.
  - `CanDoItem = { text: string; state: "probado" | "marcado" | "pendiente" }`; `canDoSummary(modules: ModuleView[]): { known: number; total: number; groups: { moduleId: string; title: string; index: number; state: ModuleView["state"]; items: CanDoItem[] }[] }`. Un ítem es `probado` si su módulo está `completed`; si no, `marcado` si `progress.done[canDoKey(text)]`; si no, `pendiente`. `known` cuenta probados + marcados; los módulos sin `can_do_es` no generan grupo.

- [ ] **Step 1: Write the failing test** (`cando.test.ts`, con módulos armados a mano como `{ module: { id, title, can_do_es }, index, state, progress }`): `canDoKey` estable y distinto para textos distintos; `setCanDo` marca y desmarca sin tocar otras claves (`entrada`, `salida:habla`); `canDoSummary` cuenta probados de un módulo `completed` incluso sin marcas (Review Focus 2), marcados de uno `current`, `pendiente` el resto, `known/total` correctos, y devuelve `{ known: 0, total: 0, groups: [] }` para `[]` y para módulos con `can_do_es: []` (Review Focus 1).
- [ ] **Step 2: Run** `npm --prefix web test -- src/state/cando.test.ts` → FAIL.
- [ ] **Step 3: Implement** según Interfaces.
- [ ] **Step 4: Run** → PASS; suite completa verde.
- [ ] **Step 5: Commit** `git commit -m "Estado de «sé hacer»: claves, marcas y resumen por módulo"`.

### Task 2: El Cierre guarda lo que marcas

**Files:**
- Modify: `web/src/ui/ModuleStepScreen.tsx` (componente `Cierre`, lista de «¿Qué sabes hacer ya?»)
- Test: `web/src/ui/cierreMarks.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `setCanDo`, `canDoKey` (Tarea 1); `store.getUnit`/`putUnit`; `moduleProgressId`.
- Comportamiento: las casillas arrancan con lo ya guardado (`view.progress.done[canDoKey(c)]`); al cambiar una casilla se guarda en el progreso del módulo (`setCanDo` + `putUnit`, partiendo de `store.getUnit(moduleProgressId(id))` o `emptyProgress`); desmarcar la quita. El texto pasa a «Marca lo que de verdad puedes hacer sin mirar. Se guarda en este dispositivo y aparece en Progreso como «marcado por ti»; no cuenta para completar el módulo: lo que quede sin marcar conviene repasarlo antes de la prueba.»

- [ ] **Step 1: Write the failing test** (`cierreMarks.test.tsx`, `ModuleStepScreen` con `step="cierre"` y `memoryStore`, módulo real de `course.json` abierto con el modo de prueba o con las cápsulas completadas): marcar una casilla guarda `sabe:*` en `mod:<id>`; recargar la pantalla la muestra marcada; desmarcar la quita (Review Focus 3); marcar no cambia `completed` ni `done.cierre`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** suite completa → verde.
- [ ] **Step 5: Commit** `git commit -m "El Cierre del módulo guarda lo que marcas que sabes hacer"`.

### Task 3: Calendario de constancia (estado puro)

**Files:**
- Create: `web/src/state/calendar.ts`
- Test: `web/src/state/calendar.test.ts`

**Interfaces:**
- Consumes: `DayProgress`, `isActive` (`state/streak.ts`), `totalSeconds` (`state/strands.ts`).
- Produces: `CalendarCell = { date: string; seconds: number; studied: boolean; future: boolean; level: 0 | 1 | 2 }` y `fourWeeks(days: DayProgress[], today: string): { cells: CalendarCell[]; studiedDays: number; seconds: number }` con 28 celdas en orden (4 semanas, lunes a domingo, la última fila es la semana de `today`). `studied = isActive(day) || seconds > 0`; `future = date > today`; `level`: 0 sin estudio, 1 menos de 10 min, 2 de 10 min o más; las celdas futuras son nivel 0 y no cuentan. `studiedDays` y `seconds` suman solo celdas no futuras.

- [ ] **Step 1: Write the failing test:** 28 celdas con la semana en curso al final y lunes primero; un día antiguo con `reviewsDone` y sin `seconds` cuenta (Review Focus 4); un día con segundos y sin pasos cuenta; niveles 0/1/2 en los umbrales (599 s → 1, 600 s → 2); los días posteriores a `today` dentro de la semana son `future` y nunca `studied` (Review Focus 5); `today` a medianoche local (`"2026-11-24"` es martes) coloca la celda correcta sin depender de UTC.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** con fechas `YYYY-MM-DD` (aritmética por componentes, como `streak.ts`, sin `Date` local).
- [ ] **Step 4: Run** → PASS; suite verde.
- [ ] **Step 5: Commit** `git commit -m "Calendario de constancia de las últimas cuatro semanas"`.

### Task 4: Pantalla «Progreso»

**Files:**
- Modify: `web/src/ui/ProgressScreen.tsx`, `web/src/App.tsx` (componente `Progress`), `web/src/styles.css`
- Test: `web/src/ui/progressScreen.test.tsx` (nuevo); adaptar `web/src/ui/tabs.test.tsx` (caso «Progreso»)

**Interfaces:**
- `ProgressScreen({ week, days, today, modules }: { week: Seconds; days: DayProgress[]; today: string; modules: ModuleView[] })`.
- Contenido, en este orden: título «Progreso» + enlace `Ajustes` (`a.tap`); sección **Ya sabes hacer** (`known de total`, barra; por módulo un `<details>` con su título, «n de m» y la lista de ítems con estado en texto («probado en el cierre», «marcado por ti», «pendiente»); abierto el módulo en curso; si `total === 0` la sección no aparece); sección **Últimas 4 semanas** (rejilla 7×4 `aria-hidden` con niveles por token, rótulo de días `L M X J V S D`, y texto «N días de estudio · H h M min en total»; sin datos, «Cuando estudies, aquí verás tu constancia.»); `WeekCard` (tiempo por tipo de práctica); enlace «Acerca de la app…» (`a.tap`). Una línea honesta bajo «Ya sabes hacer»: lo «marcado por ti» es autoevaluación y lo «probado» viene de la prueba de cierre o de ubicación; ninguna es una verificación de un hablante nativo. Un texto breve dice que «Lo que más te cuesta» llegará cuando la app guarde tus aciertos por tipo de error (no se promete fecha).
- `App.tsx` `Progress` carga `useDayData(store)`, calcula `moduleViews(pack.course, data.units)` y pasa `days`, `today = localDate(new Date())`.

- [ ] **Step 1: Write the failing test** (`progressScreen.test.tsx`, pack real de `course.json`): sin datos muestra el vacío del calendario y «Ya sabes hacer» con `0 de N`; con un módulo completado muestra sus ítems como «probado en el cierre» y `known` correcto; con una marca en un módulo en curso la muestra «marcado por ti»; sin módulos no hay sección (Review Focus 1); el calendario da `N días de estudio`; los enlaces `Ajustes` y `Acerca` siguen y miden ≥ 44 px (clase `tap`); el texto de honestidad está.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**; el módulo en curso abierto con `<details open>`; rejilla con `display: grid; grid-template-columns: repeat(7, 1fr)`, celdas cuadradas con `aspect-ratio: 1`, niveles `var(--line)` / mezcla de `--ok` / `--ok`.
- [ ] **Step 4: Adaptar** `tabs.test.tsx` (el caso «enlaza a Ajustes y a Acerca de» ahora recibe las props nuevas) y correr la suite completa → verde.
- [ ] **Step 5: Commit** `git commit -m "Progreso: lo que ya sabes hacer, constancia de cuatro semanas y tiempo real"`.

### Task 5: Verificación visual y registro

- [ ] **Step 1:** `npm --prefix web run build`; `preview_start`; en el navegador sembrar un progreso de ejemplo en IndexedDB (módulo 1 completo, marcas en el módulo 2, 12 días de estudio repartidos en 4 semanas) para ver los estados; 375 y 320 px, claro y oscuro; luego borrar lo sembrado.
- [ ] **Step 2:** Capturas de Progreso vacío, con datos y con el módulo en curso desplegado; comprobar toques ≥ 44 px, sin desborde ni errores de consola; marcar/desmarcar en el Cierre y ver el cambio en Progreso.
- [ ] **Step 3:** `CONTINUIDAD.md` (entrada nueva), `CLAUDE.md` (etapas 1–5 hechas; pendiente «Lo que más te cuesta»); commit `Registro: rediseño del frontend, etapa 5`. Mostrar capturas.

## Decisiones que tomé yo (a revisar)

- **Dónde viven las marcas:** en `done["sabe:<hash>"]` del progreso del módulo, no en un almacén nuevo. Es lo mismo que ya hacen las partes `salida:*`; si más adelante el contenido cambia el texto de un «sé hacer», esa marca se pierde en silencio (la clave depende del texto).
- **Probado vs marcado:** un módulo completado da por «probados» todos sus «sé hacer» aunque no los hayas marcado (la prueba de cierre mezcla frases de todas sus cápsulas); es una aproximación y por eso se rotula como «probado en el cierre», no como «dominado».
- **«Lo que más te cuesta» queda fuera** hasta que exista el almacén de aciertos por tipo de error; la pantalla lo dice sin prometer fecha.
- **Umbral del calendario:** 10 min por día separa «poco» de «bastante»; es un valor mío, no un dato de la literatura.
