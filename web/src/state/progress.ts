import type { Course, Unit } from "../content/load";
import type { Card } from "../generated/card";
import { applyTest, emptyProgress, markStep, masterByPlacement } from "./course";
import { applyModuleTest, hablaKey, hablaMissing, markModuleStep, moduleProgressId, salidaKey, salidaMissing, textoKey, textosMissing, type ModuleStepId, type SalidaPart } from "./modules";
import { newCard, review } from "./srs";
import { localDate, type Store, type StepId, type UnitProgress } from "./store";
import { normalizeDay } from "./session";
import { REFUERZO_KEY } from "./dayplan";

async function bumpDay(store: Store, key: string, now: Date): Promise<void> {
  const day = normalizeDay(await store.getDay(localDate(now)), now);
  const steps = day.stepsDone ?? [];
  if (!steps.includes(key)) await store.putDay({ ...day, stepsDone: [...steps, key] });
}

/** Anota que hoy se hizo la tanda de «Lo que más te cuesta» (el Refuerzo del plan de hoy). */
export const finishRefuerzo = (store: Store, now: Date): Promise<void> => bumpDay(store, REFUERZO_KEY, now);

const load = async (store: Store, unitId: string) => (await store.getUnit(unitId)) ?? emptyProgress(unitId);

/** Marca un paso como hecho (los pasos completados no se «des-hacen» al repetirlos). */
export async function finishStep(store: Store, unitId: string, step: StepId, now: Date): Promise<UnitProgress> {
  const p = markStep(await load(store, unitId), step, now);
  await store.putUnit(p);
  await bumpDay(store, `${unitId}:${step}`, now);
  return p;
}

/** Registra la prueba de la unidad; si aprueba, la unidad queda completada. */
export async function finishTest(store: Store, unitId: string, correct: number, total: number, now: Date): Promise<{ progress: UnitProgress; passed: boolean }> {
  const r = applyTest(await load(store, unitId), correct, total, now);
  await store.putUnit(r.progress);
  await bumpDay(store, `${unitId}:prueba`, now);
  return r;
}

/** Ubicación: las unidades dominadas se completan y su código entra al repaso espaciado (primer repaso «Bien»). */
export async function placeUnits(store: Store, mastered: Unit[], now: Date): Promise<void> {
  const have = new Set((await store.allCards()).map((c: Card) => c.id));
  for (const u of mastered) {
    await store.putUnit(masterByPlacement(await load(store, u.id), now));
    const id = `error_code:${u.codes[0]}`;
    if (!have.has(id)) {
      const { card, log } = review(newCard({ kind: "error_code", ref: u.codes[0] }, "not_applicable", now), 3, now, { origin: "review" });
      await store.putCard(card);
      await store.addReviewLog(log);
    }
  }
}

export const unitOf = (course: Course, id: string): Unit | undefined => course.units.find((u) => u.id === id);


/** Marca un paso del módulo (Entrada, Fluidez…). Los ya hechos no se deshacen. */
export async function finishModuleStep(store: Store, moduleId: string, step: ModuleStepId, now: Date): Promise<UnitProgress> {
  const p = markModuleStep(await load(store, moduleProgressId(moduleId)), step, now);
  await store.putUnit(p);
  await bumpDay(store, `${moduleProgressId(moduleId)}:${step}`, now);
  return p;
}

/** Marca un texto real del módulo como leído; cuando están todos, el paso «Textos reales» queda hecho. */
export async function finishModuleText(store: Store, module: import("../content/load").CourseModule, textId: string, now: Date): Promise<UnitProgress> {
  let p = await load(store, moduleProgressId(module.id));
  p = { ...p, done: { ...p.done, [textoKey(textId)]: p.done[textoKey(textId)] ?? now.toISOString() } };
  if (textosMissing(module, p).length === 0) p = markModuleStep(p, "textos", now);
  await store.putUnit(p);
  await bumpDay(store, `${moduleProgressId(module.id)}:${textoKey(textId)}`, now);
  return p;
}

/**
 * Marca una parte de la Salida. La parte hablada pide TODOS los juegos de rol y tareas orales del módulo: con `itemId` se marca ese y la parte
 * queda hecha cuando están todos; sin `itemId` se da por hecha entera. Con todas las partes, la Salida queda hecha.
 */
export async function finishSalidaPart(store: Store, module: import("../content/load").CourseModule, part: SalidaPart, now: Date, itemId?: string): Promise<UnitProgress> {
  let p = await load(store, moduleProgressId(module.id));
  const at = now.toISOString();
  if (part === "habla" && itemId) {
    p = { ...p, done: { ...p.done, [hablaKey(itemId)]: p.done[hablaKey(itemId)] ?? at } };
    if (hablaMissing(module, p).length === 0) p = { ...p, done: { ...p.done, [salidaKey("habla")]: p.done[salidaKey("habla")] ?? at } };
  } else {
    p = { ...p, done: { ...p.done, [salidaKey(part)]: p.done[salidaKey(part)] ?? at } };
  }
  if (salidaMissing(module, p).length === 0) p = markModuleStep(p, "salida", now);
  await store.putUnit(p);
  await bumpDay(store, `${moduleProgressId(module.id)}:${salidaKey(part)}${itemId ? `:${itemId}` : ""}`, now);
  return p;
}

/** Registra la prueba de cierre del módulo; con 80 % o más el módulo queda completado y se abre el siguiente. */
export async function finishModuleTest(store: Store, moduleId: string, correct: number, total: number, now: Date): Promise<{ progress: UnitProgress; passed: boolean }> {
  const r = applyModuleTest(await load(store, moduleProgressId(moduleId)), correct, total, now);
  await store.putUnit(r.progress);
  await bumpDay(store, `${moduleProgressId(moduleId)}:cierre`, now);
  return r;
}
