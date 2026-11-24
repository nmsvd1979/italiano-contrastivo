import { describe, expect, it } from "vitest";
import type { ModuleView } from "./modules";
import { canDoKey, canDoSummary, setCanDo } from "./cando";
import { emptyProgress } from "./course";

const NOW = new Date("2026-11-24T12:00:00.000Z");
const mod = (id: string, index: number, state: ModuleView["state"], can: string[], done: Record<string, string> = {}, byPlacement = false): ModuleView =>
  ({ module: { id, title: `Módulo ${id}`, can_do_es: can }, index, state, byPlacement, progress: { ...emptyProgress(`mod:${id}`), done } }) as unknown as ModuleView;

describe("claves de «sé hacer»", () => {
  it("son estables y distintas para textos distintos", () => {
    expect(canDoKey("Saludar con «tu»")).toBe(canDoKey("Saludar con «tu»"));
    expect(canDoKey("Saludar con «tu»")).not.toBe(canDoKey("Saludar con «Lei»"));
    expect(canDoKey("x")).toMatch(/^sabe:[0-9a-z]+$/);
  });
  it("setCanDo marca y desmarca sin tocar el resto del progreso del módulo", () => {
    const p = { ...emptyProgress("mod:m01"), done: { entrada: "x", "salida:habla": "y" } };
    const on = setCanDo(p, "Saludar", true, NOW);
    expect(on.done[canDoKey("Saludar")]).toBe(NOW.toISOString());
    expect(on.done.entrada).toBe("x");
    expect(on.done["salida:habla"]).toBe("y");
    const off = setCanDo(on, "Saludar", false, NOW);
    expect(canDoKey("Saludar") in off.done).toBe(false);
    expect(off.done).toEqual(p.done);
  });
});

describe("resumen de «sé hacer»", () => {
  it("un módulo completado con la prueba de cierre da por «completados» sus «sé hacer», aunque no estén marcados", () => {
    const s = canDoSummary([mod("m01", 0, "completed", ["a", "b"])]);
    expect(s.known).toBe(2);
    expect(s.total).toBe(2);
    expect(s.groups[0].items.map((i) => i.state)).toEqual(["completado", "completado"]);
  });
  it("un módulo saltado por la prueba de ubicación se distingue: «saltado», no «completado»", () => {
    const s = canDoSummary([mod("m01", 0, "completed", ["a", "b"], {}, true)]);
    expect(s.groups[0].items.map((i) => i.state)).toEqual(["saltado", "saltado"]);
    expect(s.known).toBe(2);
  });
  it("en un módulo en curso cuentan solo las marcadas por ti", () => {
    const s = canDoSummary([mod("m02", 1, "current", ["a", "b", "c"], { [canDoKey("b")]: NOW.toISOString() })]);
    expect(s.known).toBe(1);
    expect(s.total).toBe(3);
    expect(s.groups[0].items.map((i) => i.state)).toEqual(["pendiente", "marcado", "pendiente"]);
  });
  it("suma varios módulos y conserva su orden", () => {
    const s = canDoSummary([mod("m01", 0, "completed", ["a"]), mod("m02", 1, "current", ["b", "c"], { [canDoKey("c")]: "x" }), mod("m03", 2, "locked", ["d"])]);
    expect(s.known).toBe(2);
    expect(s.total).toBe(4);
    expect(s.groups.map((g) => g.moduleId)).toEqual(["m01", "m02", "m03"]);
  });
  it("sin módulos, o con módulos sin «sé hacer», no hay grupos", () => {
    expect(canDoSummary([])).toEqual({ known: 0, total: 0, groups: [] });
    expect(canDoSummary([mod("m01", 0, "current", [])])).toEqual({ known: 0, total: 0, groups: [] });
  });
});
