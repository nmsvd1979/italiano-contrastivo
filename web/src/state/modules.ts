import type { Course, CourseModule } from "../content/load";
import { emptyProgress, unitViews, type UnitView } from "./course";
import { isPreview } from "./preview";
import type { Item } from "../generated/item";
import type { ContentPack } from "../content/load";
import type { UnitProgress } from "./store";
import { testItems } from "./steps";

/**
 * Módulos temáticos: una situación comunicativa (qué sabrás hacer) hecha de pasos propios y de cápsulas (las unidades).
 * Orden dentro del módulo: Entrada → Cápsulas → Salida → Fluidez → Cierre. El progreso de los pasos del módulo se guarda
 * en el mismo almacén de unidades con el id `mod:<id>` (como `hito:A1`).
 */
export type ModuleStepId = "entrada" | "salida" | "fluidez" | "cierre";
export const MODULE_STEPS: ModuleStepId[] = ["entrada", "salida", "fluidez", "cierre"];
export type ModuleNext = ModuleStepId | "capsulas";
export const MODULE_STEP_LABEL: Record<ModuleNext, string> = { entrada: "Entrada", capsulas: "Cápsulas", salida: "Salida", fluidez: "Fluidez", cierre: "Cierre" };
export const MODULE_STEP_PURPOSE: Record<ModuleNext, string> = {
  entrada: "Un diálogo o texto real de la situación: léelo, escúchalo y entiende la idea antes de estudiar los detalles.",
  capsulas: "Las unidades del módulo, una por una: cada cápsula trabaja un punto y trae su práctica y su prueba.",
  salida: "Usa lo aprendido: juego de roles, tarea oral y un mensaje escrito tuyo. Aquí se pasa de reconocer a producir.",
  fluidez: "Relee y reescucha lo que ya conoces, cada vez más rápido y con menos apoyo.",
  cierre: "Marca lo que ya sabes hacer y haz la prueba mezclada del módulo (80 % o más para completarlo).",
};
export const MODULE_PASS_RATIO = 0.8;
export const moduleProgressId = (m: CourseModule | string) => `mod:${typeof m === "string" ? m : m.id}`;

export type ModuleState = "completed" | "current" | "locked";
export type ModuleView = {
  module: CourseModule;
  index: number;
  state: ModuleState;
  units: UnitView[];
  progress: UnitProgress;
  /** Siguiente paso del módulo (null si está completado o bloqueado). */
  next: ModuleNext | null;
  /** Estado de cada paso, en orden. */
  steps: { id: ModuleNext; done: boolean; open: boolean }[];
  /** Todo el módulo se saltó con la prueba de ubicación. */
  byPlacement: boolean;
  preview?: boolean;
};

const hasProgress = (p: UnitProgress) => p.completed || Object.keys(p.done).length > 0;

/**
 * Estado de los módulos y de sus unidades. Las unidades de un módulo bloqueado, o de uno cuya Entrada aún no se hizo (si no empezaste ninguna
 * unidad suya), quedan bloqueadas; así el resto de la app (Hoy, pasos, ubicación) sigue usando solo vistas de unidad.
 */
