import { describe, expect, it } from "vitest";
import { REFUERZO_KEY } from "./dayplan";
import { finishRefuerzo } from "./progress";
import { localDate, memoryStore } from "./store";

const NOW = new Date("2026-11-24T12:00:00");

describe("Refuerzo del plan de hoy", () => {
  it("al terminar la tanda se anota en el día y no se duplica", async () => {
    const store = memoryStore();
    await finishRefuerzo(store, NOW);
    await finishRefuerzo(store, NOW);
    expect((await store.getDay(localDate(NOW))).stepsDone).toEqual([REFUERZO_KEY]);
  });
  it("cuenta como actividad del día (racha) sin tocar el resto del progreso", async () => {
    const store = memoryStore();
    await store.putDay({ date: localDate(NOW), reviewsDone: 2, capsulesDone: [], seconds: { foco: 120 } });
    await finishRefuerzo(store, NOW);
    expect(await store.getDay(localDate(NOW))).toMatchObject({ reviewsDone: 2, seconds: { foco: 120 }, stepsDone: [REFUERZO_KEY] });
  });
});
