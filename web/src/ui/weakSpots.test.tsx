import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { localDate, memoryStore } from "../state/store";
import type { WeakSpot } from "../state/weak";
import { PracticeScreen } from "./PracticeScreen";
import { ProgressScreen } from "./ProgressScreen";
import { WeakScreen } from "./WeakScreen";
import { isFocusRoute } from "./kit/TabBar";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
const spot = (over: Partial<WeakSpot> = {}): WeakSpot => ({ code: "ERR_A", unitId: "u1", title: "Essere y avere", ok: 4, n: 20, accuracy: 0.2, ...over });
const review = { due: 0, newAvailable: 0, doneToday: 0, cap: 30, seconds: 0, filler: 0 };
const progress = (weak: { spots: WeakSpot[]; attempts: number; evaluated: number }) => render(<ProgressScreen week={{}} days={[]} today="2026-11-24" modules={[]} weak={weak} />);

describe("Progreso: lo que más te cuesta", () => {
  it("con puntos débiles muestra el tema, el porcentaje, los aciertos a la primera y el enlace a practicar", () => {
    progress({ spots: [spot()], attempts: 20, evaluated: 1 });
    expect(screen.getByRole("heading", { name: "Lo que más te cuesta" })).toBeTruthy();
    expect(screen.getByText("Essere y avere")).toBeTruthy();
    expect(screen.getByText("20 %")).toBeTruthy();
    expect(screen.getByText("4 de 20 a la primera")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Practicar esto" }).getAttribute("href")).toBe("#/debiles");
  });
  it("sin datos suficientes lo dice y no inventa nada", () => {
    progress({ spots: [], attempts: 2, evaluated: 0 });
    expect(screen.getByText(/Todavía no hay datos suficientes/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Practicar esto" })).toBeNull();
  });
  it("con datos y sin temas débiles lo dice", () => {
    progress({ spots: [], attempts: 40, evaluated: 2 });
    expect(screen.getByText(/Ningún tema por debajo del 80 %/)).toBeTruthy();
  });
  it("con muchos intentos repartidos en temas que no llegan a 5 no dice que no hay temas débiles", () => {
    progress({ spots: [], attempts: 12, evaluated: 0 });
    expect(screen.getByText(/Todavía no hay datos suficientes/)).toBeTruthy();
    expect(screen.queryByText(/Ningún tema por debajo/)).toBeNull();
  });
  it("el porcentaje no redondea hacia arriba un tema débil (79,7 % se ve como 79 %)", () => {
    progress({ spots: [spot({ accuracy: 0.797, ok: 35, n: 44 })], attempts: 44, evaluated: 1 });
    expect(screen.getByText("79 %")).toBeTruthy();
  });
  it("explica cómo se calcula", () => {
    progress({ spots: [], attempts: 0, evaluated: 0 });
    expect(screen.getByText(/primer intento/)).toBeTruthy();
    expect(screen.getByText(/21 días/)).toBeTruthy();
  });
});

describe("Practicar: lo que más te cuesta", () => {
  it("con puntos débiles ofrece una tanda; sin ellos explica cuándo aparece", () => {
    const { unmount } = render(<PracticeScreen review={review} weak={[spot(), spot({ code: "ERR_B", title: "Il, lo, l'" })]} />);
    expect(screen.getByText("Essere y avere · Il, lo, l'")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Practicar 10 frases" }).getAttribute("href")).toBe("#/debiles");
    unmount();
    render(<PracticeScreen review={review} weak={[]} />);
    expect(screen.queryByRole("link", { name: "Practicar 10 frases" })).toBeNull();
    expect(screen.getByText(/Aparece cuando/)).toBeTruthy();
  });
});

describe("pantalla de práctica de puntos débiles", () => {
  it("con intentos guardados corre ejercicios del tema más débil", async () => {
    const store = memoryStore();
    const code = pack.course.units[0].codes[0];
    await store.putDay({ date: localDate(new Date()), reviewsDone: 0, capsulesDone: [], attempts: { [code]: { ok: 1, n: 10 } } });
    render(<WeakScreen pack={pack} store={store} />);
    expect(await screen.findByText(/^1 \/ \d+$/)).toBeTruthy();
    expect(screen.getByLabelText("Salir").getAttribute("href")).toBe("#/");
  });
  it("sin puntos débiles no falla y ofrece volver", async () => {
    render(<WeakScreen pack={pack} store={memoryStore()} />);
    expect(await screen.findByText(/No tienes puntos débiles ahora/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver a Hoy" }).getAttribute("href")).toBe("#/");
  });
  it("un tema sin ejercicios en el paquete tampoco falla", async () => {
    const store = memoryStore();
    await store.putDay({ date: localDate(new Date()), reviewsDone: 0, capsulesDone: [], attempts: { [pack.course.units[0].codes[0]]: { ok: 0, n: 10 } } });
    render(<WeakScreen pack={{ ...pack, itemsByCode: {} } as ContentPack} store={store} />);
    await waitFor(() => expect(screen.getByText(/No tienes puntos débiles ahora/)).toBeTruthy());
  });
  it("es una pantalla de trabajo: sin menú", () => {
    expect(isFocusRoute("#/debiles")).toBe(true);
  });
});
