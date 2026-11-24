# Rediseño del frontend, etapas 1 y 2: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar listas la base visual (colores de hebra, iconos, etiquetas, arreglo del scroll) y las pantallas Hoy, Ruta, Practicar y Progreso (mínimo) con las cinco pestañas nuevas, sin tocar la lógica de contenido ni de progreso.

**Architecture:** Solo cambia la capa `web/src/ui/` (más dos campos nuevos de presentación en `state/dayplan.ts` y `state/strands.ts`). Los componentes nuevos viven en `web/src/ui/kit/`. Las rutas `#/…` actuales se conservan; se añaden `#/practicar` y `#/progreso`. Las pruebas de las pantallas tocadas se adaptan, no se eliminan.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library (jsdom). Se corre con `npm --prefix web test`.

**Spec:** `docs/specs/2026-11-24-rediseno-frontend.md` (maqueta: `docs/specs/2026-11-24-rediseno-frontend-maqueta.html`).

## Global Constraints

- Interfaz y explicaciones en español neutro con tuteo; código e identificadores en inglés (el proyecto mezcla: sigue los nombres existentes en cada archivo).
- Cinco pestañas, en este orden y con estos textos: `Hoy`, `Ruta`, `Practicar`, `Biblioteca`, `Progreso`. Iconos SVG de trazo, sin emoji.
- Colores de hebra: Entender = `--s-in`, Estudiar = `--s-form`, Producir = `--s-out`, Fluidez = `--s-flu`. Terracota (`--accent`) solo para la acción principal y lo que hay que notar.
- Valores de partida (claro / oscuro): `--s-in` `#2f7bc4` / `#6fb0ea`; `--s-form` `#6f66cf` / `#a39bff`; `--s-out` `#b7791f` / `#e0a84f`; `--s-flu` `#1f7a7a` / `#5cc2c2`. El texto de las etiquetas usa `--card`; si algún par queda bajo 4,5:1 se oscurece/aclara el fondo hasta pasar.
- Se conservan: paleta papel/tinta/terracota, italiano en serif, modo oscuro, `prefers-reduced-motion`, objetivos táctiles ≥ 44 px, lógica de progreso/repaso/pruebas, rutas `#/…` existentes.
- Los avisos de honestidad (texto IA sin revisar por nativo, sin prueba en iPhone) no se eliminan: se pliegan donde ya existen.
- Commits pequeños, en español, un tema por commit, terminados con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Nunca `--force`. Este worktree está en la rama `claude/language-app-frontend-design-15eb2c` (la regla de commitear a `main` se aplica al integrar).
- Línea base antes de empezar: `npm --prefix web test` en verde (≈994 pruebas web).

## Review Focus

Entradas o condiciones que el spec implica y ninguna tarea probaría por sí sola. Cada una tiene su prueba en la tarea que se indica.

1. Todo completado hoy (sin repaso, sin unidad ni módulo pendiente): Hoy no revienta y ofrece «Ver la ruta». → Tarea 4.
2. Solo hay un bloque pendiente: «Solo N min» no se repite con el botón principal. → Tarea 4.
3. Semana sin datos: la barra apilada muestra el texto vacío, no una barra rota. → Tarea 4.
4. Contraste de las etiquetas de hebra ≥ 4,5:1 en claro y en oscuro. → Tarea 2.
5. Ruta con todos los módulos completados (ninguno «actual») y las pantallas Ajustes/Acerca marcando la pestaña Progreso. → Tareas 3 y 5.

---

### Task 1: Volver arriba al cambiar de pantalla

**Files:**
- Create: `web/src/ui/kit/useScrollTop.ts`
- Test: `web/src/ui/kit/useScrollTop.test.tsx`
- Modify: `web/src/App.tsx` (llamar al hook en `App`)

**Interfaces:**
- Produces: `useScrollTop(hash: string): void` — al cambiar `hash` (no en el primer render) llama `window.scrollTo(0, 0)`.

