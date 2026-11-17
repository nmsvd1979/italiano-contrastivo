import type { Card } from "../generated/card";
import type { ReviewLog } from "../generated/review-log";
import { schemaValidator } from "../content/schemas";
import type { DayProgress, Store } from "./store";

export const BACKUP_APP = "italiano-contrastivo";
export type Backup = { app: typeof BACKUP_APP; version: 1; exportedAt: string; cards: Card[]; logs: ReviewLog[]; days: DayProgress[] };

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

export async function exportBackup(store: Store, now: Date): Promise<Backup> {
  const [cards, logs, days] = await Promise.all([store.allCards(), store.allLogs(), store.allDays()]);
  return { app: BACKUP_APP, version: 1, exportedAt: now.toISOString(), cards, logs, days };
}

const isDay = (d: unknown): d is DayProgress => {
  const x = d as DayProgress;
  return typeof x?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && Number.isInteger(x.reviewsDone) && x.reviewsDone >= 0
    && Array.isArray(x.capsulesDone) && x.capsulesDone.every((c) => typeof c === "string");
};

/** Valida el texto de una copia de seguridad entero antes de tocar nada; lanza BackupError con un mensaje claro. */
export function parseBackup(text: string): Backup {
  let data: Partial<Backup>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("El archivo no es una copia de seguridad válida.");
  }
  if (data?.app !== BACKUP_APP || data.version !== 1 || !Array.isArray(data.cards) || !Array.isArray(data.logs) || !Array.isArray(data.days)) {
    throw new BackupError("El archivo no es una copia de seguridad de esta app.");
  }
  const card = schemaValidator("card");
  const log = schemaValidator("review-log");
  const badCard = data.cards.findIndex((c) => !card(c));
  if (badCard >= 0) throw new BackupError(`La tarjeta ${badCard + 1} de la copia está dañada; no se importó nada.`);
  if (data.logs.some((l) => !log(l))) throw new BackupError("Hay registros de repaso dañados en la copia; no se importó nada.");
  if (!data.days.every(isDay)) throw new BackupError("Hay días dañados en la copia; no se importó nada.");
  return data as Backup;
}

/** Reemplaza el progreso actual por el de la copia (ya validada). */
export async function restoreBackup(store: Store, backup: Backup): Promise<void> {
  await store.clearAll();
  for (const c of backup.cards) await store.putCard(c);
  for (const l of backup.logs) await store.addReviewLog(l);
  for (const d of backup.days) await store.putDay(d);
}
