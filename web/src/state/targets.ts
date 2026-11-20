/** Minutos objetivo por unidad de A1 (plan 2026-11-19): 48 unidades × 60 min ≈ 48 h + repaso y examen de hito ⇒ ≥ 50 h. */
export const TARGET_MINUTES = { descubre: 7, palabras: 5, lectura: 10, capsula: 4, practica: 10, escucha: 12, practica2: 10, prueba: 4 } as const;
export const UNIT_TARGET_MINUTES = Object.values(TARGET_MINUTES).reduce((a, b) => a + b, 0); // 62 de pasos (las unidades de vocabulario suman «Palabras»; sin lista: 57) + ficha y repaso de la sesión ≈ 60
export const A1_TARGET_HOURS = 50;
export const MIN_SENTENCES_TARGET = 40; // oraciones validadas con audio por unidad
