import type { Course, Unit } from "../content/load";
import type { Card } from "../generated/card";
import { applyTest, emptyProgress, markStep, masterByPlacement } from "./course";
import { newCard, review } from "./srs";
import { localDate, type Store, type StepId, type UnitProgress } from "./store";
import { normalizeDay } from "./session";

async function bumpDay(store: Store, key: string, now: Date): Promise<void> {
  const day = normalizeDay(await store.getDay(localDate(now)), now);
  const steps = day.stepsDone ?? [];
  if (!steps.includes(key)) await store.putDay({ ...day, stepsDone: [...steps, key] });
}

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
