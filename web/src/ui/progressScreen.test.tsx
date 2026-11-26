import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { canDoKey } from "../state/cando";
import { emptyProgress } from "../state/course";
import { moduleProgressId, moduleViews } from "../state/modules";
import type { DayProgress, UnitProgress } from "../state/store";
import { ProgressScreen } from "./ProgressScreen";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const course = read("course.json") as ContentPack["course"];
const mods = course.modules!;
const TOTAL = mods.reduce((t, m) => t + m.can_do_es.length, 0);
const TODAY = "2026-11-24";
const placed = (id: string): UnitProgress => ({ ...emptyProgress(id), completed: true, testBest: 1, mastery: "ubicacion" });
const day = (date: string, over: Partial<DayProgress> = {}): DayProgress => ({ date, reviewsDone: 0, capsulesDone: [], ...over });
const show = (units: UnitProgress[] = [], days: DayProgress[] = [], modules = moduleViews(course, units, false).modules) =>
  render(<ProgressScreen week={{}} days={days} today={TODAY} modules={modules} weak={{ spots: [], attempts: 0, evaluated: 0 }} />);

describe("pantalla Progreso", () => {
  it("sin datos: «Ya sabes hacer» en cero y el calendario explica cómo se llena", () => {
    show();
    expect(screen.getByRole("heading", { name: "Ya sabes hacer" })).toBeTruthy();
    expect(screen.getByText(`0 de ${TOTAL}`)).toBeTruthy();
    expect(screen.getByText(/Cuando estudies, aquí verás tu constancia/)).toBeTruthy();
  });
  it("un módulo completado con la prueba de cierre se rotula «módulo completado»", () => {
    const cierre: UnitProgress = { ...emptyProgress(moduleProgressId(mods[0].id)), completed: true, done: { cierre: "x" } };
    const units = [...mods[0].units.map((id) => ({ ...emptyProgress(id), completed: true, testBest: 1, mastery: "prueba" as const })), cierre];
    show(units);
    expect(screen.getByText(`${mods[0].can_do_es.length} de ${TOTAL}`)).toBeTruthy();
    expect(screen.getAllByText("módulo completado (prueba de cierre)")).toHaveLength(mods[0].can_do_es.length);
  });
  it("un módulo saltado por la prueba de ubicación se rotula como tal, no como completado", () => {
    show(mods[0].units.map(placed));
    expect(screen.getAllByText("módulo saltado por la prueba de ubicación")).toHaveLength(mods[0].can_do_es.length);
    expect(screen.queryByText("módulo completado (prueba de cierre)")).toBeNull();
    expect(screen.queryByText("probado")).toBeNull();
  });
  it("lo que marcaste en un módulo en curso aparece como «marcado por ti» y ese módulo viene desplegado", () => {
    const entrada: UnitProgress = { ...emptyProgress(moduleProgressId(mods[0].id)), done: { entrada: "x", [canDoKey(mods[0].can_do_es[0])]: "x" } };
    const { container } = show([entrada]);
    expect(screen.getAllByText("marcado por ti")).toHaveLength(1);
    const open = container.querySelectorAll("details[open]");
    expect(open).toHaveLength(1);
    expect(open[0].textContent).toContain(mods[0].title);
  });
  it("los pendientes lo dicen en texto, no solo en color", () => {
    const { container } = show();
    expect(container.querySelector("ul.cando li")?.textContent).toMatch(/pendiente/);
  });
  it("sin módulos no aparece «Ya sabes hacer» y nada falla", () => {
    show([], [], []);
    expect(screen.queryByRole("heading", { name: "Ya sabes hacer" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Progreso" })).toBeTruthy();
  });
  it("el calendario cuenta los días de estudio y el tiempo", () => {
    show([], [day("2026-11-10", { reviewsDone: 2, seconds: { foco: 1200 } }), day("2026-11-24", { stepsDone: ["u01:descubre"], seconds: { entrada: 2400 } })]);
    expect(screen.getByText(/2 días de estudio · 1 h 0 min en total/)).toBeTruthy();
  });
  it("dice con franqueza qué es autoevaluación y qué es prueba, y qué falta", () => {
    show();
    expect(screen.getByText(/autoevaluación/)).toBeTruthy();
    expect(screen.getByText(/hablante nativo/)).toBeTruthy();
    expect(screen.getByText(/pronunciación/)).toBeTruthy();   // la prueba de cierre no la evalúa
    expect(screen.getByText(/Lo que más te cuesta/)).toBeTruthy();
  });
  it("Ajustes y Acerca de siguen y se pueden tocar (≥ 44 px)", () => {
    show();
    expect(screen.getByText("Ajustes").closest("a")?.getAttribute("href")).toBe("#/ajustes");
    expect(screen.getByText("Ajustes").classList.contains("tap")).toBe(true);
    expect(screen.getByText(/Acerca de la app/).closest("a")?.classList.contains("tap")).toBe(true);
  });
  it("sin tiempo medido no dice «menos de 1 min en total»", () => {
    show([], [day("2026-11-10", { reviewsDone: 2 }), day("2026-11-11", { stepsDone: ["u01:descubre"] })]);
    expect(screen.getByText("2 días de estudio")).toBeTruthy();
    expect(screen.queryByText(/en total/)).toBeNull();
  });
});

describe("casillas del Cierre", () => {
  const css = readFileSync(`${process.cwd()}/src/styles.css`, "utf8");
  it("cada «sé hacer» se puede tocar (≥ 44 px)", () => {
    expect(Number(css.match(/ul\.options label\s*\{[^}]*min-height:\s*(\d+)px/)?.[1] ?? 0)).toBeGreaterThanOrEqual(44);
  });
});

describe("Progreso: colección de sellos", () => {
  it("hay un sello por módulo y solo el completado está ganado", () => {
    const cierre: UnitProgress = { ...emptyProgress(moduleProgressId(mods[0].id)), completed: true, done: { cierre: "x" } };
    const units = [...mods[0].units.map((id) => ({ ...emptyProgress(id), completed: true, testBest: 1, mastery: "prueba" as const })), cierre];
    show(units);
    const grid = screen.getByRole("list", { name: "Sellos de los módulos" });
    expect(grid.querySelectorAll("li")).toHaveLength(mods.length);   // todos los módulos, también los de A2 (su sello dice «de A2»)
    expect(grid.querySelectorAll('[data-earned="true"]')).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Sello del módulo 1, ganado" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Sello del módulo 2, pendiente" })).toBeTruthy();
  });
});
