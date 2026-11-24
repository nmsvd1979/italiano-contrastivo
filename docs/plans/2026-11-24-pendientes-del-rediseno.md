# Pendientes del rediseño: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los tres pendientes de código que dejó el rediseño: (1) el rótulo «Error típico» de «Descubre» en vocabulario, (2) el avance de un bloque que se pierde al cambiar el número de ejercicios, (3) «Lo que más te cuesta» (guardar los aciertos por tipo de error y mostrarlos en Progreso y Practicar).

**Architecture:** (2) el guardado de un bloque pasa a incluir los propios ejercicios, de modo que retomarlo no depende de volver a calcularlos. (3) Los primeros intentos se acumulan por día y por tema en `DayProgress.attempts` (sin tocar la base de datos ni el esquema: los días ya van en la copia de seguridad), las escrituras del día se serializan, un módulo puro calcula los puntos débiles de las últimas 3 semanas y una pantalla `#/debiles` practica 10 frases de los tres más débiles. Solo `web/src/`.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library. `npm --prefix web test`.

**Spec:** `docs/specs/2026-11-24-rediseno-frontend.md` (Progreso y Practicar: «Lo que más te cuesta»). Diseño de datos y umbrales: decisiones mías declaradas al final.

## Global Constraints

- Español neutro con tuteo; toques ≥ 44 px; claro y oscuro con tokens; estado nunca solo en color.
- Honestidad: «lo que más te cuesta» se calcula solo con primeros intentos reales y se dice cómo; con pocos datos no se inventa nada.
- No se cambian esquemas de IndexedDB ni de contenido; los campos nuevos son opcionales. Copia de seguridad y restauración siguen valiendo.
- Se conservan rutas, pruebas (se adaptan, no se eliminan), reencolado, comodines y nota por el primer intento.
- Línea base: 1133 pruebas web en verde. Commits pequeños en español con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; sin `--force`.

## Review Focus

1. Retomar un bloque con un conjunto de ejercicios distinto al guardado: continúa en el mismo ejercicio; un guardado de más de 7 días se ignora; los guardados antiguos (sin ejercicios) siguen funcionando.
2. Un ejercicio cuenta una sola vez (el primer intento): no al reencolarse, no sin tema (`target_error_codes`), no en la ubicación, no sin proveedor.
3. Escrituras simultáneas del día (tiempo medido e intentos) no se pisan.
4. Puntos débiles: 80 % exacto no es débil, mínimo 5 intentos, solo últimas 3 semanas, temas sin unidad se omiten.
5. `#/debiles` sin puntos débiles o con temas sin ejercicios no falla.

---

### Task 1: Rótulo de vocabulario en «Descubre»

**Files:** Modify `web/src/ui/NoticeStep.tsx`; Test `web/src/ui/noticeVocab.test.tsx`.

- Comportamiento: si `unit.codes[0]` empieza por `ERR_VOC_`, la línea bajo el ejemplo dice «No es lo mismo:» y la otra palabra va sin tachar (`<span lang="it">`); si no, como hoy («Error típico de hispanohablantes» con `<del>`, o «Así no se escribe…» en sonidos).
- [ ] **Step 1: Write the failing test** (pack mínimo con una frase y una divergencia): vocabulario → «No es lo mismo», sin «Error típico», el texto no es `DEL`; gramática → «Error típico de hispanohablantes» con `DEL`; sonidos → «Así no se escribe».
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** suite completa → verde.
- [ ] **Step 5: Commit** `git commit -m "Descubre: en vocabulario no se llama «error típico» a otra palabra"`.

### Task 2: Retomar un bloque no depende de recalcularlo

**Files:** Modify `web/src/state/runState.ts`, `web/src/ui/ItemRunner.tsx`; Test `web/src/ui/runFrozen.test.tsx`, adaptar `web/src/ui/design.test.tsx` si hace falta.

**Interfaces:**
- `RunSnapshot` gana `items?: unknown[]` y `savedAt?: number` (ms). `loadRunFrozen(key: string, now = Date.now()): RunSnapshot | null`: devuelve el guardado solo si trae `items` (array no vacío), `savedAt` de menos de 7 días, y `queue`, `pos`, `first` coherentes con `items.length`; si no, `null`. `loadRun(key, ids)` no cambia (guardados antiguos). `saveRun` sigue igual; el ejecutor añade `items` y `savedAt`.
- `ItemRunner`: calcula una vez (`useState` perezoso) `frozen = persistKey ? loadRunFrozen(persistKey) : null`; si hay `frozen`, usa `frozen.items` como lista (`list`) y `frozen` como `saved`; si no, `list = items` y `saved = loadRun(persistKey, ids)` como hoy. Todo el cuerpo usa `list` (no `items`). Cada `saveRun` incluye `items: list` y `savedAt: Date.now()`.

