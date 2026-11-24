# Rediseño del frontend, etapa 3 (módulo y cápsula): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el módulo se vea entero en una pantalla como línea de tiempo, que tocar la cápsula en curso lleve directo a su siguiente paso, y que la ficha de la cápsula muestre el contraste español–italiano con forma propia.

**Architecture:** Solo capa `web/src/ui/` (+ estilos). Componentes nuevos en `ui/kit/`: `UnitStrip` (tira de pasos) y `ContrastCard`. `ModuleScreen` y `UnitScreen` se reescriben sobre ellos. Los datos salen de lo que ya existe (`unit.divergences`, `sentences.json`, `noticeCards`); no se cambian esquemas ni progreso guardado.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library. `npm --prefix web test`.

**Spec:** `docs/specs/2026-11-24-rediseno-frontend.md` (etapa 3). Maqueta: pantallas 3 y 4 de `docs/specs/2026-11-24-rediseno-frontend-maqueta.html`.

## Global Constraints

- Español neutro con tuteo; objetivos táctiles ≥ 44 px (`min-height: 44px` en todo enlace/botón nuevo); colores de hebra `--s-in/--s-form/--s-out/--s-flu` con `Tag`; terracota solo para la acción principal y lo que hay que notar; claro y oscuro; sin emoji en iconos.
- Rutas `#/…` existentes intactas; no se toca la lógica de `state/` salvo lo dicho; las pruebas se adaptan, no se eliminan.
- El estado hecho/actual/pendiente nunca va solo en color: lleva texto accesible (`aria-label` o texto oculto).
- No se inventa italiano: los ejemplos de contraste salen solo de `unit.divergences` con su frase de `sentences.json` (Tatoeba, con autor).
- Commits pequeños en español con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; sin `--force`. Línea base: 1043 pruebas web en verde.

## Review Focus

1. Módulo bloqueado o completado: no hay botón principal fijo; el completado deja repetir pasos.
2. Unidad sin divergencias (no hay ejemplos de contraste): no aparece la sección «Contraste» y no falla.
3. Unidad de sonidos (`SOUND_CODES`): el ejemplo dice «Así no se escribe», no «Error típico de hispanohablantes».
4. Unidad completada o bloqueada: `UnitScreen` sin botón «Empezar»; los pasos de una completada siguen abiertos.
5. Estado accesible de cada paso/etapa (no solo color).

---

### Task 1: Tira de pasos de la unidad (`UnitStrip`)

**Files:**
- Create: `web/src/ui/kit/UnitStrip.tsx`
- Test: `web/src/ui/kit/UnitStrip.test.tsx`

**Interfaces:**
- Consumes: `UnitView`, `stepsFor`, `canDoStep`, `STEP_LABEL` (`state/course.ts`).
- Produces: `STEP_SHORT: Record<StepId, string>` = `STEP_LABEL` salvo `prueba: "Prueba"`; `unitStepStates(view: UnitView): { id: StepId; label: string; state: "done" | "current" | "todo"; open: boolean }[]` (`done` si `view.progress.done[id]`, `current` si `view.next === id`, si no `todo`; `open = canDoStep(view, id)`); `UnitStrip({ view }: { view: UnitView })`: `<ol className="ustrip">`; cada paso abierto es `<a href="#/unidad/{id}/{step}">`, los cerrados `<span>`; `aria-label` = `` `${label}, ${hecho|toca ahora|pendiente}` ``; barra de color arriba (`data-state`), etiqueta debajo.

- [ ] **Step 1: Write the failing test** (`UnitStrip.test.tsx`, con `UnitView` armado a mano sobre un `Unit` mínimo con `codes`/`words` vacíos):
  - `it("unitStepStates marca hecho, actual y pendiente")`: `done: { descubre }`, `next: "capsula"` (unidad sin palabras ni lectura → pasos `descubre, capsula, practica, escucha, practica2, prueba`) → `["done","current","todo","todo","todo","todo"]`.
  - `it("la prueba se llama «Prueba» en la tira")`.
  - `it("los pasos abiertos son enlaces al paso y los cerrados no")`: unidad `current` → `descubre` es enlace con `href="#/unidad/u01/descubre"`, `practica` no tiene `closest("a")`.
  - `it("cada paso dice su estado además del color")`: `getByLabelText("Descubre, hecho")`, `getByLabelText("Cápsula, toca ahora")`, `getByLabelText("Práctica, pendiente")`.
