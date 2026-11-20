import type { Course, Unit } from "../content/load";
import { isPreview } from "./preview";
import type { StepId, UnitProgress } from "./store";

export const STEPS: StepId[] = ["descubre", "palabras", "lectura", "capsula", "practica", "escucha", "practica2", "prueba"];
/** Los pasos de una unidad: «Lectura» solo si tiene un texto asignado y «Palabras» solo si es de vocabulario (lista de palabras del tema). */
export const stepsFor = (unit?: Unit): StepId[] => (unit ? STEPS.filter((s) => (s !== "lectura" || !!unit.readings?.length) && (s !== "palabras" || !!unit.words?.length)) : STEPS);
export const STEP_LABEL: Record<StepId, string> = {
  descubre: "Descubre", palabras: "Palabras", lectura: "Lectura", capsula: "Cápsula", practica: "Práctica", escucha: "Escucha", practica2: "Práctica 2", prueba: "Prueba de la unidad",
};
export const STEP_PURPOSE: Record<StepId, string> = {
  descubre: "Bloque de lectura: ejemplos reales con el punto clave resaltado, significado y huecos solo donde el italiano difiere.",
  palabras: "Las palabras del tema, con significado y audio: míralas, escúchalas y tápalas para comprobar que las recuerdas.",
  lectura: "Un texto real de un libro abierto: léelo con audio y traducción, y responde preguntas.",
  capsula: "Gimnasio sintáctico: una explicación corta y práctica guiada de un solo punto.",
  practica: "Ejercicios variados; lo que falles vuelve una vez más.",
  escucha: "Bloque de sonidos y voz: escribe lo que oyes y repite frases en voz alta.",
  practica2: "Segunda tanda de ejercicios, con otras frases y otros tipos, para fijar lo aprendido.",
  prueba: "Frases que no viste en la práctica. Con 80 % o más, completas la unidad.",
};
export const PASS_RATIO = 0.8;

export const emptyProgress = (unitId: string): UnitProgress => ({ unitId, done: {}, testBest: null, completed: false });

/** Siguiente paso pendiente de una unidad (los pasos van en orden); null si está completada. */
export function nextStep(p: UnitProgress, unit?: Unit): StepId | null {
  if (p.completed) return null;
  return stepsFor(unit).find((s) => !p.done[s]) ?? null;
}

/** Unidad opcional (vocabulario ampliado): no cuenta para el examen de hito ni bloquea las demás. */
export const isOptional = (unit: Unit): boolean => unit.level.endsWith("+");

export type UnitState = "completed" | "current" | "locked";
export type UnitView = { unit: Unit; state: UnitState; progress: UnitProgress; next: StepId | null; index: number; preview?: boolean };

/** Estado de cada unidad: la primera sin completar es la actual; las siguientes quedan bloqueadas. */
export function unitViews(course: Course, all: UnitProgress[], unlockAll: boolean = isPreview()): UnitView[] {
  const byId = new Map(all.map((p) => [p.unitId, p]));
  const found = { core: false, optional: false };  // las unidades opcionales (nivel «A1+») van en su propia cadena y nunca bloquean el camino principal
  return course.units.map((unit, index) => {
    const progress = byId.get(unit.id) ?? emptyProgress(unit.id);
    const chain = isOptional(unit) ? "optional" : "core";
    let state: UnitState;
    if (progress.completed) state = "completed";
    else if (!found[chain] || unlockAll) { state = "current"; found[chain] = true; }
    else state = "locked";
    return { unit, state, progress, next: state === "current" ? nextStep(progress, unit) : null, index, preview: unlockAll };
  });
}

export const currentView = (views: UnitView[]): UnitView | undefined => views.find((v) => v.state === "current" && !isOptional(v.unit)) ?? views.find((v) => v.state === "current");

/** Un paso solo se puede hacer si es el siguiente de la unidad actual (o repetir uno ya hecho de una unidad desbloqueada). */
export function canDoStep(view: UnitView, step: StepId): boolean {
  if (view.preview) return true; // modo de prueba: cualquier paso de cualquier unidad
  if (view.state === "locked") return false;
  if (view.state === "completed") return true;
  const steps = stepsFor(view.unit);
  const idx = steps.indexOf(step);
  return idx >= 0 && steps.slice(0, idx).every((s) => view.progress.done[s]);
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
  const { practica: _a, practica2: _b, prueba: _t, ...rest } = p.done;  // hay que rehacer las dos tandas de práctica
  return { passed: false, progress: { ...p, testBest: best, done: rest } };
}

export function masterByPlacement(p: UnitProgress, now: Date): UnitProgress {
  const at = now.toISOString();
  return { ...p, done: Object.fromEntries(STEPS.map((s) => [s, at])), testBest: 1, completed: true, completedAt: at, mastery: "ubicacion" };
}

export function summary(views: UnitView[]): { done: number; total: number; current?: UnitView } {
  const core = views.filter((v) => !isOptional(v.unit));
  return { done: core.filter((v) => v.state === "completed").length, total: core.length, current: currentView(views) };
}
