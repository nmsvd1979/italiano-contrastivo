# Ruta guiada y contenido — diseño (2026-11-17)

## Por qué
El usuario pidió una app **guiada** de verdad: avance claro por unidades con lógica explícita, contenido suficiente y duraciones honestas («5 minutos» tiene que durar 5, no 1). Hoy hay 8 cápsulas sueltas y repasos; los minutos mostrados eran una fórmula (75 + 25·ítems), no una medición.

## Qué dicen las fuentes (cuaderno «App para aprender italiano», consultado 2026-11-17)
- Horas guiadas acumuladas: A1 40–50 · A2 90–100 · B1 180–240 · B2 300–400.
- Orden: A1 fonética (c/ch, g/gh, gli, gn, sc), género/número, presente, artículos y preposiciones simples y **artículo ante posesivo desde el inicio**; A2 passato prossimo/imperfetto, imperativo negativo, clíticos ci/ne, **auxiliar essere**; B1 congiuntivo tras opinión, pronombres combinados, condicional; B2 consecutio, período hipotético, concesivas, pasiva.
- Sesión diaria de 30 min: ① repaso espaciado 5 · ② gimnasio sintáctico 10 · ③ análisis fonético y voz 8 · ④ intercomprensión y reconstrucción 7. Cápsula de 4 min (0:30 trigger, 0:45 explicación, 2:15 recuperación de 4–6 ítems, 0:30 cierre). 5–7 días por semana.
- Ciclo de unidad: ANTES (input/intercomprensión) → DURANTE (noticing/garden path) → DESPUÉS (andamiaje inverso: huecos solo en los puntos de divergencia) → REVISIÓN (testing effect; hasta 33 % del tiempo).
- Diagnóstico inicial de las 4 destrezas; examen de hito por nivel con distractores calcados de la L1; promoción: ≥50 % en cada actividad (criterio de certificación) .

## Diseño
**Curso** = niveles → unidades (`schemas/data/course.json`, fuente de verdad). Cada unidad: un objetivo de divergencia, 1+ códigos de error, estado `active` (hay contenido validado) o `planned` (en el mapa, sin contenido; se dice por qué). No se inventan unidades «activas» sin oraciones validadas.

**Pasos de cada unidad activa** (ciclo de las fuentes), cada uno con minutos calculados por ítems × segundos por tipo:
1. **Descubre** (ANTES/noticing): 4 oraciones con el punto de divergencia resaltado, traducción y audio, + 2 preguntas de inferencia de significado.
2. **Cápsula** (DURANTE): las 4 fases ya existentes.
3. **Práctica** (DESPUÉS): ~18 ítems de elección/hueco/orden (el hueco cae solo en el punto divergente).
4. **Escucha** (bloque ③ en el teléfono): 8 dictados con los clips de Serena. *No* mide geminadas ni acento (eso necesita ASR en el Mac).
5. **Prueba de unidad** (REVISIÓN): 10 ítems con oraciones reservadas (no vistas en Práctica); **≥ 80 % completa la unidad** y desbloquea la siguiente (umbral mío: las fuentes dan 50 % para certificar un nivel entero, no para dominar un patrón).

**Día** («Hoy»): ① Repaso con presupuesto de tiempo (≈5 min: vencidas + relleno con falsos amigos/ítems de unidades anteriores) y ② el siguiente paso de la unidad actual (≈10 min tope). Ruta visible en `#/ruta` con estados bloqueada / actual / completada y minutos por paso. Todo fraccionable.

**Tiempos honestos**: segundos por ítem con valores a priori conservadores (elección 12, hueco 20, orden 30, traducir 45, dictado 50, lectura+inferencia 25) que se **reemplazan por la mediana medida** en el uso real del usuario (guardada en el dispositivo). Los minutos de la pantalla salen de ahí; la cápsula deja de decir «4 min» por fórmula.

**Diagnóstico**: prueba de ubicación corta (≈6 min, 12 ítems tomados de las unidades A1–A2 activas); las unidades con ≥ 75 % se marcan «dominadas» (se saltan, siguen accesibles).

## Enfoques considerados
- A. Seguir con cápsulas sueltas y solo ordenarlas: rápido, pero no cumple «ruta guiada» ni da minutos reales. Descartado.
- B. **Unidades de 5 pasos + día con presupuesto de tiempo (elegido):** respeta el ciclo de las fuentes, se construye con lo que ya hay (oraciones validadas + generadores) y es verificable con datos.
- C. Replicar los 4 bloques de 30 min tal cual: ③ y ④ dependen de ASR y de textos que no existen; se haría con relleno. Descartado: se mapean a pasos que sí se pueden hacer (Escucha, Descubre/Reconstrucción) y se declara lo que falta.

## No metas / límites
- Bloque ③ real (geminadas/heterotónicas por ASR) y ④ con textos y los 7 tamices: pendientes (necesitan Mac y textos).
- B1–B2: solo se muestran como `planned` salvo que haya oraciones validadas y generador.
- Contenido validado por IA, no por nativo.
