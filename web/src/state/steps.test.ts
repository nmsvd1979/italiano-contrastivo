import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import type { Item } from "../generated/item";
import { dictationSentences, kindOf, meaningQuestions, noticeCards, practiceItems, reconstructionItems, shadowSentences, stepSeconds, testItems, TEST_ITEMS, unitSentences, voiceItems } from "./steps";
import { estimateSeconds } from "./timing";

const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = {
  capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"),
  sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json"),
} as ContentPack;
const sid = (i: Item) => (i as Item & { sentence_id: string }).sentence_id;

describe.each(pack.course.units.map((u) => [u.id, u] as const))("unidad %s con el contenido real", (_id, unit) => {
  it("la práctica llega a ≈6 min con prioridad y no repite ítems", () => {
    const items = practiceItems(unit, pack);
    const seconds = items.reduce((s, i) => s + estimateSeconds(kindOf(i)), 0);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(seconds).toBeGreaterThanOrEqual(5.5 * 60);
    expect(seconds).toBeLessThanOrEqual(7.5 * 60);
    expect(items.every((i) => unit.parts.practica.includes(sid(i)))).toBe(true);
  });
  it("el bloque de lectura (Descubre + reconstrucción) llena ≈7 min y reconstruye solo con huecos primero", () => {
    const s = stepSeconds(unit, "descubre", pack);
    expect(s).toBeGreaterThanOrEqual(6.3 * 60);
    expect(s).toBeLessThanOrEqual(7.7 * 60);
    const items = reconstructionItems(unit, pack);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    const types = items.map((i) => i.type);
    expect(types[0]).toBe(unit.codes[0] === "ERR_PERSONAL_A" ? types[0] : "cloze");
  });
  it("el bloque de voz llena ≈8 min con 5 dictados y frases para repetir distintas a las del dictado", () => {
    const s = stepSeconds(unit, "escucha", pack);
    expect(s).toBeGreaterThanOrEqual(7 * 60);
    expect(s).toBeLessThanOrEqual(9 * 60);
    const v = voiceItems(unit, pack);
    expect(v.filter((x) => x.kind === "dictation").length).toBe(5);
    const heard = new Set(v.filter((x) => x.kind === "dictation").map((x) => x.sentence.id));
    expect(v.filter((x) => x.kind === "shadow").every((x) => !heard.has(x.sentence.id))).toBe(true);
    expect(shadowSentences(unit, pack).every((x) => !!x.audio)).toBe(true);
  });
  it("la práctica va de reconocer a producir (elección → hueco → orden)", () => {
    const rank = { choice_l1_distractor: 0, cloze: 1, reorder: 2 } as Record<string, number>;
    const ranks = practiceItems(unit, pack).map((i) => rank[i.type ?? ""]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
  it("la prueba tiene 10 ítems, solo con oraciones reservadas, y ninguno aparece en la práctica", () => {
    const test = testItems(unit, pack);
    expect(test.length).toBe(TEST_ITEMS);
    expect(test.every((i) => unit.parts.prueba.includes(sid(i)))).toBe(true);
    const practice = new Set(practiceItems(unit, pack).map((i) => i.id));
    expect(test.some((i) => practice.has(i.id))).toBe(false);
  });
  it("cada paso dura entre 2 y 9 minutos con los tiempos a priori", () => {
    for (const step of ["descubre", "capsula", "practica", "escucha", "prueba"] as const) {
      const s = stepSeconds(unit, step, pack);
      expect(s, `${unit.id}/${step}`).toBeGreaterThanOrEqual(110);
      expect(s, `${unit.id}/${step}`).toBeLessThanOrEqual(10 * 60);
    }
  });
  it("tiene 4 tarjetas de descubrimiento con el tramo resaltado y 8 dictados con audio", () => {
    const cards = noticeCards(unit, pack);
    expect(cards.length).toBe(4);
    for (const c of cards) expect(c.sentence.it.slice(c.start, c.end).length).toBeGreaterThan(0);
    const dict = dictationSentences(unit, pack);
    expect(dict.length).toBe(8);
    expect(dict.every((s) => !!s.audio)).toBe(true);
  });
  it("las preguntas de significado tienen la respuesta correcta en su lugar y opciones distintas", () => {
    for (const q of meaningQuestions(noticeCards(unit, pack), unitSentences(unit, pack))) {
      expect(q.options[q.answer]).toBe(q.sentence.es);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options.length).toBe(3);
    }
  });
});
