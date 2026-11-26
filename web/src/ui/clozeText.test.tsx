import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "../generated/item";
import { ClozeText, type ClozeTextItem } from "./items/ClozeText";
import { ItemView } from "./items/ItemView";

afterEach(cleanup);

const gaps = [
  { options: ["guardavo", "ho guardato"], answer: 0, why_es: "Mentre marca algo en curso." },
  { options: ["squillava", "è squillato"], answer: 1, why_es: "All'improvviso corta la escena." },
  { options: ["non rispondevo", "non ho risposto"], answer: 0, why_es: "Di solito: costumbre." },
  { options: ["ho risposto", "rispondevo"], answer: 0, why_es: "Questa volta: una vez concreta." },
  { options: ["ho sentito", "sentivo"], answer: 0, why_es: "A un tratto: un momento." },
];
const relato = {
  id: "rl1", type: "cloze_text", requires_server: false, review_status: "validated", gaps, authored: true,
  text: "Ieri sera, mentre {1} un film, all'improvviso {2} il telefono. Di solito {3} a quell'ora, ma questa volta {4} subito. A un tratto {5} un rumore.",
  translation_es: "Anoche, mientras veía una película, sonó el teléfono.",
} as unknown as ClozeTextItem;

const pick = (gap: number, text: string) => {
  fireEvent.click(screen.getByLabelText(`Hueco ${gap}`));
  fireEvent.click(screen.getByText(text));
};

describe("relato con huecos", () => {
  it("el selector de ejercicios lo muestra y avisa del progreso", () => {
    render(<ItemView item={relato as unknown as Item} onAnswer={() => undefined} />);
    expect(screen.getByText(/0 de 5/)).toBeTruthy();
    pick(1, "guardavo");
    expect(screen.getByText(/1 de 5/)).toBeTruthy();
    expect(screen.getByText(/Mentre marca algo en curso/)).toBeTruthy();   // cada respuesta enseña su pista
  });

  it("con 4 de 5 aprueba y entrega true al continuar", () => {
    const onAnswer = vi.fn();
    render(<ClozeText item={relato} onAnswer={onAnswer} />);
    pick(1, "guardavo"); pick(2, "è squillato"); pick(3, "non rispondevo"); pick(4, "rispondevo"); pick(5, "ho sentito");
    expect(screen.getByText(/4 de 5 huecos/)).toBeTruthy();
    expect(screen.getByText("¡Correcto!")).toBeTruthy();
    fireEvent.click(screen.getByText("Continuar"));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("con 3 de 5 no aprueba, dice cuántos hacen falta y repasa los huecos fallados", () => {
    const onAnswer = vi.fn();
    render(<ClozeText item={relato} onAnswer={onAnswer} />);
    pick(1, "ho guardato"); pick(2, "è squillato"); pick(3, "non rispondevo"); pick(4, "rispondevo"); pick(5, "ho sentito");
    expect(screen.getByText(/3 de 5 huecos\. Se aprueba con 4/)).toBeTruthy();
    expect(screen.getByText(/Hueco 1: guardavo/)).toBeTruthy();
    fireEvent.click(screen.getByText("Continuar"));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("un hueco contestado no se puede cambiar y la traducción está a un toque", () => {
    render(<ClozeText item={relato} onAnswer={() => undefined} />);
    pick(1, "guardavo");
    expect((screen.getByLabelText("Hueco 1") as HTMLButtonElement).disabled).toBe(true);
    pick(2, "è squillato"); pick(3, "non rispondevo"); pick(4, "ho risposto"); pick(5, "ho sentito");
    expect(screen.getByText("Ver la traducción")).toBeTruthy();
  });
});
