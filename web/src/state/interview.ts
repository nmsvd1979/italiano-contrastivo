import type { Course, InterviewQuestion, Speaking } from "../content/load";

/** Preguntas de una ronda de «Preguntas por voz». */
export const INTERVIEW_SIZE = 6;
/** De la ronda, como máximo estas son del tema del módulo; el resto repasa módulos anteriores del mismo nivel. */
export const INTERVIEW_OWN = 4;
export const INTERVIEW_ID = "entrevista";

/** Mezcla estable (misma semilla, mismo orden): cada intento cambia el orden sin depender de Math.random. */
function shuffle<T>(xs: T[], seed: number): T[] {
  const out = [...xs];
  let s = (seed * 2654435761) >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Ronda de preguntas por voz de un módulo: hasta 4 de su tema y el resto de los módulos anteriores del mismo nivel, en orden al azar.
 * Si no hay módulos anteriores (m01), se completa con más preguntas del propio módulo. `attempt` cambia la selección y el orden.
 */
export function interviewRound(speaking: Speaking | null | undefined, course: Course, moduleId: string, attempt = 0): InterviewQuestion[] {
  const bank = speaking?.interview?.questions ?? [];
  const mods = course.modules ?? [];
  const me = mods.find((m) => m.id === moduleId);
  if (!me) return [];
  const earlier = new Set(mods.slice(0, mods.indexOf(me)).filter((m) => m.level === me.level).map((m) => m.id));
  const seed = hash(moduleId) + attempt * 97;
  const own = shuffle(bank.filter((q) => q.module === moduleId), seed);
  const prev = shuffle(bank.filter((q) => earlier.has(q.module)), seed + 1);
  const picked = [...own.slice(0, INTERVIEW_OWN), ...prev, ...own.slice(INTERVIEW_OWN)].slice(0, INTERVIEW_SIZE);
  return shuffle(picked, seed + 2);
}
