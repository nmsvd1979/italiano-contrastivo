# Rediseño del frontend, etapa 4 (ejercicio y corrección): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un ejercicio muestre lo que quieres decir (frase en español) grande al centro y las respuestas abajo, y que la corrección diga «Dijiste / Se dice» con el porqué a la vista, «Escuchar» y «Ver ficha».

**Architecture:** Solo `web/src/ui/` y estilos. `Feedback` gana la comparación «Dijiste / Se dice» y el enlace a la ficha; `RunContext` lleva `fichaHref`; `ItemRunner` cambia el contador a «8 / 24»; `Choice` obtiene la frase en español de `sentences.json` por `sentence_id` (vía el paquete que ya expone `AudioProvider`). Sin cambios de datos, de progreso ni de la lógica de reencolado.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library. `npm --prefix web test`.

**Spec:** `docs/specs/2026-11-24-rediseno-frontend.md` (etapa 4). Maqueta: pantalla 5 de `docs/specs/2026-11-24-rediseno-frontend-maqueta.html`.

## Global Constraints

- Español neutro con tuteo; toques ≥ 44 px; claro y oscuro; colores solo por token; el estado nunca solo en color.
- Se conservan: reencolado de lo fallado (una vez), nota por el primer intento, «mi versión también es correcta» y sus comodines, guardado de avance (`persistKey`), `RunContext.why`, rutas existentes. Las pruebas se adaptan, no se eliminan.
- No se inventa italiano ni español: la frase en español sale de `sentences.json` por `sentence_id`; si no se encuentra, el ejercicio queda como hoy.
- En los ejercicios de escuchar (`listen: true`) no se muestra la frase en español (cambiaría el ejercicio).
- Línea base: 1074 pruebas web en verde. Commits pequeños en español con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; sin `--force`.

## Review Focus

1. `Choice` sin `sentence_id`, con una frase que no está en el paquete o sin `AudioProvider`: se ve como hoy, sin fallar.
2. Ejercicio de escuchar: no muestra el español.
3. Acierto: la hoja sigue breve (sin «Dijiste / Se dice» ni «Ver ficha»).
4. Sin `fichaHref` (repaso, ubicación, hito): no hay enlace «Ver ficha».
5. Tras fallar y reencolar, el contador sigue siendo `pos / total` coherente (el total crece una vez).

---

### Task 1: Hoja de corrección «Dijiste / Se dice» con «Ver ficha»

**Files:**
- Modify: `web/src/ui/kit/Feedback.tsx`, `web/src/ui/kit/RunContext.tsx`, `web/src/ui/items/Choice.tsx`, `Cloze.tsx`, `Reorder.tsx`, `Write.tsx`, `web/src/ui/items/WordRecall.tsx`, `web/src/styles.css`
- Test: `web/src/ui/feedbackSheet.test.tsx` (nuevo); adaptar `web/src/ui/design.test.tsx` (≈ líneas 32-47)

**Interfaces:**
- Produces: `Run` gana `fichaHref?: string`. `Feedback({ ok, answer, said, why, extra, onContinue })` con `said?: ReactNode` (lo que el usuario puso). Al fallar muestra: cabecera «Casi», filas `Dijiste` (`said`, tachado) y `Se dice` (`answer`) si hay `said`; el `why` del ítem **visible** en una línea; `extra`; un `<details>` «Ver la regla» con `run.why` si existe; fila de acciones con un enlace `Ver ficha` (`a.button`, `href = run.fichaHref`) solo si hay `fichaHref`; aviso de reencolado; botón «Continuar». Al acertar: «¡Correcto!» + `answer` + `extra` + botón, como hoy.
- `said` por tipo: Choice = texto elegido; Cloze = frase con lo escrito; Reorder = orden armado; Write = lo escrito (reemplaza el «Escribiste:» de `extra`); WordRecall = lo escrito.

- [ ] **Step 1: Write the failing tests** (`feedbackSheet.test.tsx`, con `ItemRunner` + `RunProvider`/`fichaHref`, ítems como en `design.test.tsx`):
  - `it("al fallar muestra «Dijiste» tachado y «Se dice» con lo que cambia resaltado")` → `Dijiste` + `del` con «Io tengo fame.»; `Se dice` + `mark` «ho».
  - `it("el porqué del ítem está a la vista, sin desplegar nada")` → el texto de `WHY.l1_calque` visible fuera de un `details` cerrado.
  - `it("«Ver ficha» aparece con fichaHref y apunta a ella")` → `getByRole("link", { name: "Ver ficha" })` con `href` del run; Review Focus 4: sin `fichaHref` → `queryByRole("link", { name: "Ver ficha" })` es null.
  - `it("al acertar la hoja es breve")` → sin «Dijiste», sin «Ver ficha» (Review Focus 3).
  - `it("la regla de la unidad queda plegada")` → `getByText("Ver la regla")` es `summary` y su `details` contiene el `why` del run.
- [ ] **Step 2: Run** `npm --prefix web test -- src/ui/feedbackSheet.test.tsx` → FAIL.
- [ ] **Step 3: Implement** según Interfaces; pasar `said` desde cada ítem; estilos (`.feedback .cmp` rejilla `64px 1fr`, etiquetas 11 px, acciones con `min-height: 44px`).
- [ ] **Step 4: Adaptar** `design.test.tsx`: la cabecera pasa de «Casi. Así se dice:» a «Casi» y «¿Por qué?» a «Ver la regla»; mantener las aserciones de `mark`, texto de la regla y «volverá al final». Suite completa verde.
- [ ] **Step 5: Commit** `git commit -m "Corrección con «Dijiste / Se dice», porqué a la vista y «Ver ficha»"`.

### Task 2: Contador «8 / 24» y enlace a la ficha desde los pasos de unidad

