import { describe, expect, it } from "vitest";
import { reserveParts, RESERVE_SIZE, type ContentPack, type PackSentence, type Unit } from "../content/load";
import { readPack } from "../test/realPack";
import { milestoneWriteItems, scoreMilestone, levelUnits, milestoneOpen, hitoOf } from "./milestone";
import { moduleTestItems, moduleViews } from "./modules";
import { testItems } from "./steps";

const sentence = (id: string, level: string, words = 6): PackSentence => ({ id, it: Array.from({ length: words }, (_, i) => `p${i}`).join(" "), es: "x", cefr_estimate: level });
const unit = (level: string, ids: string[]): Unit => ({ id: "ux", level, title: "t", goal_es: "", why_here: "", codes: ["ERR_X"], status: "active", explanation_es: "", parts: { descubre: [], practica: ids, escucha: [], prueba: [] }, divergences: [] });
const course = (u: Unit) => ({ version: 1, levels: [], units: [u], planned: [] });

describe("reserveParts por nivel", () => {
  const ids = (n: number, level: string, from = 0) => Array.from({ length: n }, (_, i) => sentence(`${level}${from + i}`, level));
  it("en A2 prefiere frases A1 o A2 y no toma B1 si le alcanzan", () => {
    const ss = [...ids(14, "A2"), ...ids(8, "B1")];
    const u = unit("A2", ss.map((s) => s.id));
    reserveParts(course(u), ss);
    expect(u.parts.reserva).toHaveLength(RESERVE_SIZE);
    for (const id of u.parts.reserva!) expect(id.startsWith("B1"), id).toBe(false);
  });
  it("en A2 completa con B1 corto si faltan, y nunca con B2", () => {
    const ss = [...ids(2, "A2"), ...ids(18, "B1"), ...ids(10, "B2")];
    const u = unit("A2", ss.map((s) => s.id));
    reserveParts(course(u), ss);
    expect(u.parts.reserva!.length).toBe(RESERVE_SIZE);
    for (const id of u.parts.reserva!) expect(id.startsWith("B2"), id).toBe(false);
  });
  it("en A1 sigue igual: A1 y, si no alcanzan, A2; nunca B1", () => {
    const ss = [...ids(2, "A1"), ...ids(18, "A2"), ...ids(6, "B1")];
    const u = unit("A1", ss.map((s) => s.id));
    reserveParts(course(u), ss);
    for (const id of u.parts.reserva!) expect(id.startsWith("B1"), id).toBe(false);
  });
});

describe("cápsulas de solo reconocer (productive: false)", () => {
  const pack: ContentPack = readPack();
  const mods = pack.course.modules!;
  const view = (productive: boolean) => {
    const m = mods[1];
    const units = pack.course.units.map((u) => (m.units.includes(u.id) ? { ...u, productive } : u));
    const p = { ...pack, course: { ...pack.course, units } } as ContentPack;
    return { p, v: moduleViews(p.course, []).modules[1] };
  };
  it("su prueba y el Cierre piden elegir, no escribir", () => {
    const { p, v } = view(false);
    for (const u of v.units) for (const it of testItems(u.unit, p)) expect(it.type, u.unit.id).not.toBe("translate_es_it");
    for (const it of moduleTestItems(v, p)) expect(it.type).not.toBe("translate_es_it");
  });
  it("las que se producen siguen pidiendo escribir", () => {
    const { p, v } = view(true);
    const kinds = new Set(v.units.flatMap((u) => testItems(u.unit, p).map((i) => i.type)));
    expect(kinds.has("translate_es_it")).toBe(true);
  });
  it("el examen de hito no pide escribir lo que solo se reconoce", () => {
    const units = pack.course.units.map((u) => ({ ...u, productive: false }));
    const p = { ...pack, course: { ...pack.course, units } } as ContentPack;
    expect(milestoneWriteItems(p, "A1")).toHaveLength(0);
  });
});

describe("examen de hito por nivel", () => {
  const pack = readPack();
  it("las unidades de un nivel son las de sus módulos", () => {
    expect(levelUnits(pack, "A1")).toHaveLength(69);
    expect(levelUnits(pack, "A1").every((u) => u.level === "A1")).toBe(true);
  });
  it("se abre con todas las unidades del nivel completas", () => {
    const all = new Set(levelUnits(pack, "A1").map((u) => u.id));
    expect(milestoneOpen(pack, all, "A1", false)).toBe(true);
    all.delete([...all][0]);
    expect(milestoneOpen(pack, all, "A1", false)).toBe(false);
  });
  it("A1 no exige mínimos por parte (como antes); A2 sí: una parte vacía no se aprueba sola", () => {
    expect(scoreMilestone(["gram", "gram"], [true, true], "A1").passed).toBe(true);
    expect(scoreMilestone(["gram", "gram"], [true, true], "A2").passed).toBe(false);
    expect(hitoOf("A2").min.gram).toBeGreaterThan(0);
  });
});
