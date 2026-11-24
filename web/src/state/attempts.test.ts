import { describe, expect, it } from "vitest";
import type { Item } from "../generated/item";
import { recordAttempt, trackAttempt, updateDay } from "./attempts";
import { addDaySeconds } from "./strands";
import { localDate, memoryStore, type Store } from "./store";

const item = (code?: string) => ({ id: "i1", type: "cloze", text: "x ___", answers: ["y"], requires_server: false, review_status: "validated", ...(code ? { target_error_codes: [code] } : {}) }) as unknown as Item;
const today = () => localDate(new Date());
const empty = { date: "2026-11-24", reviewsDone: 0, capsulesDone: [] };

describe("recordAttempt", () => {
  it("suma aciertos e intentos de un tema sin tocar los demás", () => {
    const a = recordAttempt(empty, "ERR_A", true);
    const b = recordAttempt(recordAttempt(a, "ERR_A", false), "ERR_B", false);
    expect(b.attempts).toEqual({ ERR_A: { ok: 1, n: 2 }, ERR_B: { ok: 0, n: 1 } });
    expect(a.attempts).toEqual({ ERR_A: { ok: 1, n: 1 } });   // no muta
  });
});

describe("escrituras del día", () => {
  it("tiempo medido e intentos en paralelo no se pisan", async () => {
    const store = memoryStore();
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < 10; i++) { jobs.push(addDaySeconds(store, "foco", 1)); jobs.push(trackAttempt(store, item("ERR_A"), i % 2 === 0)); }
    await Promise.all(jobs);
    const day = await store.getDay(today());
    expect(day.seconds?.foco).toBe(10);
    expect(day.attempts?.ERR_A).toEqual({ ok: 5, n: 10 });
  });
  it("un ejercicio sin tema no escribe nada", async () => {
    const store = memoryStore();
    await trackAttempt(store, item(), true);
    expect((await store.getDay(today())).attempts).toBeUndefined();
  });
  it("un fallo de guardado no rompe el estudio ni la cola", async () => {
    const real = memoryStore();
    let broken = true;
    const flaky = { ...real, getDay: async (d: string) => { if (broken) throw new Error("sin almacenamiento"); return real.getDay(d); } } as Store;
    await expect(updateDay(flaky, new Date(), (d) => d)).resolves.toBeUndefined();
    broken = false;
    await trackAttempt(flaky, item("ERR_A"), true);
    expect((await real.getDay(today())).attempts?.ERR_A).toEqual({ ok: 1, n: 1 });
  });
});
