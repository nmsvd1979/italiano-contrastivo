import { createEmptyCard, fsrs, type Grade, type State } from "ts-fsrs";
import calibration from "../../../schemas/data/calibration.json";
import type { Card } from "../generated/card";
import type { ReviewLog } from "../generated/review-log";

const scheduler = fsrs({ enable_fuzz: false }); // retención por defecto 0,9: el intervalo en días es igual a la estabilidad
const DAY_MS = 86_400_000;
const REVIEW_STATE = 2;

type Subject = Card["subject"];
type LexicalType = Card["lexical_type"];

const calibrationFor = (t: LexicalType) =>
  t === "cognate" ? calibration.cognate : t === "false_friend" ? calibration.false_friend : calibration.neutral;

export function newCard(subject: Subject, lexicalType: LexicalType, now: Date): Card {
  const empty = createEmptyCard(now);
  return {
    id: `${subject.kind}:${subject.ref}`,
    subject,
    lexical_type: lexicalType,
    calibration: { ...calibrationFor(lexicalType) },
    fsrs: {
      due: empty.due.toISOString(), stability: empty.stability, difficulty: empty.difficulty,
      scheduled_days: empty.scheduled_days, reps: empty.reps, lapses: empty.lapses,
      learning_steps: empty.learning_steps, state: empty.state,
    },
  };
}

export type ReviewOptions = { origin?: ReviewLog["origin"]; capsuleId?: string };

/**
 * Aplica ts-fsrs y luego la calibración léxica: en la primera repetición suma ΔD a la dificultad (1–10) y multiplica la
 * estabilidad por γs; un lapso de falso amigo vuelve a multiplicar la estabilidad por γs.
 */
export function review(card: Card, rating: 1 | 2 | 3 | 4, now: Date, opts: ReviewOptions = {}): { card: Card; log: ReviewLog } {
  const { card: next } = scheduler.next({ ...card.fsrs, state: card.fsrs.state as State }, now, rating as Grade);
  let { stability, difficulty } = next;
  let recalibrated = false;
  if (card.fsrs.reps === 0) {
    difficulty = Math.min(10, Math.max(1, difficulty + card.calibration.delta_d));
    stability *= card.calibration.gamma_s;
    recalibrated = true;
  } else if (rating === 1 && card.fsrs.state === REVIEW_STATE && card.lexical_type === "false_friend") {
    stability *= card.calibration.gamma_s;
    recalibrated = true;
  }
  let scheduledDays = next.scheduled_days;
  let due = next.due;
  if (recalibrated && next.state === REVIEW_STATE) {
    scheduledDays = Math.max(1, Math.round(stability));
    due = new Date(now.getTime() + scheduledDays * DAY_MS);
  }
  const updated: Card = {
    ...card,
    fsrs: {
      due: due.toISOString(), stability, difficulty, scheduled_days: scheduledDays, reps: next.reps, lapses: next.lapses,
      learning_steps: next.learning_steps, state: next.state, last_review: (next.last_review ?? now).toISOString(),
    },
  };
  const log: ReviewLog = { card_id: card.id, rating, reviewed_at: now.toISOString(), origin: opts.origin ?? "review" };
  if (opts.capsuleId) log.capsule_id = opts.capsuleId;
  return { card: updated, log };
}

/** Tarjetas vencidas, las más atrasadas primero; las que vencen en el futuro no entran. */
export function dueCards(cards: Card[], now: Date, limit: number): Card[] {
  return cards
    .filter((c) => new Date(c.fsrs.due).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime())
    .slice(0, limit);
}
