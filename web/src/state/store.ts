import type { Card } from "../generated/card";
import type { ReviewLog } from "../generated/review-log";
import { schemaValidator } from "../content/schemas";

export type DayProgress = { date: string; reviewsDone: number; capsulesDone: string[] };
export type CapsuleProgress = {
  capsuleId: string;
  phase: "trigger" | "explanation" | "retrieval" | "closing";
  answers: Record<string, boolean>;
};

export interface Store {
  getCard(id: string): Promise<Card | undefined>;
  putCard(c: Card): Promise<void>;
  allCards(): Promise<Card[]>;
  addReviewLog(l: ReviewLog): Promise<void>;
  allLogs(): Promise<ReviewLog[]>;
  getDay(date: string): Promise<DayProgress>;
  putDay(d: DayProgress): Promise<void>;
  getCapsuleProgress(id: string): Promise<CapsuleProgress | undefined>;
  putCapsuleProgress(p: CapsuleProgress): Promise<void>;
  clearCapsuleProgress(id: string): Promise<void>;
}

export class StoreUnavailableError extends Error {
  constructor(message = "No se puede guardar el progreso en este navegador.") {
    super(message);
    this.name = "StoreUnavailableError";
  }
}

/** Fecha local `YYYY-MM-DD` (la sesión del día cambia a medianoche local, no a medianoche UTC). */
export function localDate(now: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const STORES = { cards: "id", logs: undefined, days: "date", capsules: "capsuleId" } as const;

function open(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined" || !indexedDB) return reject(new StoreUnavailableError());
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(name, 1);
    } catch {
      return reject(new StoreUnavailableError());
    }
    req.onupgradeneeded = () => {
      for (const [store, keyPath] of Object.entries(STORES)) {
        req.result.createObjectStore(store, keyPath ? { keyPath } : { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new StoreUnavailableError());
    req.onblocked = () => reject(new StoreUnavailableError());
  });
}

const wrap = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export async function openStore(name = "italiano-contrastivo"): Promise<Store> {
  const db = await open(name);
  const os = (store: keyof typeof STORES, mode: IDBTransactionMode = "readonly") => db.transaction(store, mode).objectStore(store);
  const checked = (schema: string, label: string, value: unknown) => {
    const v = schemaValidator(schema);
    if (!v(value)) throw new Error(`${label} no cumple el esquema.`);
  };
  return {
    getCard: (id) => wrap<Card | undefined>(os("cards").get(id)),
    async putCard(c) {
      checked("card", `La tarjeta ${c.id}`, c);
      await wrap(os("cards", "readwrite").put(c));
    },
    allCards: () => wrap<Card[]>(os("cards").getAll()),
    async addReviewLog(l) {
      checked("review-log", "El registro de repaso", l);
      await wrap(os("logs", "readwrite").add(l));
    },
    allLogs: () => wrap<ReviewLog[]>(os("logs").getAll()),
    async getDay(date) {
      return (await wrap<DayProgress | undefined>(os("days").get(date))) ?? { date, reviewsDone: 0, capsulesDone: [] };
    },
    async putDay(d) {
      await wrap(os("days", "readwrite").put(d));
    },
    getCapsuleProgress: (id) => wrap<CapsuleProgress | undefined>(os("capsules").get(id)),
    async putCapsuleProgress(p) {
      await wrap(os("capsules", "readwrite").put(p));
    },
    async clearCapsuleProgress(id) {
      await wrap(os("capsules", "readwrite").delete(id));
    },
  };
}