- [ ] **Step 1: Write the failing test** (`useScrollTop.test.tsx`): con `window.scrollTo = vi.fn()`, un componente de prueba que llama `useScrollTop(hash)`. Casos: `it("no se desplaza en el primer render")` → `scrollTo` no llamado; `it("vuelve arriba cuando cambia el hash")` → tras `rerender` con otro hash, `scrollTo` llamado una vez con `(0, 0)`; `it("no se desplaza si el hash no cambia")` → `rerender` con el mismo hash, sigue en 0 llamadas.
- [ ] **Step 2: Run** `npm --prefix web test -- src/ui/kit/useScrollTop.test.tsx` → FAIL (módulo no existe).
- [ ] **Step 3: Implement** `useScrollTop` en `web/src/ui/kit/useScrollTop.ts` con un `useRef` que guarda el hash anterior y un `useEffect`. Llamarlo en `App()` de `web/src/App.tsx` justo después de `useHash()`.
- [ ] **Step 4: Run** el test → PASS; luego `npm --prefix web test` completo → verde.
- [ ] **Step 5: Commit** `git add web/src/ui/kit/useScrollTop.ts web/src/ui/kit/useScrollTop.test.tsx web/src/App.tsx` · `git commit -m "Vuelve arriba al cambiar de pantalla"`.

### Task 2: Colores de hebra y etiqueta `Tag`

**Files:**
- Modify: `web/src/styles.css` (tokens `--s-*` claro/oscuro; reglas `.tag`, `.tag[data-strand=…]`)
- Modify: `web/src/state/strands.ts` (añadir `STRAND_TAG`)
- Create: `web/src/ui/kit/Tag.tsx`
- Test: `web/src/ui/kit/tokens.test.ts`, `web/src/ui/kit/Tag.test.tsx`

**Interfaces:**
- Consumes: `Strand` de `state/strands.ts`.
- Produces: `STRAND_TAG: Record<Strand, string>` = `{ entrada: "Entender", foco: "Estudiar", salida: "Producir", fluidez: "Fluidez" }`; `Tag({ strand }: { strand: Strand }): JSX.Element` que renderiza `<span className="tag" data-strand={strand}>{STRAND_TAG[strand]}</span>`.

- [ ] **Step 1: Write the failing tests.**
  - `Tag.test.tsx`: `it("muestra el nombre corto de la hebra")` → `render(<Tag strand="foco" />)`, `getByText("Estudiar")` con `data-strand="foco"`; `it("las cuatro hebras tienen nombre distinto")` → los cuatro valores de `STRAND_TAG` son únicos.
  - `tokens.test.ts`: lee `web/src/styles.css` con `fs`, extrae los valores `--s-in/--s-form/--s-out/--s-flu` y `--card` del primer bloque `:root` (claro) y del bloque `@media (prefers-color-scheme: dark)` (oscuro), implementa `contrast(hexA, hexB)` según WCAG 2.1 y comprueba `expect(contrast(strandColor, card)).toBeGreaterThanOrEqual(4.5)` para las 4 hebras en ambos temas (8 aserciones, con `it.each`).
- [ ] **Step 2: Run** `npm --prefix web test -- src/ui/kit` → FAIL.
- [ ] **Step 3: Implement.** Añadir los tokens a `:root` y a su bloque oscuro en `styles.css` con los valores de partida; `.tag { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; color: var(--card); flex: none }` y `.tag[data-strand="entrada"] { background: var(--s-in) }` (igual para las otras tres). `STRAND_TAG` en `strands.ts`; `Tag.tsx` en `ui/kit/`. Si `tokens.test.ts` falla por contraste, ajustar el valor del token fallido (más oscuro en claro, más claro en oscuro) y anotar el valor final en `styles.css`.
- [ ] **Step 4: Run** los tests → PASS; suite completa verde.
- [ ] **Step 5: Commit** `git commit -m "Colores de hebra, etiqueta Tag y prueba de contraste"`.

### Task 3: Iconos, cinco pestañas, Practicar y Progreso (mínimo)