export function moduleViews(course: Course, all: UnitProgress[], unlockAll: boolean = isPreview()): { modules: ModuleView[]; units: UnitView[] } {
  const base = unitViews(course, all, unlockAll);
  const modules = course.modules ?? [];
  if (!modules.length) return { modules: [], units: base };
  const byUnit = new Map(base.map((v) => [v.unit.id, v]));
  const byId = new Map(all.map((p) => [p.unitId, p]));
  const out: ModuleView[] = [];
  const replaced = new Map<string, UnitView>();
  let previousDone = true;
  modules.forEach((module, index) => {
    const units = module.units.map((id) => byUnit.get(id)).filter((v): v is UnitView => !!v);
    const progress = byId.get(moduleProgressId(module)) ?? emptyProgress(moduleProgressId(module));
    const byPlacement = units.length > 0 && units.every((v) => v.progress.mastery === "ubicacion");
    const capsulasDone = units.every((v) => v.progress.completed);
    const started = units.some((v) => hasProgress(v.progress));
    const entradaGates = !started && !progress.done.entrada;       // sin progreso previo, la Entrada abre las cápsulas
    const completed = byPlacement || progress.completed;
    const unlocked = unlockAll || previousDone;
    const done = (id: ModuleNext) => (id === "capsulas" ? capsulasDone : !!progress.done[id as ModuleStepId]) || completed;
    const order: ModuleNext[] = ["entrada", "capsulas", "salida", "fluidez", "cierre"];
    const required = (id: ModuleNext) => id !== "entrada" || entradaGates || !!progress.done.entrada;   // si ya empezaste unidades, la Entrada es recomendada pero no bloquea
    const steps = order.map((id, i) => ({ id, done: done(id), open: unlockAll || (unlocked && (completed || order.slice(0, i).filter(required).every(done))) }));
    const state: ModuleState = completed ? "completed" : unlocked ? "current" : "locked";
    const next: ModuleNext | null = completed || !unlocked ? null : (steps.find((st) => !st.done && required(st.id))?.id ?? null);
    out.push({ module, index, state, units, progress, next, steps, byPlacement, preview: unlockAll });
    // Gating de unidades: bloqueadas si el módulo está bloqueado o si falta la Entrada que las abre.
    for (const v of units) {
      if (v.progress.completed) continue;
      if ((!unlocked && !unlockAll) || (entradaGates && !unlockAll)) replaced.set(v.unit.id, { ...v, state: "locked", next: null });
    }
    previousDone = completed;
  });
  // Tras bloquear unidades hay que mantener la regla «una sola unidad actual por cadena»: si la actual quedó bloqueada, ninguna otra del núcleo se abre.
  const units = base.map((v) => replaced.get(v.unit.id) ?? v);
  const firstLockedCurrent = base.findIndex((v) => replaced.has(v.unit.id) && v.state === "current" && !v.unit.level.endsWith("+"));
  const gated = firstLockedCurrent < 0 ? units : units.map((v, i) => (i > firstLockedCurrent && v.state === "current" && !v.unit.level.endsWith("+") && !unlockAll ? { ...v, state: "locked" as const, next: null } : v));
  return { modules: out, units: gated };
}

/** El módulo actual: el primero con estado «current». */
export const currentModule = (views: ModuleView[]): ModuleView | undefined => views.find((m) => m.state === "current");

/** Resultado del cierre: ≥80 % completa el módulo; si no, hay que repetir la Salida y la Fluidez antes de reintentar. */
export function applyModuleTest(p: UnitProgress, correct: number, total: number, now: Date): { progress: UnitProgress; passed: boolean } {
  const ratio = total ? correct / total : 0;
  const best = Math.max(p.testBest ?? 0, ratio);
  const at = now.toISOString();
  if (ratio >= MODULE_PASS_RATIO) return { passed: true, progress: { ...p, testBest: best, done: { ...p.done, cierre: at }, completed: true, completedAt: at, mastery: "prueba" } };
  return { passed: false, progress: { ...p, testBest: best } };
}

export const markModuleStep = (p: UnitProgress, step: ModuleStepId, now: Date): UnitProgress => ({ ...p, done: { ...p.done, [step]: p.done[step] ?? now.toISOString() } });

/** Resumen para la ruta: módulos completados y total. */
export const moduleSummary = (views: ModuleView[]) => ({ done: views.filter((m) => m.state === "completed").length, total: views.length });

/** Duración orientativa de cada paso del módulo (el resto se mide con tiempo real). */
export const MODULE_STEP_SECONDS: Record<ModuleStepId, number> = { entrada: 8 * 60, salida: 18 * 60, fluidez: 6 * 60, cierre: 10 * 60 };

/** Partes de la Salida: al menos una práctica hablada (juego de roles o tarea oral, si el módulo la tiene) y un mensaje escrito tuyo. */
export type SalidaPart = "habla" | "escritura";
export const salidaKey = (part: SalidaPart | string) => `salida:${part}`;
export function salidaMissing(m: CourseModule, p: UnitProgress): SalidaPart[] {
  const speaks = m.roleplays.length + m.tasks.length > 0;
  const out: SalidaPart[] = [];
  if (speaks && !p.done[salidaKey("habla")]) out.push("habla");
  if (!p.done[salidaKey("escritura")]) out.push("escritura");
  return out;
}

export const MODULE_TEST_MAX = 12;
export const MODULE_TEST_PER_UNIT = 2;
/** Prueba de cierre: frases reservadas de la prueba de cada cápsula, de a dos por unidad y mezcladas entre unidades; se escribe desde el español. */
export function moduleTestItems(view: ModuleView, pack: ContentPack): Item[] {
  const pools = view.units.map((v) => testItems(v.unit, pack).slice(0, MODULE_TEST_PER_UNIT));
  const out: Item[] = [];
  for (let round = 0; round < MODULE_TEST_PER_UNIT && out.length < MODULE_TEST_MAX; round++) {
    for (const pool of pools) if (pool[round] && out.length < MODULE_TEST_MAX) out.push(pool[round]);
  }
  return out;
}
