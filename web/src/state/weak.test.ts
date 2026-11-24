import { describe, expect, it } from "vitest";
import type { ContentPack, Course } from "../content/load";
import type { Item } from "../generated/item";
import type { DayProgress } from "./store";
import { WEAK_ACCURACY, WEAK_MIN_ATTEMPTS, weakItems, weakSpots } from "./weak";

const TODAY = "2026-11-24";
const course = { units: [{ id: "u1", title: "Essere y avere", codes: ["ERR_A"] }, { id: "u2", title: "Il, lo, l'", codes: ["ERR_B"] }, { id: "u3", title: "Tener", codes: ["ERR_C"] }] } as unknown as Course;
const day = (date: string, attempts: DayProgress["attempts"]): DayProgress => ({ date, reviewsDone: 0, capsulesDone: [], attempts });

describe("puntos débiles", () => {
  it("el 80 % exacto no es débil y el 79 % sí", () => {
    expect(weakSpots([day(TODAY, { ERR_A: { ok: 8, n: 10 } })], course, TODAY).spots).toEqual([]);
    expect(weakSpots([day(TODAY, { ERR_A: { ok: 79, n: 100 } })], course, TODAY).spots).toHaveLength(1);
    expect(WEAK_ACCURACY).toBe(0.8);
  });
  it("con menos de 5 intentos no aparece y con 5 sí", () => {
    expect(weakSpots([day(TODAY, { ERR_A: { ok: 0, n: WEAK_MIN_ATTEMPTS - 1 } })], course, TODAY).spots).toEqual([]);
    expect(weakSpots([day(TODAY, { ERR_A: { ok: 0, n: WEAK_MIN_ATTEMPTS } })], course, TODAY).spots).toHaveLength(1);
  });
  it("suma varios días y solo cuenta las últimas 3 semanas", () => {
    const days = [day(TODAY, { ERR_A: { ok: 1, n: 3 } }), day("2026-11-10", { ERR_A: { ok: 1, n: 3 } }), day("2026-11-03", { ERR_A: { ok: 0, n: 50 } })]; // la ventana son 21 días contando hoy: el 4 de noviembre entra y el 3 ya no
    const r = weakSpots(days, course, TODAY);
    expect(r.spots[0]).toMatchObject({ code: "ERR_A", ok: 2, n: 6 });
    const old = weakSpots([day("2026-10-20", { ERR_A: { ok: 0, n: 50 } })], course, TODAY);
    expect(old.spots).toEqual([]);
    expect(old.attempts).toBe(0);
  });
  it("ordena por precisión y desempata por intentos; respeta el máximo", () => {
    const days = [day(TODAY, { ERR_A: { ok: 3, n: 10 }, ERR_B: { ok: 3, n: 10 }, ERR_C: { ok: 1, n: 10 } })];
    expect(weakSpots(days, course, TODAY).spots.map((s) => s.code)).toEqual(["ERR_C", "ERR_A", "ERR_B"]);
    expect(weakSpots([day(TODAY, { ERR_A: { ok: 3, n: 10 }, ERR_B: { ok: 3, n: 20 } })], course, TODAY).spots.map((s) => s.code)).toEqual(["ERR_B", "ERR_A"]);
    expect(weakSpots(days, course, TODAY, 2).spots).toHaveLength(2);
  });
  it("un tema sin unidad se omite y los datos de cada punto son los de su unidad", () => {
    const r = weakSpots([day(TODAY, { ERR_ZZ: { ok: 0, n: 10 }, ERR_B: { ok: 2, n: 10 } })], course, TODAY);
    expect(r.spots).toHaveLength(1);
    expect(r.spots[0]).toMatchObject({ code: "ERR_B", unitId: "u2", title: "Il, lo, l'", ok: 2, n: 10, accuracy: 0.2 });
  });
  it("attempts cuenta todos los intentos de la ventana, también los de temas que no son débiles", () => {
    const r = weakSpots([day(TODAY, { ERR_A: { ok: 10, n: 10 }, ERR_B: { ok: 1, n: 2 } })], course, TODAY);
    expect(r.attempts).toBe(12);
    expect(r.spots).toEqual([]);
  });
  it("sin días no falla", () => {
    expect(weakSpots([], course, TODAY)).toEqual({ spots: [], attempts: 0 });
  });
});

describe("ejercicios de los puntos débiles", () => {
  const mk = (code: string, n: number, type = "cloze"): Item[] => Array.from({ length: n }, (_, i) => ({ id: `${code}_${i}`, type, requires_server: false, review_status: "validated", target_error_codes: [code] }) as unknown as Item);
  const pack = { itemsByCode: { ERR_A: mk("ERR_A", 30), ERR_B: mk("ERR_B", 30), ERR_C: [...mk("ERR_C", 2), ...mk("ERR_C", 3, "translate_es_it").map((x, i) => ({ ...x, id: `tr_${i}` }))] } } as unknown as Pick<ContentPack, "itemsByCode">;
  const spot = (code: string) => ({ code, unitId: "u", title: code, ok: 0, n: 10, accuracy: 0 });
  it("reparte por turnos, empezando por el más débil, sin repetir y hasta 10", () => {
    const out = weakItems([spot("ERR_A"), spot("ERR_B")], pack, TODAY);
    expect(out).toHaveLength(10);
    expect(new Set(out.map((i) => i.id)).size).toBe(10);
    expect((out[0] as { target_error_codes: string[] }).target_error_codes[0]).toBe("ERR_A");
    expect((out[1] as { target_error_codes: string[] }).target_error_codes[0]).toBe("ERR_B");
  });
  it("solo usa tipos permitidos y devuelve los que haya si son menos de 10", () => {
    const out = weakItems([spot("ERR_C")], pack, TODAY);
    expect(out.map((i) => i.type)).toEqual(["cloze", "cloze"]);
  });
  it("otra fecha cambia la tanda", () => {
    const a = weakItems([spot("ERR_A")], pack, "2026-11-24").map((i) => i.id).join();
    const b = weakItems([spot("ERR_A")], pack, "2026-11-25").map((i) => i.id).join();
    expect(a).not.toBe(b);
  });
  it("sin puntos débiles o sin ejercicios devuelve lista vacía", () => {
    expect(weakItems([], pack, TODAY)).toEqual([]);
    expect(weakItems([spot("ERR_NO")], pack, TODAY)).toEqual([]);
  });
});
