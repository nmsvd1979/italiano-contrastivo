import type { DayProgress } from "./store";

/** Un día cuenta si se hizo al menos un bloque: un repaso, una cápsula o un paso de unidad. */
export const isActive = (d: DayProgress | undefined): boolean =>
  !!d && (d.reviewsDone > 0 || d.capsulesDone.length > 0 || (d.stepsDone?.length ?? 0) > 0);

const dayBefore = (date: string): string => {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return t.toISOString().slice(0, 10);
};

/**
 * Racha de días seguidos con estudio. Hoy sin estudiar todavía no la corta (queda pendiente).
 * Protector: se perdona UN día sin estudio por cada 7 días caminados hacia atrás (no dos seguidos).
 */
export function computeStreak(days: DayProgress[], today: string): { streak: number; studiedToday: boolean; protectorUsed: boolean } {
  const active = new Set(days.filter(isActive).map((d) => d.date));
  const studiedToday = active.has(today);
  let cursor = studiedToday ? today : dayBefore(today);
  let streak = 0, sinceBridge = 7, protectorUsed = false;
  while (true) {
    if (active.has(cursor)) { streak++; sinceBridge++; cursor = dayBefore(cursor); continue; }
    const prev = dayBefore(cursor);
    if (sinceBridge >= 7 && active.has(prev)) { protectorUsed = true; sinceBridge = 0; cursor = prev; continue; }
    break;
  }
  return { streak, studiedToday, protectorUsed };
}
