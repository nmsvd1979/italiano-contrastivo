# italiano-contrastivo — guía para Claude Code

App de autoaprendizaje de italiano (A1→B2) para hispanohablantes, basada en lingüística contrastiva ES→IT, los 7 tamices EuroComRom y la Noticing Hypothesis. Objetivo: habla y escritura precisas, evitando la fosilización por "falsa transparencia". Reemplazará a la app anterior (`italiano-plan`), de la que NO se reutiliza código ni contenido.

Fuente de diseño: cuaderno NotebookLM "App para aprender italiano" (id 231c3dc2-c7c3-44dd-b591-9515c2de2829).

## Rumbo vigente
Estructura (desde 2026-11-24): la ruta se organiza en **módulos temáticos** (situación comunicativa) hechos de **cápsulas** (las unidades por código de error). Cada módulo: Entrada (texto real) → Cápsulas → Salida (hablar y escribir, obligatoria) → Fluidez → Cierre (prueba mezclada ≥80 %). Plan en `docs/specs/2026-11-24-plan-modulos.md`; evidencia en `docs/metodos-y-estructura-de-la-app.md`. «Hablar» y «Escribir» son prácticas libres fuera de las pestañas.
Un nivel está terminado cuando: (1) `schemas/data/syllabus-aN.json` declara la cobertura del programa CILS/PLIDA y la prueba `tests/py/test_cobertura_aN.py` pasa, (2) el hito de cinco partes está listo y (3) el usuario completa los módulos. Método para A2–B2 en `docs/hoja-de-ruta-a2-b2.md`. **A1 está construido (69 unidades, 12 módulos, cobertura en `syllabus-a1.json`); A2 solo está planificado**: requisitos y módulos en `schemas/data/syllabus-a2.json` (prueba `tests/py/test_cobertura_a2.py`) y receta paso a paso en `docs/plan-a2.md`. Siguiente paso: módulo a2m01 (pasado con avere/essere).
Rediseño del frontend (aprobado 2026-11-24; etapas 1–3 hechas, 4–5 pendientes): `docs/specs/2026-11-24-rediseno-frontend.md`.
Plan maestro en `docs/specs/2026-11-22-plan-maestro.md`; revisión que lo motivó en `docs/revision-adversarial-2026-11-22.md`; estado y siguiente paso en `CONTINUIDAD.md`. Léelos al empezar.
- Uso solo personal; todo gratis (sin API de pago). Meta: B2 en 18–24 meses a ritmo flexible, para hablar, entender y escribir bien.
- El ciclo de cada unidad sigue las cuatro hebras de Nation: entrada, foco en la forma, salida (escribir y hablar) y fluidez. No es solo reconocimiento.
- La corrección de escritura y habla va por capas gratuitas (reconstrucción con diferencias, traducción inversa, detector propio, IA gratuita fuera de la app, dictado del iPhone). No hay servidor en el Mac: el hardware no lo soporta.
- La app recomienda exposición externa (Biblioteca) y mide minutos reales, no estimados.

## Arquitectura (PWA sin servidor)
- `schemas/`: JSON Schema (draft 2020-12) = fuente de verdad. De ahí se generan tipos TS y modelos Pydantic; no se editan a mano.
- `pipeline/`: Python. Corpus Tatoeba/OPUS y libros abiertos → SQLite de autoría. Solo lo `validated` se exporta.
- `web/`: PWA (TS, ts-fsrs). Todo corre en el dispositivo y funciona offline.
- Estado del usuario solo en IndexedDB del dispositivo. Sin cuentas ni servicios de pago.

## Reglas
- Contenido en italiano: **primero buscar fuente abierta** (libros abiertos, Tatoeba). Si no existe, el usuario autorizó (2026-11-24) que la IA escriba el texto, con estas condiciones: va marcado `authored: true` (se escribe solo en `scripts/autorales.py`), italiano simple del nivel apoyado en frases de fuentes verificadas, la interfaz lo declara y se reemplaza cuando aparezca una fuente real. Nada se presenta como de un libro ni como revisado por un nativo. Todo ítem nuevo nace `needs_review`; dudas en `docs/dudas-italiano.md`.
- Licencias: Tatoeba CC BY 2.0 FR (guardar autor e id), Piper según modelo. Libros abiertos (Piacere!, Leggiamo, etc.) son no comerciales: válidos solo mientras la app sea personal. Mantener atribuciones al día.
- Antes de enlazar un recurso externo o confiar en una licencia marcada «verificar», comprobarlo.
- No marcar como verificado lo que no se probó (audio, iPhone).
- Git: commitear directo a `main`, sin ramas ni PR; commits pequeños en español, un tema por commit; nunca `--force`.
- Interfaz y explicaciones: español neutro con tuteo.

## Revisión y verificación (transparencia)
- Quien revisa el italiano en este proyecto no es hablante nativo ni domina el idioma. La "validación" combina esa revisión con un auditor IA (`reviewer = "llm-audit"` en `reviews`). **No equivale a verificación de un hablante nativo**: el export lo desglosa por revisor y la app debe declararlo.
- Una compuerta de revisión que da 100% en todo no es una medición: contrastarla con una auditoría independiente antes de confiar en ella.
- Las traducciones por pivote (vía inglés) pierden género, número y persona: tasa de rechazo medida 37%. No usar pares pivote sin verificarlos uno a uno.
