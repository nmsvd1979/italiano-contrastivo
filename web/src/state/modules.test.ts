import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { currentView, emptyProgress } from "./course";
import { applyModuleTest, currentModule, moduleProgressId, moduleTestItems, moduleViews, MODULE_TEST_MAX, salidaKey, salidaMissing } from "./modules";
import type { UnitProgress } from "./store";

const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
const [M1, M2] = pack.course.modules!;
const NOW = new Date("2026-11-24T12:00:00.000Z");
const completed = (id: string, mastery: "prueba" | "ubicacion" = "prueba"): UnitProgress => ({ ...emptyProgress(id), completed: true, testBest: 1, mastery });
const modDone = (id: string, done: Record<string, string> = {}, completedFlag = false): UnitProgress => ({ ...emptyProgress(moduleProgressId(id)), done, completed: completedFlag });
const at = NOW.toISOString();

describe("módulos: estado y bloqueos", () => {
  it("sin progreso: el primer módulo pide su Entrada, sus cápsulas quedan bloqueadas y el siguiente módulo también", () => {
    const v = moduleViews(pack.course, [], false);
    expect(v.modules.map((m) => m.state)).toEqual(["current", ...Array(pack.course.modules!.length - 1).fill("locked")]);
    expect(v.modules[0].next).toBe("entrada");
    expect(v.units.filter((u) => M1.units.includes(u.unit.id)).every((u) => u.state === "locked")).toBe(true);
    expect(currentView(v.units.filter((u) => !u.unit.level.endsWith("+")))).toBeUndefined();       // ninguna cápsula del camino principal toca todavía: «Hoy» propone la Entrada
  });
  it("con la Entrada hecha, la primera cápsula es la actual; el resto del módulo sigue en cadena", () => {
    const v = moduleViews(pack.course, [modDone(M1.id, { entrada: at })], false);
    expect(v.modules[0].next).toBe("capsulas");
    expect(currentView(v.units)!.unit.id).toBe(M1.units[0]);
    expect(v.units.filter((u) => M1.units.includes(u.unit.id) && u.state === "locked").length).toBe(M1.units.length - 1);
  });
  it("si ya empezaste una cápsula del módulo (progreso anterior), la Entrada no bloquea", () => {
    const v = moduleViews(pack.course, [{ ...emptyProgress(M1.units[0]), done: { descubre: at } }], false);
    expect(v.modules[0].next).toBe("capsulas");
    expect(currentView(v.units)!.unit.id).toBe(M1.units[0]);
    expect(v.modules[0].steps.find((s) => s.id === "entrada")!.open).toBe(true);
  });
  it("con todas las cápsulas hechas toca la Salida; Fluidez y Cierre esperan a la anterior", () => {
    const v = moduleViews(pack.course, M1.units.map((u) => completed(u)), false).modules[0];
    expect(v.next).toBe("salida");
    expect(v.steps.map((s) => [s.id, s.open])).toEqual([["entrada", true], ["capsulas", true], ["salida", true], ["fluidez", false], ["cierre", false]]);
    const v2 = moduleViews(pack.course, [...M1.units.map((u) => completed(u)), modDone(M1.id, { salida: at })], false).modules[0];
    expect(v2.next).toBe("fluidez");
    expect(v2.steps.find((s) => s.id === "cierre")!.open).toBe(false);
  });
  it("aprobar el cierre completa el módulo y abre el siguiente; sin aprobar, no", () => {
    const base = M1.units.map((u) => completed(u));
    const open = moduleViews(pack.course, [...base, modDone(M1.id, { entrada: at, salida: at, fluidez: at, cierre: at }, true)], false);
    expect(open.modules[0].state).toBe("completed");
    expect(open.modules[1].state).toBe("current");
    expect(open.modules[1].next).toBe("entrada");
    const closed = moduleViews(pack.course, [...base, modDone(M1.id, { entrada: at, salida: at, fluidez: at })], false);
    expect(closed.modules[1].state).toBe("locked");
    expect(currentModule(closed.modules)!.module.id).toBe(M1.id);
  });
  it("un módulo cuyas unidades se saltaron con la ubicación queda completado", () => {
    const v = moduleViews(pack.course, M1.units.map((u) => completed(u, "ubicacion")), false);
    expect(v.modules[0]).toMatchObject({ state: "completed", byPlacement: true });
    expect(v.modules[1].state).toBe("current");
  });
  it("en modo de prueba todo está abierto", () => {
    const v = moduleViews(pack.course, [], true);
    expect(v.modules.every((m) => m.state === "current" && m.steps.every((s) => s.open))).toBe(true);
    expect(v.units.some((u) => u.state === "locked")).toBe(false);
  });
});

