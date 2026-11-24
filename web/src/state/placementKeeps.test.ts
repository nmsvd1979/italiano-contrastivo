import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Course } from "../content/load";
import { applyTest, emptyProgress, masterByPlacement } from "./course";
import { moduleViews } from "./modules";
import { finishTest, placeUnits } from "./progress";
import { memoryStore } from "./store";

const course = JSON.parse(readFileSync("public/content/course.json", "utf8")) as Course;
const M1 = course.modules![0];
const M2 = course.modules![1];
const NOW = new Date("2026-11-24T12:00:00.000Z");
const unitsOf = (ids: string[]) => ids.map((id) => course.units.find((u) => u.id === id)!);

describe("repasar una unidad saltada por la prueba de ubicación", () => {
  it("aprobar otra vez la prueba no cambia cómo se completó (sigue «ubicación»)", () => {
    const placed = masterByPlacement(emptyProgress("u01"), NOW);
    const r = applyTest(placed, 10, 10, NOW);
    expect(r.passed).toBe(true);
    expect(r.progress).toMatchObject({ completed: true, mastery: "ubicacion", testBest: 1 });
  });
  it("suspenderla tampoco la descompleta ni cambia cómo se completó", () => {
    const placed = masterByPlacement(emptyProgress("u01"), NOW);
    const r = applyTest(placed, 2, 10, NOW);
    expect(r.passed).toBe(false);
    expect(r.progress).toMatchObject({ completed: true, mastery: "ubicacion" });
  });
  it("una unidad completada con la prueba normal sigue con «prueba»", () => {
    const r = applyTest(emptyProgress("u01"), 10, 10, NOW);
    expect(r.progress.mastery).toBe("prueba");
  });
  it("el módulo saltado sigue completado y el siguiente abierto tras repasar una de sus unidades", async () => {
    const store = memoryStore();
    await placeUnits(store, unitsOf(M1.units), NOW);
    const antes = moduleViews(course, await store.allUnits(), false);
    expect(antes.modules[0]).toMatchObject({ state: "completed", byPlacement: true });
    await finishTest(store, M1.units[0], 10, 10, NOW);          // repasa y aprueba la prueba de una unidad
    await finishTest(store, M1.units[1], 3, 10, NOW);           // y suspende otra
    const despues = moduleViews(course, await store.allUnits(), false);
    expect(despues.modules[0]).toMatchObject({ state: "completed", byPlacement: true });
    expect(despues.modules[1].state).toBe("current");           // el siguiente módulo no se vuelve a bloquear
    expect(despues.modules[1].module.id).toBe(M2.id);
  });
  it("un módulo cuyas unidades se completaron una a una sigue sin darse por saltado", async () => {
    const store = memoryStore();
    for (const id of M1.units) await finishTest(store, id, 10, 10, NOW);
    const v = moduleViews(course, await store.allUnits(), false).modules[0];
    expect(v.byPlacement).toBe(false);
    expect(v.state).not.toBe("completed");   // faltan Entrada, Salida, Fluidez y Cierre
  });
});