**Files:**
- Modify: `web/src/ui/ItemRunner.tsx`, `web/src/ui/kit/FocusHead.tsx`, `web/src/ui/StepScreen.tsx`
- Test: `web/src/ui/runnerCounter.test.tsx` (nuevo); adaptar `design.test.tsx` (≈ 73, 101-102) y `route.test.tsx` (≈ 49, 52, 196)

**Interfaces:**
- `FocusHead({ progress, exitHref, label, count }: { …; count?: string })` muestra `count` a la derecha de la barra. `ItemRunner` gana `fichaHref?: string` (se pasa al `RunProvider`) y muestra `` `${pos + 1} / ${queue.length}` `` en el `FocusHead`; desaparece «Ejercicio N de M · quedan …»; si se retomó, una línea pequeña «Retomado». `StepScreen` pasa `fichaHref={`#/unidad/${unitId}`}` a todos sus `ItemRunner`.

- [ ] **Step 1: Write the failing tests:** `it("el contador es «1 / 2»")`; `it("al fallar y reencolarse el total crece una vez")` (Review Focus 5: tras fallar el 2.º de 2, el contador dice «3 / 3»); `it("retomado lo dice")`; `it("StepScreen ofrece «Ver ficha» al fallar")` con `fichaHref` hacia `#/unidad/{id}`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Quitar `estimateSeconds`/`formatDuration`/`loadSamples` si quedan sin uso en `ItemRunner` (mantener `recordSample`).
- [ ] **Step 4: Adaptar** las pruebas que buscaban «Ejercicio N de M» a «N / M`; suite verde.
- [ ] **Step 5: Commit** `git commit -m "Contador de ejercicios «8 / 24» y acceso a la ficha desde los pasos"`.

### Task 3: La frase en español al centro y las respuestas abajo

**Files:**
- Modify: `web/src/audio/AudioContext.tsx` (hook `useSpanishOf`), `web/src/ui/items/Choice.tsx`, `Cloze.tsx`, `Write.tsx`, `WordRecall.tsx`, `Reorder.tsx`, `web/src/styles.css`
- Test: `web/src/ui/askLayout.test.tsx` (nuevo)

**Interfaces:**
- Produces: `useSpanishOf(sentenceId?: string): string | undefined` en `AudioContext.tsx`: busca en `ctx.pack.sentences`; `undefined` sin id, sin proveedor o sin frase.
- Cada ejercicio envuelve la pregunta en `<div className="ask">` (centrada verticalmente, ocupa el espacio libre) con una etiqueta pequeña («Quieres decir» o la consigna) y la frase en español en grande; las respuestas (opciones, hueco, banco de palabras) quedan debajo. `Choice`: si hay español y no es de escuchar, «Quieres decir» + español grande; si no, solo la consigna como hoy. `Cloze`: `hint_es` pasa a «Quieres decir» + español grande, y la frase con el hueco va debajo. `Write`/`WordRecall`: etiqueta «Escribe en italiano» y la frase/glosa grande. `Reorder`: la consigna (que ya trae el español) en grande.

- [ ] **Step 1: Write the failing tests** (`askLayout.test.tsx`, `AudioProvider` con un paquete mínimo de frases):
  - `it("Choice muestra la frase en español grande cuando la encuentra")` → `getByText("¿Tú eres Tom?")` dentro de `.ask`.
  - `it("Choice sin sentence_id, con frase ausente o sin proveedor se ve como hoy")` (Review Focus 1) → solo la consigna, sin «Quieres decir».
  - `it("Choice de escuchar no muestra el español")` (Review Focus 2).
  - `it("Cloze muestra el español como «Quieres decir» y no como «Pista:»")`.
  - `it("Write y WordRecall ponen la frase en grande bajo «Escribe en italiano»")`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `useSpanishOf` y el marcado; CSS: `main.focus .item { display: flex; flex-direction: column; min-height: calc(100dvh - 210px); }`, `.ask { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 6px; }`, `.ask .es { font-size: 24px; line-height: 1.3; }`, `.ask .eyebrow`. Adaptar las pruebas que buscaban «Pista:» o «Escribe en italiano: «…»» como un solo texto.
- [ ] **Step 4: Run** suite completa → verde.
- [ ] **Step 5: Commit** `git commit -m "Ejercicios: frase en español grande al centro y respuestas abajo"`.

### Task 4: Verificación visual y registro

- [ ] **Step 1:** `npm --prefix web run build`; `preview_start`; modo de prueba; `#/unidad/u13/practica` a 375 y 320 px, claro y oscuro.
- [ ] **Step 2:** Capturas: ejercicio de elegir, de hueco, de ordenar, de escribir y de escuchar; corrección tras un fallo (con «Dijiste / Se dice», porqué y «Ver ficha»); pulsar «Ver ficha» y volver con la ×; comprobar que el avance se conserva. Sin errores de consola, sin desborde, toques ≥ 44 px.
- [ ] **Step 3:** `CONTINUIDAD.md` (entrada nueva) y `CLAUDE.md` (etapas 1–4 hechas); commit `Registro: rediseño del frontend, etapa 4`. Mostrar capturas.

## Decisiones que tomé yo (a revisar)

- «Dijiste» solo aparece al fallar; al acertar la hoja sigue breve.
- El porqué visible es el del ítem (una línea); la regla de la unidad queda plegada bajo «Ver la regla» para no alargar la hoja.
- «Ver ficha» sale del ejercicio hacia `#/unidad/{id}`; el avance del bloque se conserva por `persistKey`, pero el ejercicio en curso se vuelve a mostrar desde cero.
- «Ver ficha» solo en los pasos de unidad (donde hay una ficha propia); en repaso, ubicación e hito no se muestra.