**Files:**
- Create: `web/src/ui/kit/Icon.tsx`, `web/src/ui/PracticeScreen.tsx`, `web/src/ui/ProgressScreen.tsx`
- Modify: `web/src/ui/kit/TabBar.tsx`, `web/src/App.tsx` (rutas `#/practicar`, `#/progreso`; extraer el cargador de `Today` a `useDayData`), `web/src/ui/SettingsScreen.tsx` y `web/src/ui/AboutScreen.tsx` (enlace «‹ Progreso» arriba), `web/src/ui/RouteScreen.tsx` (quitar la sección «Práctica libre»), `web/src/styles.css` (`.tabbar svg`)
- Test: `web/src/ui/tabs.test.tsx` (nuevo); adaptar `web/src/ui/design.test.tsx` (aserción de TabBar y de `isFocusRoute`) y las pruebas que busquen la pestaña «Repaso» o «Ajustes» por texto

**Interfaces:**
- Produces: `Icon({ name }: { name: "hoy" | "ruta" | "practicar" | "biblioteca" | "progreso" })` (SVG inline, `aria-hidden`, trazo `currentColor`, 20 px); `PracticeScreen({ review }: { review: TodayPlan["review"] })`; `ProgressScreen({ week }: { week: Seconds })`; `useDayData(store: Store): { cards: Card[]; day: DayProgress; units: UnitProgress[]; days: DayProgress[] } | null` (la lógica de carga y el `visibilitychange` que hoy están dentro de `Today` en `App.tsx`, sin cambiar su comportamiento).
- Rutas nuevas: `#/practicar` → `PracticeScreen`, `#/progreso` → `ProgressScreen`. La pestaña `Practicar` está activa en `#/practicar`, `#/hablar`, `#/escribir`; `Progreso` en `#/progreso`, `#/ajustes`, `#/acerca`. `isFocusRoute` no cambia (`#/repaso` sigue sin menú).
- Contenido de `PracticeScreen`: tarjeta «Repaso» (cuántas tarjetas tocan hoy y minutos según `review`; botón «Repasar» → `#/repaso`; con 0 pendientes dice «No tienes repasos pendientes ahora»), tarjeta «Hablar» (enlace «Juegos de roles, tareas y frases» → `#/hablar`), tarjeta «Escribir» (enlace «Reconstruir un texto y escribir el tuyo» → `#/escribir`), cada una con `<Tag strand>` (Repaso: `foco`; Hablar y Escribir: `salida`).
- Contenido de `ProgressScreen`: `<h1>Progreso</h1>`, enlace «Ajustes» → `#/ajustes`, `<WeekCard week={week} />` y enlace «Acerca de la app» → `#/acerca`. (La parte «Ya sabes hacer» llega en la etapa 5.)

- [ ] **Step 1: Write the failing tests** (`tabs.test.tsx`):
  - `it("hay cinco pestañas en orden")` → `render(<TabBar hash="#/" />)`; los textos de los enlaces, en orden: `["Hoy","Ruta","Practicar","Biblioteca","Progreso"]`.
  - `it.each` de `[ "#/hablar", "#/escribir", "#/practicar" ]` → «Practicar» tiene `aria-current="page"`; `it.each` de `[ "#/ajustes", "#/acerca", "#/progreso" ]` → «Progreso» lo tiene (Review Focus 5).
  - `it("cada pestaña lleva un icono SVG y ningún emoji")` → cada `<a>` contiene un `svg` y su texto no coincide con `/\p{Extended_Pictographic}/u`.
  - `it("Practicar con repasos pendientes muestra el conteo y enlaza al repaso")` → `PracticeScreen` con `review` de 6 vencidas: texto «6» y enlace `Repasar` con `href="#/repaso"`; con 0: «No tienes repasos pendientes ahora».
  - `it("Progreso enlaza a Ajustes")` → enlace `Ajustes` con `href="#/ajustes"`.
- [ ] **Step 2: Run** `npm --prefix web test -- src/ui/tabs.test.tsx` → FAIL.
- [ ] **Step 3: Implement** los componentes y rutas. Trazos de los iconos tomados de la maqueta (`#i-hoy`, `#i-ruta`, `#i-prac`, `#i-bib`, `#i-prog` en `docs/specs/2026-11-24-rediseno-frontend-maqueta.html`). En `RouteScreen.tsx` borrar la sección «Práctica libre». Adaptar `design.test.tsx`: el caso «las pantallas de trabajo ocultan el menú…» sigue igual salvo que `TabBar` ya tiene 5 pestañas.
- [ ] **Step 4: Run** `npm --prefix web test` completo → verde (adaptar lo que falle por textos de pestañas, sin borrar casos).
- [ ] **Step 5: Commit** `git commit -m "Cinco pestañas con iconos propios; Practicar y Progreso mínimos"`.

