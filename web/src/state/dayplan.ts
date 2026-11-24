import { STEP_LABEL, stepsFor } from "./course";
import { STRAND_OF_STEP, type Strand } from "./strands";
import { MODULE_STEP_LABEL, type ModuleStepId } from "./modules";
import type { TodayPlan } from "./session";
import type { DayProgress, StepId } from "./store";
import { stepSeconds } from "./steps";
import type { ContentPack } from "../content/load";
import { estimateSeconds, type Samples } from "./timing";
import type { WeakSpot } from "./weak";

export type BlockKey = "repaso" | "lectura" | "gimnasio" | "voz";
export const BLOCKS: Record<BlockKey, { n: string; title: string; color: string }> = {
  repaso: { n: "①", title: "Repaso", color: "var(--b1)" },
  gimnasio: { n: "②", title: "Gimnasio sintáctico", color: "var(--b2)" },
  voz: { n: "③", title: "Sonidos y voz", color: "var(--b3)" },
  lectura: { n: "④", title: "Lectura y reconstrucción", color: "var(--b4)" },
};
/** Qué bloque de la sesión de las fuentes trabaja cada paso de la unidad. */
export const BLOCK_OF_STEP: Record<StepId, BlockKey> = { descubre: "lectura", palabras: "repaso", lectura: "lectura", capsula: "gimnasio", practica: "gimnasio", escucha: "voz", practica2: "gimnasio", prueba: "gimnasio" };

/** Qué bloque de la sesión trabaja cada paso propio de un módulo. */
export const BLOCK_OF_MODULE_STEP: Record<ModuleStepId, BlockKey> = { entrada: "lectura", textos: "lectura", salida: "voz", fluidez: "voz", cierre: "gimnasio" };

/** Hebra de cada paso propio de un módulo (el cierre es una prueba: produce). */
export const STRAND_OF_MODULE_STEP: Record<ModuleStepId, Strand> = { entrada: "entrada", textos: "entrada", salida: "salida", fluidez: "fluidez", cierre: "salida" };

export type SessionBlock = { key: BlockKey; strand: Strand; label: string; title: string; subtitle: string; seconds: number; href: string; done: boolean; step?: StepId };

/** Marca en `DayProgress.stepsDone` de la tanda de «Lo que más te cuesta» (el Refuerzo del plan de hoy). */
export const REFUERZO_KEY = "refuerzo";
/** Qué se hace en cada paso de la unidad, en pocas palabras (la fila de Hoy). */
export const STEP_HINT: Record<StepId, string> = {
  descubre: "Ejemplos reales y el punto clave", palabras: "El vocabulario de la cápsula", lectura: "Un texto corto para entender", capsula: "La regla en pocos minutos",
  practica: "Ejercicios de la cápsula", escucha: "Dictado y repetir en voz alta", practica2: "Más ejercicios, con otras frases", prueba: "Escribe las frases desde el español",
};

/**
 * El plan de hoy, por contenido y no por tiempo: el repaso, el refuerzo (si hay temas débiles) y TODOS los pasos que faltan de tu cápsula
 * (o el paso propio del módulo). Los pasos ya hechos hoy se muestran como hechos. El orden respeta el ciclo de la unidad
 * (descubrir → practicar → escuchar → probar). El tiempo no recorta nada: los minutos son solo una referencia.
 */
export function planSession(input: { plan: TodayPlan; day: DayProgress; pack: ContentPack; samples?: Samples; weak?: WeakSpot[] }): SessionBlock[] {
  const { plan, day, pack, samples = {}, weak = [] } = input;
  const pending = plan.review.due + plan.review.newAvailable;
  const work = pending + plan.review.filler;
  const blocks: SessionBlock[] = [{
    key: "repaso", strand: "foco", label: "Repaso", title: BLOCKS.repaso.title, seconds: plan.review.seconds, href: "#/repaso", done: work === 0 || (day.reviewsDone > 0 && pending === 0),
    subtitle: pending > 0 ? `Tienes ${pending} para repasar${plan.review.filler ? " + práctica de unidades anteriores" : ""}` : plan.review.filler ? "Práctica de recuperación de unidades anteriores" : "No tienes repasos pendientes ahora.",
  }];
  if (weak.length > 0) {
    blocks.push({
      key: "gimnasio", strand: "foco", label: "Refuerzo", title: BLOCKS.gimnasio.title, seconds: 10 * estimateSeconds("choice", samples), href: "#/debiles",
      done: (day.stepsDone ?? []).includes(REFUERZO_KEY), subtitle: "Lo que más te cuesta: 10 frases",
    });
  }
  const unit = plan.unit?.view.unit;
  if (!unit && plan.module) {   // la sesión del día es un paso propio del módulo (Entrada, Salida, Fluidez o Cierre)
    const { view, step, seconds } = plan.module;
    blocks.push({ key: BLOCK_OF_MODULE_STEP[step], strand: STRAND_OF_MODULE_STEP[step], label: MODULE_STEP_LABEL[step], title: BLOCKS[BLOCK_OF_MODULE_STEP[step]].title, subtitle: `Módulo ${view.index + 1} · ${MODULE_STEP_LABEL[step]}`, seconds, href: `#/modulo/${view.module.id}/${step}`, done: false });
    return blocks;
  }
  if (!unit && plan.milestone && !plan.milestone.passed) {   // todos los módulos hechos: el siguiente tramo del camino es el examen de hito
    blocks.push({ key: "gimnasio", strand: "salida", label: `Examen de hito ${plan.milestone.level}`, title: BLOCKS.gimnasio.title, subtitle: "La prueba de todo el nivel", seconds: 30 * 60, href: `#/hito/${plan.milestone.level}`, done: false });
    return blocks;
  }
  if (!unit || !plan.unit) return blocks;
  const doneToday = new Set(day.stepsDone ?? []);
  const doneSteps = stepsFor(unit).filter((s) => doneToday.has(`${unit.id}:${s}`) && plan.unit!.view.progress.done[s]);
  for (const step of doneSteps) {
    blocks.push({ key: BLOCK_OF_STEP[step], strand: STRAND_OF_STEP[step], label: STEP_LABEL[step], step, title: BLOCKS[BLOCK_OF_STEP[step]].title, subtitle: "Hecho hoy", seconds: stepSeconds(unit, step, pack, samples), href: `#/unidad/${unit.id}/${step}`, done: true });
  }
  const steps = stepsFor(unit);
  const start = steps.indexOf(plan.unit.step);
  for (const step of steps.slice(start)) {
    if (plan.unit.view.progress.done[step]) continue;
    blocks.push({ key: BLOCK_OF_STEP[step], strand: STRAND_OF_STEP[step], label: STEP_LABEL[step], step, title: BLOCKS[BLOCK_OF_STEP[step]].title, subtitle: STEP_HINT[step], seconds: stepSeconds(unit, step, pack, samples), href: `#/unidad/${unit.id}/${step}`, done: false });
  }
  return blocks;
}
