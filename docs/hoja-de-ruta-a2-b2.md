# Hoja de ruta A2 → B2: objetivo, método y qué hacer cuando falta algo

Escrita el 2026-11-24 al cerrar A1, para no repetir las vueltas que costó A1. Es un **método**, no una promesa de plazos: los esfuerzos son estimaciones mías basadas en cómo se armó A1.

## 1. Objetivo final y cuándo un nivel está «terminado»

**Meta del proyecto:** B2 en 18 a 24 meses para hablar, entender y escribir con precisión, estudiando solo, gratis y sin hablante nativo.

Un nivel está terminado cuando se cumplen estas tres cosas, en este orden:

1. **Cobertura declarada.** Existe `schemas/data/syllabus-aN.json` con cada requisito del programa oficial (CILS y PLIDA de ese nivel), y cada uno está «covered» (apunta a una unidad, módulo, rol, tarea o texto que existe), «partial» o «gap» (con el hueco y cómo cerrarlo). La prueba `tests/py/test_cobertura_aN.py` lo exige: ≥ 80 % cubierto, nada «covered» sin referencias, ningún hueco sin plan.
2. **Hito de nivel** con las cinco partes: reconocimiento, escribir, escuchar (dictado + comprensión sin ver el texto), leer (textos no vistos) y hablar (rúbrica). Mínimo 50 % por parte, 65 % en total.
3. **Uso real.** Tú completas los módulos y apruebas el hito. Esto no se puede automatizar.

Lo que ninguna de las tres garantiza: que un nativo apruebe el italiano de la app. Todo sigue siendo «validado por IA». La app lo declara.

## 2. Qué dice la evidencia que condiciona A2–B2

(Resumen de `docs/metodos-y-estructura-de-la-app.md`; ahí están las fuentes y lo que no se pudo verificar.)

- **Unidades temáticas hechas de cápsulas**, con salida hablada y escrita dentro de cada una, no módulos aparte.
- **A1 + A2 deberían ser cerca de un tercio de las horas; B1 + B2, dos tercios.** Hoy A1 ya pesa más de la cuenta; A2 debe ser más compacto que A1 (≈ 8–10 módulos, no 11).
- **La meseta del hispanohablante está en el intermedio.** Desde A2 hay que medir **precisión al producir** (escribir y hablar), no solo comprensión: seguimiento de los «puntos calientes» (a personal, auxiliares, preposiciones de lugar, artículos, clíticos, subjuntivo, dobles) con pruebas diferidas.
- **Orden de adquisición del italiano** (Pavia / Processability): presente → passato prossimo → imperfetto → futuro → condicional → congiuntivo. No saltarlo.
- **Dos fechas por estructura:** reconocer antes que producir. Los programas no coinciden en dónde van futuro, condicional y congiuntivo (CILS: B2; PLIDA y Génova: B1 al menos para reconocer). Decisión propuesta: reconocer en A2–B1 y producir en B1–B2.

## 3. El método, paso a paso (lo que se hizo en A1, ordenado)

Cada nivel repite estos pasos. Los comandos son los reales del repositorio.

1. **Mapear el programa.** Copiar el formato de `schemas/data/syllabus-a1.json`. Fuentes: fichas CILS del nivel (alojadas por el IIC de Buenos Aires: `Contenuti-Livello-A2.pdf`, etc.), Sillabo PLIDA y Sillabo UniGe (URLs en `research_notes/.../curriculo_secuencia.md`, no versionado; las principales están en `docs/metodos-y-estructura-de-la-app.md`). Marcar cada requisito con su estado probable.
2. **Diseñar los módulos.** Un módulo = una situación + una función (`schemas/data/course.json → modules`). Tamaño 4–8 cápsulas. Cada uno con `can_do_es`, `entry_reading`, `roleplays`, `tasks`, `phrase_groups`, `extra_readings`, `writing_es`, `library`. Validación automática en `pipeline/exercises/modules.py`.
3. **Cápsulas (unidades).** Para cada error o punto nuevo:
   - Código en `schemas/data/topic-codes.json` (explicación en español).
   - Si es una transformación mecánica: generador en `pipeline/exercises/calques.py` (se prueba con `tests/py/test_calques.py`). Si es vocabulario o partículas: tema en `pipeline/vocab/vocab_a1.yaml` (+ tamiz en `sieves.json`).
   - Candidatas: `python scripts/fill_pack.py CODIGO 60` (oraciones de Tatoeba que ya encajan).
   - **Auditoría una por una** (italiano correcto, nivel, sin vulgaridades ni modismos; traducción propia donde Tatoeba no trae español) → `data/work/capsules/verdicts.json` → `python scripts/capsule_apply.py`.
   - Reconstruir: `python -m pipeline export`, `capsules`, `readings`, `tts` (con `ESPEAK_DATA_PATH` del venv).
   - Meta: ≥ 30 oraciones por unidad (la prueba `cierreA1.test.ts` lo vigila; copiar para A2).