- [ ] **Step 1: Write the failing test** (`runFrozen.test.tsx`): (a) con 3 cloze (`hint_es` distinto en cada uno), responder el 1.º, desmontar y montar con OTRA lista de ejercicios (4, otros ids) y la misma `persistKey` → muestra «2 / 3» y el `hint_es` del 2.º original, y «Retomado»; (b) un guardado de hace 8 días se ignora (aparece «1 / 4» con la lista nueva); (c) un guardado antiguo sin `items` sigue retomándose con la lista igual (comportamiento de `design.test.tsx`); (d) `loadRunFrozen` devuelve `null` con índices fuera de rango, sin `items` o dañado.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** suite completa → verde.
- [ ] **Step 5: Commit** `git commit -m "Retomar un bloque conserva sus ejercicios aunque cambie el recuento"`.

### Task 3: Guardar los primeros intentos por tema

**Files:** Create `web/src/state/attempts.ts`, `web/src/ui/kit/AttemptsContext.tsx`; Modify `web/src/state/store.ts` (tipo `DayProgress`), `web/src/state/strands.ts` (`addDaySeconds` usa `updateDay`), `web/src/ui/ItemRunner.tsx`, `web/src/ui/PlacementScreen.tsx`, `web/src/App.tsx`; Test `web/src/state/attempts.test.ts`, `web/src/ui/attemptsTracking.test.tsx`.

**Interfaces:**
- `DayProgress` gana `attempts?: Record<string, { ok: number; n: number }>` (clave = código de error).
- `recordAttempt(day: DayProgress, code: string, correct: boolean): DayProgress` (pura). `updateDay(store: Store, now: Date, fn: (d: DayProgress) => DayProgress): Promise<void>`: lee `store.getDay(localDate(now))`, aplica `fn`, guarda; las llamadas sobre el mismo `store` se encadenan (WeakMap de promesas) y un error no rompe la cadena ni el estudio. `trackAttempt(store: Store, item: Item, correct: boolean, now = new Date()): Promise<void>`: usa `item.target_error_codes?.[0]`; sin código no hace nada. `addDaySeconds` pasa a usar `updateDay`.
- `AttemptsProvider({ store, children })` y `useTrackAttempt(): (item: Item, correct: boolean) => void` (no-op sin proveedor). `ItemRunner` gana `track?: boolean` (por defecto `true`) y llama al hook una vez por ejercicio en su primer intento (donde ya registra `first.current[idx]`), solo si `current.item`. `PlacementScreen` pasa `track={false}`. `App` envuelve con `AttemptsProvider`.

- [ ] **Step 1: Write the failing tests:** `attempts.test.ts` → `recordAttempt` suma ok/n sin tocar otros temas; 20 operaciones mezcladas en paralelo (`addDaySeconds` y `trackAttempt`) con un `memoryStore` conservan todos los segundos e intentos (Review Focus 3); `trackAttempt` sin código no escribe. `attemptsTracking.test.tsx` (con `AttemptsProvider` y `memoryStore`) → fallar un hueco guarda `{ ok: 0, n: 1 }` para su tema; acertar `{ ok: 1, n: 1 }`; el reencolado no vuelve a contar; un ejercicio sin `target_error_codes` no cuenta; `track={false}` no cuenta; sin proveedor no falla (Review Focus 2).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** suite completa → verde.
- [ ] **Step 5: Commit** `git commit -m "Se guardan los primeros intentos por tema y las escrituras del día se serializan"`.

### Task 4: Puntos débiles (estado puro)

**Files:** Create `web/src/state/weak.ts`; Test `web/src/state/weak.test.ts`.

**Interfaces:**
- `WEAK_MIN_ATTEMPTS = 5`, `WEAK_WINDOW_DAYS = 21`, `WEAK_ACCURACY = 0.8`. `WeakSpot = { code: string; unitId: string; title: string; ok: number; n: number; accuracy: number }`. `weakSpots(days: DayProgress[], course: Course, today: string, max = 3): { spots: WeakSpot[]; attempts: number }`: suma `attempts` de los días dentro de las últimas 21 fechas (`lastDates` de `strands.ts`), asigna cada código a la unidad cuyo `codes[0]` coincide (omite los que no tienen), conserva los de `n >= 5` y `accuracy < 0.8`, ordena por precisión ascendente y luego por `n` descendente, devuelve como máximo `max`; `attempts` es el total de intentos de la ventana (para el estado vacío).
- `weakItems(spots: WeakSpot[], pack: Pick<ContentPack, "itemsByCode">, today: string, max = 10): Item[]`: ejercicios de `itemsByCode[code]` de tipo `choice_l1_distractor`, `cloze` o `reorder`, repartidos por turnos entre los puntos débiles (el más débil primero), sin repetir ids, empezando cada tema en una posición que depende de `today` (para que no sea siempre la misma tanda); devuelve los que haya si hay menos de `max`.

- [ ] **Step 1: Write the failing test:** 80 % exacto no es débil y 79 % sí; con 4 intentos no aparece y con 5 sí; los días de hace más de 21 no cuentan; orden por precisión y desempate por `n`; código sin unidad omitido; `max`; `attempts` cuenta todos los de la ventana (Review Focus 4). `weakItems`: reparto por turnos, sin duplicados, solo tipos permitidos, menos de 10 si no hay más, y otra fecha cambia la tanda.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → verde.
- [ ] **Step 5: Commit** `git commit -m "Puntos débiles: los temas con menos aciertos de las últimas tres semanas"`.

