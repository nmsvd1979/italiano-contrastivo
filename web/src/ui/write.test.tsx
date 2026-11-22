import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentPack } from "../content/load";
import { WriteScreen } from "./WriteScreen";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json"), readings: read("readings.json") } as ContentPack;

describe("Reconstruir un texto", () => {
  it("leer → taparlo → escribir → ver qué recuperaste, en orden", () => {
    render(<WriteScreen pack={pack} />);
    const first = [...pack.readings!].filter((r) => r.sentences.length >= 3).sort((a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title))[0];
    const original = first.sentences.slice(0, 3).map((s) => s.it).join(" ");
    expect(screen.getByText(first.sentences[0].it)).toBeTruthy(); // al leer se ve el texto
    fireEvent.click(screen.getByText("Taparlo y escribir"));
    expect(screen.queryByText(first.sentences[0].it)).toBeNull(); // tapado
    const box = screen.getByLabelText("Lo que recuerdo");
    fireEvent.change(box, { target: { value: original.split(" ").slice(0, 4).join(" ") } });
    fireEvent.click(screen.getByText("Comprobar"));
    const total = original.split(/\s+/).filter(Boolean).length;
    expect(screen.getByText(new RegExp(`Recuperaste 4 de ${total} palabras`))).toBeTruthy();
    fireEvent.click(screen.getByText("Volver a leerlo"));
    expect(screen.getByText("Taparlo y escribir")).toBeTruthy();
  });
});

describe("Mi propio texto y «Pedir corrección»", () => {
  it("prepara el encargo con el texto y el nivel, y muestra qué cambió con la respuesta pegada", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<WriteScreen pack={pack} />);
    fireEvent.click(screen.getByText("Mi propio texto"));
    expect(screen.queryByText("Pedir una corrección más completa")).toBeNull(); // sin texto no hay encargo
    fireEvent.change(screen.getByLabelText("Tu texto en italiano"), { target: { value: "Io ho andato a Roma ieri." } });
    expect(screen.getByText("Pedir una corrección más completa")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tu nivel"), { target: { value: "A2" } });
    fireEvent.click(screen.getByText("Copiar el encargo"));
    const sent = writeText.mock.calls[0][0] as string;
    expect(sent).toContain("nivel A2");
    expect(sent).toContain("Io ho andato a Roma ieri.");
    fireEvent.change(screen.getByLabelText("Pega aquí la respuesta de la IA"), { target: { value: "Error: «ho andato» → «sono andato».\n\nTEXTO CORREGIDO:\nIo sono andato a Roma ieri." } });
    expect(screen.getByText("Qué cambió")).toBeTruthy();
    expect(screen.getAllByText("sono").length).toBeGreaterThan(0);
  });
  it("avisa si la respuesta pegada no trae la marca TEXTO CORREGIDO", () => {
    render(<WriteScreen pack={pack} />);
    fireEvent.click(screen.getByText("Mi propio texto"));
    fireEvent.change(screen.getByLabelText("Tu texto en italiano"), { target: { value: "Ciao" } });
    fireEvent.change(screen.getByLabelText("Pega aquí la respuesta de la IA"), { target: { value: "Todo bien." } });
    expect(screen.getByRole("alert").textContent).toMatch(/TEXTO CORREGIDO/);
  });
});
