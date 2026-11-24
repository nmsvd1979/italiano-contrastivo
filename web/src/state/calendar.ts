import { totalSeconds } from "./strands";
import type { DayProgress } from "./store";
import { isActive } from "./streak";

export type CalendarCell = { date: string; seconds: number; studied: boolean; future: boolean; level: 0 | 1 | 2 };
/** Desde cuántos segundos de estudio en un día se considera «bastante» (nivel 2). Valor del proyecto, no un dato de la literatura. */
export const LONG_DAY_SECONDS = 10 * 60;

const utc = (date: string): number => { const [y, m, d] = date.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fmt = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Las últimas cuatro semanas (lunes a domingo; la última fila es la semana de `today`). Se trabaja con fechas `YYYY-MM-DD` sin pasar por la
 * zona horaria. Un día cuenta si se hizo algo (`isActive`) o hay tiempo medido; los días posteriores a `today` no cuentan.
 */
export function fourWeeks(days: DayProgress[], today: string): { cells: CalendarCell[]; studiedDays: number; seconds: number } {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const dayMs = 86_400_000;
  const mondayIndex = (new Date(utc(today)).getUTCDay() + 6) % 7;
  const start = utc(today) - (mondayIndex + 21) * dayMs;
  const cells: CalendarCell[] = [];
  let studiedDays = 0, seconds = 0;
  for (let i = 0; i < 28; i++) {
    const date = fmt(start + i * dayMs);
    const future = date > today;
    const d = byDate.get(date);
    const secs = d ? totalSeconds(d.seconds ?? {}) : 0;
    const studied = !future && (isActive(d) || secs > 0);
    const level: 0 | 1 | 2 = !studied ? 0 : secs >= LONG_DAY_SECONDS ? 2 : 1;
    if (studied) { studiedDays++; seconds += secs; }
    cells.push({ date, seconds: future ? 0 : secs, studied, future, level });
  }
  return { cells, studiedDays, seconds };
}
