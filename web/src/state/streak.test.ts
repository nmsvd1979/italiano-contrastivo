import { describe, expect, it } from "vitest";
import { computeStreak } from "./streak";
import type { DayProgress } from "./store";

const d = (date: string, reviewsDone = 1): DayProgress => ({ date, reviewsDone, capsulesDone: [] });
const days = (...ds: string[]) => ds.map((x) => d(x));

describe("racha", () => {
  it("sin estudio no hay racha", () => expect(computeStreak([], "2026-11-17")).toEqual({ streak: 0, studiedToday: false, protectorUsed: false }));
  it("cuenta días seguidos incluyendo hoy", () => {
    expect(computeStreak(days("2026-11-15", "2026-11-16", "2026-11-17"), "2026-11-17")).toMatchObject({ streak: 3, studiedToday: true });
  });
  it("hoy sin estudiar aún no corta la racha de ayer", () => {
    expect(computeStreak(days("2026-11-15", "2026-11-16"), "2026-11-17")).toMatchObject({ streak: 2, studiedToday: false });
  });
  it("un día sin estudiar se perdona con el protector", () => {
    expect(computeStreak(days("2026-11-14", "2026-11-15", "2026-11-17"), "2026-11-17")).toEqual({ streak: 3, studiedToday: true, protectorUsed: true });
  });
  it("dos días seguidos sin estudiar cortan la racha", () => {
    expect(computeStreak(days("2026-11-13", "2026-11-14", "2026-11-17"), "2026-11-17").streak).toBe(1);
  });
  it("el protector es uno por semana: un segundo hueco dentro de 7 días corta", () => {
    expect(computeStreak(days("2026-11-10", "2026-11-12", "2026-11-14", "2026-11-16", "2026-11-17"), "2026-11-17").streak).toBe(3);
  });
  it("cruza el cambio de mes", () => {
    expect(computeStreak(days("2026-10-31", "2026-11-01"), "2026-11-01").streak).toBe(2);
  });
  it("un día con 0 repasos pero un paso de unidad cuenta", () => {
    expect(computeStreak([{ date: "2026-11-17", reviewsDone: 0, capsulesDone: [], stepsDone: ["u01:descubre"] }], "2026-11-17").streak).toBe(1);
  });
});
