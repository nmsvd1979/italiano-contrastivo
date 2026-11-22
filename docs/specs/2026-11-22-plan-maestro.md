# Plan maestro: app de italiano A1→B2 para hispanohablantes

## Contexto

La revisión adversarial mostró que la app actual funciona, pero es un curso A1 de reconocimiento: 8 % de distractores contrastivos, sin producción corregida, horas estimadas sin medir, y A2–B2 casi vacío. Pediste replantear la ruta completa con base en el cuaderno de NotebookLM y evidencia externa.

Tus decisiones (2026-11-22): uso **solo personal**, **todo gratis**, meta **B2 en 18–24 meses con ritmo flexible**, **sin personas** por ahora, y que la app **recomiende exposición externa**.

Qué leí: las tres fuentes de diseño del cuaderno completas (3285814c, 79103ab3, 6c87ec52) y el índice de las 99. Las consultas con IA al cuaderno se agotaron por tiempo otra vez. Búsquedas externas: 5. Los enlaces y licencias marcados «verificar» no están confirmados.

## Qué dice la evidencia (y qué del cuaderno no se sostiene)

**Sólido, se mantiene como base:**
- Atención a la forma y «notar la brecha» (Schmidt); técnica *garden path*; análisis contrastivo para lenguas cercanas; riesgo de fosilización por éxito comunicativo temprano.
- Producir obliga a procesar la gramática (Swain); recuperar de memoria y espaciar los repasos fija más que releer.
- Corrección puntual palabra por palabra mejor que reescritura completa (fuente CASS del cuaderno).
- Intercomprensión (7 tamices) para leer pronto textos reales.

**Débil o exagerado en el cuaderno (las tres fuentes de diseño son síntesis hechas por IA):**
- «Retención +80 % con microaprendizaje»: viene de blogs comerciales. Las cápsulas cortas son una comodidad, no una ley.
- Tabla de horas por nivel: sale de blogs de academias. Se usa como orden de magnitud, no como meta exacta.
- «Medir milisegundos de geminadas con reconocimiento de voz»: no es viable gratis en un iPhone.
- La sesión fija de 30 min en 4 bloques es una propuesta, no un resultado medido.
- Errores ya anotados en `docs/dudas-italiano.md` (oceano, atmosfera, adesso/adrede).

**Lo que falta en el cuaderno y cambia el diseño — las cuatro hebras de Nation:** un curso equilibrado reparte el tiempo en partes parecidas entre (1) entender mensajes, (2) producir mensajes, (3) estudio de la lengua y (4) fluidez con material fácil. Es una guía práctica, no una proporción demostrada. La app actual es casi 100 % hebra 3. Ese es el desequilibrio central a corregir.

## Decisión de fondo: evolucionar, no rehacer

Se conserva el motor (PWA, esquemas, FSRS, pipeline, auditoría, ~1.500 pruebas). Se cambia el modelo de contenido y el ciclo de la unidad.

| Se conserva | Se rehace | Se descarta |
|---|---|---|
| Esquemas, IndexedDB, copia de seguridad, modo de prueba | Ciclo de unidad (4 hebras en vez de 7 pasos de relleno) | Carpeta `server/` y Mac como backend (quitar de CLAUDE.md) |
| FSRS con calibración léxica | Unidades de sonidos (percepción, no ortografía inventada) | LanguageTool, modelo local, pares pivote |
| Las 15 unidades contrastivas y sus generadores de calcos | Vocabulario (por tamices, con artículo, ES→IT) | Relleno hasta el minuto objetivo y horas a priori |
| Lecturas de libros abiertos y su motor de ejercicios | Pruebas, hito y ubicación (con producción) | Distractores de persona que nadie comete («Io sappiamo») |
| Prefiltro `pipeline/audit_rules.py`, test de cierre | Texto «Cómo empezar», fichas desfasadas | «Error típico» fabricado («Parighi») |

## Diseño nuevo

### Ciclo de cada unidad
1. **Entrada.** Diálogo o texto real con audio; capas de tamices (tocar una palabra muestra el cognado y la regla: *chiave ← llave*, *notte ← noche*); preguntas de comprensión.
2. **Foco.** Disparador *garden path* → ficha contrastiva → práctica que sube de reconocer a **escribir** (hueco de frase completa, transformar, traducir ES→IT con corrección).
3. **Salida.** Una tarea escrita y una hablada por unidad (ver abajo).
4. **Fluidez.** Releer y reescuchar a velocidad normal, *shadowing*, recuperación rápida de lo ya dominado.

Prueba de unidad: ≥12 oraciones no vistas, mayoría de respuesta escrita, sin preguntas de 2 opciones.

