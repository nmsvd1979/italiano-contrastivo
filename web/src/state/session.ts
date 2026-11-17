import type { ContentPack, Lexeme } from "../content/load";
import type { Capsule } from "../generated/capsule";
import type { Card } from "../generated/card";
import type { Item } from "../generated/item";
import type { ReviewLog } from "../generated/review-log";
import { score, type CapsuleState } from "./capsuleMachine";
import { dueCards, newCard, review } from "./srs";
import { type DayProgress, localDate } from "./store";

export const REVIEW_CAP = 12; // ≈5 min por tanda
export const NEW_LEXEMES_PER_BATCH = 3;

export type ReviewEntry = { card: Card } | { lexeme: Lexeme };
export type TodayPlan = {
  review: { due: number; newAvailable: number; doneToday: number; cap: number };
  nextCapsule: Capsule | null;
  allCapsulesDone: boolean;
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

export function planToday(input: { pack: ContentPack; cards: Card[]; day: DayProgress; now: Date }): TodayPlan {
  const { pack, cards, now } = input;
  const day = normalizeDay(input.day, now);
  const due = dueCards(cards, now, Infinity).length;
  const room = Math.max(0, REVIEW_CAP - Math.min(due, REVIEW_CAP));
  const have = new Set(cards.map((c) => c.id));
  const nextCapsule = pack.capsules.find((c) => !have.has(`error_code:${c.target_error_codes[0]}`)) ?? null;
  return {
    review: { due, newAvailable: Math.min(NEW_LEXEMES_PER_BATCH, room, unseenLexemes(pack, cards).length), doneToday: day.reviewsDone, cap: REVIEW_CAP },
    nextCapsule,
    allCapsulesDone: nextCapsule === null,
  };
}

/** Una tanda de repaso: tarjetas vencidas (las más atrasadas primero) y, si sobra cupo, falsos amigos nuevos. */
export function reviewQueue(input: { pack: ContentPack; cards: Card[]; now: Date }): ReviewEntry[] {
  const due = dueCards(input.cards, input.now, REVIEW_CAP).map((card) => ({ card }));
  const room = REVIEW_CAP - due.length;
  const fresh = unseenLexemes(input.pack, input.cards).slice(0, Math.min(NEW_LEXEMES_PER_BATCH, room)).map((lexeme) => ({ lexeme }));
  return [...due, ...fresh];
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