- [ ] **Step 2: Run** `npm --prefix web test -- src/ui/kit/UnitStrip.test.tsx` → FAIL (módulo no existe).
- [ ] **Step 3: Implement** según Interfaces. Estilos `.ustrip` en `styles.css` (flex, `gap: 4px`, cada `li` `flex: 1; min-width: 0`, enlace/span `display:flex; flex-direction:column; min-height: 44px`, barra de 6 px con `--ok` hecho, degradado `--ok`/`--line` actual, `--line` pendiente; etiqueta 11 px que no se corta: `overflow-wrap: anywhere`).
- [ ] **Step 4: Run** el test → PASS; suite completa verde.
- [ ] **Step 5: Commit** `git commit -m "Tira de pasos de la unidad con estado accesible"`.

### Task 2: Tarjeta de contraste (`ContrastCard`)

**Files:**
- Create: `web/src/ui/kit/ContrastCard.tsx`
- Test: `web/src/ui/kit/ContrastCard.test.tsx`

**Interfaces:**
- Consumes: `noticeCards(unit, pack)` y `SOUND_CODES` (`state/steps.ts`); tipo `PackSentence`.
- Produces: `contrastCards(unit: Unit, pack: ContentPack, max?: number): ContrastData[]` con `ContrastData = { id: string; es: string; before: string; changed: string; after: string; wrong: string; soundOnly: boolean; author: string }` (máx. 3 por defecto; `soundOnly = SOUND_CODES.has(unit.codes[0])`; `author = sentence.author`); `ContrastCard({ data }: { data: ContrastData })`: bloque con `ES` (gris) y `IT` (serif grande, `<mark>` en `changed`) y una línea `«Así no se escribe (no sonaría igual)»` si `soundOnly`, si no `«Error típico de hispanohablantes»` seguida de `<del lang="it">{before + wrong + after}</del>`.

- [ ] **Step 1: Write the failing test:**
  - `it("contrastCards arma antes/cambio/después con la frase y su traducción")`: pack mínimo con una frase `{ id:"s1", it:"Tu sei Tom?", es:"¿Tú eres Tom?", author:"x" }` y `unit.divergences = [{ id:"s1", start:3, end:6, wrong:"siete" }]` → `[{ es:"¿Tú eres Tom?", before:"Tu ", changed:"sei", after:" Tom?", wrong:"siete", … }]`.
  - `it("máximo 3 y sin divergencias devuelve lista vacía")` (Review Focus 2).
  - `it("la tarjeta resalta lo que cambia y muestra el error típico")`: `getByText("sei").tagName === "MARK"`, `getByText(/Error típico de hispanohablantes/)`, `getByText("Tu siete Tom?")` dentro de `del`.
  - `it("en unidades de sonidos dice «Así no se escribe»")` (Review Focus 3): con `soundOnly: true`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**; reutilizar `noticeCards` (no duplicar la búsqueda de frases). Estilos `.contrast` (rejilla `28px 1fr`, etiqueta `ES`/`IT` 11 px, IT en `var(--serif)` 19 px) con tokens.
- [ ] **Step 4: Run** → PASS; suite verde.
- [ ] **Step 5: Commit** `git commit -m "Tarjeta de contraste español-italiano para la ficha"`.

### Task 3: Ficha de la cápsula (`UnitScreen`)

**Files:**
- Modify: `web/src/ui/UnitScreen.tsx`, `web/src/styles.css`
- Test: `web/src/ui/unitScreen.test.tsx` (nuevo); adaptar `web/src/ui/route.test.tsx` (≈ líneas 150-155)