4. **Entrada, salida y texto real de cada módulo** (ver §4: de dónde sale el texto).
5. **Cierre del nivel:** archivo de cobertura + hito + `docs/` + `CONTINUIDAD.md`.

## 4. De dónde sale el contenido (en este orden de preferencia)

| Prioridad | Fuente | Estado verificado | Uso |
|---|---|---|---|
| 1 | **Libros abiertos** *Piacere!* (Iowa, CC BY-NC-SA), *Leggiamo* (LBCC, CC BY-NC), *Tutt\* a tavola!* vol. 1 y 2 (UMass, CC BY-NC), *Giornate italiane* (UT Austin, CC BY-NC-SA) | Leídos en el navegador integrado (los lectores automáticos reciben 403). *Piacere!*: capítulos de passato prossimo con avere/essere, concordancia del participio, pronombres indirectos, reflexivos, imperfetto, comparativos, futuro, ci/ne, imperativo, condicional. *Giornate*: unidades 6–11 (passato prossimo, imperfetto, futuro, trabajo, viajes, bienestar, condicional). *Tutt\* a tavola!* vol. 2: cap. 8 (passato prossimo e imperfetto) y 11 (restaurante) verificados; 7, 9, 10 y 12 por revisar | Diálogos (roles), preguntas orales («Conversazione»), listas de frases verbatim |
| 2 | **Tatoeba** (API `api.tatoeba.org/unstable/sentences?lang=ita&q=…&sort=relevance`; descargas en `tatoeba.org/downloads`) | CC BY 2.0 FR; verificado | Oraciones sueltas para las cápsulas; audio NM1 (1.591 clips cortos, CC BY 4.0) |
| 3 | **Wikivoyage en inglés «Italian phrasebook»** (CC BY-SA) y **OpenLearn «Beginners' Italian»** (CC BY-NC-SA en el PDF; la web dice «All rights reserved») | Verificados | Frases funcionales, textos cortos |
| 4 | **Textos propios escritos por la IA** | Autorizado por el usuario el 2026-11-24 solo cuando no hay fuente | Ver §5 |
| — | PLIDA, CILS, CERTIT | Derechos reservados | Solo enlazar o imitar el formato |

**Sin fuente abierta confirmada (no volver a buscar sin una pista nueva):** diálogos de tiempo, tienda y hotel en libros abiertos; menús, carteles y SMS reales con licencia; «Può ripetere?» en trato formal; audio de diálogos nativos abierto. *Common Voice* (CC0) tiene condiciones de redistribución sin confirmar; *Lingua Libre* tiene palabras sueltas (verificar por archivo).

## 5. Cuándo y cómo generar contenido propio

Regla (decisión del usuario, 2026-11-24): si no hay fuente abierta suficiente, la IA escribe el texto. Para que sea honesto y se pueda auditar después:

- Todo texto propio lleva `authored: true` en `content/readings/*.json` (y `scripts/autorales.py` es su única fuente de verdad: así se regenera y se revisa en un solo lugar). La interfaz dice «escrito por la IA, no es de un libro ni lo revisó un nativo».
- **Italiano simple y del nivel**, apoyado en frases ya verificadas de libros abiertos (se cita cuáles en `adaptation`). Nada de modismos ni registros raros. Tratamiento Lei/tu coherente con la situación.
- Traducción al español y preguntas de comprensión (≥ 4, con la respuesta correcta en posiciones distintas) escritas junto con el texto.
- Los documentos (menú, horario, formulario, cartel, anuncio) son tablas (`kind: documento`); los diálogos tienen `speaker` en cada línea (así sirven de juego de roles y reciben dos voces).
- Cada palabra nueva se clasifica en `pipeline/vocab/reading_words.json` (la construcción falla si falta alguna, a propósito).
- Si más adelante se encuentra una fuente abierta equivalente, el texto propio se **reemplaza** por el real y se borra de `autorales.py`.

## 6. Propuesta de módulos A2 (a validar con el archivo de cobertura A2)

Basada en los códigos ya definidos (u09–u12) y en `course.json → planned`; el orden respeta la secuencia de adquisición.

