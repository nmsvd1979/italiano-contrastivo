import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reserveParts, RESERVE_MAX_WORDS, RESERVE_SIZE, type ContentPack } from "../content/load";
import { moduleTestItems, moduleViews } from "./modules";
import { milestoneItems, milestoneWriteItems } from "./milestone";
import { weakItems } from "./weak";
import { rotate, withoutReserve, reserveChoiceItems, reserveItems, practiceItems } from "./steps";

const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"),
  course: read("course.json"), readings: read("readings.json"), readingItems: read("reading_items.json") } as ContentPack;
reserveParts(pack.course, pack.sentences);
const a1 = pack.course.units.filter((u) => u.level === "A1");
const sid = (i: unknown) => (i as { sentence_id?: string }).sentence_id ?? "";

describe("frases reservadas (contenido real de A1)", () => {
  it("cada unidad A1 aparta 3 frases con su ejercicio de elección y ninguna sale en descubre, escucha, práctica ni prueba", () => {
    for (const u of a1) {
      const r = u.parts.reserva ?? [];
      expect(r, u.id).toHaveLength(RESERVE_SIZE);
      for (const id of r) for (const k of ["descubre", "escucha", "practica", "prueba"] as const) expect(u.parts[k], `${u.id}:${k}`).not.toContain(id);
      expect(reserveChoiceItems(u, pack), u.id).toHaveLength(RESERVE_SIZE);
      expect(reserveItems(u, pack), u.id).toHaveLength(RESERVE_SIZE);
    }
  });
  it("la práctica sigue siendo suficiente y ninguna tanda de práctica usa la reserva", () => {
    for (const u of a1) {
      expect(u.parts.practica.length + u.parts.prueba.length, u.id).toBeGreaterThanOrEqual(27);
      const ids = new Set(u.parts.reserva);
      for (const part of [1, 2] as const) for (const it of practiceItems(u, pack, {}, undefined, part)) expect(ids.has(sid(it)), u.id).toBe(false);
    }
  });
  it("el Cierre trae frases de la reserva y cada reintento cambia la lista", () => {
    const mv = moduleViews(pack.course, []).modules[0];
    const reserved = new Set(mv.units.flatMap((v) => v.unit.parts.reserva ?? []));
    const lists = [0, 1, 2].map((n) => moduleTestItems(mv, pack, n));
    expect(lists[0].some((i) => reserved.has(sid(i)))).toBe(true);
    expect(new Set(lists.map((l) => l.map((i) => i.id).join())).size).toBe(3);
  });
  it("el Cierre de cada módulo A1 usa solo frases de la reserva (ninguna ya escrita en la prueba de la cápsula)", () => {
    for (const mv of moduleViews(pack.course, [], true).modules.filter((m) => m.module.level === "A1")) {
      const reserved = new Set(mv.units.flatMap((v) => v.unit.parts.reserva ?? []));
      for (const n of [0, 1, 2]) for (const i of moduleTestItems(mv, pack, n)) expect(reserved.has(sid(i)), `${mv.module.id}:${sid(i)}`).toBe(true);
    }
  });
  it("en A1 la reserva no trae frases B1 o más, y solo usa A2 si no hay frases A1 suficientes", () => {
    const lv = new Map(pack.sentences.map((s) => [s.id, s.cefr_estimate]));
    for (const u of a1) {
      const levels = (u.parts.reserva ?? []).map((id) => lv.get(id));
      expect(levels.every((l) => l === "A1" || l === "A2"), u.id).toBe(true);
      if (!levels.includes("A2")) continue;
      const skip = new Set([...u.parts.descubre, ...u.parts.escucha]), words = new Map(pack.sentences.map((s) => [s.id, s.it.split(/\s+/).length]));
      const shortA1 = [...u.parts.practica, ...(u.parts.reserva ?? [])].filter((id) => !skip.has(id) && (words.get(id) ?? 99) <= RESERVE_MAX_WORDS && lv.get(id) === "A1");
      expect(shortA1.length, u.id).toBeLessThan(RESERVE_SIZE);
    }
  });
  it("el hito usa frases de la reserva en reconocimiento y escritura, y un reintento no repite las mismas", () => {
    const reserved = new Set(a1.flatMap((u) => u.parts.reserva ?? []));
    const r0 = milestoneItems(pack, "A1", 0), r1 = milestoneItems(pack, "A1", 1);
    expect(r0.items.filter((i) => reserved.has(sid(i))).length).toBeGreaterThan(r0.items.length / 2);
    expect(r0.items.map((i) => i.id).join()).not.toBe(r1.items.map((i) => i.id).join());
    const w0 = milestoneWriteItems(pack, "A1", new Set(), 0), w1 = milestoneWriteItems(pack, "A1", new Set(), 1);
    expect(w0.filter((i) => reserved.has(sid(i))).length).toBeGreaterThan(w0.length / 2);
    expect(w0.map((i) => i.id).join()).not.toBe(w1.map((i) => i.id).join());
  });
  it("el repaso y el refuerzo no usan frases reservadas", () => {
    const u = a1[0], code = u.codes[0];
    const all = pack.itemsByCode[code];
    const ids = new Set(u.parts.reserva);
    expect(all.some((i) => ids.has(sid(i)))).toBe(true);                                   // sin el filtro sí saldrían
    expect(withoutReserve(all, pack.course).some((i) => ids.has(sid(i)))).toBe(false);
    const out = weakItems([{ code, correct: 0, total: 5 } as never], pack, "2026-11-24", 40);
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((i) => ids.has(sid(i)))).toBe(false);
  });
  it("rotate gira sin perder elementos", () => {
    expect(rotate([1, 2, 3], 1)).toEqual([2, 3, 1]);
    expect(rotate([], 4)).toEqual([]);
  });
});
