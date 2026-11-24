import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AudioProvider } from "../audio/AudioContext";
import type { Item } from "../generated/item";
import { ItemView } from "./items/ItemView";
import { WordRecall } from "./items/WordRecall";

afterEach(cleanup);
const base = { requires_server: false, review_status: "validated" };
const sentences = [{ id: "s1", it: "Tu sei Tom?", es: "¿Tú eres Tom?", cefr_estimate: "A1" }];
const pack = { sentences, lexemes: [], readings: [] };
const inPack = (node: React.ReactNode) => render(<AudioProvider pack={pack} index={new Set()}>{node}</AudioProvider>);
const options = [{ text: "Tu sei Tom?", correct: true }, { text: "Tu siete Tom?", correct: false, distractor_kind: "morphological" }];
const choice = (over: object = {}) => ({ ...base, id: "c1", type: "choice_l1_distractor", prompt_es: "¿Cuál es la frase correcta en italiano?", sentence_id: "s1", options, ...over }) as unknown as Item;
const ask = (c: HTMLElement) => c.querySelector(".ask") as HTMLElement;

describe("frase en español al centro", () => {
  it("Choice muestra la frase en español grande cuando la encuentra", () => {
    const { container } = inPack(<ItemView item={choice()} onAnswer={() => undefined} />);
    expect(ask(container).textContent).toContain("Quieres decir");
    expect(screen.getByText("¿Tú eres Tom?").closest(".ask")).not.toBeNull();
    expect(screen.getByText("¿Tú eres Tom?").classList.contains("es")).toBe(true);
  });
  it("Choice sin sentence_id, con frase ausente o sin proveedor se ve como hoy", () => {
    const sinId = inPack(<ItemView item={choice({ sentence_id: undefined })} onAnswer={() => undefined} />);
    expect(screen.queryByText("Quieres decir")).toBeNull();
    sinId.unmount();
    const ausente = inPack(<ItemView item={choice({ sentence_id: "nope" })} onAnswer={() => undefined} />);
    expect(screen.queryByText("Quieres decir")).toBeNull();
    ausente.unmount();
    render(<ItemView item={choice()} onAnswer={() => undefined} />);   // sin AudioProvider
    expect(screen.queryByText("Quieres decir")).toBeNull();
    expect(screen.getByText("¿Cuál es la frase correcta en italiano?")).toBeTruthy();
  });
  it("Choice de escuchar no muestra el español", () => {
    inPack(<ItemView item={choice({ listen: true, prompt_es: "Escucha la frase y elige cómo se escribe." })} onAnswer={() => undefined} />);
    expect(screen.queryByText("¿Tú eres Tom?")).toBeNull();
    expect(screen.getByText("Escucha la frase y elige cómo se escribe.")).toBeTruthy();
  });
  it("Cloze muestra el español como «Quieres decir» y no como «Pista:»", () => {
    const cloze = { ...base, id: "z1", type: "cloze", text: "Tu ___ Tom?", answers: ["sei"], hint_es: "¿Tú eres Tom?" } as unknown as Item;
    const { container } = render(<ItemView item={cloze} onAnswer={() => undefined} />);
    expect(ask(container).textContent).toContain("Quieres decir");
    expect(screen.getByText("¿Tú eres Tom?").classList.contains("es")).toBe(true);
    expect(screen.queryByText(/Pista:/)).toBeNull();
  });
  it("Reorder separa la consigna de la frase en español", () => {
    const reorder = { ...base, id: "o1", type: "reorder", prompt_es: "Ordena las palabras: «Es lo mismo.»", tokens: ["stesso.", "È", "lo"], answer: ["È", "lo", "stesso."] } as unknown as Item;
    const { container } = render(<ItemView item={reorder} onAnswer={() => undefined} />);
    expect(screen.getByText("Es lo mismo.").classList.contains("es")).toBe(true);
    expect(ask(container).textContent).toContain("Ordena las palabras");
  });
  it("Write y WordRecall ponen la frase en grande bajo «Escribe en italiano»", () => {
    const write = { ...base, id: "w1", type: "translate_es_it", source_es: "¿Tú eres Tom?", accepted_it: ["Tu sei Tom?"] } as unknown as Item;
    const a = render(<ItemView item={write} onAnswer={() => undefined} />);
    expect(ask(a.container).textContent).toContain("Escribe en italiano");
    expect(screen.getByText("¿Tú eres Tom?").classList.contains("es")).toBe(true);
    a.unmount();
    const b = render(<WordRecall lexeme={{ id: "lx", form: "casa", gloss_es: "casa (hogar)", art: "la", lexical_type: "noun", source: "x" } as never} onRate={() => undefined} />);
    expect(ask(b.container).textContent).toContain("Escribe en italiano");
    expect(screen.getByText("casa (hogar)").classList.contains("es")).toBe(true);
  });
});
