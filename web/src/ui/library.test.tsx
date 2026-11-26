import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack, Resource } from "../content/load";
import { KIND_LABEL, pick } from "../state/library";
import { localDate, memoryStore } from "../state/store";
import { LibraryScreen } from "./LibraryScreen";

import { readItems } from "../test/realPack";
afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const library: Resource[] = read("library.json");
const pack = { capsules: read("capsules.json"), itemsByCode: readItems(), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json"), library } as ContentPack;

describe("datos de la Biblioteca", () => {
  it("cada recurso está completo: https, nivel, tarea, fecha de verificación y advertencia honesta", () => {
    const ids = library.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of library) {
      expect(r.url, r.id).toMatch(/^https:\/\//);
      expect(r.levels.length, r.id).toBeGreaterThan(0);
      expect(KIND_LABEL[r.kind], r.id).toBeTruthy();
      expect(["entrada", "foco", "fluidez"], r.id).toContain(r.strand);
      expect(["gratis", "freemium", "pago"], r.id).toContain(r.cost);
      expect(r.note.length, r.id).toBeGreaterThan(20);
      expect(r.task.length, r.id).toBeGreaterThan(20);
      expect(r.verified, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("hay recursos para cada nivel y de entrada (la hebra que la app no cubre)", () => {
    for (const l of ["A1", "A2", "B1", "B2"] as const) expect(pick(library, l).length, l).toBeGreaterThan(2);
    expect(library.filter((r) => r.strand === "entrada").length).toBeGreaterThan(3);
  });
  it("pick filtra por nivel y tipo y pone lo gratuito primero", () => {
    const a1 = pick(library, "A1");
    expect(a1.every((r) => r.levels.includes("A1"))).toBe(true);
    const costs = a1.map((r) => ({ gratis: 0, freemium: 1, pago: 2 })[r.cost]);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    expect(pick(library, "todos", "podcast").every((r) => r.kind === "podcast")).toBe(true);
  });
});

describe("pantalla Biblioteca", () => {
  it("abre los enlaces fuera de la app de forma segura, filtra por nivel y avisa de las advertencias", () => {
    render(<LibraryScreen pack={pack} store={memoryStore()} />);
    const link = screen.getAllByRole("link").find((a) => a.getAttribute("href") === "https://www.wordreference.com/ites/")!;
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    fireEvent.click(screen.getByRole("button", { name: "B2" }));
    expect(screen.queryByText("Aula Fácil: curso de italiano A1")).toBeNull(); // es solo A1
    expect(screen.getAllByText(/Il Post/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/⚠/).length).toBeGreaterThan(0);
  });
  it("registrar minutos de un recurso suma a la hebra correspondiente de hoy", async () => {
    const store = memoryStore();
    render(<LibraryScreen pack={pack} store={store} />);
    await screen.findByRole("button", { name: "A1", pressed: true }); // el nivel por defecto (el de tu unidad) se aplica de forma asíncrona
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    const pod = library.find((r) => r.id === "podcast-italiano")!;
    const card = screen.getByText(pod.title).closest("li")!;
    fireEvent.click(card.querySelector("summary")!);
    fireEvent.click(Array.from(card.querySelectorAll("button")).find((b) => b.textContent === "20 min")!);
    await waitFor(async () => expect((await store.getDay(localDate(new Date()))).seconds?.entrada).toBe(20 * 60));
    expect(await screen.findByText(/Registrado: 20 min en «Entender»/)).toBeTruthy();
  });
});
