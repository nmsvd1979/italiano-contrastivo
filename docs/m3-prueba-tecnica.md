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
