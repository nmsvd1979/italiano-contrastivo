import { STEP_LABEL, STEPS } from "./course";
import type { TodayPlan } from "./session";
import type { DayProgress, StepId } from "./store";
import { stepSeconds } from "./steps";
import type { ContentPack } from "../content/load";
import type { Samples } from "./timing";

export type BlockKey = "repaso" | "lectura" | "gimnasio" | "voz";
export const BLOCKS: Record<BlockKey, { n: string; title: string; color: string }> = {
  repaso: { n: "①", title: "Repaso", color: "var(--b1)" },
  gimnasio: { n: "②", title: "Gimnasio sintáctico", color: "var(--b2)" },
  voz: { n: "③", title: "Sonidos y voz", color: "var(--b3)" },
  lectura: { n: "④", title: "Lectura y reconstrucción", color: "var(--b4)" },
};
/** Qué bloque de la sesión de las fuentes trabaja cada paso de la unidad. */
export const BLOCK_OF_STEP: Record<StepId, BlockKey> = { descubre: "lectura", capsula: "gimnasio", practica: "gimnasio", escucha: "voz", prueba: "gimnasio" };

export type SessionBlock = { key: BlockKey; title: string; subtitle: string; seconds: number; href: string; done: boolean; step?: StepId };
export const SESSION_BUDGET_SECONDS = 25 * 60;

/**
 * La sesión de hoy: el repaso y los siguientes pasos de tu unidad (cada uno es un bloque de las fuentes) hasta llenar ≈25–30 min.
 * Los pasos ya hechos hoy se muestran como hechos. El orden respeta el ciclo de la unidad (descubrir → practicar → escuchar → probar).
 */
export function planSession(input: { plan: TodayPlan; day: DayProgress; pack: ContentPack; samples?: Samples }): SessionBlock[] {
  const { plan, day, pack, samples = {} } = input;
  const pending = plan.review.due + plan.review.newAvailable;
  const work = pending + plan.review.filler;
  const blocks: SessionBlock[] = [{
    key: "repaso", title: BLOCKS.repaso.title, seconds: plan.review.seconds, href: "#/repaso", done: work === 0 || (day.reviewsDone > 0 && pending === 0),
    subtitle: pending > 0 ? `Tienes ${pending} para repasar${plan.review.filler ? " + práctica de unidades anteriores" : ""}` : plan.review.filler ? "Práctica de recuperación de unidades anteriores" : "No tienes repasos pendientes ahora.",
  }];
  const unit = plan.unit?.view.unit;
  if (!unit || !plan.unit) return blocks;
  const doneToday = new Set(day.stepsDone ?? []);
  const doneSteps = STEPS.filter((s) => doneToday.has(`${unit.id}:${s}`) && plan.unit!.view.progress.done[s]);
  for (const step of doneSteps) {
    blocks.push({ key: BLOCK_OF_STEP[step], step, title: BLOCKS[BLOCK_OF_STEP[step]].title, subtitle: `${STEP_LABEL[step]} · hecho`, seconds: stepSeconds(unit, step, pack, samples), href: `#/unidad/${unit.id}/${step}`, done: true });
  }
  let total = plan.review.seconds + blocks.filter((b) => b.done && b.key !== "repaso").reduce((t, b) => t + b.seconds, 0);
  const start = STEPS.indexOf(plan.unit.step);
  for (const step of STEPS.slice(start)) {
    if (plan.unit.view.progress.done[step]) continue;
    const seconds = stepSeconds(unit, step, pack, samples);
    if (total > 0 && total + seconds > SESSION_BUDGET_SECONDS + 5 * 60 && blocks.some((b) => !b.done && b.key !== "repaso")) break;
    blocks.push({ key: BLOCK_OF_STEP[step], step, title: BLOCKS[BLOCK_OF_STEP[step]].title, subtitle: STEP_LABEL[step], seconds, href: `#/unidad/${unit.id}/${step}`, done: false });
    total += seconds;
    if (total >= SESSION_BUDGET_SECONDS) break;
  }
  return blocks;
}
