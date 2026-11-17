# M3 — prueba técnica (2026-11-17)

## Hardware
MacBook Pro 2018, Intel i5-8259U, 8 GB RAM, sin GPU, 35 GB libres. Un SLM de 7B no es viable (≈2 tokens/s y casi sin RAM libre). Decisión del usuario: por capas, modelo chico (1.5–3B) solo si mide bien; si no, reglas propias.

## Java / LanguageTool (medido)
- Java 16 del sistema no sirve. Homebrew en Intel compila dependencias (no hay bottles): descartado. Se usó Temurin 17.0.21 en `~/tools/jdk17` y LanguageTool 6.6 en `~/tools/LanguageTool-6.6` (fuera del repo).
- Servidor local con `-Xmx700m`; primera respuesta ≈2,8 s, después rápida.
- **Hallazgo: el italiano de LanguageTool solo trae corrector ortográfico (`MORFOLOGIK_RULE_IT_IT`).** Detectó «pizzza», «buonna», pero NO detectó «Ho andato», «Io sono mangiato», «Vado in Roma», «Un cane bianca», «Il mio amica», «Gli amici sono arrivato». O sea: no detecta ninguno de los errores contrastivos del catálogo.

## Consecuencia para el diseño
- LanguageTool sirve solo para erratas (útil, pero secundario).
- Los errores del catálogo hay que detectarlos con **reglas propias**: invertir los generadores de calcos de `pipeline/exercises/calques.py` (ya sabemos qué patrón es el calco de cada código). Determinista, sin modelo, explicable con `explanation_es`.
- El SLM chico queda como capa opcional para explicaciones; no se mide hasta tener las reglas.

## NO verificado todavía
Conexión HTTPS iPhone→Mac, tamaño/velocidad del SLM, umbrales de geminadas.

## Detector de escritura con reglas propias (hecho)
- `web/src/writing/detect.ts`: inversa de `pipeline/exercises/calques.py`; 8 códigos (AUX_ESSERE, PREP_PLACE, CE_AGREEMENT, PERSONAL_A, POSSESSIVE_ARTICLE, PREP_ARTICLE_CONTRACTION, COMPARATIVE_DI, TENERE_AVERE). Corre en el teléfono, sin Mac ni conexión: M3 ya no depende de la prueba iPhone–Mac para esta parte.
- Pantalla `#/escribir`: textarea + «Revisar»; el texto no se guarda ni sale del dispositivo.
- Pruebas: 12 errores típicos detectados; 21 frases correctas sin marcar; las 35 oraciones validadas del paquete salen sin marcas; los 38 calcos generados del corpus se detectan, salvo «ha uscito/entrato/salito» (válidos como transitivos, excluidos a propósito).
- `tests/py/test_calque_pairs.py` vigila que `calque-pairs.json` y `explanations.json` coincidan con el corpus y el catálogo.
- Verificado en el navegador de escritorio (texto con 3 errores → 3 avisos con explicación).

## Límites conocidos (no verificados en uso real)
- Posesivo sin artículo: heurística; no marca todos los casos y puede errar con posposición rara («amico mio» + verbo no listado).
- «loro» no se revisa (es también pronombre).
- Solo 8 patrones: «sin avisos» NO significa texto correcto. No revisa ortografía (LanguageTool queda pendiente como capa opcional en el Mac).
- Probado solo con oraciones propias y del corpus, no con escritura real de un hispanohablante; faltan falsos positivos/negativos con textos reales.
- iPhone real y sin conexión: sin probar.
