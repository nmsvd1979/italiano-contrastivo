import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Item } from "../generated/item";
import { loadRunFrozen, saveRun, signature } from "../state/runState";
import { fromItems, ItemRunner } from "./ItemRunner";

afterEach(() => { cleanup(); localStorage.clear(); });
beforeEach(() => localStorage.clear());

const base = { requires_server: false, review_status: "validated" };
const cloze = (id: string, es: string): Item => ({ ...base, id, type: "cloze", text: "Io ___ fame.", answers: ["ho"], hint_es: es }) as unknown as Item;
const A = [cloze("a1", "Primero"), cloze("a2", "Segundo"), cloze("a3", "Tercero")];
const B = [cloze("b0", "Otro 0"), cloze("b1", "Otro 1"), cloze("b2", "Otro 2"), cloze("b3", "Otro 3")];   // otro recuento y otros ids
const answer = (text: string) => {
  fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: text } });
  fireEvent.click(screen.getByText("Comprobar"));
  fireEvent.click(screen.getByText("Continuar"));
};
const KEY = "u01:practica";

describe("retomar un bloque con sus propios ejercicios", () => {
  it("continúa en el mismo ejercicio aunque ahora se calculen otros", () => {
    const first = render(<ItemRunner items={fromItems(A)} persistKey={KEY} onFinish={() => undefined} />);
    answer("ho");
    first.unmount();
    render(<ItemRunner items={fromItems(B)} persistKey={KEY} onFinish={() => undefined} />);
    expect(screen.getByText("2 / 3")).toBeTruthy();
    expect(screen.getByText("Segundo")).toBeTruthy();
    expect(screen.queryByText("Otro 1")).toBeNull();
    expect(screen.getByText(/Retomado/)).toBeTruthy();
  });
  it("un guardado de hace más de 7 días se ignora", () => {
    const old = Date.now() - 8 * 24 * 3600 * 1000;
    saveRun(KEY, { sig: signature(A.map((i) => i.id)), queue: [0, 1, 2], pos: 1, first: [true, null, null], requeued: [], done: [0], streak: 1, items: fromItems(A), savedAt: old });
    render(<ItemRunner items={fromItems(B)} persistKey={KEY} onFinish={() => undefined} />);
    expect(screen.getByText("1 / 4")).toBeTruthy();
    expect(screen.getByText("Otro 0")).toBeTruthy();
  });
  it("un guardado de hace más de 7 días se ignora también si la lista coincide", () => {
    const old = Date.now() - 8 * 24 * 3600 * 1000;
    saveRun(KEY, { sig: signature(A.map((i) => i.id)), queue: [0, 1, 2], pos: 1, first: [true, null, null], requeued: [], done: [0], streak: 1, items: fromItems(A), savedAt: old });
    render(<ItemRunner items={fromItems(A)} persistKey={KEY} onFinish={() => undefined} />);
    expect(screen.getByText("1 / 3")).toBeTruthy();
    expect(screen.queryByText(/Retomado/)).toBeNull();
  });
  it("un guardado antiguo, sin ejercicios, se sigue retomando si la lista coincide", () => {
    saveRun(KEY, { sig: signature(A.map((i) => i.id)), queue: [0, 1, 2], pos: 1, first: [true, null, null], requeued: [], done: [0], streak: 1 });
    render(<ItemRunner items={fromItems(A)} persistKey={KEY} onFinish={() => undefined} />);
    expect(screen.getByText("2 / 3")).toBeTruthy();
    expect(screen.getByText("Segundo")).toBeTruthy();
  });
  it("un guardado antiguo con una lista distinta se descarta como antes", () => {
    saveRun(KEY, { sig: signature(A.map((i) => i.id)), queue: [0, 1, 2], pos: 1, first: [true, null, null], requeued: [], done: [0], streak: 1 });
    render(<ItemRunner items={fromItems(B)} persistKey={KEY} onFinish={() => undefined} />);
    expect(screen.getByText("1 / 4")).toBeTruthy();
  });
  it("loadRunFrozen devuelve null con índices fuera de rango, sin ejercicios o dañado", () => {
    const ok = { sig: "x", queue: [0, 1], pos: 1, first: [true, null], requeued: [], done: [0], streak: 0, items: fromItems(A.slice(0, 2)), savedAt: Date.now() };
    saveRun(KEY, ok);
    expect(loadRunFrozen(KEY)?.pos).toBe(1);
    saveRun(KEY, { ...ok, queue: [0, 5] });
    expect(loadRunFrozen(KEY)).toBeNull();
    saveRun(KEY, { ...ok, items: undefined });
    expect(loadRunFrozen(KEY)).toBeNull();
    saveRun(KEY, { ...ok, items: [] });
    expect(loadRunFrozen(KEY)).toBeNull();
    saveRun(KEY, { ...ok, first: [true] });
    expect(loadRunFrozen(KEY)).toBeNull();
    localStorage.setItem(`italiano-contrastivo.run.${KEY}`, "{no es json");
    expect(loadRunFrozen(KEY)).toBeNull();
  });
  it("al terminar se borra lo guardado", () => {
    render(<ItemRunner items={fromItems([A[0]])} persistKey={KEY} onFinish={() => undefined} />);
    answer("ho");
    expect(loadRunFrozen(KEY)).toBeNull();
    expect(localStorage.getItem(`italiano-contrastivo.run.${KEY}`)).toBeNull();
  });
});
