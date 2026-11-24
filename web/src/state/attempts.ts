import type { Item } from "../generated/item";
import { localDate, type DayProgress, type Store } from "./store";

/** Primeros intentos de un tema en un día: aciertos y total. */
export type Attempts = Record<string, { ok: number; n: number }>;

/** Suma un primer intento (acierto o fallo) de un tema al día. Pura: no muta. */
export function recordAttempt(day: DayProgress, code: string, correct: boolean): DayProgress {
  const prev = day.attempts?.[code];
  return { ...day, attempts: { ...day.attempts, [code]: { ok: (prev?.ok ?? 0) + (correct ? 1 : 0), n: (prev?.n ?? 0) + 1 } } };
}

const chains = new WeakMap<Store, Promise<void>>();

/**
 * Lee el día de `now`, le aplica `fn` y lo guarda. Las llamadas sobre el mismo almacén se encadenan, para que el tiempo medido y los
 * intentos (que escriben el mismo día) no se pisen. Un fallo de guardado no rompe el estudio ni la cola.
 */
export function updateDay(store: Store, now: Date, fn: (d: DayProgress) => DayProgress): Promise<void> {
  const next = (chains.get(store) ?? Promise.resolve()).then(async () => {
    try { await store.putDay(fn(await store.getDay(localDate(now)))); } catch { /* sin almacenamiento: se pierde esta anotación, no el estudio */ }
  });
  chains.set(store, next);
  return next;
}

/** Anota un primer intento en un tema por su código de error. */
export function trackAttemptCode(store: Store, code: string, correct: boolean, now = new Date()): Promise<void> {
  return updateDay(store, now, (d) => recordAttempt(d, code, correct));
}

/** Anota el primer intento de un ejercicio en su tema (`target_error_codes[0]`); sin tema no hace nada. */
export function trackAttempt(store: Store, item: Item, correct: boolean, now = new Date()): Promise<void> {
  const code = (item as { target_error_codes?: string[] }).target_error_codes?.[0];
  return code ? trackAttemptCode(store, code, correct, now) : Promise.resolve();
}
