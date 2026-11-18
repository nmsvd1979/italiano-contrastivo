import type { Course, Unit } from "../content/load";
import type { StepId, UnitProgress } from "./store";

export const STEPS: StepId[] = ["descubre", "capsula", "practica", "escucha", "prueba"];
export const STEP_LABEL: Record<StepId, string> = {
  descubre: "Descubre", capsula: "Cápsula", practica: "Práctica", escucha: "Escucha", prueba: "Prueba de la unidad",
};
export const STEP_PURPOSE: Record<StepId, string> = {
  descubre: "Bloque de lectura: ejemplos reales con el punto clave resaltado, significado y huecos solo donde el italiano difiere.",
  capsula: "Gimnasio sintáctico: una explicación corta y práctica guiada de un solo punto.",
  practica: "Ejercicios variados; lo que falles vuelve una vez más.",
  escucha: "Bloque de sonidos y voz: escribe lo que oyes y repite frases en voz alta.",
  prueba: "Frases que no viste en la práctica. Con 80 % o más, completas la unidad.",
};
export const PASS_RATIO = 0.8;

export const emptyProgress = (unitId: string): UnitProgress => ({ unitId, done: {}, testBest: null, completed: false });

/** Siguiente paso pendiente de una unidad (los pasos van en orden); null si está completada. */
export function nextStep(p: UnitProgress): StepId | null {
  if (p.completed) return null;
  return STEPS.find((s) => !p.done[s]) ?? null;
}

export type UnitState = "completed" | "current" | "locked";
export type UnitView = { unit: Unit; state: UnitState; progress: UnitProgress; next: StepId | null; index: number };

/** Estado de cada unidad: la primera sin completar es la actual; las siguientes quedan bloqueadas. */
export function unitViews(course: Course, all: UnitProgress[]): UnitView[] {
  const byId = new Map(all.map((p) => [p.unitId, p]));
  let currentFound = false;
  return course.units.map((unit, index) => {
    const progress = byId.get(unit.id) ?? emptyProgress(unit.id);
    let state: UnitState;
    if (progress.completed) state = "completed";
    else if (!currentFound) { state = "current"; currentFound = true; }
    else state = "locked";
    return { unit, state, progress, next: state === "current" ? nextStep(progress) : null, index };
  });
}

export const currentView = (views: UnitView[]): UnitView | undefined => views.find((v) => v.state === "current");

/** Un paso solo se puede hacer si es el siguiente de la unidad actual (o repetir uno ya hecho de una unidad desbloqueada). */
export function canDoStep(view: UnitView, step: StepId): boolean {
  if (view.state === "locked") return false;
  if (view.state === "completed") return true;
  const idx = STEPS.indexOf(step);
  return STEPS.slice(0, idx).every((s) => view.progress.done[s]);
}

export function markStep(p: UnitProgress, step: StepId, now: Date): UnitProgress {
  return { ...p, done: { ...p.done, [step]: p.done[step] ?? now.toISOString() } };
}

/** Resultado de la prueba: ≥80 % completa la unidad; si no, hay que rehacer la práctica antes de reintentar. */
export function applyTest(p: UnitProgress, correct: number, total: number, now: Date): { progress: UnitProgress; passed: boolean } {
  const ratio = total ? correct / total : 0;
  const best = Math.max(p.testBest ?? 0, ratio);
  if (ratio >= PASS_RATIO) {
    return { passed: true, progress: { ...p, testBest: best, done: { ...p.done, prueba: now.toISOString() }, completed: true, completedAt: now.toISOString(), mastery: "prueba" } };
  }
  const { practica: _drop, prueba: _t, ...rest } = p.done;
  return { passed: false, progress: { ...p, testBest: best, done: rest } };
}

export function masterByPlacement(p: UnitProgress, now: Date): UnitProgress {
  const at = now.toISOString();
  return { ...p, done: Object.fromEntries(STEPS.map((s) => [s, at])), testBest: 1, completed: true, completedAt: at, mastery: "ubicacion" };
}

export function summary(views: UnitView[]): { done: number; total: number; current?: UnitView } {
  return { done: views.filter((v) => v.state === "completed").length, total: views.length, current: currentView(views) };
}
