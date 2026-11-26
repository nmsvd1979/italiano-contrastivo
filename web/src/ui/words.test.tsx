import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Course } from "../content/load";
import { isOptional, stepsFor, unitViews } from "../state/course";
import { stepSeconds } from "../state/steps";
import type { ContentPack } from "../content/load";
import { WordsStep } from "./WordsStep";

import { readItems } from "../test/realPack";
afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const course: Course = read("course.json");
const pack = { capsules: read("capsules.json"), itemsByCode: readItems(), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course } as ContentPack;
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
  it("el sustantivo se muestra con su artículo italiano y avisa del género distinto y de los falsos amigos", () => {
    const food = course.units.find((u) => u.words?.some((w) => w.form === "latte"))!;
    expect(food.words!.find((w) => w.form === "latte")).toMatchObject({ art: "il", gdiv: true });
    expect(food.words!.find((w) => w.form === "acqua")!.art).toBe("l'");
    const adjectives = course.units.find((u) => u.words?.some((w) => w.form === "alto"))!;
    expect(adjectives.words!.every((w) => !w.art)).toBe(true); // adjetivos: sin artículo
    const body = course.units.find((u) => u.words?.some((w) => w.form === "burro"))!;
    render(<WordsStep unit={body} onFinish={() => undefined} />);
    expect(screen.getByText("il burro")).toBeTruthy();
    expect(screen.getAllByText(/Falso amigo: Parece 'burro' \(animal\) pero significa mantequilla/).length).toBe(1);
  });
  it("el paso tiene duración estimada por palabra", () => {
    expect(stepSeconds(vocab, "palabras", pack)).toBe(vocab.words!.length * 15);
  });
});

