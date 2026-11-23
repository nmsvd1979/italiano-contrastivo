import type { ContentPack, Lexeme } from "../content/load";
import type { Capsule } from "../generated/capsule";
import type { Card } from "../generated/card";
import type { Item } from "../generated/item";
import type { ReviewLog } from "../generated/review-log";
import { score, type CapsuleState } from "./capsuleMachine";
import { currentView, isOptional, summary, type UnitView } from "./course";
import { currentModule, MODULE_STEP_SECONDS, moduleViews, type ModuleStepId, type ModuleView } from "./modules";
import { dueCards, newCard, review } from "./srs";
import { kindOf, stepSeconds } from "./steps";
import { estimateSeconds, type Samples } from "./timing";
import { type DayProgress, localDate, type StepId, type UnitProgress } from "./store";

export const REVIEW_CAP = 12; // ≈5 min por tanda
export const NEW_LEXEMES_PER_BATCH = 3;
/** Los falsos amigos nuevos entran al repaso solo cuando ya completaste algunas unidades: el primer día no se repasa lo que no has estudiado. */
export const FRESH_AFTER_UNITS = 2;
const freshAllowed = (units: UnitProgress[] | undefined) => (units ?? []).filter((u) => u.completed).length >= FRESH_AFTER_UNITS;

export const REVIEW_SECONDS = 5 * 60; // presupuesto del bloque ① de las fuentes
export const FILLER_MAX = 20;
/** `filler` = práctica de recuperación de unidades ya completadas, para llenar el bloque cuando hay pocas tarjetas vencidas. */
export type ReviewEntry = { card: Card } | { lexeme: Lexeme } | { filler: Item };

export const entrySeconds = (e: ReviewEntry, samples: Samples = {}): number =>
  "filler" in e ? estimateSeconds(kindOf(e.filler), samples) : estimateSeconds("card" in e ? (e.card.subject.kind === "error_code" ? "choice" : e.card.subject.kind === "writing_fix" ? "cloze" : "flashcard") : "flashcard", samples);
export type TodayPlan = {
  review: { due: number; newAvailable: number; doneToday: number; cap: number; seconds: number; filler: number };
  /** Unidad actual y su siguiente paso (null si no queda ninguna unidad por hacer). */
  unit: { view: UnitView; step: StepId; seconds: number } | null;
  /** Paso propio del módulo actual (Entrada, Salida, Fluidez o Cierre) cuando no toca una cápsula. */
  module: { view: ModuleView; step: ModuleStepId; seconds: number } | null;
  route: { done: number; total: number };
  stepsToday: number;
};

/** El progreso de otra fecha local equivale a un día vacío (la sesión cambia a medianoche local). */
export function normalizeDay(day: DayProgress, now: Date): DayProgress {
  const date = localDate(now);
  return day.date === date ? day : { date, reviewsDone: 0, capsulesDone: [] };
}

export const afterReview = (day: DayProgress): DayProgress => ({ ...day, reviewsDone: day.reviewsDone + 1 });
export const afterCapsule = (day: DayProgress, capsuleId: string): DayProgress =>
  day.capsulesDone.includes(capsuleId) ? day : { ...day, capsulesDone: [...day.capsulesDone, capsuleId] };

const unseenLexemes = (pack: ContentPack, cards: Card[]) => {
  const have = new Set(cards.map((c) => c.id));
  return pack.lexemes.filter((l) => !have.has(`lexeme:${l.id}`));
};

export function planToday(input: { pack: ContentPack; cards: Card[]; day: DayProgress; now: Date; units?: UnitProgress[]; samples?: Samples }): TodayPlan {
  const { pack, cards, now, units = [], samples = {} } = input;
  const day = normalizeDay(input.day, now);
  const due = dueCards(cards, now, Infinity).length;
  const room = Math.max(0, REVIEW_CAP - Math.min(due, REVIEW_CAP));
  const queue = reviewQueue({ pack, cards, now, units, samples });
  const seconds = queue.reduce((t, e) => t + entrySeconds(e, samples), 0);
  const mv = moduleViews(pack.course, units);
  const views = mv.units;
  const cm = currentModule(mv.modules);
  const anyCur = currentView(views);
  const cur = anyCur && isOptional(anyCur.unit) && cm ? undefined : anyCur;   // mientras un módulo pide un paso propio, no se ofrece una unidad opcional
  const step = cur?.next ?? null;
  const modStep = cm && cm.next && cm.next !== "capsulas" ? cm.next : null;
  return {
    review: { due, newAvailable: freshAllowed(units) ? Math.min(NEW_LEXEMES_PER_BATCH, room, unseenLexemes(pack, cards).length) : 0, doneToday: day.reviewsDone, cap: REVIEW_CAP, seconds, filler: queue.filter((e) => "filler" in e).length },
    unit: cur && step ? { view: cur, step, seconds: stepSeconds(cur.unit, step, pack, samples) } : null,
    module: cm && modStep ? { view: cm, step: modStep, seconds: MODULE_STEP_SECONDS[modStep] } : null,
    route: { done: summary(views).done, total: views.length },
    stepsToday: (day.stepsDone ?? []).length,
  };
}

