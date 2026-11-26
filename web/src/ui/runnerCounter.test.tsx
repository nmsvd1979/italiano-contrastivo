import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import type { Item } from "../generated/item";
import { setPreview } from "../state/preview";
import { memoryStore } from "../state/store";
import { fromItems, ItemRunner } from "./ItemRunner";
import { StepScreen } from "./StepScreen";

import { readItems } from "../test/realPack";
afterEach(() => { cleanup(); localStorage.clear(); });
beforeEach(() => localStorage.clear());

const base = { requires_server: false, review_status: "validated" };
const cloze = (n: number): Item => ({ ...base, id: `z${n}`, type: "cloze", text: "Io ___ fame.", answers: ["ho"], hint_es: "Yo tengo hambre." }) as unknown as Item;
const answer = (text: string) => {
  fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: text } });
  fireEvent.click(screen.getByText("Comprobar"));
  fireEvent.click(screen.getByText("Continuar"));
};

describe("contador de ejercicios", () => {
  it("dice «1 / 2» y ya no estima el tiempo restante", () => {
    render(<ItemRunner items={fromItems([cloze(1), cloze(2)])} onFinish={() => undefined} />);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.queryByText(/quedan/)).toBeNull();
    expect(screen.queryByText(/Ejercicio 1 de/)).toBeNull();
  });
  it("al fallar y reencolarse el total crece una vez", () => {
    render(<ItemRunner items={fromItems([cloze(1), cloze(2)])} requeueWrong onFinish={() => undefined} />);
    answer("ho");
    answer("hai");
    expect(screen.getByText("3 / 3")).toBeTruthy();
  });
  it("lo retomado lo dice", () => {
    const items = fromItems([cloze(1), cloze(2), cloze(3)]);
    const first = render(<ItemRunner items={items} persistKey="u01:practica" onFinish={() => undefined} />);
    answer("ho");
    first.unmount();
    render(<ItemRunner items={items} persistKey="u01:practica" onFinish={() => undefined} />);
    expect(screen.getByText("2 / 3")).toBeTruthy();
    expect(screen.getByText(/Retomado/)).toBeTruthy();
  });
});

describe("«Ver ficha» desde el ejercicio", () => {
  it("ItemRunner lo ofrece al fallar solo si recibe fichaHref", () => {
    const { unmount } = render(<ItemRunner items={fromItems([cloze(1)])} fichaHref="#/unidad/u01" onFinish={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: "hai" } });
    fireEvent.click(screen.getByText("Comprobar"));
    expect(screen.getByRole("link", { name: "Ver ficha" }).getAttribute("href")).toBe("#/unidad/u01");
    unmount();
    render(<ItemRunner items={fromItems([cloze(1)])} onFinish={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: "hai" } });
    fireEvent.click(screen.getByText("Comprobar"));
    expect(screen.queryByRole("link", { name: "Ver ficha" })).toBeNull();
  });
  it("la práctica de una unidad apunta a la ficha de esa unidad", async () => {
    const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
    const pack = { capsules: read("capsules.json"), itemsByCode: readItems(), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
    setPreview(true);   // modo de prueba: todos los pasos abiertos
    const U1 = pack.course.units[0].id;
    render(<StepScreen unitId={U1} step="practica" pack={pack} store={memoryStore()} />);
    for (let i = 0; i < 8 && !screen.queryByRole("link", { name: "Ver ficha" }); i++) {
      const option = (await screen.findAllByRole("button")).find((b) => b.closest("ul.options"));
      if (!option) break;
      fireEvent.click(option);
      if (!screen.queryByRole("link", { name: "Ver ficha" })) fireEvent.click(screen.getByText("Continuar"));
    }
    await waitFor(() => expect(screen.getByRole("link", { name: "Ver ficha" }).getAttribute("href")).toBe(`#/unidad/${U1}`));
  });
});
