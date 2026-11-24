import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Item } from "../generated/item";
import { localDate, memoryStore } from "../state/store";
import { fromItems, ItemRunner } from "./ItemRunner";
import { AttemptsProvider } from "./kit/AttemptsContext";

afterEach(cleanup);
const base = { requires_server: false, review_status: "validated" };
const cloze = (id: string, code?: string): Item => ({ ...base, id, type: "cloze", text: "Io ___ fame.", answers: ["ho"], hint_es: "x", ...(code ? { target_error_codes: [code] } : {}) }) as unknown as Item;
const answer = (text: string) => {
  fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: text } });
  fireEvent.click(screen.getByText("Comprobar"));
  fireEvent.click(screen.getByText("Continuar"));
};
const day = (store: ReturnType<typeof memoryStore>) => store.getDay(localDate(new Date()));
const runner = (store: ReturnType<typeof memoryStore>, items: Item[], extra: object = {}) =>
  render(<AttemptsProvider store={store}><ItemRunner items={fromItems(items)} onFinish={() => undefined} {...extra} /></AttemptsProvider>);

describe("primeros intentos por tema", () => {
  it("un fallo guarda 0 de 1 y un acierto 1 de 1", async () => {
    const store = memoryStore();
    runner(store, [cloze("a", "ERR_A"), cloze("b", "ERR_B")]);
    answer("hai");
    answer("ho");
    await waitFor(async () => expect((await day(store)).attempts).toEqual({ ERR_A: { ok: 0, n: 1 }, ERR_B: { ok: 1, n: 1 } }));
  });
  it("el reencolado no vuelve a contar", async () => {
    const store = memoryStore();
    runner(store, [cloze("a", "ERR_A")], { requeueWrong: true });
    answer("hai");   // falla y vuelve
    answer("ho");    // segundo intento
    await waitFor(async () => expect((await day(store)).attempts?.ERR_A).toEqual({ ok: 0, n: 1 }));
  });
  it("un ejercicio sin tema no cuenta", async () => {
    const store = memoryStore();
    runner(store, [cloze("a")]);
    answer("hai");
    await new Promise((r) => setTimeout(r, 30));
    expect((await day(store)).attempts).toBeUndefined();
  });
  it("con track={false} (la ubicación) no cuenta", async () => {
    const store = memoryStore();
    runner(store, [cloze("a", "ERR_A")], { track: false });
    answer("hai");
    await new Promise((r) => setTimeout(r, 30));
    expect((await day(store)).attempts).toBeUndefined();
  });
  it("sin proveedor no falla", () => {
    render(<ItemRunner items={fromItems([cloze("a", "ERR_A")])} onFinish={() => undefined} />);
    expect(() => answer("hai")).not.toThrow();
  });
});