### Escritura y habla sin pagar (lo mejor disponible, por capas)
Ninguna opción gratis iguala a un corrector humano; se combinan varias y la app registra el resultado.

**Escritura**
1. *Reconstrucción con modelo* (dentro de la app): lees/escuchas un texto corto, lo reescribes de memoria, y la app muestra las diferencias contra el original. Es el «andamiaje inverso» del cuaderno y no requiere IA.
2. *Traducción inversa*: ES→IT sobre oraciones validadas, corregida contra respuestas aceptadas con resaltado de la diferencia.
3. *Detector propio* (`web/src/writing/detect.ts`): ampliar de 8 a los códigos que tengan regla fiable.
4. *Corrección con IA gratis fuera de la app*: botón «Pedir corrección» que copia un encargo ya armado (nivel, tarea, tu texto, instrucción de corregir palabra por palabra y nombrar el calco). Lo pegas en la app gratuita de Claude, ChatGPT o Gemini. De vuelta marcas qué errores te encontró y entran al repaso.
5. *Comunidades gratuitas de corrección por nativos* (LangCorrect, Journaly — verificar): enlazadas como opción, no obligatorias.

**Habla**
1. *Entrenamiento de percepción* con varias voces nativas (pares mínimos, identificar cuál oyes): mejora también la pronunciación. Audio de Lingua Libre y Common Voice (CC0, verificar).
2. *Dictado del iPhone como comprobador*: dices la frase al micrófono del teclado en italiano; si el teléfono escribe lo esperado, se te entiende. Gratis y sin conexión a servicios. **Requiere prueba técnica en tu iPhone.**
3. *Shadowing* con grabación y comparación (ya existe), sobre audio nativo cuando lo haya.
4. *Monólogos cronometrados* (misma historia en 3, 2 y 1 min) y lectura en voz alta: fluidez.
5. *Conversación con voz de IA gratuita* (modo voz de ChatGPT o Gemini): la app entrega el guion del rol y luego registra minutos y errores.
6. Reconocimiento de voz dentro del navegador (Whisper): solo si la prueba técnica en tu iPhone resulta usable.

### Vocabulario por tamices
Cada palabra se clasifica: cognado transparente, cognado con cambio regular, opaca, falso amigo. Los cognados pasan rápido (solo género, grafía y acento); las opacas van al repaso completo; los falsos amigos llevan tarjeta doble (*burro* = mantequilla / *asino* = burro). Toda tarjeta muestra artículo italiano y sílaba tónica, y se repasa en dirección ES→IT. Fuente de datos: Wiktionary (género, acento, conjugaciones; CC BY-SA) y listas de frecuencia.

### Biblioteca y registro de horas
Pantalla «Biblioteca» con recursos externos por nivel y por unidad, cada uno con una tarea breve en la app. La app cuenta **minutos reales medidos** por hebra y avisa si una queda atrás. Meta de reparto: la app aporta estudio de la lengua, salida guiada y repaso; la entrada extensa viene sobre todo de fuera.

Candidatos a enlazar (verificar cada enlace antes de incluirlo): portal RAI de italiano para extranjeros, portal Loescher «Italiano per stranieri», cursos A1–B2 de Integrazione Migranti, Easy Italian, Podcast Italiano, LearnAmo, Un Italiano Vero, Vikidia y Wikivoyage en italiano, audiolibros de LibriVox, Treccani, WordReference, Forvo, pruebas de ejemplo PLIDA/CILS/CELI.

### De dónde sale el contenido (sin inventar italiano)
- **Secuencia y lecturas:** Piacere! (21 capítulos, A1→B2), Leggiamo, Tutt* a tavola, Cotto e mangiato, Le giornate italiane. Licencias no comerciales: válidas para uso personal.
- **Oraciones:** Tatoeba directo; oraciones de esos libros; PAISÀ (250 M de palabras, CC BY-NC-SA) para B1–B2, donde Tatoeba no alcanza.
- **Textos reales B1–B2:** Wikipedia/Vikidia/Wikivoyage, literatura de dominio público con audio de LibriVox.
- **Mapa de errores:** catálogo propio (49 códigos), corpus VALICO de aprendientes hispanohablantes (verificar acceso), estudios del cuaderno.
- **Currículo:** sillabi oficiales y PLIDA (ya resumidos), programación EOI Zamora y guías de gramática contrastiva UGR/UPO (en el cuaderno, sin leer aún).
- **Referencia para consultar, no copiar:** gramática contrastiva de Carrera Díaz.

## Fases

