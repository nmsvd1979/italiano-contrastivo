import type { Capsule } from "../generated/capsule";
import type { CapsuleProgress } from "./store";

export type CapsuleState = {
  phase: "trigger" | "explanation" | "retrieval" | "closing" | "done";
  index: number;
  answers: Record<string, boolean>;
};
export type CapsuleEvent = { type: "continue" } | { type: "answer"; itemId: string; correct: boolean };

export function initialState(c: Capsule, saved?: CapsuleProgress): CapsuleState {
  if (!saved) return { phase: "trigger", index: 0, answers: {} };
  const index = saved.phase === "retrieval" ? c.retrieval.filter((it) => it.id in saved.answers).length : 0;
  return { phase: saved.phase, index, answers: { ...saved.answers } };
}

export function next(s: CapsuleState, c: Capsule, e: CapsuleEvent): CapsuleState {
  if (e.type === "continue") {
    if (s.phase === "trigger") return { ...s, phase: "explanation" };
    if (s.phase === "explanation") return { ...s, phase: "retrieval", index: 0 };
    if (s.phase === "closing") return { ...s, phase: "done" };
    return s;
  }
  if (s.phase !== "retrieval" || c.retrieval[s.index]?.id !== e.itemId) return s;
  const answers = { ...s.answers, [e.itemId]: e.correct };
  const index = s.index + 1;
  return index >= c.retrieval.length ? { phase: "closing", index: 0, answers } : { phase: "retrieval", index, answers };
}

/** Lo que se guarda tras cada paso; al terminar no queda nada que retomar. */
export function toProgress(s: CapsuleState, capsuleId: string): CapsuleProgress | null {
  return s.phase === "done" ? null : { capsuleId, phase: s.phase, answers: s.answers };
}

export function score(s: CapsuleState, c: Capsule): { correct: number; total: number } {
  return { correct: c.retrieval.filter((it) => s.answers[it.id]).length, total: c.retrieval.length };
}