### Task 4: Hoy rediseñado

**Files:**
- Modify: `web/src/state/dayplan.ts` (campos nuevos en `SessionBlock`), `web/src/ui/TodayScreen.tsx`, `web/src/styles.css`
- Create: `web/src/ui/kit/WeekBar.tsx`
- Test: `web/src/ui/today.test.tsx` (nuevo); adaptar `web/src/ui/ui.test.tsx` (bloque `describe("TodayScreen")`, líneas ≈124–150) y `web/src/state/dayplan.test.ts` (si cubre `SessionBlock`)

**Interfaces:**
- Consumes: `STRAND_TAG`, `Tag` (Tarea 2), `STRAND_OF_STEP` (`state/strands.ts`).
- Produces:
  - `SessionBlock` gana `strand: Strand` y `label: string`. `label`: repaso → `"Repaso"`; paso de unidad → `STEP_LABEL[step]`; paso de módulo → `MODULE_STEP_LABEL[step]`. `strand`: repaso → `"foco"`; paso de unidad → `STRAND_OF_STEP[step]`; paso de módulo → `entrada→"entrada"`, `salida→"salida"`, `fluidez→"fluidez"`, `cierre→"salida"`. `subtitle` y `title` no cambian.
  - `secondaryActions(plan: TodayPlan, blocks: SessionBlock[] | undefined, primaryHref: string): { short: { href: string; label: string } | null; other: { href: string; label: string } }` exportada de `TodayScreen.tsx`. `short` = el bloque no hecho de menor duración con `seconds <= 300` y `href !== primaryHref`, con `label` `` `Solo ${Math.ceil(seconds / 60)} min` ``; `null` si no hay. `other` = `{ href: "#/practicar", label: "Elegir otra cosa" }`.
  - `WeekBar({ week }: { week: Seconds })`: barra apilada con un segmento por hebra (ancho proporcional, color de hebra), debajo `Entender 22 · Estudiar 48 · Producir 9 · Fluidez 6` (minutos redondeados, `<1` si hay menos de 60 s) y, con ≥ 20 min en total, una frase `«{Hebra} va corto esta semana.»` para la menos trabajada, con enlace a `#/practicar`. Sin datos: «Cuando estudies, aquí verás cuánto tiempo real dedicas a cada tipo de práctica.»
- Comportamiento de `TodayScreen`: tarjeta «Tu sesión» con eyebrow y título como hoy (unidad o módulo), filas = bloques (`<Tag strand>` + `label` en negrita + `subtitle` pequeño + minutos o ✓), botón principal `<a className="button primary block">` fijo abajo con texto `` `${nothingToday ? "Empezar" : "Continuar"} · ${action.label}` `` donde `nothingToday = day.reviewsDone === 0 && plan.stepsToday === 0`; debajo del bloque, los dos botones secundarios de `secondaryActions`; `WeekBar` en lugar de `WeekCard`; «Cómo empezar» como `<details open>` solo en `firstTime`. Se conservan racha (`chip`), `storeError` y la línea «Hoy llevas N pasos y N repasos». Se retira el uso de `BLOCKS[…].color` y de los números ①②③④ en esta pantalla.

