import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ContrastData } from "./ContrastCard";
import { SessionSummary } from "./SessionSummary";

afterEach(cleanup);
const fixed: ContrastData = { id: "s1", es: "Yo me llamo Shu.", before: "Io ", changed: "mi", after: " chiamo Shu.", wrong: "me", soundOnly: false, vocab: false };

describe("cierre de sesión", () => {
  it("dice los aciertos a la primera en texto y cuántos se fallaron", () => {
    render(<SessionSummary correct={21} total={24} daySeconds={14 * 60 + 5} newWords={6} fixed={fixed} />);
    expect(screen.getByRole("img", { name: "21 de 24 a la primera" })).toBeTruthy();
    expect(screen.getByText("14 min")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("palabras nuevas hoy")).toBeTruthy();
    expect(screen.getByText(/Fallaste 3 ejercicios a la primera/)).toBeTruthy();
    expect(screen.getByText("Hoy practicaste")).toBeTruthy();
    expect(screen.getByText("mi").tagName).toBe("MARK");
  });
  it("sin fallos no menciona fallos; sin puntuación muestra el anillo de ✓", () => {
    render(<SessionSummary correct={8} total={8} />);
    expect(screen.queryByText(/Fallaste/)).toBeNull();
    cleanup();
    render(<SessionSummary />);
    expect(screen.getByRole("img", { name: "Completado" })).toBeTruthy();
    expect(screen.queryByText(/min$/)).toBeNull();
  });
  it("una palabra nueva se dice en singular y 0 palabras no se muestran", () => {
    render(<SessionSummary correct={1} total={2} newWords={1} daySeconds={0} />);
    expect(screen.getByText("palabra nueva hoy")).toBeTruthy();
    expect(screen.getByText("0 min")).toBeTruthy();
    expect(screen.getByText(/Fallaste 1 ejercicio a la primera/)).toBeTruthy();
    cleanup();
    render(<SessionSummary correct={1} total={2} newWords={0} />);
    expect(screen.queryByText(/palabra/)).toBeNull();
  });
});