/**
 * Una tanda de repaso: tarjetas vencidas (las más atrasadas primero), falsos amigos nuevos si sobra cupo y, si el bloque no llega a
 * 5 min, práctica de recuperación con ejercicios de unidades ya completadas (intercalados entre unidades). Nunca se inventa relleno
 * si aún no hay unidades completadas: el bloque simplemente dura lo que dura.
 */
export function reviewQueue(input: { pack: ContentPack; cards: Card[]; now: Date; units?: UnitProgress[]; samples?: Samples }): ReviewEntry[] {
  const due = dueCards(input.cards, input.now, REVIEW_CAP).map((card) => ({ card }));
  const room = REVIEW_CAP - due.length;
  const fresh = freshAllowed(input.units) ? unseenLexemes(input.pack, input.cards).slice(0, Math.min(NEW_LEXEMES_PER_BATCH, room)).map((lexeme) => ({ lexeme })) : [];
  const queue: ReviewEntry[] = [...due, ...fresh];
  const samples = input.samples ?? {};
  let seconds = queue.reduce((t, e) => t + entrySeconds(e, samples), 0);
  if (seconds >= REVIEW_SECONDS || !input.units?.length) return queue;
  const done = new Set(input.units.filter((u) => u.completed).map((u) => u.unitId));
  const pools = input.pack.course.units.filter((u) => done.has(u.id)).map((u) => {
    const ids = new Set(u.parts.practica);
    return (input.pack.itemsByCode[u.codes[0]] ?? []).filter((it) => ids.has((it as Item & { sentence_id?: string }).sentence_id ?? "") && (it.type === "choice_l1_distractor" || it.type === "cloze"));
  });
  const seen = new Set<string>();
  for (let round = 0; seconds < REVIEW_SECONDS && queue.filter((e) => "filler" in e).length < FILLER_MAX; round++) {
    let added = false;
    for (const pool of pools) {
      const it = pool[round * 7 % Math.max(1, pool.length)] ?? pool[round];
      if (!it || seen.has(it.id)) continue;
      seen.add(it.id);
      queue.push({ filler: it });
      seconds += estimateSeconds(kindOf(it), samples);
      added = true;
      if (seconds >= REVIEW_SECONDS) break;
    }
    if (!added && round > 40) break;
  }
  return queue;
}

/** Ítem de repaso de un código: rota con el número de repeticiones y evita repetir el último mostrado. */
export function pickItem(items: Item[], reps: number, lastId?: string): Item {
  let i = reps % items.length;
  if (items.length > 1 && items[i].id === lastId) i = (i + 1) % items.length;
  return items[i];
}

export const ratingFromAnswer = (correct: boolean): 3 | 1 => (correct ? 3 : 1);

/** Al cerrar una cápsula nace la tarjeta de su código, con un primer repaso según el acierto (≥80% Bien, ≥50% Difícil). */
export function closeCapsule(c: Capsule, state: CapsuleState, cards: Card[], now: Date): { card: Card; log: ReviewLog } | null {
  const code = c.target_error_codes[0];
  if (cards.some((x) => x.id === `error_code:${code}`)) return null;
  const { correct, total } = score(state, c);
  const accuracy = total ? correct / total : 0;
  const rating = accuracy >= 0.8 ? 3 : accuracy >= 0.5 ? 2 : 1;
  return review(newCard({ kind: "error_code", ref: code }, "not_applicable", now), rating, now, { origin: "capsule", capsuleId: c.id });
}
