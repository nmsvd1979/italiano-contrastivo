import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentPack } from "../content/load";
import { buildDictationItems } from "../state/dictationTest";
import { DictationTestScreen } from "./DictationTestScreen";

afterEach(() => { cleanup(); delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition; });
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
const items = buildDictationItems(pack);

describe("pantalla de la prueba de dictado", () => {
  it("recorre todo: lo que escribe el teléfono se clasifica y el resumen se puede copiar", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<DictationTestScreen pack={pack} />);
    expect(screen.getByText(/NO ofrece reconocimiento de voz propio/)).toBeTruthy();
    fireEvent.click(screen.getByText("Empezar"));
    for (const [i, it] of items.entries()) {
      expect(screen.getByText(`Ejercicio ${i + 1} de ${items.length}`)).toBeTruthy();
      // frases: el teléfono escribe bien; pares: «corrige» hacia la otra palabra (el caso malo que se quiere detectar)
      fireEvent.change(screen.getByLabelText("Lo que escribió el teléfono"), { target: { value: it.kind === "par" ? it.other! : it.say } });
      fireEvent.click(screen.getByText("Comprobar"));
      expect(screen.getByText(it.kind === "par" ? /Confundido/ : /Exacto/)).toBeTruthy();
      fireEvent.click(screen.getByText(i + 1 >= items.length ? "Ver resultado" : "Siguiente"));
    }
    expect(screen.getAllByText(/NO distingue simple\/doble/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Copiar resultados"));
    expect(writeText.mock.calls[0][0]).toContain("Prueba de dictado");
    expect(writeText.mock.calls[0][0]).toContain("confundido");
  });
  it("si el navegador ofrece reconocimiento de voz, un botón 🎙 lo prueba aparte (y un error también es dato)", async () => {
    class Fake { lang = ""; interimResults = false; maxAlternatives = 1; onresult: ((e: unknown) => void) | null = null; onerror: ((e: { error: string }) => void) | null = null; onend: (() => void) | null = null;
      start() { setTimeout(() => this.onerror?.({ error: "service-not-allowed" }), 0); } stop() {} }
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = Fake;
    render(<DictationTestScreen pack={pack} />);
    fireEvent.click(screen.getByText("Empezar"));
    fireEvent.click(screen.getByText(/Probar con el reconocimiento del navegador/));
    expect((await screen.findByRole("alert")).textContent).toContain("service-not-allowed");
  });
  it("antes de escuchar aborta el reconocimiento anterior, y un «aborted» explica la causa probable", async () => {
    const aborts = vi.fn();
    class Fake { lang = ""; interimResults = false; maxAlternatives = 1; onresult: ((e: unknown) => void) | null = null; onerror: ((e: { error: string }) => void) | null = null; onend: (() => void) | null = null;
      start() { setTimeout(() => { this.onerror?.({ error: "aborted" }); this.onend?.(); }, 0); } stop() {} abort() { aborts(); } }
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = Fake;
    render(<DictationTestScreen pack={pack} />);
    fireEvent.click(screen.getByText("Empezar"));
    fireEvent.click(screen.getByText(/Probar con el reconocimiento del navegador/));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Safari, sin instalar/);
    fireEvent.click(await screen.findByText(/Probar con el reconocimiento del navegador/));
    expect(aborts).toHaveBeenCalledTimes(1); // el segundo intento aborta el primero antes de empezar
  });
});