- [ ] **Step 1: Write the failing tests** (`today.test.tsx`, reutilizando los helpers de `ui.test.tsx` si están exportados o copiando `pack()`/`NOW` mínimos):
  - `it("cada fila de la sesión lleva su etiqueta de hebra")` → con plan de repaso + Descubre: aparecen `Estudiar` (por repaso y por Descubre) y el texto `Repaso` y `Descubre`.
  - `it("«Empezar» si hoy no se ha hecho nada y «Continuar» si ya se hizo algo")` → `day.reviewsDone = 0` → `/^Empezar · /`; con `reviewsDone = 2` → `/^Continuar · /`.
  - `it("secondaryActions: «Solo N min» es el bloque pendiente más corto y no repite el principal")` → bloques de 180 s (href A) y 420 s (href B): con `primaryHref` B devuelve `short = { href: A, label: "Solo 3 min" }`; con `primaryHref` A devuelve `short: null` porque el otro dura > 300 s.
  - `it("con un solo bloque no hay «Solo N min»")` → Review Focus 2.
  - `it("todo hecho: sin filas pendientes ofrece «Ver la ruta» y no falla")` → plan sin repaso, sin unidad ni módulo (todas las unidades `masterByPlacement`): botón `Ver la ruta` con `href="#/ruta"` (Review Focus 1).
  - `it("WeekBar sin datos muestra el texto vacío; con datos, minutos por hebra y la hebra corta")` → `week={}` → texto «aquí verás cuánto tiempo real»; `week={{ foco: 25*60, entrada: 5*60, salida: 60 }}` → contiene `Estudiar 25`, `Fluidez` como hebra corta con enlace a `#/practicar` (Review Focus 3).
- [ ] **Step 2: Run** `npm --prefix web test -- src/ui/today.test.tsx` → FAIL.
- [ ] **Step 3: Implement** `dayplan.ts` (rellenar `strand` y `label` en los tres sitios donde se crean bloques), `WeekBar.tsx`, `secondaryActions` y la nueva `TodayScreen`; estilos nuevos (`.session`, `.row-block`, `.stack`) con los tokens existentes, `min-width: 0` en textos que pueden crecer.
- [ ] **Step 4: Adaptar** `ui.test.tsx` (`describe("TodayScreen")`): `"① Repaso"` pasa a `"Repaso"`; `"④ Lectura y reconstrucción"` pasa a `"Descubre"` (mantener las comprobaciones de `href`, `/2 repasos/`, `/Tienes 1 para repasar/`, `/4 días · estudia hoy/`, `/No tienes repasos pendientes ahora/`); el botón `/^Continuar · Descubre/` sigue valiendo porque ese caso usa `reviewsDone: 2`. Run `npm --prefix web test` → verde.
- [ ] **Step 5: Commit** `git commit -m "Hoy: sesión con etiquetas de hebra, barra semanal y salidas secundarias"`.

### Task 5: Ruta rediseñada

**Files:**
- Modify: `web/src/ui/RouteScreen.tsx` (solo la rama de módulos A1, las filas de hito y las «próximamente»; la rama de unidades sin módulos se deja igual), `web/src/styles.css`
- Create: `web/src/ui/kit/ModuleStrip.tsx`
- Test: `web/src/ui/routeRedesign.test.tsx` (nuevo); adaptar `web/src/ui/modules.test.tsx` (línea ≈29) y `web/src/ui/route.test.tsx` si buscan textos retirados

**Interfaces:**
- Consumes: `ModuleView` (`state/modules.ts`: `module`, `index`, `state: "completed"|"current"|"locked"`, `steps: {id, done, open}[]`, `next`, `units`), `MODULE_STEP_LABEL`.
- Produces: `stageStates(view: ModuleView): { id: ModuleNext; label: string; state: "done" | "current" | "todo" }[]` (un elemento por cada `view.steps`; `done` si `s.done`, `current` si `view.next === s.id`, si no `todo`) y `ModuleStrip({ view }: { view: ModuleView })` que dibuja los segmentos (relleno completo / mitad / vacío) con la etiqueta de cada etapa debajo (`Entrada`, `Cápsulas`, `Salida`, `Fluidez`, `Cierre`).
- Comportamiento de `RouteScreen` (rama con `modules.length > 0`): cabecera «Ruta» + `A1` + «`N de M módulos completados`» con barra; el módulo con `state === "current"` como tarjeta destacada (`<a>` al módulo con número, título, `can_do_es[0]`, `ModuleStrip` y botón «Continuar · {MODULE_STEP_LABEL[next]}»); los demás módulos como filas de una línea (número en círculo, título, `can_do_es[0]`; los completados con ✓; los bloqueados atenuados y sin enlace); fila «Examen de hito A1» con la misma lógica de apertura de hoy; filas «próximamente» con `planned`. El párrafo de método y las horas de referencia por nivel pasan a un `<details><summary>Cómo funciona</summary>…</details>` al final con el texto actual sin recortar.

