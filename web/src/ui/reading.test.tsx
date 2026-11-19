import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Reading } from "../content/load";
import { ReadingStep } from "./ReadingStep";

afterEach(cleanup);
const readings: Reading[] = JSON.parse(readFileSync("public/content/readings.json", "utf8"));
const reading = readings.find((r) => r.id === "rd_zaino")!;

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
