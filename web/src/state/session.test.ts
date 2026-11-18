import { describe, expect, it } from "vitest";
import type { Capsule } from "../generated/capsule";
import type { Card } from "../generated/card";
import type { Item } from "../generated/item";
import type { ContentPack, Lexeme } from "../content/load";
import { afterCapsule, afterReview, closeCapsule, entrySeconds, normalizeDay, pickItem, planToday, ratingFromAnswer, reviewQueue } from "./session";
import { newCard } from "./srs";
import { localDate } from "./store";
import { masterByPlacement, emptyProgress } from "./course";

const NOW = new Date("2026-11-16T15:00:00.000Z");
const TODAY = localDate(NOW);
const cap = (code: string): Capsule => ({
  id: `cap_${code.toLowerCase()}`, cefr: "A1", target_error_codes: [code],
  trigger: { id: "t", type: "translate_es_it", source_es: "x", accepted_it: ["y"], requires_server: false, review_status: "validated" },
  explanation: { text_es: "e" }, retrieval: Array.from({ length: 4 }, (_, i) => ({ id: `${code}_r${i}`, type: "cloze", text: "a ___ b", answers: ["c"], requires_server: false, review_status: "validated" })),
  estimated_seconds: 240, review_status: "validated",
}) as unknown as Capsule;
const lex = (n: number): Lexeme[] => Array.from({ length: n }, (_, i) => ({ id: `lx_${i}`, form: `f${i}`, gloss_es: `g${i}`, lexical_type: "false_friend", source: "s" }));
const unit = (id: string, code: string) => ({ id, level: "A1", title: `Unidad ${id}`, goal_es: "g", why_here: "w", codes: [code], status: "active" as const, explanation_es: "e",
  parts: { descubre: [], practica: [], escucha: [], prueba: [] }, divergences: [] });
const pack = (lexemes = lex(5)): ContentPack => ({
  course: { version: 1, levels: [{ id: "A1", title: "A1", guided_hours: "x" }], units: [unit("u01", "ERR_A"), unit("u02", "ERR_B")], planned: [] },
  capsules: [cap("ERR_A"), cap("ERR_B")], itemsByCode: {}, lexemes, sentences: [],
  manifest: { capsules: ["cap_err_a", "cap_err_b"], codes: {}, levels: {}, reviewers: {}, sentences_used: 0, translation_kind: {} },
});
const errCard = (code: string, due = NOW.toISOString()): Card => {
  const c = newCard({ kind: "error_code", ref: code }, "not_applicable", NOW);
  return { ...c, fsrs: { ...c.fsrs, due } };
};
const emptyDay = { date: TODAY, reviewsDone: 0, capsulesDone: [] as string[] };

describe("planToday", () => {
  it("sin tarjetas: nada vencido, primera unidad en su primer paso, hasta 3 léxicos nuevos y su duración", () => {
    const p = planToday({ pack: pack(), cards: [], day: emptyDay, now: NOW });
    expect(p.review).toMatchObject({ due: 0, newAvailable: 3, doneToday: 0, cap: 12 });
    expect(p.review.seconds).toBe(45); // 3 tarjetas × 15 s a priori
    expect(p.unit?.view.unit.id).toBe("u01");
    expect(p.unit?.step).toBe("descubre");
    expect(p.route).toEqual({ done: 0, total: 2 });
  });
  it("una unidad completada pasa a la siguiente; todas completadas → sin unidad", () => {
    const u1 = masterByPlacement(emptyProgress("u01"), NOW);
    expect(planToday({ pack: pack(), cards: [], day: emptyDay, now: NOW, units: [u1] }).unit?.view.unit.id).toBe("u02");
    const all = planToday({ pack: pack(), cards: [], day: emptyDay, now: NOW, units: [u1, masterByPlacement(emptyProgress("u02"), NOW)] });
    expect(all.unit).toBeNull();
    expect(all.route.done).toBe(2);
  });
  it("cuenta solo las tarjetas vencidas y no mezcla el progreso de otro día", () => {
    const cards = [errCard("ERR_A"), errCard("ERR_B", "2026-11-20T00:00:00.000Z")];
    const p = planToday({ pack: pack([]), cards, day: { date: "2026-11-15", reviewsDone: 9, capsulesDone: ["cap_x"], stepsDone: ["u01:descubre"] }, now: NOW });
    expect(p.review).toMatchObject({ due: 1, newAvailable: 0, doneToday: 0, cap: 12 });
    expect(p.stepsToday).toBe(0);
  });
  it("los repasos no avanzan la unidad", () => {
    const day = afterReview(emptyDay);
    expect(day).toEqual({ date: TODAY, reviewsDone: 1, capsulesDone: [] });
    expect(planToday({ pack: pack(), cards: [], day, now: NOW }).unit?.step).toBe("descubre");
  });
  it("sin unidades completadas el repaso no inventa relleno y dura lo que dura", () => {
    const q = reviewQueue({ pack: pack(), cards: [], now: NOW, units: [] });
    expect(q.every((e) => !("filler" in e))).toBe(true);
  });
  it("con una unidad completada el repaso se llena a ≈5 min con práctica de esa unidad, sin repetir ítems", () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `z${i}`, type: "cloze", sentence_id: `s${i}`, text: "a ___ b", answers: ["c"], requires_server: false, review_status: "validated" }));
    const p = pack([]);
    p.itemsByCode = { ERR_A: items as unknown as Item[] };
    p.course.units[0].parts.practica = items.map((i) => i.sentence_id);
    const done = masterByPlacement(emptyProgress("u01"), NOW);
    const q = reviewQueue({ pack: p, cards: [], now: NOW, units: [done] });
    const secs = q.reduce((t, e) => t + entrySeconds(e), 0);
    expect(secs).toBeGreaterThanOrEqual(300);
    expect(secs).toBeLessThan(330);
    expect(new Set(q.map((e) => ("filler" in e ? e.filler.id : ""))).size).toBe(q.length);
    expect(planToday({ pack: p, cards: [], day: emptyDay, now: NOW, units: [done] }).review.filler).toBe(q.length);
  });
  it("el tiempo del repaso usa lo medido cuando existe", () => {
    const p = planToday({ pack: pack(), cards: [], day: emptyDay, now: NOW, samples: { flashcard: [5, 5, 5, 5, 5] } });
    expect(p.review.seconds).toBe(15);
  });
});

