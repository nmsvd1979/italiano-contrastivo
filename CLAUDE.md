# italiano-contrastivo — guía para Claude Code

App de autoaprendizaje de italiano (A1→B2) para hispanohablantes, basada en lingüística contrastiva ES→IT, los 7 tamices EuroComRom y la Noticing Hypothesis. Objetivo: habla y escritura precisas, evitando la fosilización por "falsa transparencia". Reemplazará a la app anterior (`italiano-plan`), de la que NO se reutiliza código ni contenido.

Fuente de diseño: cuaderno NotebookLM "App para aprender italiano" (id 231c3dc2-c7c3-44dd-b591-9515c2de2829).

## Arquitectura (híbrida Mac + PWA)
- `schemas/`: JSON Schema (draft 2020-12) = fuente de verdad. De ahí se generan tipos TS y modelos Pydantic; no se editan a mano.
- `pipeline/`: Python. Corpus Tatoeba/OPUS → SQLite de autoría. Solo lo `validated` se exporta.
- `server/`: servidor local en el Mac (LanguageTool, SLM con JSON Schema, WhisperX/MFA, Piper).
- `web/`: PWA (TS, ts-fsrs). Funciona sola offline; con el Mac al alcance activa evaluación de escritura y habla.
- Estado del usuario solo en IndexedDB del dispositivo. Sin cuentas ni servicios de pago.

## Reglas
- Contenido en italiano: no inventar. Todo ítem nuevo nace `needs_review`; dudas en `docs/dudas-italiano.md`.
- Licencias: Tatoeba CC BY 2.0 FR (guardar autor e id), Piper según modelo. Mantener atribuciones al día.
- No marcar como verificado lo que no se probó (audio, iPhone).
- Git: nunca push directo a `main`; ramas `feat/…` o `fix/…` + PR; un tema por PR; commits en español.
- Interfaz y explicaciones: español neutro con tuteo.

## Revisión y verificación (transparencia)
- Quien revisa el italiano en este proyecto no es hablante nativo ni domina el idioma. La "validación" combina esa revisión con un auditor IA (`reviewer = "llm-audit"` en `reviews`). **No equivale a verificación de un hablante nativo**: el export lo desglosa por revisor y la app debe declararlo.
- Una compuerta de revisión que da 100% en todo no es una medición: contrastarla con una auditoría independiente antes de confiar en ella.
- Las traducciones por pivote (vía inglés) pierden género, número y persona: tasa de rechazo medida 37%. No usar pares pivote sin verificarlos uno a uno.