describe("módulos: salida y prueba de cierre", () => {
  it("la Salida pide práctica hablada solo si el módulo la tiene, y siempre un mensaje escrito", () => {
    const withSpeech = M1;
    expect(salidaMissing(withSpeech, modDone(withSpeech.id))).toEqual(["habla", "escritura"]);
    expect(salidaMissing(withSpeech, modDone(withSpeech.id, { [salidaKey("habla")]: at }))).toEqual(["escritura"]);
    const noSpeech = { ...M1, roleplays: [], tasks: [], gap_es: "sin diálogo abierto" };   // un módulo sin práctica hablada declara su hueco
    expect(salidaMissing(noSpeech, modDone(noSpeech.id))).toEqual(["escritura"]);
  });
  it("hoy todos los módulos de A1 tienen práctica hablada propia (juego de roles o tarea oral)", () => {
    for (const m of pack.course.modules!) expect(m.roleplays.length + m.tasks.length, m.id).toBeGreaterThan(0);
  });
  it("el cierre aprueba con 80 % o más y guarda la mejor nota; si no aprueba, no completa", () => {
    const ok = applyModuleTest(modDone(M1.id), 10, 12, NOW);
    expect(ok.passed).toBe(true);
    expect(ok.progress).toMatchObject({ completed: true, done: { cierre: at } });
    const no = applyModuleTest(modDone(M1.id), 9, 12, NOW);
    expect(no.passed).toBe(false);
    expect(no.progress).toMatchObject({ completed: false, testBest: 0.75 });
  });
  it("la prueba mezcla frases de todas las cápsulas del módulo, sin repetir, escritas desde el español", () => {
    for (const m of pack.course.modules!) {
      const view = moduleViews(pack.course, [], true).modules.find((x) => x.module.id === m.id)!;
      const items = moduleTestItems(view, pack);
      expect(items.length, m.id).toBeGreaterThan(5);
      expect(items.length, m.id).toBeLessThanOrEqual(MODULE_TEST_MAX);
      expect(new Set(items.map((i) => i.id)).size, m.id).toBe(items.length);
      expect(items.every((i) => i.type === "translate_es_it"), m.id).toBe(true);
    }
  });
  it("M2 tiene verbos en -are (parlo, abito) para poder hablar de tus datos", () => {
    expect(M2.units).toContain("u14");
  });
});

describe("Salida: todos los juegos de rol y tareas orales", () => {
  const m = pack.course.modules!.find((x) => x.roleplays.length + x.tasks.length >= 2)!;
  const p = (done: Record<string, string> = {}) => ({ ...emptyProgress(moduleProgressId(m.id)), done });
  it("la parte hablada falta hasta que se marca cada práctica del módulo", async () => {
    const { hablaKey, hablaMissing } = await import("./modules");
    const items = [...m.roleplays, ...m.tasks];
    expect(hablaMissing(m, p())).toEqual(items);
    expect(hablaMissing(m, p({ [hablaKey(items[0])]: "x" }))).toEqual(items.slice(1));
    expect(hablaMissing(m, p(Object.fromEntries(items.map((id) => [hablaKey(id), "x"]))))).toEqual([]);
  });
  it("la marca general de antes (`salida:habla`) sigue valiendo", async () => {
    const { hablaMissing } = await import("./modules");
    expect(hablaMissing(m, p({ [salidaKey("habla")]: "x" }))).toEqual([]);
  });
  it("finishSalidaPart con una práctica no completa la parte hasta tenerlas todas", async () => {
    const { finishSalidaPart } = await import("./progress");
    const { memoryStore } = await import("./store");
    const store = memoryStore();
    const items = [...m.roleplays, ...m.tasks];
    let prog = await finishSalidaPart(store, m, "habla", new Date(), items[0]);
    expect(prog.done[salidaKey("habla")]).toBeUndefined();
    for (const id of items.slice(1)) prog = await finishSalidaPart(store, m, "habla", new Date(), id);
    expect(prog.done[salidaKey("habla")]).toBeDefined();
  });
});
