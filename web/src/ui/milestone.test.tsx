import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { masterByPlacement, emptyProgress } from "../state/course";
import { milestoneListening, milestoneReadings, hitoId, HITO, milestoneItems, milestoneListenSentences, milestoneOpen, milestoneProgress, milestoneWriteItems, oralPassed, scoreMilestone } from "../state/milestone";
import { setPreview } from "../state/preview";
import { memoryStore } from "../state/store";
import { MilestoneScreen } from "./MilestoneScreen";

import { readItems } from "../test/realPack";
afterEach(() => { cleanup(); localStorage.clear(); });
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const speaking = read("speaking.json");
const pack = { capsules: read("capsules.json"), itemsByCode: readItems(), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
const NOW = new Date("2026-11-18T12:00:00.000Z");
/** Responde bien todo el examen: elección, escribir y dictados (sale el mismo armado que usa la pantalla). */
async function answerAll(p: ContentPack) {
  const m = milestoneItems(p);
  const used = new Set(m.items.map((i) => (i as { sentence_id?: string }).sentence_id).filter((x): x is string => !!x));
  const write = milestoneWriteItems(p, "A1", used);
  const listen = milestoneListenSentences(p, "A1", used);
  for (const item of m.items) {
    const good = (item as unknown as { options: { text: string; correct: boolean }[] }).options.find((o) => o.correct)!.text;
    fireEvent.click(await screen.findByText(good));
    fireEvent.click(await screen.findByText("Continuar"));
  }
  for (const w of write) {
    fireEvent.change(await screen.findByLabelText("Tu traducción"), { target: { value: (w as { accepted_it: string[] }).accepted_it[0] } });
    fireEvent.click(screen.getByRole("button", { name: "Comprobar" }));
    fireEvent.click(await screen.findByText("Continuar"));
  }
  for (const s of listen) {
    fireEvent.change(await screen.findByLabelText("Lo que escuchaste"), { target: { value: s.it } });
    fireEvent.click(screen.getByRole("button", { name: "Comprobar" }));
    fireEvent.click(await screen.findByText("Continuar"));
  }
}


describe("examen de hito A1", () => {
  it("tiene 40 preguntas: 14 de léxico (35 %) y 26 de gramática y sonidos (65 %), sin repetir ítems", () => {
    const m = milestoneItems(pack);
    expect(m.items.length).toBe(40);
    expect(m.parts.filter((p) => p === "lex").length).toBe(14);
    expect(m.parts.filter((p) => p === "gram").length).toBe(26);
    expect(new Set(m.items.map((i) => i.id)).size).toBe(40);
  });
  it("aprueba con ≥65 % global y ≥50 % en cada parte", () => {
    const parts = [...Array(14).fill("lex"), ...Array(26).fill("gram")] as ("lex" | "gram")[];
    const all = (n: number, part: "lex" | "gram") => parts.map((p, i) => p === part && i < 100 && n > 0 ? true : false);
    expect(scoreMilestone(parts, parts.map(() => true)).passed).toBe(true);
    expect(scoreMilestone(parts, parts.map(() => false)).passed).toBe(false);
    // 65 % total pero 0 % en léxico: no aprueba (la parte lo impide)
    const noLex = parts.map((p) => p === "gram");
    expect(scoreMilestone(parts, noLex)).toMatchObject({ passed: false, total: 26 / 40 });
    // 27 aciertos de 40 = 67,5 %, con ≥50 % en cada parte: aprueba
    const mixed = parts.map((p, i) => (p === "lex" ? i < 7 : i - 14 < 20));
    expect(scoreMilestone(parts, mixed).passed).toBe(true);
    void all;
  });
  it("se abre al completar todas las unidades A1 y guarda la mejor nota", () => {
    const a1 = pack.course.units.filter((u) => u.level === "A1").map((u) => u.id);
    expect(milestoneOpen(pack, new Set(a1.slice(1)))).toBe(false);
    expect(milestoneOpen(pack, new Set(a1))).toBe(true);
    expect(milestoneOpen(pack, new Set(), "A1", true)).toBe(true);
    const p1 = milestoneProgress(undefined, "A1", 0.5, false, NOW);
    const p2 = milestoneProgress(p1, "A1", 0.8, true, NOW);
    expect(p2).toMatchObject({ unitId: hitoId("A1"), testBest: 0.8, completed: true });
    expect(milestoneProgress(p2, "A1", 0.3, false, NOW).completed).toBe(true); // aprobar no se pierde
  });
  it("cerrado dice que se abre al completar A1; en modo de prueba se puede rendir y se guarda aprobado", async () => {
    const store = memoryStore();
    render(<MilestoneScreen pack={pack} store={store} />);
    expect(await screen.findByText(/Se abre cuando completes/)).toBeTruthy();
    cleanup();
    setPreview(true);
    render(<MilestoneScreen pack={pack} store={store} />);
    fireEvent.click(await screen.findByText("Empezar"));
    await answerAll(pack);
    expect(await screen.findByText("¡Nivel A1 completado!")).toBeTruthy();
    expect((await store.allUnits()).find((u) => u.unitId === hitoId("A1"))).toMatchObject({ completed: true, testBest: 1 });
    void masterByPlacement; void emptyProgress;
  });

  it("suma producción y escucha: 12 frases para escribir y 6 dictados, sin repetir oraciones del reconocimiento", () => {
    const m = milestoneItems(pack);
    const used = new Set(m.items.map((i) => (i as { sentence_id?: string }).sentence_id).filter((x): x is string => !!x));
    const before = new Set(used);
    const write = milestoneWriteItems(pack, "A1", used);
    const listen = milestoneListenSentences(pack, "A1", used);
    expect(write.length).toBe(HITO.WRITE);
    expect(listen.length).toBe(HITO.LISTEN);
    const ids = [...write.map((w) => (w as { sentence_id: string }).sentence_id), ...listen.map((l) => l.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((i) => before.has(i))).toBe(false);
  });
  it("no se aprueba con la parte de escribir bajo 50 % aunque el total supere 65 %", () => {
    const parts = [...Array(40).fill("gram"), ...Array(12).fill("write")] as ("gram" | "write")[];
    const answers = parts.map((p, i) => (p === "gram" ? true : i - 40 < 4)); // 44 de 52 = 85 %, pero 4 de 12 en escribir
    expect(scoreMilestone(parts, answers)).toMatchObject({ passed: false });
    expect(scoreMilestone(parts, parts.map((p, i) => (p === "gram" ? true : i - 40 < 6))).passed).toBe(true);
  });
  it("la parte oral es autoevaluación: pide la mitad de la rúbrica", () => {
    expect(oralPassed(2, 4)).toBe(true);
    expect(oralPassed(1, 4)).toBe(false);
    expect(oralPassed(0, 0)).toBe(false);
  });
  it("con tarea oral, el examen termina en la rúbrica y solo aprueba si cumples la mitad", async () => {
    const withOral = { ...pack, speaking } as ContentPack;
    setPreview(true);
    const store = memoryStore();
    render(<MilestoneScreen pack={withOral} store={store} />);
    fireEvent.click(await screen.findByText("Empezar"));
    await answerAll(withOral);
    fireEvent.click(await screen.findByRole("button", { name: /Empezar a hablar/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Terminé" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ver mi resultado" })); // 0 de 4: no cumple la rúbrica
    expect(await screen.findByText("Todavía no")).toBeTruthy();
    expect((await store.allUnits()).find((u) => u.unitId === hitoId("A1"))?.completed).toBeFalsy();
  });
  it("con tarea oral y la rúbrica cumplida, aprueba y guarda el nivel", async () => {
    const withOral = { ...pack, speaking } as ContentPack;
    setPreview(true);
    const store = memoryStore();
    render(<MilestoneScreen pack={withOral} store={store} />);
    fireEvent.click(await screen.findByText("Empezar"));
    await answerAll(withOral);
    fireEvent.click(await screen.findByRole("button", { name: /Empezar a hablar/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Terminé" }));
    for (const box of await screen.findAllByRole("checkbox")) fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Ver mi resultado" }));
    expect(await screen.findByText("¡Nivel A1 completado!")).toBeTruthy();
    expect(screen.getByText(/Hablar \(autoevaluación\)/)).toBeTruthy();
    expect((await store.allUnits()).find((u) => u.unitId === hitoId("A1"))).toMatchObject({ completed: true });
  });
});

const readingsAll = read("readings.json");
const withReadings = { ...pack, speaking, readings: readingsAll } as ContentPack;

/** Lee las lecturas no vistas y responde (bien o mal todas). */
async function answerReadings(p: ContentPack, right: boolean) {
  for (const r of [...milestoneListening(p), ...milestoneReadings(p)]) {
    fireEvent.click(await screen.findByText(/^Ya lo (leí|escuché): preguntas$/));
    for (const q of r.questions) {
      const good = q.options[q.answer];
      const bad = q.options.find((_, i) => i !== q.answer)!;
      fireEvent.click(await screen.findByText(right ? good : bad));
      fireEvent.click(await screen.findByText("Continuar"));
    }
  }
}

describe("hito: lectura de textos no vistos", () => {
  it("hay lecturas, un documento y un diálogo para escuchar que ninguna unidad usa, sin traducción visible", () => {
    const ex = [...milestoneReadings(withReadings), ...milestoneListening(withReadings)];
    expect(milestoneReadings(withReadings).map((r) => r.id)).toEqual(["rd_orario", "rd_sms_esame", "rd_valentina"]);
    expect(milestoneListening(withReadings).map((r) => r.id)).toEqual(["rd_stazione"]);
    const used = new Set(pack.course.units.flatMap((u) => u.readings ?? []));
    expect(ex.some((r) => used.has(r.id))).toBe(false);
    expect(ex.find((r) => r.id === "rd_orario")!.table!.rows.length).toBeGreaterThan(3);
  });
  it("el examen pide leer, no muestra la traducción y aprueba con todo bien", async () => {
    setPreview(true);
    const store = memoryStore();
    render(<MilestoneScreen pack={withReadings} store={store} />);
    fireEvent.click(await screen.findByText("Empezar"));
    await answerAll(withReadings);
    expect(await screen.findByText(/Solo escucha|Aquí no hay traducción|Documento/)).toBeTruthy();
    expect(screen.queryByText(/Traducción al español: IA/)).toBeNull();
    await answerReadings(withReadings, true);
    fireEvent.click(await screen.findByRole("button", { name: /Empezar a hablar/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Terminé" }));
    for (const box of await screen.findAllByRole("checkbox")) fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Ver mi resultado" }));
    expect(await screen.findByText("¡Nivel A1 completado!")).toBeTruthy();
    expect(screen.getByText(/Leer: \d+ de \d+/)).toBeTruthy();
  });
  it("no aprueba si no entiendes los textos aunque el resto salga perfecto", async () => {
    setPreview(true);
    const store = memoryStore();
    render(<MilestoneScreen pack={withReadings} store={store} />);
    fireEvent.click(await screen.findByText("Empezar"));
    await answerAll(withReadings);
    await answerReadings(withReadings, false);
    fireEvent.click(await screen.findByRole("button", { name: /Empezar a hablar/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Terminé" }));
    for (const box of await screen.findAllByRole("checkbox")) fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Ver mi resultado" }));
    expect(await screen.findByText("Todavía no")).toBeTruthy();
    expect((await store.allUnits()).find((u) => u.unitId === hitoId("A1"))?.completed).toBeFalsy();
  });
});
