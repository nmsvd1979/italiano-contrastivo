import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Reading, ReadingWord } from "../content/load";
import { ReadingStep } from "./ReadingStep";

afterEach(cleanup);
const readings: Reading[] = JSON.parse(readFileSync("public/content/readings.json", "utf8"));
const reading = readings.find((r) => r.id === "rd_zaino")!;
const words: Record<string, ReadingWord> = JSON.parse(readFileSync("public/content/reading_words.json", "utf8"));

describe("diálogos y audio de la lectura", () => {
  const poste = readings.find((r) => r.id === "rd_poste")!;
  it("en un diálogo se ve quién habla (hay preguntas que lo necesitan)", () => {
    const first = poste.sentences.find((s) => s.speaker)!;
    render(<ReadingStep reading={poste} onFinish={() => undefined} />);
    expect(screen.getAllByText(`${first.speaker}:`).length).toBeGreaterThan(0);
  });
  it("se puede oír sin ver la traducción: «Escuchar todo» y un botón por frase, y la traducción sigue oculta", () => {
    render(<ReadingStep reading={poste} onFinish={() => undefined} />);
    expect(screen.getByText(/Escuchar todo el texto/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Escuchar la frase 1"));
    expect(screen.queryByText(poste.sentences[0].es)).toBeNull();
  });
});

describe("capa de tamices en la lectura", () => {
  it("sin glosario no ofrece la capa; con él, las palabras se colorean y al tocar una se ve qué es y su parentesco", () => {
    const { unmount } = render(<ReadingStep reading={reading} onFinish={() => undefined} />);
    expect(screen.queryByLabelText(/Ver el parentesco con el español/)).toBeNull();
    unmount();
    render(<ReadingStep reading={reading} words={words} onFinish={() => undefined} />);
    fireEvent.click(screen.getByLabelText(/Ver el parentesco con el español/));
    const first = reading.sentences[0].it.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)!.find((w) => words[w.toLowerCase()])!;
    const tok = screen.getAllByText(first).find((e) => e.tagName === "BUTTON")!;
    expect(tok.getAttribute("data-k")).toBe(words[first.toLowerCase()].k);
    fireEvent.click(tok);
    expect(screen.getByRole("status").textContent).toContain(words[first.toLowerCase()].g);
    fireEvent.click(screen.getAllByText("Traducción")[0]);
    expect(screen.getByText(reading.sentences[0].es)).toBeTruthy();
  });
  it("todas las palabras de todas las lecturas están en el glosario", () => {
    for (const r of readings) for (const s of r.sentences) for (const t of s.it.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) ?? []) expect(words[t.toLowerCase()], `${r.id}: ${t}`).toBeTruthy();
  });
});

describe("paso de lectura", () => {
  it("muestra el texto con su fuente y marca la traducción como de IA; tocar una frase la traduce", () => {
    render(<ReadingStep reading={reading} onFinish={() => undefined} />);
    expect(screen.getByText(/CC BY-NC-SA 4.0\. Traducción al español: IA, sin revisar por un nativo/)).toBeTruthy();
    expect(screen.queryByText("Elena es una estudiante.")).toBeNull();
    fireEvent.click(screen.getByText("Elena è una studentessa."));
    expect(screen.getByText("Elena es una estudiante.")).toBeTruthy();
  });
  it("responder bien todas las preguntas termina el paso; una mala muestra la frase del texto", () => {
    const onFinish = vi.fn();
    render(<ReadingStep reading={reading} onFinish={onFinish} />);
    fireEvent.click(screen.getByText("Ya lo leí: preguntas"));
    reading.questions.forEach((q, i) => {
      expect(screen.getByText(`Pregunta ${i + 1} de ${reading.questions.length}`)).toBeTruthy();
      const wrong = q.options.findIndex((_, k) => k !== q.answer);
      if (i === 0) {
        fireEvent.click(screen.getByText(q.options[wrong]));
        expect(screen.getByText(reading.sentences[q.evidence!].it)).toBeTruthy();
      } else fireEvent.click(screen.getByText(q.options[q.answer]));
      fireEvent.click(screen.getByText(/Continuar|Siguiente/));
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
