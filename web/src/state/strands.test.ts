import { describe, expect, it } from "vitest";
import { addDaySeconds, addSeconds, lastDates, STRAND_OF_STEP, totalSeconds, weekTotals } from "./strands";
import { memoryStore, localDate } from "./store";
import { STEPS } from "./course";

const day = (date: string, seconds = {}) => ({ date, reviewsDone: 0, capsulesDone: [], seconds });

describe("hebras: tiempo real activo", () => {
  it("cada paso de la unidad pertenece a una hebra", () => {
    for (const s of STEPS) expect(STRAND_OF_STEP[s], s).toBeTruthy();
    expect(STRAND_OF_STEP.lectura).toBe("entrada");
    expect(STRAND_OF_STEP.prueba).toBe("salida");
  });
  it("suma segundos sin tocar lo demás del día", () => {
    const d = addSeconds(addSeconds(day("2026-11-22"), "foco", 30), "foco", 15);
    expect(d.seconds).toEqual({ foco: 45 });
    expect(d.reviewsDone).toBe(0);
  });
  it("la semana incluye hoy y los 6 días anteriores, no más", () => {
    expect(lastDates("2026-11-22")).toHaveLength(7);
    expect(lastDates("2026-11-22").at(-1)).toBe("2026-11-16");
    const w = weekTotals([day("2026-11-22", { foco: 60 }), day("2026-11-16", { salida: 30 }), day("2026-11-15", { foco: 9999 })], "2026-11-22");
    expect(w).toEqual({ foco: 60, salida: 30 });
    expect(totalSeconds(w)).toBe(90);
  });
  it("guarda en el día de hoy y acumula", async () => {
    const store = memoryStore();
    const now = new Date("2026-11-22T15:00:00");
    await addDaySeconds(store, "entrada", 20, now);
    await addDaySeconds(store, "entrada", 25, now);
    expect((await store.getDay(localDate(now))).seconds).toEqual({ entrada: 45 });
  });
});
