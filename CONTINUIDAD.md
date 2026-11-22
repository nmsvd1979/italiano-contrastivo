# CONTINUIDAD

Registro de avances. Lo más reciente arriba.

## 2026-11-22 (noche) — Fase 1: traducciones y vocabulario con artículo
**Traducciones:** 5 subagentes revisaron las 2.204 oraciones usadas en unidades (italiano→español): marcaron 53 (2,4 %); más 11 cambios mecánicos de vocabulario de España («coche»→«auto», «gafas»→«lentes»). 64 oraciones retraducidas con `scripts/retranslate.py` (quedan `translation_kind=llm`, marcadas) y re-exportadas. Lo más grave eran los «vorrei» traducidos «quiero» (ahora «quisiera»), «vosotros» y la persona/género. Una muestra mía de 45 pares sin marcar no halló errores de sentido; la auditoría es de IA, **no de un nativo**, y pudo dejar pasar casos. Respaldo de la base: `data/work/authoring.pre-traducciones.db` (fuera de git).

**Vocabulario (paso Palabras y Repaso):** el sustantivo se muestra con su artículo italiano (580 de 795 palabras: «il latte», «l'acqua»); 23 llevan aviso «género distinto del español» (solo palabras parientes: latte/leche, sangue/sangre…); 7 falsos amigos del catálogo avisan en la lista (+ `topo`, de la tabla de la fuente 3285814c). Género/número añadidos a mano a 60 sustantivos de las unidades de sonidos en `schemas/data/course.json`. El género de las 795 palabras lo escribió el proyecto antes y solo revisé terminaciones inusuales: sin verificar por un nativo. Quedan 194 palabras sin artículo (adjetivos, verbos, adverbios).

**Pruebas:** Python 1.217 (con la base de datos real enlazada) y web 757 en verde; se construye la app. Sigue sin correr `tsc`.

**Fuera de este paso (decidido):** «quitar el relleno por minutos» se mueve a la Fase 2, porque es parte del rediseño del ciclo de unidad (cuatro hebras), no un arreglo suelto. Falta aún: oraciones nuevas para u07, u02, u05.

## 2026-11-22 (tarde) — Fase 1, primer paso: oraciones y pruebas de A1
**Hecho:** el generador del curso (`pipeline/exercises/course.py`) ahora filtra las oraciones de unidades A1 con el prefiltro de auditoría (quita imperfetto, congiuntivo, condicional, >14 palabras, temas inadecuados): 70 de 2.591 oraciones salieron de las unidades. Causa raíz de la «unidad 1 difícil»: la prueba reservaba a propósito las 6 oraciones MÁS difíciles; ahora se reparte por todo el rango. En las unidades de sonidos el texto «Error típico de hispanohablantes» pasó a «Así no se escribe (no sonaría igual)», porque esas grafías las arma el generador y no son errores documentados. Reconstruir el contenido es determinista (se comprobó que reproduce lo publicado byte a byte antes de cambiar nada).

**Pruebas:** web 756 y Python 801 en verde; la app se construye y se vio en el navegador. **No se pudo correr el chequeo de tipos** (`tsc` no está instalado en este entorno).

**Costos declarados:**
- u07, u02 y u05 bajaron de 30 oraciones (27, 29 y 27): quedan en `KNOWN_GAPS` de `cierreA1.test.ts`. Faltan oraciones nuevas.
- El bloque de voz de u08 y u11 (A2) quedó en ≈8 min (antes ≥9): se bajó el mínimo de la prueba a 8 min; es límite de contenido.
- La prueba de cada unidad sigue siendo de 6 oraciones y de 2 opciones (se cambia en la Fase 2).

**Siguiente:** artículo italiano en cada sustantivo del vocabulario y marcar falsos amigos; corregir las traducciones que no calzan; quitar el relleno por minutos; nuevas oraciones para u07, u02, u05.

## 2026-11-22 — Revisión adversarial y plan maestro
**Hecho:** revisión completa de lo construido (`docs/revision-adversarial-2026-11-22.md`); lectura de las tres fuentes de diseño del cuaderno NotebookLM y búsquedas externas; plan maestro aprobado (`docs/specs/2026-11-22-plan-maestro.md`); `CLAUDE.md` corregido.

**Decisiones del usuario:**
- Uso solo personal (permite libros abiertos de licencia no comercial).
- Todo gratis: sin API de pago. La corrección de escritura y habla se resuelve por capas (reconstrucción con diferencias, traducción inversa, detector propio, IA gratuita fuera de la app con encargo preparado, dictado del iPhone como comprobador).
- Meta: B2 en 18–24 meses a ritmo flexible, para hablar, entender y escribir bien (no para un examen). La app debe recomendar exposición externa.
- Sin personas (tutor/nativo) por ahora; la app declara que nada está verificado por un nativo.
- Se evoluciona lo construido, no se rehace.

**Cambio de diseño:** de 7 pasos de reconocimiento a cuatro hebras (entrada, foco en la forma, salida, fluidez) según Nation.

**Pendiente:** Fase 0 (pruebas técnicas en el iPhone: sin conexión, dictado del teclado en italiano, reconocimiento de voz en navegador; leer fuentes del cuaderno aún sin leer: EOI Zamora, guías UGR/UPO, shadowing, Partículas, componente fónico; archivo de licencias).

**Siguiente paso:** Fase 1, reparar A1 (empezar por u18–u20 con el prefiltro `pipeline/audit_rules.py`).

**Notas:**
- Las consultas con IA al cuaderno se agotan por tiempo; se lee el texto de las fuentes con `source_get_content`.
- Los enlaces y licencias marcados «verificar» en el plan no están confirmados.
- Las duraciones de las fases son estimaciones de trabajo, no mediciones.
