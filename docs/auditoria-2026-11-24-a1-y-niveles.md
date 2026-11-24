# Auditoría 2026-11-24: ¿la app ya sirve para aprender A1 y para construir A2–B2?

Commit auditado: `9b5e7c6`. Dos revisiones separadas: la mía (Claude, sesión principal) y la de un auditor independiente (subagente sin acceso a mis conclusiones). Este documento junta ambas y marca dónde coinciden. Todo hallazgo «crítico» o «importante» lo comprobé yo en el código después de recibir el informe del auditor.

## Qué se ejecutó y qué no
- **Pruebas:** Python 878 en verde (y 399 omitidas). Web 1.200 de 1.200 en verde. El auditor corrió además `tsc`, que sí está instalado en la raíz (CONTINUIDAD dice que no): da 1 error, solo en una prueba (`web/src/ui/speaking.test.tsx:135`).
- **Medido con scripts sobre `web/public/content`:**
  - 12 módulos y 69 unidades A1, todas dentro de un módulo.
  - 3.201 oraciones. De sus traducciones al español, 1.240 son `llm`.
  - 11.157 ejercicios de tres tipos: elegir, hueco y ordenar. A eso se suma escribir la frase desde el español.
  - 854 palabras enseñadas en 43 unidades de vocabulario, y todas entran al repaso.
  - 59 textos, de los cuales 18 están escritos por la IA.
  - 43 MB de audio, todo con voz sintética salvo 6 palabras.
- **Leído en el código:** el flujo de Hoy, los módulos, el repaso, el examen de hito y los topes de tamaño.
- **No verificado:**
  - Uso real en iPhone o en el navegador: esta vez no abrí la app.
  - Calidad del italiano.
  - Que `syllabus-a1.json` refleje fielmente los PDF de CILS/PLIDA.
  - El build de producción.

## Veredicto 1: aprender A1 siguiendo la ruta y «Hoy»
**Casi listo. Se puede empezar a usar hoy.** Coincidimos los dos.

**Lo que está bien (verificado):**
- El camino Hoy → 12 módulos → examen de hito funciona sin callejones sin salida. Lo recorre una prueba automática (`ruta.test.ts`).
- Ningún paso referencia contenido que no exista.
- Cada cápsula trae entre 24 y 74 frases de práctica, 8 de escucha y entre 6 y 8 de prueba.
- Las 854 palabras alcanzan para A1. Un A1 suele rondar las 500–1.000.
- El repaso de palabras es de producción: se escribe en italiano desde el español, que es lo correcto.
- La cobertura del programa declara 65 de 67 requisitos.

**Lo que falta o hay que mejorar (por prioridad):**

| Prioridad | Hallazgo | Evidencia | Qué hacer |
|---|---|---|---|
| Importante | **Las pruebas repiten las mismas frases.** La prueba de la cápsula, el Cierre del módulo y el examen de hito usan las mismas 6–8 frases reservadas por unidad, siempre en el mismo orden. Si repruebas, te salen las mismas. El ≥80 % y el ≥65 % miden en parte memoria, no dominio. | `steps.ts:73-76`, `modules.ts:136-144`, `milestone.ts:22-56` | Separar los bancos: unas frases para la prueba de la cápsula, otras para el Cierre y otras para el hito, y rotarlas al repetir. |
| Importante | **El repaso puede comerse el día.** Al terminar «Palabras» entran hasta 44 tarjetas nuevas de golpe, y no hay tope diario. El botón principal manda al Repaso mientras haya algo vencido. Según la simulación aproximada del auditor, son 50–100 repasos diarios, con picos de 140–160: eso no cabe en 15 minutos. | `words.ts:20-30`, `TodayScreen.tsx:20` | Fijar un tope de palabras nuevas por día (por ejemplo, 10–15) y dejar que el resto entre los días siguientes. |
| Importante | **La producción no se evalúa.** La escritura de la Salida cuenta con cualquier texto de 12 caracteres o más. Los juegos de rol cuentan con solo terminarlos. La parte oral del hito es una autoevaluación y siempre es la misma tarea. | `WriteScreen.tsx:36`, `milestone.ts:79` | Para uso personal en A1 es aceptable, pero «Ya sabes hacer» sobreestima. Como mínimo: comparar la escritura con el texto de entrada (la reconstrucción ya existe) y rotar la tarea oral del hito. |
| Media | **Escuchar solo voz sintética.** Únicamente 2 textos se escuchan sin verlos, y uno de ellos es del examen. | `readings.json` (marca `listen`) | Para A1 basta como base, pero conviene dar más peso a la Biblioteca (audio real externo) y, de ser posible, agregar más textos solo de escucha. |
| Media | **El italiano lo validó casi todo una IA.** 3.352 revisiones `llm-audit` frente a 27 propias. Los textos reales obligatorios están escritos por la IA. | `manifest.json` | Ya se declara en la app. No es un bloqueo, es un riesgo conocido. |
| Menor | Sobra: el nivel «A1+» sin unidades, u09–u12 bloqueadas dentro del paquete, la rama antigua «por unidades» de `RouteScreen` (`:124-132`) y el archivo de atribuciones de 615 KB en el precache. | — | Limpiar cuando toque. |

**Conclusión 1:** no falta nada que impida aprender A1 con la ruta. Lo que hay que mejorar es la **medición** (pruebas que repiten frases, producción sin evaluar) y la **dosis** de repaso. Lo del repaso conviene arreglarlo antes de llegar a los módulos con mucho vocabulario (m02 en adelante), porque es lo que más afecta el uso diario.