- [ ] **Step 1: Write the failing tests** (`routeRedesign.test.tsx`):
  - `it("stageStates marca hecho, actual y pendiente")` → vista con `steps` `entrada done`, `capsulas` no done y `next: "capsulas"`, resto no done → `["done","current","todo","todo","todo"]`.
  - `it("solo el módulo en curso trae tira de etapas y botón")` → 3 vistas (completed, current, locked): `getAllByText("Cápsulas")` tiene longitud 1; botón `Continuar · Cápsulas` presente.
  - `it("sin ningún módulo en curso no falla y muestra el examen")` → 2 vistas `completed`: no hay `Continuar ·`, aparece `Examen de hito A1` (Review Focus 5).
  - `it("el método y las horas siguen disponibles plegados")` → `getByText("Cómo funciona")` es un `summary`, y el `details` contiene `/Referencia general/`.
  - `it("un módulo bloqueado no es un enlace")` → el título del módulo bloqueado no tiene `closest("a")`.
- [ ] **Step 2: Run** `npm --prefix web test -- src/ui/routeRedesign.test.tsx` → FAIL.
- [ ] **Step 3: Implement** `ModuleStrip.tsx` (+ `stageStates`) y la nueva rama de `RouteScreen`; estilos `.mod-card`, `.mod-row`, `.strip` con tokens.
- [ ] **Step 4: Adaptar** `modules.test.tsx` línea ≈29 (`0 de N módulos completados` se conserva tal cual en la cabecera) y cualquier prueba que buscara «Siguiente: Entrada» o el nodo ▶; run `npm --prefix web test` → verde.
- [ ] **Step 5: Commit** `git commit -m "Ruta: módulo actual destacado, filas compactas y «Cómo funciona» plegado"`.

### Task 6: Verificación visual y registro

**Files:**
- Modify: `CONTINUIDAD.md` (entrada nueva arriba), `CLAUDE.md` (una línea en «Rumbo vigente» apuntando a `docs/specs/2026-11-24-rediseno-frontend.md`)

- [ ] **Step 1:** `npm --prefix web run build` (el aviso de precache > 9 MB ya existía; si el build falla por otra cosa, corregir).
- [ ] **Step 2:** `preview_start` con `web-preview` (`.claude/launch.json`); en el navegador `localStorage.setItem('italiano-contrastivo.preview','1')`, tamaño `mobile` (375×812). Capturar Hoy, Ruta (arriba y desplazada), Practicar y Progreso en claro y en oscuro (`resize_window` con `colorScheme`). Comprobar además a 320 px de ancho que ningún título largo desborda ni se corta.
- [ ] **Step 3:** `read_console_messages` sin errores; recorrer pestañas con clic y confirmar que cada cambio de pantalla vuelve arriba.
- [ ] **Step 4:** Mostrar las capturas al usuario y esperar su visto bueno antes de seguir con la etapa 3 (regla del proyecto: cambios visuales se enseñan antes de continuar). Quitar el modo de prueba del navegador al terminar.
- [ ] **Step 5:** Escribir en `CONTINUIDAD.md` la entrada (fecha, qué se hizo, decisiones —por ejemplo «Empezar/Continuar» y «Solo N min»—, pendientes: probar en iPhone, etapas 3–5, almacén de puntos calientes) y commitear: `git commit -m "Registro: rediseño del frontend, etapas 1 y 2"`. No marcar nada como probado en iPhone.

## Decisiones que tomé yo (a revisar)

- Los componentes `ContrastCard`, `ConjugationTable` y `Timeline` del spec se construyen en la etapa 3, que es donde se usan (no antes: no hay dónde probarlos).
- «Progreso» existe desde la etapa 2 con lo que ya hay (semana + Ajustes/Acerca) para que las cinco pestañas lleven a algún sitio; «Ya sabes hacer» llega en la etapa 5.
- Qué hacen los botones nuevos de Hoy: «Solo N min» = el bloque pendiente más corto de hasta 5 min; «Elegir otra cosa» = pestaña Practicar; el principal dice «Empezar» si hoy no se ha hecho nada y «Continuar» si sí.
- `WeekCard` (detallada) se conserva y pasa a Progreso; Hoy usa la nueva `WeekBar` compacta.