**Interfaces:**
- Consumes: `UnitStrip` (Tarea 1), `ContrastCard`/`contrastCards` (Tarea 2), `stepSeconds`, `loadSamples`, `formatDuration`, `canDoStep`, `STEP_LABEL`.
- Comportamiento: enlace de vuelta `‹ {título del módulo}` a `#/modulo/{id}` (módulo = el de `pack.course.modules` que incluya la unidad; si no hay, `‹ Ruta` a `#/ruta`), clase `tap`; título (`lang="it"`) y `goal_es`; `UnitStrip`; sección «Contraste» con las `ContrastCard` (si hay); `ficha_es` en `<details className="ficha">` (abierto si aún no se hizo «Descubre», como hoy); «Por qué aquí» y duración total en `<small>`; botón fijo `<a className="button primary block">` `` `Empezar · ${STEP_LABEL[next]} · ${formatDuration(seconds)}` `` hacia `#/unidad/{id}/{next}` solo si `view.next` existe y `canDoStep(view, view.next)`; si la unidad está bloqueada, `role="status"` «Esta unidad se abre cuando completes la anterior.»; la mejor nota de la prueba se conserva. Desaparece la lista de siete tarjetas con «Hacer».

- [ ] **Step 1: Write the failing test** (`unitScreen.test.tsx`, pack real como en `modules.test.tsx`, vistas de `moduleViews(pack.course, [], false)`):
  - `it("muestra la tira de pasos y un solo botón «Empezar» al paso siguiente")` → `getByRole("link", { name: /^Empezar · / })` con `href` `#/unidad/{id}/{next}`; existe `getByRole("list", { name: … })` o `.ustrip`.
  - `it("la vuelta lleva al módulo de la unidad")` → enlace `‹ {módulo.title}` con `href="#/modulo/{m.id}"`.
  - `it("muestra tarjetas de contraste cuando la unidad tiene divergencias y no la sección si no")` (Review Focus 2).
  - `it("una unidad completada no ofrece «Empezar» pero deja repetir pasos")` (Review Focus 4): `moduleViews` con la unidad completada → sin enlace `/^Empezar/`, y `getByLabelText("Descubre, hecho").closest("a")`.
  - `it("una unidad bloqueada lo dice y no ofrece botón")`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** y estilos (`main.unit` con `padding-bottom` para el botón fijo). **Adaptar** `route.test.tsx` línea ≈154: `getAllByRole("link", { name: /Empezar|Hacer|Repetir/ })` pasa a esperar un enlace `/^Empezar · /`.
- [ ] **Step 4: Run** `npm --prefix web test` completo → verde.
- [ ] **Step 5: Commit** `git commit -m "Ficha de la cápsula: tira de pasos, contraste y un botón al paso siguiente"`.

### Task 4: Módulo como línea de tiempo (`ModuleScreen`)

**Files:**
- Modify: `web/src/ui/ModuleScreen.tsx`, `web/src/styles.css`
- Test: `web/src/ui/moduleTimeline.test.tsx` (nuevo); adaptar `web/src/ui/modules.test.tsx` (≈ líneas 33-39)

**Interfaces:**
- Consumes: `ModuleView`, `MODULE_STEP_LABEL`, `MODULE_STEP_SECONDS`, `salidaMissing`, `Tag`, `STEP_LABEL`, `stepSeconds`, `formatDuration`.
- Produces: `moduleAction(view: ModuleView, pack: ContentPack, samples?: Samples): { href: string; label: string } | null` exportada de `ModuleScreen.tsx`: `null` si el módulo está `completed`/`locked` o no hay paso siguiente; si `next === "capsulas"`, la unidad actual (`view.units.find(u => u.state === "current")`) con `href: #/unidad/{id}/{unit.next}` y `label: "{STEP_LABEL[unit.next]} · {duración}"`; si no, `href: #/modulo/{id}/{next}` y `label: "{MODULE_STEP_LABEL[next]} · {duración de MODULE_STEP_SECONDS}"`.
- Comportamiento de la pantalla: `‹ Ruta`, `Módulo N`, título; línea de tiempo vertical con 5 filas (Entrada, Cápsulas, Salida, Fluidez, Cierre): punto ✓ hecho / aro actual / vacío, `Tag` de hebra (Entrada→`entrada`, Cápsulas→`foco`, Salida→`salida`, Fluidez→`fluidez`, Cierre→`salida`), texto de estado accesible; los pasos propios abiertos son enlaces a `#/modulo/{id}/{step}` (hechos: repetir); la fila Cápsulas lista cada cápsula con puntos de sus pasos (`stepsFor`) y: la actual enlaza **directo a su siguiente paso** (`#/unidad/{id}/{next}`) con un enlace secundario `Ficha` a `#/unidad/{id}`; las completadas enlazan a `#/unidad/{id}`; las bloqueadas, sin enlace; «Salida» conserva el «Falta: …»; botón fijo con `moduleAction` («Continuar · …»); debajo, plegados: «Al terminar sabrás» (`can_do_es`), el hueco `gap_es` si existe, «Textos para leer» (`extra_readings`) y la mejor nota del cierre.

