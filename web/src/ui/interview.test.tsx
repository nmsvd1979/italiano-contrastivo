import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InterviewQuestion } from "../content/load";
import { memoryStore } from "../state/store";
import { InterviewRun } from "./InterviewRun";

afterEach(cleanup);
const qs: InterviewQuestion[] = [
  { id: "a", module: "m01", it: "Come ti chiami?", es: "¿Cómo te llamas?" },
  { id: "b", module: "m01", it: "Hai fame?", es: "¿Tienes hambre?", authored: true },
];

describe("InterviewRun", () => {
  it("no muestra la pregunta hasta responder; «Otra vez» la repite una vez al final; al terminar avisa", async () => {
    const done = vi.fn();
    render(<InterviewRun questions={qs} store={memoryStore()} onExit={() => {}} onComplete={done} />);
    fireEvent.click(screen.getByText("🎧 Empezar"));
    expect(screen.getByText("🎧 Pregunta 1 de 2")).toBeTruthy();
    expect(screen.queryByText(/Come ti chiami/)).toBeNull();                       // solo audio
    fireEvent.click(screen.getByText("🎙 Grabar mi respuesta"));                    // en jsdom no hay micrófono: avisa y deja seguir
    fireEvent.click(await screen.findByText("Ya respondí"));
    expect(screen.getByText("«Come ti chiami?»")).toBeTruthy();
    fireEvent.click(screen.getByText("Otra vez"));
    expect(screen.getByText("🎧 Pregunta 2 de 3")).toBeTruthy();                   // la repetida va al final
    for (const m of ["Bien", "Casi"]) {
      fireEvent.click(screen.getByText("🎙 Grabar mi respuesta"));
      fireEvent.click(await screen.findByText("Ya respondí"));
      fireEvent.click(screen.getByText(m));
    }
    expect(screen.getByText("Bien: 1 · Casi: 1 · Otra vez: 1.")).toBeTruthy();
    fireEvent.click(screen.getByText("Volver a la Salida"));
    expect(done).toHaveBeenCalledOnce();
  });
});
