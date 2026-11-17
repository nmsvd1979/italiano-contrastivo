# Fase 3 — App (PWA) y servidor local: diseño

Estado: **borrador para tu aprobación**. Sin código de la Fase 3 todavía.

## Intención
Poder **usar** la app cuanto antes con contenido A1–A2 y seguir desarrollando lo demás (B1–B2, audio, corrección) mientras se estudia. La arquitectura pedagógica no se reinventa: sale de las fuentes del cuaderno de NotebookLM (ids entre paréntesis) y de la evidencia de las Fases 1–2.

## Lo que ya está decidido por las fuentes
- **Sesión diaria de 30 min en 4 bloques** (3285814c §6.5): ① repaso espaciado anticontaminación (0–5 min, SRS léxico con tarjetas de doble entrada para falsos amigos); ② gimnasio sintáctico contrastivo (5–15, micro-lección interactiva); ③ análisis fonético y de voz (15–23, ASR: geminadas, heterotónicas); ④ intercomprensión y reconstrucción (23–30, lectura con los 7 tamices y andamiaje inverso con huecos en los puntos de divergencia).
- **Cápsula de 3–5 min en 4 fases** (79103ab3, 51205318): trigger *garden path* 0:30 → explicación atómica 0:45 → recuperación activa 4–6 ítems 2:15 → retroalimentación y cierre con FSRS 0:30. Un solo objetivo atómico por cápsula (p. ej. «ci→ce ante ne», no «los clíticos»). Ya está en `schemas/capsule.schema.json`.
- **FSRS-6 con calibración léxica** (5f4ef3d8): `ts-fsrs` 6.0.0 en el cliente; cognados ΔD −1,5 / γs 1,8, falsos amigos +2,5 / 0,5, neutros sin ajuste (`schemas/data/calibration.json`); el sesgo se aplica a la tarjeta nueva y al lapso de un falso amigo. Puntos críticos de divergencia (heterotónicas, ci/ne, auxiliares) con intervalos cortos.
- **Backend local en el Mac** (5f4ef3d8, 8d54677d): LanguageTool (puerto 8081) + SLM local con JSON Schema estricto (`schemas/slm-feedback.schema.json`, Qwen 2.5 7B/14B o Llama 3.1 8B) para escritura; Piper TTS para voz; WhisperX/MFA para la duración de geminadas (Rgem). Orden de construcción sugerido por la fuente: base de datos y corpus → motor SRS y reglas → audio → SLM → frontend.
- Shadowing prosódico y tareas de concienciación (79103ab3) como tipos de actividad de las fases 2–3 de la cápsula.

## Lo que dice la evidencia propia (cambia el alcance)
- **Solo hay contenido validado utilizable para A1–A2.** 242 oraciones hoy (directas + generadas por IA desde el italiano); el pivote está excluido (37% de rechazo). B1–B2 tiene pocas por código.
- **Toda la validación es de IA + una persona que no sabe italiano**, no de un nativo: la app lo declara (página «Cómo se revisó» + atribuciones desde `ATTRIBUZIONI-tatoeba.md`).
- **No existen textos de lectura** para el bloque ④ (solo oraciones sueltas), ni etiquetas de tamiz por palabra.

## Hitos (entrega incremental; el usuario usa la app desde M1)
| Hito | Qué entrega | Depende de |
|---|---|---|
| **M1 usable** | Bloques ① y ② offline en el iPhone: tarjetas FSRS (léxico + códigos de error) y cápsulas A1–A2 de 4 fases; voz del propio iPhone (it-IT, etiquetada «voz del sistema»); progreso en IndexedDB | generadores de ejercicios, paquete de contenido, PWA |
| **M2** | Voz Piper en las oraciones (clips precalculados) | licencia del modelo, generación y revisión de audio |
| **M3** | Bloque ③ y ítems `write`/`speak` con el Mac: LanguageTool, SLM, geminadas | prueba técnica previa (abajo) |
| **M4** | Bloque ④ intercomprensión y B1–B2 | textos reales (fuente a definir) y más oraciones validadas |

El alcance elegido por el usuario (cápsulas + repaso + Piper + corrección con el Mac) es M1+M2+M3; M4 queda fuera de la primera versión.

