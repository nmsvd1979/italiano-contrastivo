import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { nextAction } from "../ui/TodayScreen";
import { emptyProgress, stepsFor } from "./course";
import { hablaMissing, moduleProgressId, moduleViews, salidaMissing, textosMissing, type ModuleStepId } from "./modules";
import { finishModuleStep, finishModuleTest, finishModuleText, finishSalidaPart, finishStep, finishTest } from "./progress";
import { planToday } from "./session";
import { localDate, memoryStore } from "./store";

import { readItems } from "../test/realPack";
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: readItems(), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
const NOW = new Date("2026-11-24T12:00:00");

/** Sigue «el siguiente» de Hoy sin elegir nada: la ruta sola debe bastar para completar A1. */
describe("la ruta es el único camino para completar A1", () => {
  it("siguiendo solo lo que ofrece Hoy se recorren los 12 módulos, se llega al hito y nunca se ofrece otro nivel", async () => {
    const store = memoryStore();
    const seen = new Map<string, Set<string>>();           // módulo → etapas propias que Hoy ofreció
    const offeredLevels = new Set<string>();
    for (let guard = 0; guard < 3000; guard++) {
      const units = await store.allUnits();
      const plan = planToday({ pack, cards: [], day: await store.getDay(localDate(NOW)), now: NOW, units });
      if (plan.unit) {
        const u = plan.unit.view.unit;
        offeredLevels.add(u.level);
        if (plan.unit.step === "prueba") await finishTest(store, u.id, 10, 10, NOW);
        else await finishStep(store, u.id, plan.unit.step, NOW);
        continue;
      }
      if (!plan.module) break;
      const { module } = plan.module.view;
      seen.set(module.id, (seen.get(module.id) ?? new Set()).add(plan.module.step));
      const step: ModuleStepId = plan.module.step;
      const progress = async () => (await store.getUnit(moduleProgressId(module.id))) ?? emptyProgress(moduleProgressId(module.id));
      if (step === "salida") {   // la Salida pide TODOS los juegos de rol y tareas orales del módulo, y un mensaje escrito
        for (const id of hablaMissing(module, await progress())) await finishSalidaPart(store, module, "habla", NOW, id);
        if (salidaMissing(module, await progress()).includes("escritura")) await finishSalidaPart(store, module, "escritura", NOW);
      }
      else if (step === "textos") for (const id of textosMissing(module, await progress())) await finishModuleText(store, module, id, NOW);
      else if (step === "cierre") await finishModuleTest(store, module.id, 10, 10, NOW);
      else await finishModuleStep(store, module.id, step, NOW);
    }

    const mods = pack.course.modules!;
    expect(mods).toHaveLength(12);
    for (const m of mods) {
      const stages = seen.get(m.id) ?? new Set();
      for (const s of ["entrada", "salida", "fluidez", "cierre"]) expect(stages.has(s), `${m.id} no ofreció ${s}`).toBe(true);
      expect(stages.has("textos"), `${m.id} textos`).toBe((m.extra_readings ?? []).length > 0);
    }
    expect([...offeredLevels]).toEqual(["A1"]);            // ninguna unidad de A2/B1 apareció en el camino

    const units = await store.allUnits();
    const plan = planToday({ pack, cards: [], day: await store.getDay(localDate(NOW)), now: NOW, units });
    expect(moduleViews(pack.course, units).modules.every((m) => m.state === "completed")).toBe(true);
    expect(plan.unit).toBeNull();
    expect(plan.module).toBeNull();
    expect(plan.milestone).toEqual({ level: "A1", passed: false });
    expect(nextAction(plan)).toEqual({ href: "#/hito/A1", label: "Examen de hito A1" });
    for (const u of pack.course.units.filter((x) => x.level !== "A1")) {
      expect(moduleViews(pack.course, units).units.find((v) => v.unit.id === u.id)?.state, u.id).toBe("locked");
    }

    await store.putUnit({ ...emptyProgress("hito:A1"), completed: true });
    const after = planToday({ pack, cards: [], day: await store.getDay(localDate(NOW)), now: NOW, units: await store.allUnits() });
    expect(after.milestone).toEqual({ level: "A1", passed: true });
    expect(["#/repaso", "#/ruta"]).toContain(nextAction(after).href);   // con el hito aprobado solo queda el repaso de lo aprendido (o ver la ruta): ninguna unidad de otro nivel
  }, 120_000);

  it("cada unidad de A1 está en un módulo (si no, la ruta no la alcanzaría)", () => {
    const inModules = new Set(pack.course.modules!.flatMap((m) => m.units));
    for (const u of pack.course.units.filter((x) => x.level === "A1")) expect(inModules.has(u.id), u.id).toBe(true);
    expect(stepsFor(pack.course.units[0]).length).toBeGreaterThan(0);
  });
});