describe("día", () => {
  it("normalizeDay devuelve un día vacío si la fecha no es la de hoy", () => {
    expect(normalizeDay({ date: "2026-11-15", reviewsDone: 4, capsulesDone: ["a"] }, NOW)).toEqual(emptyDay);
    expect(normalizeDay(emptyDay, NOW)).toBe(emptyDay);
  });
  it("afterCapsule no duplica", () => {
    expect(afterCapsule(afterCapsule(emptyDay, "cap_x"), "cap_x").capsulesDone).toEqual(["cap_x"]);
  });
});

describe("reviewQueue", () => {
  it("vencidas primero (máx. 12) y luego hasta 3 léxicos nuevos si sobra cupo", () => {
    const due = Array.from({ length: 10 }, (_, i) => errCard(`ERR_${i}`, `2026-11-1${i % 5}T00:00:00.000Z`));
    const q = reviewQueue({ pack: pack(), cards: [...due, errCard("ERR_FUT", "2026-12-01T00:00:00.000Z")], now: NOW });
    expect(q.length).toBe(12);
    expect(q.filter((e) => "card" in e).length).toBe(10);
    expect(q.filter((e) => "lexeme" in e).length).toBe(2);
  });
  it("no repite léxicos que ya tienen tarjeta", () => {
    const have = newCard({ kind: "lexeme", ref: "lx_0" }, "false_friend", NOW);
    const q = reviewQueue({ pack: pack(lex(1)), cards: [{ ...have, fsrs: { ...have.fsrs, due: "2026-12-01T00:00:00.000Z" } }], now: NOW });
    expect(q).toEqual([]);
  });
});

describe("pickItem y calificación", () => {
  const items = ["a", "b", "c"].map((id) => ({ id })) as unknown as Item[];
  it("rota por repeticiones y evita repetir el último ítem", () => {
    expect(pickItem(items, 0).id).toBe("a");
    expect(pickItem(items, 1).id).toBe("b");
    expect(pickItem(items, 0, "a").id).toBe("b");
    expect(pickItem([items[0]], 0, "a").id).toBe("a");
  });
  it("acierto → 3, fallo → 1", () => {
    expect(ratingFromAnswer(true)).toBe(3);
    expect(ratingFromAnswer(false)).toBe(1);
  });
});

describe("closeCapsule", () => {
  const c = cap("ERR_A");
  const answers = (n: number) => Object.fromEntries(c.retrieval.map((it, i) => [it.id, i < n]));
  it("crea y repasa la tarjeta del código con origen cápsula; la nota sale del acierto", () => {
    const hi = closeCapsule(c, { phase: "closing", index: 0, answers: answers(4) }, [], NOW)!;
    expect(hi.card.id).toBe("error_code:ERR_A");
    expect(hi.card.fsrs.reps).toBe(1);
    expect(hi.log).toMatchObject({ rating: 3, origin: "capsule", capsule_id: c.id });
    expect(closeCapsule(c, { phase: "closing", index: 0, answers: answers(2) }, [], NOW)!.log.rating).toBe(2);
    expect(closeCapsule(c, { phase: "closing", index: 0, answers: answers(1) }, [], NOW)!.log.rating).toBe(1);
  });
  it("si la tarjeta del código ya existe no hace nada", () => {
    expect(closeCapsule(c, { phase: "closing", index: 0, answers: answers(4) }, [errCard("ERR_A")], NOW)).toBeNull();
  });
});
