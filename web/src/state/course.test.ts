import { describe, expect, it } from "vitest";
import type { Course, Unit } from "../content/load";
import { applyTest, canDoStep, currentView, emptyProgress, markStep, masterByPlacement, nextStep, STEPS, unitViews } from "./course";

const NOW = new Date("2026-11-17T12:00:00.000Z");
const unit = (id: string): Unit => ({ id, level: "A1", title: id, goal_es: "", why_here: "", codes: ["ERR_X"], status: "active", explanation_es: "",
  parts: { descubre: [], practica: [], escucha: [], prueba: [] }, divergences: [] });
const course: Course = { version: 1, levels: [], units: [unit("u01"), unit("u02"), unit("u03")], planned: [] };

describe("ruta", () => {
  it("la primera unidad sin completar es la actual y las demás están bloqueadas", () => {
    const v = unitViews(course, []);
    expect(v.map((x) => x.state)).toEqual(["current", "locked", "locked"]);
    expect(v[0].next).toBe("descubre");
  });
  it("los pasos van en orden", () => {
    let p = emptyProgress("u01");
    const seen: (string | null)[] = [];
    for (const s of STEPS) { seen.push(nextStep(p)); p = markStep(p, s, NOW); }
    expect(seen).toEqual(STEPS);
    expect(nextStep(p)).toBeNull();
  });
  it("no se puede saltar un paso ni entrar a una unidad bloqueada", () => {
    const v = unitViews(course, [])[0];
    expect(canDoStep(v, "descubre")).toBe(true);
    expect(canDoStep(v, "prueba")).toBe(false);
    expect(canDoStep(unitViews(course, [])[1], "descubre")).toBe(false);
  });
  it("aprobar la prueba (≥80 %) completa la unidad y desbloquea la siguiente", () => {
    const { progress, passed } = applyTest(emptyProgress("u01"), 8, 10, NOW);
    expect(passed).toBe(true);
    const v = unitViews(course, [progress]);
    expect(v.map((x) => x.state)).toEqual(["completed", "current", "locked"]);
    expect(currentView(v)?.unit.id).toBe("u02");
  });
  it("reprobar obliga a rehacer la práctica y guarda la mejor nota", () => {
    let p = emptyProgress("u01");
    for (const s of STEPS.slice(0, 4)) p = markStep(p, s, NOW);
    const r = applyTest(p, 7, 10, NOW);
    expect(r.passed).toBe(false);
    expect(r.progress.completed).toBe(false);
    expect(r.progress.done.practica).toBeUndefined();
    expect(r.progress.done.descubre).toBeTruthy();
    expect(nextStep(r.progress)).toBe("practica");
    expect(applyTest(r.progress, 5, 10, NOW).progress.testBest).toBe(0.7);
  });
  it("el 80 % exacto aprueba y 79 % no", () => {
    expect(applyTest(emptyProgress("u"), 4, 5, NOW).passed).toBe(true);
    expect(applyTest(emptyProgress("u"), 79, 100, NOW).passed).toBe(false);
  });
  it("la ubicación completa una unidad y marca cómo", () => {
    const p = masterByPlacement(emptyProgress("u01"), NOW);
    expect(p.completed && p.mastery === "ubicacion" && nextStep(p) === null).toBe(true);
  });
  it("una unidad ya dominada permite repetir sus pasos", () => {
    const done = masterByPlacement(emptyProgress("u01"), NOW);
    expect(canDoStep(unitViews(course, [done])[0], "practica")).toBe(true);
  });
});
