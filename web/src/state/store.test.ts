import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../generated/card";
import type { ReviewLog } from "../generated/review-log";
import { localDate, openStore, StoreUnavailableError } from "./store";

let n = 0;
const fresh = () => `test-${++n}`;

const card = (id = "c1"): Card => ({
  id, subject: { kind: "error_code", ref: "ERR_AUX_ESSERE" }, lexical_type: "not_applicable",
  calibration: { delta_d: 0, gamma_s: 1 },
  fsrs: { due: "2026-11-17T12:00:00.000Z", stability: 1, difficulty: 5, scheduled_days: 1, reps: 1, lapses: 0, learning_steps: 0, state: 1, last_review: "2026-11-16T12:00:00.000Z" },
});

afterEach(() => vi.unstubAllGlobals());

describe("store", () => {
  it("guarda y recupera una tarjeta, y sobrevive a cerrar y reabrir", async () => {
    const name = fresh();
    const a = await openStore(name);
    await a.putCard(card());
    const b = await openStore(name);
    expect(await b.getCard("c1")).toEqual(card());
    expect((await b.allCards()).map((c) => c.id)).toEqual(["c1"]);
  });

  it("rechaza una tarjeta que no cumple el esquema", async () => {
    const s = await openStore(fresh());
    const bad = { ...card(), fsrs: { ...card().fsrs, state: 9 } } as Card;
    await expect(s.putCard(bad)).rejects.toThrow(/esquema/);
    expect(await s.allCards()).toEqual([]);
  });

  it("registra repasos válidos y rechaza inválidos", async () => {
    const s = await openStore(fresh());
    const log: ReviewLog = { card_id: "c1", rating: 3, reviewed_at: "2026-11-16T12:00:00.000Z", origin: "review" };
    await s.addReviewLog(log);
    expect(await s.allLogs()).toEqual([log]);
    await expect(s.addReviewLog({ ...log, rating: 7 })).rejects.toThrow(/esquema/);
  });

  it("getDay de una fecha sin datos devuelve el día vacío; días distintos no se mezclan", async () => {
    const s = await openStore(fresh());
    expect(await s.getDay("2026-11-16")).toEqual({ date: "2026-11-16", reviewsDone: 0, capsulesDone: [] });
    await s.putDay({ date: "2026-11-16", reviewsDone: 5, capsulesDone: ["cap_x"] });
    expect((await s.getDay("2026-11-16")).reviewsDone).toBe(5);
    expect((await s.getDay("2026-11-17")).reviewsDone).toBe(0);
  });

  it("guarda, recupera y borra el progreso de una cápsula", async () => {
    const s = await openStore(fresh());
    const p = { capsuleId: "cap_x", phase: "retrieval" as const, answers: { i1: true } };
    await s.putCapsuleProgress(p);
    expect(await s.getCapsuleProgress("cap_x")).toEqual(p);
    await s.clearCapsuleProgress("cap_x");
    expect(await s.getCapsuleProgress("cap_x")).toBeUndefined();
  });

  it("openStore sin IndexedDB lanza StoreUnavailableError", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(openStore(fresh())).rejects.toBeInstanceOf(StoreUnavailableError);
  });
});

describe("localDate", () => {
  it("usa la fecha local: 02:30 UTC del 17 es todavía el 16 en Santiago", () => {
    expect(localDate(new Date("2026-11-17T02:30:00Z"), "America/Santiago")).toBe("2026-11-16");
    expect(localDate(new Date("2026-11-17T03:30:00Z"), "America/Santiago")).toBe("2026-11-17");
  });
});