**Fase 0 — Cimientos (≈1 semana)**
- Guardar el informe adversarial y este plan en `docs/`; crear `CONTINUIDAD.md`; corregir `CLAUDE.md` (sin `server/`, cuatro hebras, todo gratis, uso personal); archivo de licencias.
- Pruebas técnicas medidas en tu iPhone: instalación y uso sin conexión, dictado del teclado en italiano dentro de la app, reconocimiento de voz en navegador.
- Leer las fuentes del cuaderno aún no leídas que afectan el diseño: EOI Zamora, guías UGR/UPO, revisión de *shadowing*, Partículas, componente fónico.

**Fase 1 — Reparar A1 (≈2–3 semanas). Al terminar empiezas a estudiar.**
- Pasar el prefiltro a todas las unidades A1 y reemplazar lo que no sea A1 (prioridad u18–u20).
- Quitar el «error típico» fabricado en sonidos; artículo italiano en cada sustantivo; marcar falsos amigos del vocabulario.
- Pruebas de unidad sin doble uso de la misma oración; hito y ubicación sin preguntas de 2 opciones.
- Quitar el relleno por minutos; mostrar tiempos medidos.
- Corregir traducciones detectadas y textos desfasados de la interfaz.

**Fase 2 — Motor de producción y ciclo nuevo (≈3–4 semanas)**
- Ítems de escritura corregida (los tipos `write` y `speak` ya existen en `schemas/item.schema.json`).
- Reconstrucción con diferencias, «Pedir corrección», registro de errores hacia el repaso.
- Percepción con voces nativas, comprobación por dictado, monólogos cronometrados.
- Migrar las unidades A1 al ciclo de 4 hebras.

**Fase 3 — Vocabulario por tamices (≈2 semanas):** importar Wiktionary, clasificar las 795 palabras, tarjetas nuevas, capas de tamices en las lecturas.

**Fase 4 — Biblioteca y registro por hebra (≈1 semana).**

**Fases 5–7 — A2, B1, B2.** Cada nivel repite: currículo con fuentes → contenido → test de «nivel cerrado» → examen de hito con las cuatro destrezas. Las 34 divergencias del catálogo sin unidad se reparten aquí (auxiliares, clíticos ci/ne, imperativo negativo, congiuntivo, combinados). A2 se construye mientras estudias A1, para ir siempre un nivel por delante.

Las duraciones son estimaciones mías de trabajo, no mediciones.

## Archivos clave
- Reutilizar: `pipeline/audit_rules.py`, `pipeline/exercises/` (calques, reading_items, course), `scripts/paquete_revision.py`, `web/src/state/srs.ts`, `web/src/state/timing.ts`, `web/src/writing/detect.ts`, `web/src/state/cierreA1.test.ts` (patrón de cierre).
- Modificar: `web/src/state/steps.ts`, `course.ts`, `milestone.ts`, `targets.ts`; `web/src/ui/` (pasos, repaso, prueba, ubicación); `schemas/lexeme.schema.json`, `schemas/data/course.json`; `pipeline/vocab/vocab_a1.yaml`; `CLAUDE.md`.
- Nuevos: `docs/specs/` (plan maestro), `CONTINUIDAD.md`, datos de biblioteca, importador de Wiktionary, pantallas de salida y biblioteca.

## Verificación
- Todas las pruebas en verde (`npm test`) y chequeo de tipos, en un entorno con dependencias completas.
- Test de cierre por nivel ampliado: ninguna oración fuera de nivel, ningún sustantivo sin artículo, ninguna prueba con preguntas de 2 opciones, cada unidad con tarea escrita y hablada.
- Recorrer una unidad completa en la vista previa a tamaño de teléfono, y tú en el iPhone real.
- Tras dos semanas de uso: comparar minutos medidos contra los estimados y ajustar la ruta.
- Seguirá sin verificación de nativo; la app lo declara.

## Fuentes consultadas en la web
- [Nation, las cuatro hebras](https://core.ac.uk/download/357330216.pdf)
- [VALICO, corpus de aprendientes de italiano](https://iris.unito.it/retrieve/e27ce426-c5ab-2581-e053-d805fe0acbaa/corino%20marello%20in%20ItalianoL2.pdf)
- [PAISÀ, corpus italiano con licencia CC](https://www.ilc.cnr.it/en/progetti/paisa/)
- [Recursos en línea de italiano, Farnesina](https://italiana.esteri.it/italiana/en/corsi/online-courses-and-resources/)
- [Cursos A1–B2 de Integrazione Migranti](https://integrazionemigranti.gov.it/en-gb/Dettaglio-approfondimento/id/53)
- [Transformers.js y WebGPU](https://huggingface.co/docs/transformers.js/en/guides/webgpu)
- [Ejemplo de prueba PLIDA B2](https://languageadvisor.net/wp-content/uploads/2021/05/PLIDA-B2-prova-esempio-ascleg.pdf)
