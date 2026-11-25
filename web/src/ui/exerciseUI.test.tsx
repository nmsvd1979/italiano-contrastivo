import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Item } from "../generated/item";
import { loadSound } from "../state/sound";
import { memoryStore } from "../state/store";
import { fromItems, ItemRunner } from "./ItemRunner";
import { SettingsScreen } from "./SettingsScreen";

afterEach(() => { cleanup(); localStorage.clear(); });
beforeEach(() => localStorage.clear());

const base = { requires_server: false, review_status: "validated" };
const cloze = (n: number): Item => ({ ...base, id: `z${n}`, type: "cloze", text: "Io ___ fame.", answers: ["ho"], hint_es: "Yo tengo hambre." }) as unknown as Item;
const check = (text: string) => { fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: text } }); fireEvent.click(screen.getByText("Comprobar")); };

describe("avance por tramos", () => {
  it("hay un tramo por ejercicio y se llena al hacerlo", () => {
    const { container } = render(<ItemRunner items={fromItems([cloze(1), cloze(2), cloze(3)])} onFinish={() => undefined} />);
    expect(container.querySelectorAll(".tramos i")).toHaveLength(3);
    expect(container.querySelectorAll(".tramos i.d")).toHaveLength(0);
    check("ho");
    fireEvent.click(screen.getByText("Continuar"));
    expect(container.querySelectorAll(".tramos i.d")).toHaveLength(1);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("33");
  });
  it("con más de 12 ejercicios vuelve a una sola barra", () => {
    const many = Array.from({ length: 13 }, (_, i) => cloze(i));
    const { container } = render(<ItemRunner items={fromItems(many)} onFinish={() => undefined} />);
    expect(container.querySelector(".tramos")).toBeNull();
    expect(container.querySelector(".focus-head .bar")).not.toBeNull();
  });
});

describe("corrección", () => {
  it("al fallar con comparación dice «Casi. Mira la diferencia» y muestra Dijiste / Se dice", () => {
    render(<ItemRunner items={fromItems([cloze(1)])} onFinish={() => undefined} />);
    check("hai");
    expect(screen.getByText("Casi. Mira la diferencia")).toBeTruthy();
    expect(screen.getByText("Dijiste")).toBeTruthy();
    expect(screen.getByText("Se dice")).toBeTruthy();
  });
  it("al acertar es breve: «¡Correcto!» sin comparación", () => {
    render(<ItemRunner items={fromItems([cloze(1)])} onFinish={() => undefined} />);
    check("ho");
    expect(screen.getByText("¡Correcto!")).toBeTruthy();
    expect(screen.queryByText("Dijiste")).toBeNull();
  });
});

describe("Ajustes: sonido", () => {
  it("está apagado por defecto y se enciende y recuerda", () => {
    render(<SettingsScreen store={memoryStore()} memoryOnly={false} />);
    const box = screen.getByRole("checkbox", { name: /Sonido breve al acertar o fallar/ }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(loadSound()).toBe(true);
  });
});