### Task 5: «Lo que más te cuesta» en Progreso y Practicar

**Files:** Modify `web/src/ui/ProgressScreen.tsx`, `web/src/ui/PracticeScreen.tsx`, `web/src/ui/kit/TabBar.tsx` (`isFocusRoute` incluye `debiles`), `web/src/App.tsx`, `web/src/styles.css`; Create `web/src/ui/WeakScreen.tsx`; Test `web/src/ui/weakSpots.test.tsx`; adaptar `progressScreen.test.tsx`, `tabs.test.tsx`.

**Interfaces:**
- `ProgressScreen` gana `weak: { spots: WeakSpot[]; attempts: number }`; `PracticeScreen` gana `weak: WeakSpot[]`. Progreso: sección **Lo que más te cuesta**: con puntos débiles, lista (título de la unidad, «N % de aciertos · k de n», barra) y un enlace `a.button` «Practicar esto» → `#/debiles`; sin ellos y con menos de 5 intentos en total: «Todavía no hay datos suficientes: un tema aparece cuando llevas al menos 5 intentos»; sin ellos y con datos: «Ningún tema por debajo del 80 % en las últimas 3 semanas». Siempre una línea de método: «Cuenta solo tu primer intento en cada ejercicio, de los últimos 21 días». Practicar: tarjeta con los títulos de los puntos débiles y un botón «Practicar 10 frases» → `#/debiles`; sin ellos, una línea que explica cuándo aparece.
- `WeakScreen({ pack, store })` en `#/debiles` (sin menú): carga los días, calcula `weakSpots` y `weakItems`; con ejercicios corre `ItemRunner` (con `exitHref="#/practicar"`, `requeueWrong`, sin `persistKey`); sin ellos muestra «No tienes puntos débiles ahora» y enlace a Practicar. Al terminar muestra el resultado y vuelve a Practicar.

- [ ] **Step 1: Write the failing test:** Progreso con puntos débiles muestra título, porcentaje, «k de n» y el enlace a `#/debiles`; sin datos muestra el texto de datos insuficientes; con datos y sin débiles el de «Ningún tema…»; la línea de método está; Practicar muestra la tarjeta con botón solo si hay puntos débiles (Review Focus 5); `WeakScreen` con puntos débiles reales (días con `attempts` y el curso real) corre ejercicios del tema más débil; sin ellos no falla; `isFocusRoute("#/debiles")` es verdadero.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (los wrappers `Progress`/`Practice` de `App.tsx` calculan `weakSpots(data.days, pack.course, today)`). **Step 4: Run** suite completa → verde.
- [ ] **Step 5: Commit** `git commit -m "Lo que más te cuesta: puntos débiles en Progreso y una tanda de práctica"`.

### Task 6: Verificación, simulador de iOS y registro

- [ ] **Step 1:** `npm --prefix web run build`; navegador a 375 y 320 px, claro y oscuro: sembrar días con `attempts` para ver Progreso y Practicar con puntos débiles, correr `#/debiles`, fallar un ejercicio y comprobar que se guarda el intento (leer IndexedDB); salir de un bloque a mitad (a la ficha) y volver para ver «Retomado» con el mismo ejercicio. Borrar lo sembrado.
- [ ] **Step 2:** Simulador de iOS (si hay uno disponible): abrir la app en Safari del simulador para comprobar `:has()`/`dvh`, el menú inferior y las áreas seguras. Es WebKit real pero no un iPhone: no se marca como «probado en iPhone».
- [ ] **Step 3:** `CONTINUIDAD.md` (entrada nueva y quitar los pendientes cerrados) y `CLAUDE.md`; commit `Registro: pendientes del rediseño cerrados`.

## Decisiones que tomé yo (a revisar)

- **Dónde se guardan los intentos:** en `DayProgress.attempts` (por día y por tema), no en un almacén nuevo: no hay migración de base de datos, entra en la copia de seguridad y permite la ventana de 21 días sin guardar nada más.
- **Qué cuenta:** el primer intento de cada ejercicio con tema, en cualquier práctica, prueba, hito y repaso con ejercicios; no la ubicación (es una medición en frío). No cuentan dictado ni repetición en voz alta (no tienen tema) ni los ejercicios del tutorial de la cápsula.
- **Umbrales:** mínimo 5 intentos, menos de 80 % de aciertos, ventana de 21 días y 3 puntos débiles como máximo. Son valores míos, no datos de la literatura; el 80 % coincide con el que ya exige la app para aprobar.
- **Retomar:** el guardado incluye los ejercicios y caduca a los 7 días; un contenido actualizado no cambia un bloque ya empezado. Los guardados antiguos siguen funcionando.
- **Sin recuperación del pasado:** los intentos anteriores a este cambio no existen; los puntos débiles se llenan desde ahora.
