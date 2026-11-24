import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Unit } from "../../content/load";
import { emptyProgress, type UnitView } from "../../state/course";
import { STEP_SHORT, UnitStrip, unitStepStates } from "./UnitStrip";

afterEach(cleanup);

const unit = { id: "u01", level: "A1", title: "Prueba", codes: ["ERR_X"], words: [], readings: [], divergences: [] } as unknown as Unit;
const view = (over: Partial<UnitView> = {}): UnitView => ({
  unit, state: "current", index: 0, next: "capsula",
  progress: { ...emptyProgress("u01"), done: { descubre: "2026-11-24T10:00:00.000Z" } }, ...over,
});

describe("tira de pasos de la unidad", () => {
  it("unitStepStates marca hecho, actual y pendiente", () => {
    expect(unitStepStates(view()).map((s) => s.state)).toEqual(["done", "current", "todo", "todo", "todo", "todo"]);
    expect(unitStepStates(view()).map((s) => s.id)).toEqual(["descubre", "capsula", "practica", "escucha", "practica2", "prueba"]);
  });
  it("la prueba se llama «Prueba» en la tira", () => {
    expect(STEP_SHORT.prueba).toBe("Prueba");
    expect(unitStepStates(view()).at(-1)?.label).toBe("Prueba");
  });
  it("los pasos abiertos son enlaces al paso y los cerrados no", () => {
    render(<UnitStrip view={view()} />);
    expect(screen.getByRole("link", { name: /^Descubre/ }).getAttribute("href")).toBe("#/unidad/u01/descubre");
    expect(screen.getByRole("link", { name: /^Cápsula/ }).getAttribute("href")).toBe("#/unidad/u01/capsula");
    expect(screen.queryByRole("link", { name: /^Práctica/ })).toBeNull();
  });
  it("cada paso dice su estado además del color", () => {
    render(<UnitStrip view={view()} />);
    expect(screen.getByRole("link", { name: /^Descubre.*hecho/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^Cápsula.*toca ahora/ })).toBeTruthy();
    expect(screen.getByText("Escucha").closest("li")?.textContent).toMatch(/pendiente/);
  });
  it("una unidad completada deja repetir todos sus pasos", () => {
    render(<UnitStrip view={view({ state: "completed", next: null, progress: { ...emptyProgress("u01"), completed: true, done: { descubre: "x", capsula: "x", practica: "x", escucha: "x", practica2: "x", prueba: "x" } } })} />);
    expect(screen.getAllByRole("link")).toHaveLength(6);
  });
});