| # | Módulo (qué sabrás hacer) | Cápsulas probables | Entrada probable (fuente) |
|---|---|---|---|
| 1 | Contar el pasado (con avere y essere) | u09 (concordancia del participio), irregulares del participio, reflexivos en passato | *Piacere!* «Lettura: Il mio viaggio», *Giornate* unidad 6 |
| 2 | Describir cómo eran las cosas (imperfetto) | imperfetto regular e irregular, «da quanto tempo» | *Piacere!* «L'imperfetto», *Tutt\* a tavola!* vol. 2 cap. 7–8 |
| 3 | Contar y describir a la vez (passato prossimo vs imperfetto) | oposición, acompañantes del tiempo | *Tutt\* a tavola!* vol. 2 cap. 8 |
| 4 | Pronombres que ahorran palabras (lo/la/li/le, mi/ti/gli) | clíticos directos e indirectos, ci y ne | *Piacere!* pronombres de objeto directo e indirecto |
| 5 | Comparar y elegir | u11 (comparativos), superlativos, irregulares | *Piacere!* comparativos y superlativos |
| 6 | Planes y decisiones (futuro y condicional de cortesía) | futuro simple, condicional de dovere/potere/volere | *Piacere!* «Il futuro», «Il condizionale» |
| 7 | Dar y pedir instrucciones, consejos y permisos | imperativo con pronombres, formal («Lei») | *Piacere!* «Imperativo (tu, noi, voi)» |
| 8 | Viajar y resolver problemas | u10 («a» personal: no se usa), vocabulario de viajes y servicios, reclamos simples | *Giornate* unidad 9 |
| 9 | Trabajo y estudios | vocabulario laboral, CV, anuncios de empleo | *Piacere!* «Cercare lavoro» (ya en el repositorio como `rd_lavoro`) |
| 10 | Opinar (primer paso del congiuntivo, solo reconocer) | «penso che», «credo che» (u12 pasa de B1 a reconocimiento en A2 o se mantiene B1: decidir con el archivo de cobertura) | *Piacere!* «Il congiuntivo presente» |

Lo que A2 **hereda como pendiente de A1** (ver `schemas/data/syllabus-a1.json`, estados «partial» y «gap»): «per + infinitivo», clíticos átonos (módulo 4), «stare + gerundio», billetes/etiquetas/lista de compra, avisos orales, entonación (esperar audio nativo), y las áreas temáticas «comunicación y medios», «tecnología», «oficinas públicas y servicios».

## 7. Cómo ir más rápido que en A1 (aprendizajes)

- **Escribir primero el archivo de cobertura** y recién después las unidades: en A1 se descubrieron los huecos (plurales, imperativo negativo, auxiliar essere) al final y obligó a una segunda pasada.
- **Un módulo completo antes del siguiente**, con su entrada, rol, tarea y texto real; no construir unidades sueltas.
- **Generadores primero:** una unidad sin generador de calcos no sirve para práctica de detectar errores; revisar antes qué errores del hispanohablante son mecánicos (cada uno cuesta unas 30–40 líneas).
- **Auditar en lotes** con `fill_pack.py` y listas de ids: 150 oraciones se auditan en una pasada; lo caro es traducir las que Tatoeba no trae con español.
- **No tocar el tope de audio** sin avisar: está en `pipeline/tts/generate.py` (48 MB al 2026-11-24).
- **Probar en el iPhone al terminar cada módulo**, no al final del nivel: es lo único que la IA no puede hacer.

## 8. Riesgos y decisiones abiertas

- **Material real para B1–B2.** Tatoeba tiene mucho, pero A2+ exige textos continuos y diálogos que los libros abiertos cubren hasta B1; B2 depende de corpus (PAISÀ CC BY-NC-SA, no verificado), de prensa abierta (Wikinotizie CC BY, Vikidia, sin verificar) o de textos propios. **Antes de planificar B1–B2, comprobar qué hay de verdad.**
- **Calidad del italiano propio.** A medida que los textos suben de nivel, el riesgo de error de la IA sube. Mitigación: pedir a una segunda pasada independiente que los audite (subagente) y mantener la etiqueta visible.
- **La meseta.** Si la precisión al producir no sube con el uso, la ruta no está funcionando aunque se completen módulos: por eso hacen falta las pruebas diferidas (pendientes).
- **Tamaño de la app.** Audio ≈ 42 MB hoy; A2 sumaría ≈ 15 MB. Revisar el tope.
- **Rigidez de los candados** entre módulos: se decidirá con tu uso real de A1.
