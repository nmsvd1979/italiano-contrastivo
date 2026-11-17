# Uso y contenido (2026-11-17)

## Qué hay
- **8 cápsulas** (AUX_ESSERE, PREP_PLACE, CE_AGREEMENT, PERSONAL_A, POSSESSIVE_ARTICLE, PREP_ARTICLE_CONTRACTION, COMPARATIVE_DI, TENERE_AVERE), **179 oraciones** (de 35), 32 falsos amigos, **211 clips** de Serena (2,2 MB de audio).
- Pantallas: Hoy · Repaso (FSRS) · Escribir (detector local de los 8 errores) · Ajustes (copia de seguridad) · Acerca de.
- Ritmo: una cápsula nueva cada día dura ≈8 días; después el contenido nuevo depende de validar más oraciones/códigos. Los repasos (cápsulas + falsos amigos) siguen indefinidamente.

## Cómo se amplió el contenido (y qué NO es)
- `scripts/capsule_pack.py` elige oraciones de Tatoeba donde un generador de calcos encuentra su patrón; yo (IA) audité italiano, calco, nivel y traducción; `scripts/capsule_apply.py` aplica el veredicto (reviewer `llm-audit`; las etiquetas automáticas sin confirmar se descartan).
- 162 revisadas: 144 aprobadas, 17 rechazadas, 1 en duda. Las de pivote se tradujeron desde el italiano (`translation_kind: llm`).
- **No es verificación de un hablante nativo.** La única persona humana que revisó no sabe italiano. Auditor único (la propia IA), sin acuerdo entre auditores.
- Se corrigió el generador de «a» personal: ya no toma reflexivos («mi chiamo Ludwig»), clíticos («lo ama Mary») ni «New York».

## Robustez añadida
- Copia de seguridad: Ajustes → «Guardar copia» (JSON; hoja de compartir en iPhone) y «Restaurar» (valida todo antes de borrar nada; reemplaza el progreso).
- `navigator.storage.persist()` al arrancar (el sistema puede ignorarlo; la copia es la protección real).
- Si falla un guardado en repaso o cápsula, se avisa y se puede reintentar (antes el botón quedaba muerto); «Terminar» reintentado no duplica la tarjeta.
- «Hoy» se recalcula al volver a la app (cambio de día); el audio se detiene al pasar al ítem siguiente; el italiano lleva `lang="it"`; primera vez muestra «Cómo empezar».

## Sigue SIN verificar
- Uso en iPhone real (instalación, audio al tocar, sin conexión real, tamaño 2,6 MB precacheado).
- Que un nativo apruebe las 144 oraciones nuevas y las explicaciones.
- Clips nuevos (144) no escuchados; solo se escucharon 10 de los 67 anteriores.
- Detector de escritura: solo probado con oraciones propias y del corpus.

## Límites conocidos pendientes
- Códigos sin generador (47 − 8): sin cápsula. Candidatos seguros siguientes: ERR_ARTICLE_ALLOMORPH, ERR_PARTICIPLE_AGREEMENT.
- Cierre de cápsula en varias transacciones de IndexedDB (no atómico; el reintento es seguro).
- Capsules repiten una oración en dos tipos de ítem; disparadores compartidos.