describe("unidades opcionales (vocabulario ampliado)", () => {
  it("tienen su propia cadena: no bloquean ni se bloquean por el camino principal", () => {
    // Desde 2026-11-24 las unidades de vocabulario ampliado están dentro de los módulos de A1; la cadena opcional se prueba marcando una como «A1+».
    const marked = { ...course, units: course.units.map((u) => (u.id === "u34" || u.id === "u43" ? { ...u, level: "A1+" } : u)) };
    const views = unitViews(marked, [], false);
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

describe("tamices: parentesco con el español", () => {
  const allWords = course.units.flatMap((u) => u.words ?? []);
  it("todas las palabras traen su tamiz y las regulares su regla", () => {
    for (const w of allWords) expect(["transparente", "regular", "opaca"], w.form).toContain(w.sieve);
    expect(allWords.filter((w) => w.sieve === "regular").every((w) => !!w.rule)).toBe(true);
    expect(allWords.some((w) => w.sieve === "transparente") && allWords.some((w) => w.sieve === "opaca")).toBe(true);
  });
  it("el paso Palabras dice qué tan reconocible es cada palabra", () => {
    const unit = course.units.find((u) => u.words?.some((w) => w.form === "notte"))!;
    render(<WordsStep unit={unit} onFinish={() => undefined} />);
    expect(screen.getAllByText(/cambio regular: ch → tt \(noche → notte\)/).length).toBeGreaterThan(0);
  });
  it("calibra el repaso: parecidas = cognado (intervalos largos), opacas = neutral, falsos amigos = falso amigo", async () => {
    const { lexicalTypeOf } = await import("../state/words");
    expect(lexicalTypeOf({ sieve: "transparente" })).toBe("cognate");
    expect(lexicalTypeOf({ sieve: "regular" })).toBe("cognate");
    expect(lexicalTypeOf({ sieve: "opaca" })).toBe("neutral");
    expect(lexicalTypeOf({ sieve: "opaca", ff: true })).toBe("false_friend");
    expect(lexicalTypeOf({})).toBe("neutral");
  });
  it("al terminar «Palabras» las tarjetas nacen con el tipo léxico de cada palabra", async () => {
    const { memoryStore } = await import("../state/store");
    const { addWordCards } = await import("../state/words");
    const store = memoryStore();
    const unit = course.units.find((u) => u.words?.some((w) => w.form === "latte") && u.words?.some((w) => w.form === "burro"))!;
    await addWordCards(store, unit, new Date());
    const types = new Map((await store.allCards()).map((c) => [c.id, c.lexical_type]));
    expect(types.get("lexeme:w:burro")).toBe("false_friend");
    expect(types.get("lexeme:w:latte")).toBe("cognate" /* parecida a «leche» por cambio regular */);
  });
});

describe("pantalla de repaso con una palabra", () => {
  it("pide escribir la palabra en italiano (con su artículo) desde la glosa, y la corrige", async () => {
    const { memoryStore } = await import("../state/store");
    const { addWordCards, withArticle } = await import("../state/words");
    const { ReviewScreen } = await import("./ReviewScreen");
    const store = memoryStore();
    const now = new Date("2026-11-20T10:00:00Z");
    await addWordCards(store, vocab, now);
    render(<ReviewScreen pack={pack} store={store} now={new Date(now.getTime() + 60_000)} />);
    const w = vocab.words![0];
    expect(await screen.findByText(w.gloss)).toBeTruthy(); // se ve la glosa en español, NO la palabra italiana
    expect(screen.queryByText(w.form)).toBeNull();
    fireEvent.change(screen.getByLabelText("Tu respuesta"), { target: { value: withArticle(w.form, w.art) } });
    fireEvent.click(screen.getByText("Comprobar"));
    expect(await screen.findByText("¡Correcto!")).toBeTruthy();
    fireEvent.click(screen.getByText("Continuar"));
    await waitFor(async () => expect((await store.allCards()).some((c) => c.fsrs.reps === 1)).toBe(true));
  });
});

describe("práctica con ejercicios de la lectura", () => {
  const readingItems = read("reading_items.json");
  const packR = { ...pack, readingItems } as ContentPack;
  it("hay ejercicios derivados para todas las lecturas", () => {
    const units = (read("course.json") as { units: { id: string; readings?: string[] }[] }).units;
    for (const u of units) for (const id of u.readings ?? []) expect((readingItems[`${u.id}:${id}`] ?? []).length, `${u.id}:${id}`).toBeGreaterThan(0);
  });
  it("la unidad con lectura suma minutos en la segunda práctica frente a no tener esos ejercicios", async () => {
    const { stepSeconds } = await import("../state/steps");
    const unit = course.units.find((u) => u.readings?.length && (u.id === "u58" || u.id === "u40"))!;
    expect(stepSeconds(unit, "practica2", packR)).toBeGreaterThanOrEqual(stepSeconds(unit, "practica2", pack));
  });
});

describe("examen de hito con las unidades de A1", () => {
  it("tiene 40 preguntas (14 de léxico y 26 de gramática), sin repetir y repartidas por toda la ruta", async () => {
    const { milestoneItems, partOf } = await import("../state/milestone");
    const m = milestoneItems(pack, "A1");
    expect(m.items.length).toBe(40);
    expect(m.parts.filter((p) => p === "lex").length).toBe(14);
    expect(new Set(m.items.map((i) => i.id)).size).toBe(40);
    const a1 = course.units.filter((u) => u.level === "A1");
    const idx = (code: string) => a1.findIndex((u) => u.codes[0] === code);
    const used = m.items.map((i) => idx((i as { target_error_codes?: string[] }).target_error_codes?.[0] ?? "")).filter((k) => k >= 0);
    const lexUsed = used.filter((k) => partOf(a1[k]) === "lex");
    expect(Math.max(...lexUsed) - Math.min(...lexUsed)).toBeGreaterThan(a1.length * 0.5); // no solo las primeras unidades de vocabulario
    expect(a1.some((u) => u.level === "A1+")).toBe(false);
  });
});
