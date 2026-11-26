import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { emptyProgress } from "../state/course";
import { type ModuleView, moduleViews } from "../state/modules";
import type { UnitProgress } from "../state/store";
import { RouteScreen } from "./RouteScreen";
import { stageStates } from "./kit/ModuleStrip";

import { readItems } from "../test/realPack";
afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: readItems(), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"),
  course: read("course.json"), readings: read("readings.json"), readingWords: read("reading_words.json"), speaking: read("speaking.json"), library: read("library.json") } as ContentPack;
const mods = pack.course.modules!.filter((m) => m.level === "A1");   // el módulo a2m01 existe en el paquete: estas pruebas son de A1
const placed = (id: string): UnitProgress => ({ ...emptyProgress(id), completed: true, testBest: 1, mastery: "ubicacion" });

describe("tira de etapas", () => {
  it("stageStates marca hecho, actual y pendiente", () => {
    const view = { next: "capsulas", steps: [
      { id: "entrada", done: true, open: true }, { id: "capsulas", done: false, open: true }, { id: "salida", done: false, open: false },
      { id: "fluidez", done: false, open: false }, { id: "cierre", done: false, open: false }] } as unknown as ModuleView;
    expect(stageStates(view).map((s) => s.state)).toEqual(["done", "current", "todo", "todo", "todo"]);
    expect(stageStates(view).map((s) => s.label)).toEqual(["Entrada", "Cápsulas", "Salida", "Fluidez", "Cierre"]);
  });
});

describe("ruta rediseñada", () => {
  it("solo el módulo en curso trae tira de etapas y botón", () => {
    const v = moduleViews(pack.course, [], false);
    render(<RouteScreen views={v.units} modules={v.modules} pack={pack} />);
    expect(screen.getAllByText("Cápsulas")).toHaveLength(1);
    const go = screen.getByText(/^Continuar · Entrada/) as HTMLAnchorElement;
    expect(go.getAttribute("href")).toBe(`#/modulo/${mods[0].id}/entrada`);
  });
  it("un módulo bloqueado no es un enlace pero muestra lo que sabrás hacer", () => {
    const v = moduleViews(pack.course, [], false);
    render(<RouteScreen views={v.units} modules={v.modules} pack={pack} />);
    expect(screen.getByText(mods[1].title).closest("a")).toBeNull();
    expect(screen.getByText(mods[1].can_do_es[0])).toBeTruthy();
  });
  it("sin ningún módulo en curso no falla y muestra el examen de hito", () => {
    const v = moduleViews(pack.course, mods.flatMap((m) => m.units.map(placed)), false);
    expect(v.modules.filter((m) => m.module.level === "A1").every((m) => m.state === "completed")).toBe(true);
    render(<RouteScreen views={v.units} modules={v.modules} pack={pack} />);
    expect(screen.queryByText(/^Continuar ·/)).toBeNull();
    expect(screen.getByText("Examen de hito A1").closest("a")?.getAttribute("href")).toBe("#/hito/A1");
  });
  it("el método y las horas de referencia siguen disponibles, plegados", () => {
    const v = moduleViews(pack.course, [], false);
    render(<RouteScreen views={v.units} modules={v.modules} pack={pack} />);
    const summary = screen.getByText("Cómo funciona");
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")?.textContent).toMatch(/Referencia general/);
  });
  it("Hablar y Escribir ya no cuelgan de la ruta", () => {
    const v = moduleViews(pack.course, [], false);
    render(<RouteScreen views={v.units} modules={v.modules} pack={pack} />);
    expect(screen.queryByText("Práctica libre")).toBeNull();
  });
});
