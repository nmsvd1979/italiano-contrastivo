import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Course } from "../content/load";
import { isOptional, stepsFor, unitViews } from "../state/course";
import { stepSeconds } from "../state/steps";
import type { ContentPack } from "../content/load";
import { WordsStep } from "./WordsStep";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const course: Course = read("course.json");
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course } as ContentPack;
const vocab = course.units.find((u) => u.words?.length)!;

describe("paso «Palabras»", () => {
  it("solo las unidades de vocabulario lo tienen, justo después de «Descubre»", () => {
    expect(stepsFor(vocab).slice(0, 2)).toEqual(["descubre", "palabras"]);
    const grammar = course.units.find((u) => !u.words?.length)!;
    expect(stepsFor(grammar)).not.toContain("palabras");
  });
  it("muestra cada palabra con su significado, y se pueden tapar para comprobar de memoria", () => {
    const onFinish = vi.fn();
    render(<WordsStep unit={vocab} onFinish={onFinish} />);
    const w = vocab.words![0];
    expect(screen.getByText(w.form)).toBeTruthy();
    expect(screen.getAllByText(new RegExp(w.gloss.replace(/[()]/g, "\\$&"))).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText("Tapar los significados"));
    expect(screen.getAllByText("Ver significado").length).toBe(vocab.words!.length);
    fireEvent.click(screen.getAllByText("Ver significado")[0]);
    expect(screen.getAllByText("Ver significado").length).toBe(vocab.words!.length - 1);
    fireEvent.click(screen.getByText("Ya las repasé"));
    expect(onFinish).toHaveBeenCalled();
  });
  it("el paso tiene duración estimada por palabra", () => {
    expect(stepSeconds(vocab, "palabras", pack)).toBe(vocab.words!.length * 15);
  });
});

describe("unidades opcionales (vocabulario ampliado)", () => {
  it("tienen su propia cadena: no bloquean ni se bloquean por el camino principal", () => {
    const views = unitViews(course, [], false);
    const core = views.filter((v) => !isOptional(v.unit));
    const opt = views.filter((v) => isOptional(v.unit));
    expect(opt.length).toBeGreaterThan(0);
    expect(core.filter((v) => v.state === "current").length).toBe(1);
    expect(opt.filter((v) => v.state === "current").length).toBe(1);
    expect(core.every((v) => v.unit.level !== "A1+")).toBe(true);
  });
});

describe("fichas de enseñanza", () => {
  it("toda unidad activa tiene su ficha, con al menos dos párrafos o 40 palabras", () => {
    for (const u of course.units) {
      expect(u.ficha_es, `${u.id} sin ficha`).toBeTruthy();
      expect(u.ficha_es!.split(/\s+/).length, `${u.id} ficha muy corta`).toBeGreaterThanOrEqual(40);
    }
  });
  it("las fichas no usan voseo ni «vosotros»", () => {
    for (const u of course.units) expect(u.ficha_es, u.id).not.toMatch(/\b(vos|tenés|sabés|vosotros|vuestro|vuestra|tenéis|sois)\b/i);
  });
});

describe("palabras en el repaso espaciado", () => {
  it("al terminar «Palabras» cada palabra pasa a ser una tarjeta, sin duplicarse al repetir", async () => {
    const { memoryStore } = await import("../state/store");
    const { addWordCards, wordLexeme } = await import("../state/words");
    const store = memoryStore();
    const n = await addWordCards(store, vocab, new Date("2026-11-20T10:00:00Z"));
    expect(n).toBe(vocab.words!.length);
    expect(await addWordCards(store, vocab, new Date("2026-11-20T11:00:00Z"))).toBe(0);
    const cards = await store.allCards();
    expect(cards.length).toBe(vocab.words!.length);
    expect(cards[0].subject.kind).toBe("lexeme");
    const lx = wordLexeme(pack, cards[0].subject.ref)!;
    expect(lx.form).toBe(vocab.words![0].form);
    expect(lx.lexical_type).toBe("neutral");
    expect(wordLexeme(pack, "w:noexiste")).toBeUndefined();
  });
  it("las tarjetas de palabras entran a la cola de repaso", async () => {
    const { memoryStore } = await import("../state/store");
    const { addWordCards } = await import("../state/words");
    const { reviewQueue } = await import("../state/session");
    const store = memoryStore();
    const now = new Date("2026-11-20T10:00:00Z");
    await addWordCards(store, vocab, now);
    const q = reviewQueue({ pack, cards: await store.allCards(), now: new Date(now.getTime() + 60_000) });
    expect(q.length).toBeGreaterThan(0);
    expect(q.every((e) => "card" in e)).toBe(true);
  });
});

describe("pantalla de repaso con una palabra", () => {
  it("muestra la palabra, revela el significado y no dice «falso amigo»", async () => {
    const { memoryStore } = await import("../state/store");
    const { addWordCards } = await import("../state/words");
    const { ReviewScreen } = await import("./ReviewScreen");
    const store = memoryStore();
    const now = new Date("2026-11-20T10:00:00Z");
    await addWordCards(store, vocab, now);
    render(<ReviewScreen pack={pack} store={store} now={new Date(now.getTime() + 60_000)} />);
    const w = vocab.words![0];
    expect((await screen.findAllByText(w.form)).length).toBeGreaterThan(0);
    fireEvent.click(await screen.findByText("Mostrar significado"));
    expect(screen.queryByText(/Falso amigo/)).toBeNull();
    expect(screen.getByText(w.gloss)).toBeTruthy();
  });
});