## Veredicto 2: ¿sirve la forma de construir para A2, B1 y B2?
**Para A2 sí, como receta, pero el código necesita ajustes antes de a2m01. Para B1–B2 hacen falta cambios en el modelo de datos.** Coincidimos los dos.

**Lo que escala bien:**
- El molde de módulo (Entrada → Cápsulas → Textos → Salida → Fluidez → Cierre).
- `syllabus-aN.json` junto con `test_cobertura_aN.py`, y `ruta_obligatoria.py`, que es genérico.
- La receta de `plan-a2.md`.
- Las reglas de fuentes y de textos propios.

**Ajustes obligatorios antes de construir A2 (verificados en el código):**
1. **El nivel está fijo en «A1» en el flujo.**
   - Los módulos se encadenan en una sola lista sin mirar el nivel (`modules.ts:57-90`). Al terminar m12, a2m01 quedaría «en curso».
   - Como Hoy pone el paso del módulo antes que el hito (`TodayScreen.tsx:24-26`), **el hito A1 nunca aparecería como siguiente paso**.
   - La Ruta abre el hito solo cuando están completos *todos* los módulos, incluidos los de A2 (`RouteScreen.tsx:19`), y dibuja los módulos de A2 bajo A1 (`:99`).
   - Solo existe la dirección `#/hito/A1` (`App.tsx:110`), y los pesos del examen (`HITO.A1`) se aplican a cualquier nivel.
   - **Arreglo:** que el nivel sea un parámetro, que el hito de un nivel sea obligatorio para abrir el siguiente y que la Ruta agrupe por nivel. Agregar a `ruta.test.ts` un curso de prueba con un módulo A2. `plan-a2.md` no lo menciona y hay que agregarlo.
2. **Topes de tamaño que se rompen dentro de A2.**
   - `items_by_code.json` ya pesa 4,47 MB y el tope por archivo del precache es de 6 MiB (`vite.config.ts:35`, cuyo comentario dice «≈2,5 MiB» y está desactualizado). Unos 30 códigos más lo superan.
   - El audio va en 43 MB con un tope de 48 MB (`pipeline/tts/generate.py:16`).
   - Toda la app se carga en memoria al arrancar.
   - **Arreglo:** partir el contenido por nivel (o por módulo) y cargarlo cuando se necesite; revisar los topes.
3. **Los datos de auditoría no tienen respaldo.** `data/work/` (incluido `verdicts.json`, con los veredictos oración por oración) está en `.gitignore`. Si se pierde el disco, se pierde la trazabilidad. **Arreglo:** versionar los veredictos o respaldarlos aparte.

**Ajustes para B1–B2 (planificar; no urgen ahora):**
- **El modelo es «una unidad = un código de error = frases sueltas».** La prueba, el hito y el repaso usan `codes[0]`. B1–B2 necesita:
  - Unidades de discurso: conectores, argumentar, narrar.
  - Lecturas largas (hoy la mediana es de 110 palabras).
  - Escucha auténtica larga.
  - Un tipo de tarea de escritura extensa con rúbrica, apoyada en `correctionPrompt.ts`, que ya existe.
- **Faltan esquemas.** No hay JSON Schema para `course.json` ni para `syllabus-aN.json`, a pesar de la regla «los esquemas son la fuente de verdad». Además, A1 y A2 nombran las áreas distinto (`lexico`/`lessico`, `funcion`/`funciones`, `texto`/`testi`).
- `scripts/autorales.py` tiene `"level": "A1"` fijo.
- **Fuentes:** la hoja de ruta ya reconoce que para B1–B2 no hay audio nativo ni textos abiertos verificados. Hay que comprobarlo antes de planificar esos niveles, no después.

## Dónde discreparon las dos revisiones
- El auditor calificó como «crítico» que las pruebas reciclen frases. Yo lo dejo como «importante»: el hito llega semanas después de la cápsula, así que mide recuerdo a largo plazo, aunque no transferencia a frases nuevas.
- Sospeché que el hito tomaba preguntas de una unidad fuera de la ruta (u47). En el paquete exportado no ocurre, así que lo descarté.

## Orden recomendado
1. Tope de palabras nuevas por día (afecta el uso de A1 ya).
2. Nivel como parámetro y hito entre niveles, con su prueba (bloquea A2).
3. Partir el contenido por nivel y revisar los topes (bloquea A2 a medio camino).
4. Bancos de prueba separados y rotados.
5. Respaldo de `data/work/verdicts.json`.
6. Esquemas de `course.json` y `syllabus-aN.json`, y nombres de área unificados.
7. Para B1: tipos de lectura larga, escucha larga y escritura con rúbrica, y la búsqueda de fuentes.

## Qué quedó resuelto después de la auditoría (2026-11-24, misma jornada)
- **Resuelto:** tope diario de palabras nuevas; frases reservadas para el Cierre y el hito con rotación por intento; mínimo de 20 palabras en la escritura de la Salida y tarea oral rotativa; error de tipos y comentario de precache.
- **Resuelto en parte:** «las pruebas repiten las mismas frases» — se corrigió en el Cierre y el hito (3 frases nuevas por cápsula), no en la prueba de la cápsula. «La producción no se evalúa» — se subió el mínimo, pero sigue siendo autoevaluación.
- **Pasado a A2** (`docs/pistas-a2.md`): nivel fijo en A1, topes de tamaño, respaldo de los veredictos, esquemas JSON, modelo de datos para B1–B2.
- **Sin cambio (decisión de alcance):** audio solo sintético, italiano validado casi todo por IA, nivel «A1+» y u09–u12 en el paquete.
