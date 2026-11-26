import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { twoLevelPack } from "../test/realPack";
import { nextAction } from "../ui/TodayScreen";
import { emptyProgress } from "./course";
import { hablaMissing, moduleProgressId, moduleViews, salidaMissing, textosMissing, type ModuleStepId } from "./modules";
import { finishModuleStep, finishModuleTest, finishModuleText, finishSalidaPart, finishStep, finishTest } from "./progress";
import { planToday } from "./session";
import { localDate, memoryStore, type Store } from "./store";

const NOW = new Date("2026-11-26T12:00:00");
const planOf = async (pack: ContentPack, store: Store) => planToday({ pack, cards: [], day: await store.getDay(localDate(NOW)), now: NOW, units: await store.allUnits() });

/** Sigue «el siguiente» de Hoy sin elegir nada, hasta que Hoy no ofrece ni una unidad ni un paso de módulo. Devuelve las unidades y los módulos que Hoy ofreció. */
async function walk(pack: ContentPack, store: Store) {
  const units = new Set<string>(), modules = new Set<string>();
  for (let guard = 0; guard < 3000; guard++) {
    const plan = await planOf(pack, store);
    if (plan.unit) {
      const u = plan.unit.view.unit;
      units.add(u.id);
      if (plan.unit.step === "prueba") await finishTest(store, u.id, 10, 10, NOW);
      else await finishStep(store, u.id, plan.unit.step, NOW);
      continue;
    }
    if (!plan.module) break;
    const { module } = plan.module.view;
    modules.add(module.id);
    const progress = async () => (await store.getUnit(moduleProgressId(module.id))) ?? emptyProgress(moduleProgressId(module.id));
    const step: ModuleStepId = plan.module.step;
    if (step === "salida") {
      for (const id of hablaMissing(module, await progress())) await finishSalidaPart(store, module, "habla", NOW, id);
      if (salidaMissing(module, await progress()).includes("escritura")) await finishSalidaPart(store, module, "escritura", NOW);
    }
    else if (step === "textos") for (const id of textosMissing(module, await progress())) await finishModuleText(store, module, id, NOW);
    else if (step === "cierre") await finishModuleTest(store, module.id, 10, 10, NOW);
    else await finishModuleStep(store, module.id, step, NOW);
  }
  return { units, modules };
}

describe("la ruta entre dos niveles (A1 → hito A1 → A2)", () => {
  it("A2 no se ofrece mientras el hito A1 no esté aprobado, y el hito A1 se ofrece antes que el primer módulo A2", async () => {
    const pack = twoLevelPack();
    const store = memoryStore();
    const { units, modules } = await walk(pack, store);
    expect([...modules].sort()).toEqual(["m01", "m02"]);
    for (const id of units) expect(pack.course.units.find((u) => u.id === id)!.level, id).toBe("A1");

    const stored = await store.allUnits();
    const mv = moduleViews(pack.course, stored);
    expect(mv.modules.map((m) => m.state)).toEqual(["completed", "completed", "locked"]);
    for (const m of mv.modules[2].units) expect(mv.units.find((v) => v.unit.id === m.unit.id)!.state, m.unit.id).toBe("locked");
    expect(mv.units.find((v) => v.unit.id === "u12")!.state).toBe("locked");   // B1 sin módulo: nunca se ofrece

    const plan = await planOf(pack, store);
    expect(plan.unit).toBeNull();
    expect(plan.module).toBeNull();
    expect(plan.milestone).toEqual({ level: "A1", passed: false });
    expect(nextAction(plan)).toEqual({ href: "#/hito/A1", label: "Examen de hito A1" });
  }, 120_000);

  it("al aprobar el hito A1 se abre el primer módulo A2, que se numera dentro de su nivel", async () => {
    const pack = twoLevelPack();
    const store = memoryStore();
    await walk(pack, store);
    await store.putUnit({ ...emptyProgress("hito:A1"), completed: true });

    const plan = await planOf(pack, store);
    expect(plan.module?.view.module.id).toBe("a2m01");
    expect(plan.module?.step).toBe("entrada");
    expect(plan.place).toMatchObject({ level: "A2", module: 1, modules: 1 });   // «Módulo 1 de 1» de A2, no «Módulo 3 de 1»
    expect(plan.milestone).toBeNull();                                          // A1 ya aprobado y A2 en curso: nada pendiente
    expect(moduleViews(pack.course, await store.allUnits()).modules[2].number).toBe(1);

    const { units, modules } = await walk(pack, store);
    expect([...modules]).toEqual(["a2m01"]);
    for (const id of units) expect(pack.course.units.find((u) => u.id === id)!.level, id).toBe("A2");
  }, 120_000);

  it("el hito A2 solo se ofrece si el nivel lo declara; mientras no, no se ofrece (el nivel puede estar a medias)", async () => {
    const hidden = twoLevelPack(false);
    const storeA = memoryStore();
    await walk(hidden, storeA);
    await storeA.putUnit({ ...emptyProgress("hito:A1"), completed: true });
    await walk(hidden, storeA);
    const planA = await planOf(hidden, storeA);
    expect(planA.milestone).toBeNull();
    expect(["#/repaso", "#/ruta"]).toContain(nextAction(planA).href);

    const open = twoLevelPack(true);
    const storeB = memoryStore();
    await walk(open, storeB);
    await storeB.putUnit({ ...emptyProgress("hito:A1"), completed: true });
    await walk(open, storeB);
    const planB = await planOf(open, storeB);
    expect(planB.milestone).toEqual({ level: "A2", passed: false });
    expect(nextAction(planB)).toEqual({ href: "#/hito/A2", label: "Examen de hito A2" });
  }, 180_000);

  it("saltar un módulo A2 con la ubicación no abre el siguiente nivel sin el hito", () => {
    const pack = twoLevelPack(true);
    const [, , a2] = pack.course.modules!;
    const placed = a2.units.map((id) => ({ ...emptyProgress(id), completed: true, mastery: "ubicacion" as const }));
    const mv = moduleViews(pack.course, placed);
    expect(mv.modules[2].state).toBe("locked");                                  // A2 sigue cerrado: A1 no está completo ni su hito aprobado
  });
});
