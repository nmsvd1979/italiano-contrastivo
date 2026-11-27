import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { hitoOf, milestoneItems, milestoneListening, milestoneListenSentences, milestoneOralTask, milestoneReadings, milestoneWriteItems, scoreMilestone, type Part } from "./milestone";
import { readPack } from "../test/realPack";

/** Examen de hito de A2 con el contenido real: lo que pide el plan (reconocimiento 40 + relato, 14 escritas, dictados + 2 escuchas de examen, 3 lecturas no vistas, tarea oral). */
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { ...readPack(), readings: read("readings.json"), readingItems: read("reading_items.json"), speaking: read("speaking.json") } as ContentPack;

describe("hito de A2", () => {
  it("el nivel A2 tiene su hito abierto en el curso", () => {
    expect(pack.course.levels.find((l) => l.id === "A2")?.milestone).toBe(true);
  });
  it("el reconocimiento trae 40 preguntas (≥ 8 de léxico y ≥ 24 de gramática) más un relato de examen", () => {
    const rec = milestoneItems(pack, "A2", 0);
    const nonRelato = rec.items.filter((i) => i.type !== "cloze_text");
    expect(nonRelato).toHaveLength(40);
    expect(rec.parts.filter((p) => p === "lex").length).toBeGreaterThanOrEqual(8);
    expect(rec.parts.filter((p) => p === "gram").length).toBeGreaterThanOrEqual(24);
    const relatos = rec.items.filter((i) => i.type === "cloze_text");
    expect(relatos).toHaveLength(1);
    expect((relatos[0] as { exam?: boolean }).exam).toBe(true);
  });
  it("el relato del hito cambia en cada intento y no es de los de práctica", () => {
    const ids = [0, 1].map((a) => milestoneItems(pack, "A2", a).items.find((i) => i.type === "cloze_text")!.id);
    expect(ids[0]).not.toBe(ids[1]);
    const practice = new Set((pack.readingItems?.["u83:relatos"] ?? []).map((i) => i.id));
    expect(ids.every((id) => !practice.has(id))).toBe(true);
  });
  it("hay 14 frases para escribir y los dictados necesarios", () => {
    const write = milestoneWriteItems(pack, "A2", new Set(), 0);
    expect(write.length).toBeGreaterThanOrEqual(hitoOf("A2").min.write ?? 12);
    expect(milestoneListenSentences(pack, "A2", new Set()).length).toBeGreaterThanOrEqual(6);
  });
  it("hay 3 lecturas no vistas, 2 escuchas de examen y una tarea oral", () => {
    expect(milestoneReadings(pack, "A2")).toHaveLength(3);
    expect(milestoneListening(pack, "A2")).toHaveLength(2);
    expect(milestoneOralTask(pack, "A2", 0)).toBeTruthy();
  });
  it("con todo bien el examen se aprueba y cada parte supera su mínimo de preguntas", () => {
    const rec = milestoneItems(pack, "A2", 0);
    const write = milestoneWriteItems(pack, "A2", new Set(), 0);
    const listenN = milestoneListenSentences(pack, "A2", new Set()).length + milestoneListening(pack, "A2").reduce((s, r) => s + r.questions.length, 0);
    const readN = milestoneReadings(pack, "A2").reduce((s, r) => s + r.questions.length, 0);
    const parts: Part[] = [...rec.parts, ...write.map((): Part => "write"), ...Array(listenN).fill("listen"), ...Array(readN).fill("read")];
    const s = scoreMilestone(parts, parts.map(() => true), "A2");
    expect(s.passed).toBe(true);
    // y con la mitad de las preguntas de una parte se queda sin aprobar
    const bad = scoreMilestone(parts, parts.map((p) => p !== "read"), "A2");
    expect(bad.passed).toBe(false);
  });
});
