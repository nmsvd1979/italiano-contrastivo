import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioProvider } from "../audio/AudioContext";
import type { Item } from "../generated/item";
import { loadRun, signature } from "../state/runState";
import { fromItems, ItemRunner } from "./ItemRunner";
import { ItemView } from "./items/ItemView";

afterEach(() => { cleanup(); localStorage.clear(); });
beforeEach(() => localStorage.clear());
const base = { requires_server: false, review_status: "validated" };
const sentences = [{ id: "s1", it: "Ciao? C'è nessuno?", es: "¿Hola? ¿Hay alguien?", cefr_estimate: "A1" }, { id: "s2", it: "L'uomo ha ragione.", es: "El hombre tiene razón.", cefr_estimate: "A1" }];
const inPack = (node: React.ReactNode) => render(<AudioProvider pack={{ sentences, lexemes: [], readings: [] }} index={new Set()}>{node}</AudioProvider>);
const meaning = { ...base, id: "it_meaning_s1", type: "choice_l1_distractor", sentence_id: "s1", prompt_es: "En «Ciao? C'è nessuno?», ¿qué significa «ciao»?",
  options: [{ text: "hola o chao (informal)", correct: true }, { text: "felicitaciones por una fiesta", correct: false, distractor_kind: "different_word" }] } as unknown as Item;
const cloze = { ...base, id: "z2", type: "cloze", sentence_id: "s2", text: "L'uomo ha ___.", answers: ["ragione"], hint_es: "El hombre tiene razón." } as unknown as Item;

describe("ejercicios de significado (las opciones están en español)", () => {
  it("no muestra la frase en español: sería la respuesta", () => {
    inPack(<ItemView item={meaning} onAnswer={() => undefined} />);
    expect(screen.queryByText("Quieres decir")).toBeNull();
    expect(screen.queryByText("¿Hola? ¿Hay alguien?")).toBeNull();
  });
  it("la consigna, que lleva la frase italiana, se lee en grande y no como rótulo", () => {
    inPack(<ItemView item={meaning} onAnswer={() => undefined} />);
    expect(screen.getByText(/qué significa «ciao»/).classList.contains("es")).toBe(true);
  });
  it("la corrección no marca el español como italiano", () => {
    inPack(<ItemView item={meaning} onAnswer={() => undefined} />);
    fireEvent.click(screen.getByText("felicitaciones por una fiesta"));
    const sheet = screen.getByRole("status");
    for (const dd of sheet.querySelectorAll("dd")) expect(dd.getAttribute("lang")).toBe("es");
  });
});

describe("«Ver ficha» no borra un fallo", () => {
  const items = fromItems([cloze, { ...cloze, id: "z3" } as Item]);
  const ids = items.map((i) => i.id);
  it("registra la respuesta antes de salir: al volver el ejercicio no vuelve como primer intento", () => {
    render(<ItemRunner items={items} requeueWrong persistKey="u01:prueba" fichaHref="#/unidad/u01" onFinish={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: "hai" } });
    fireEvent.click(screen.getByText("Comprobar"));
    fireEvent.click(screen.getByRole("link", { name: "Ver ficha" }));
    const saved = loadRun("u01:prueba", ids);
    expect(saved?.first[0]).toBe(false);
    expect(saved?.requeued).toContain(0);
    expect(signature(ids)).toBe(saved?.sig);
  });
  it("si era el último ejercicio, el resultado se entrega con el fallo", () => {
    const onFinish = vi.fn();
    render(<ItemRunner items={fromItems([cloze])} fichaHref="#/unidad/u01" onFinish={onFinish} />);
    fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: "hai" } });
    fireEvent.click(screen.getByText("Comprobar"));
    fireEvent.click(screen.getByRole("link", { name: "Ver ficha" }));
    expect(onFinish).toHaveBeenCalledWith({ correct: 0, total: 1, answers: [false] });
  });
});

describe("hoja de corrección alta", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
  it("tiene altura máxima y se desplaza por dentro", () => {
    expect(css).toMatch(/\.feedback\s*\{[^}]*max-height:\s*\d+dvh/);
    expect(css).toMatch(/\.feedback\s*\{[^}]*overflow-y:\s*auto/);
  });
});

describe("«Se dice» en los huecos", () => {
  it("no mete espacios antes del punto ni tras el apóstrofo", () => {
    inPack(<ItemView item={cloze} onAnswer={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: "torto" } });
    fireEvent.click(screen.getByText("Comprobar"));
    const dd = screen.getByRole("status").querySelector("dd.answer")!;
    expect(dd.textContent).toBe("L'uomo ha ragione.");
  });
});