- [ ] **Step 1: Write the failing test:**
  - `it("moduleAction apunta al paso siguiente de la cápsula en curso, no a la pantalla de la unidad")`: módulo 1 con Entrada hecha → `href` `#/unidad/{primera unidad}/descubre`.
  - `it("moduleAction sin Entrada hecha apunta a la Entrada del módulo")` → `#/modulo/{id}/entrada`.
  - `it("módulo bloqueado o completado no tiene acción")` (Review Focus 1), con `moduleViews` de pack real (bloqueado = módulo 2 sin progreso; completado = unidades con `mastery: "ubicacion"`).
  - `it("la línea de tiempo muestra las cinco etapas con su estado en texto")`: `getByText("Entrada")`… y `getByLabelText(/Entrada, (hecho|toca ahora|pendiente)/)`.
  - `it("la cápsula actual enlaza directo a su paso y tiene enlace «Ficha»")`.
  - `it("el módulo completado deja repetir sus pasos")`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** (`ModuleScreen` + estilos `.tl`, `.st`, `.dot`, `.pips`). **Adaptar** `modules.test.tsx` ≈ línea 38: en lugar de `getByRole("link", { name: "Empezar" })`, esperar `getByRole("link", { name: /^Continuar · Entrada/ })` con `href` `#/modulo/{id}/entrada`; mantener las comprobaciones de `can_do_es` y etapas.
- [ ] **Step 4: Run** suite completa → verde.
- [ ] **Step 5: Commit** `git commit -m "Módulo como línea de tiempo con acceso directo al paso siguiente"`.

### Task 5: Verificación visual y registro

- [ ] **Step 1:** `npm --prefix web run build`; `preview_start` (`web-preview`); en el navegador quitar el modo de prueba para ver el estado real y activar el modo de prueba para ver una unidad con datos; tamaño `mobile` (375), 320 y oscuro.
- [ ] **Step 2:** Capturas: módulo 1 (línea de tiempo), ficha de `u13` (tira + contraste + ficha), ficha de una unidad de sonidos (`u18`), un módulo con la Salida con «Falta…». Sin errores de consola, sin desborde horizontal, toques ≥ 44 px (comprobar con `getBoundingClientRect` los enlaces nuevos).
- [ ] **Step 3:** Actualizar `CONTINUIDAD.md` (entrada nueva: qué se hizo, decisiones, pendientes) y el rumbo en `CLAUDE.md` (etapa 3 hecha, 4–5 pendientes); commit `Registro: rediseño del frontend, etapa 3`. Mostrar las capturas al usuario antes de la etapa 4.

## Decisiones que tomé yo (a revisar)

- **`ConjugationTable` queda fuera.** El spec la pedía, pero los datos de una unidad (`ficha_es`) son texto libre: no hay formas estructuradas (persona → forma). Parsearlo del texto sería frágil y escribir paradigmas nuevos es contenido de IA que necesita su propio flujo (`authored`, `needs_review`). Se hará cuando exista el dato; la ficha seguirá mostrando `ficha_es` como texto.
- **Ejemplos de contraste = `unit.divergences`** (frases reales de Tatoeba), no texto nuevo. La «regla en una línea» del spec no tiene dato propio: se usa `goal_es` bajo el título y `ficha_es` plegada.
- **«Ver ficha» desde los ejercicios** es de la etapa 4; esta etapa solo deja la ficha como destino (`#/unidad/{id}`) y el enlace `Ficha` en la fila de la cápsula en curso.
- **`Timeline` no es componente aparte:** se usa en una sola pantalla; va dentro de `ModuleScreen`.