## Diseño de M1
**Piezas** (todo en `web/`, TypeScript):
1. **Paquetes de contenido** (`web/public/content/`): oraciones validadas por nivel (de `python -m pipeline export`) y cápsulas generadas. Sin servidor; se precachean.
2. **Generadores de ejercicios** (`pipeline/exercises/`, Python, deterministas, con pruebas): de una oración validada + su código de error producen ítems de `schemas/item.schema.json`: `choice_l1_distractor` (la forma correcta + el **calco del español** derivado mecánicamente, con `error_code` y `distractor_kind`), `cloze`, `reorder`, `translate_es_it`. Ejemplos de calco mecánico: `ERR_AUX_ESSERE` (essere↔avere), `ERR_PREP_PLACE` (a↔in), `ERR_CE_AGREEMENT` (c'è↔ci sono), `ERR_PERSONAL_A` (agregar «a»), `ERR_POSSESSIVE_ARTICLE`, `ERR_PREP_ARTICLE_CONTRACTION` (in la→nella), `ERR_COMPARATIVE_DI` (che↔di), `ERR_TENERE_AVERE`. Los distractores son errores **por construcción**: se marcan como tales y nunca se muestran como correctos. Códigos sin generador fiable quedan fuera de M1.
3. **Constructor de cápsulas**: trigger = ítem `translate_es_it` cuya respuesta intuitiva es el calco; explicación = texto del catálogo (`explanation_es`) en una frase; recuperación = 4–6 ítems; cierre = alta de la tarjeta. Valida contra `capsule.schema.json` (4–6 ítems, 180–300 s).
4. **PWA** (Vite + React 19 + TS + vite-plugin-pwa, como el proyecto anterior): pantalla de sesión (bloque ① luego ②), tarjeta FSRS, cápsula en 4 fases, progreso y ajustes. Estado solo en IndexedDB; esquemas validados al cargar; sin cuentas ni rastreo.
5. **Orden del currículo**: por `cefr_min` del código y su tamiz (3 y 4 fonética/grafía primero, luego morfosintaxis); los códigos de mayor divergencia reaparecen con intervalos cortos.

## Sesión fraccionable (decisión del usuario, 2026-11-16)
Los 30 min diarios son un **tope**, no un bloque obligatorio. Cada bloque (①, ②) y cada cápsula (3–5 min) se puede hacer por separado en cualquier momento del día (p. ej. 5 min en la mañana, 10 en la tarde). El progreso cuenta igual: el avance de la «sesión del día» se acumula por bloque y se guarda en IndexedDB; cerrar la app a mitad de una cápsula no pierde lo ya respondido y la cápsula retoma desde su última fase completa. Razón: repetición espaciada y práctica distribuida rinden más que una sola sesión larga.

## Prueba técnica previa a M3 (no se decide a ojo)
- Que el iPhone alcance el Mac por HTTPS (Tailscale `serve` frente a certificado local), por el bloqueo de contenido mixto.
- LanguageTool reciente necesita Java 17+ (hay Java 16).
- Tamaño y velocidad del SLM en este Mac; calidad del JSON con decodificación guiada.
- Umbrales de Rgem para geminadas con audio real (ninguna fuente los fija).

## Metas, no metas y antimetas
- **Meta M1:** instalar en el iPhone, hacer una cápsula completa sin conexión, repasar tarjetas, y que el progreso sobreviva a cerrar la app.
- **No metas:** cuentas, nube, social, rachas decorativas (las fuentes piden evitar mecánicas de baja eficacia), traducir al español algo que no sea del corpus validado.
- **Antimetas:** que la app parezca verificada por un nativo; mostrar un distractor como si fuera italiano correcto; perder el progreso por un cambio de contenido.

## Restricciones
UI en español neutro con tuteo; offline-first; datos del usuario solo en el dispositivo; sin servicios de pago; lo que se genere con IA se marca; atribuciones CC BY visibles; no marcar como verificado lo que no se probó (iPhone real, audio).

## Enfoques considerados
- **A. Todo junto (app + Piper + servidor del Mac) y recién usarla:** respeta el alcance, pero tarda y mezcla tres riesgos técnicos distintos; descartado.
- **B. Hitos M1→M2→M3 (elegido):** usable pronto, cada riesgo se aísla y la prueba previa de M3 se hace sin frenar el estudio.
- **C. Solo escritorio (app en el Mac):** más simple, pero pierde la comodidad de sesiones de 3–5 min en el iPhone, que es el formato de las fuentes.

## Mis decisiones (para que las revises)
- Stack igual al proyecto anterior (Vite + React 19 + TS + ts-fsrs + vite-plugin-pwa).
- Generadores en Python dentro del pipeline (reutilizan el catálogo y los esquemas) y la app solo lee JSON.
- Bloque ④ queda para M4 por falta de textos; no se inventan lecturas.
- Voz de M1: la del sistema; Piper en M2 (decisión de modelo y licencia en M2).
- Curso: orden por nivel y tamiz (propuesta mía).

## Qué se deja al implementador
Diseño visual, estructura interna de componentes, formato exacto del paquete de contenido, mecánica exacta de cada calco por código.
