import type { Card } from "../generated/card";
import type { ReviewLog } from "../generated/review-log";
import { schemaValidator } from "../content/schemas";

export type DayProgress = { date: string; reviewsDone: number; capsulesDone: string[]; stepsDone?: string[]; /** Tiempo activo del día por hebra (segundos). */ seconds?: Partial<Record<"entrada" | "foco" | "salida" | "fluidez", number>>; /** Primeros intentos del día por tema (código de error): aciertos y total. */ attempts?: Record<string, { ok: number; n: number }> };
export type StepId = "descubre" | "palabras" | "lectura" | "capsula" | "practica" | "escucha" | "practica2" | "prueba";
/** Avance de una unidad: pasos hechos (fecha ISO), mejor nota de la prueba y si quedó completada. */
export type UnitProgress = {
  unitId: string;
  done: Partial<Record<string, string>>;   // pasos de la unidad, o de un módulo (id «mod:…»: entrada, salida, fluidez, cierre y las partes «salida:…»)
  testBest: number | null;
  completed: boolean;
  completedAt?: string;
  mastery?: "prueba" | "ubicacion";
};
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
  allDays(): Promise<DayProgress[]>;
  /** Borra tarjetas, registros, días y progreso de cápsulas (solo para restaurar una copia de seguridad). */
  clearAll(): Promise<void>;
  putDay(d: DayProgress): Promise<void>;
  getUnit(id: string): Promise<UnitProgress | undefined>;
  putUnit(p: UnitProgress): Promise<void>;
  allUnits(): Promise<UnitProgress[]>;
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

const STORES = { cards: "id", logs: undefined, days: "date", capsules: "capsuleId", units: "unitId" } as const;

function open(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined" || !indexedDB) return reject(new StoreUnavailableError());
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(name, 2);
    } catch {
      return reject(new StoreUnavailableError());
    }
    req.onupgradeneeded = () => {
      for (const [store, keyPath] of Object.entries(STORES)) { // v1→v2 solo agrega lo que falta: no toca los datos existentes
        if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store, keyPath ? { keyPath } : { autoIncrement: true });
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
    allDays: () => wrap<DayProgress[]>(os("days").getAll()),
    async putDay(d) {
      await wrap(os("days", "readwrite").put(d));
    },
    async clearAll() {
      for (const name of Object.keys(STORES) as (keyof typeof STORES)[]) await wrap(os(name, "readwrite").clear());
    },
    getUnit: (id) => wrap<UnitProgress | undefined>(os("units").get(id)),
    async putUnit(p) {
      await wrap(os("units", "readwrite").put(p));
    },
    allUnits: () => wrap<UnitProgress[]>(os("units").getAll()),
    getCapsuleProgress: (id) => wrap<CapsuleProgress | undefined>(os("capsules").get(id)),
    async putCapsuleProgress(p) {
      await wrap(os("capsules", "readwrite").put(p));
    },
    async clearCapsuleProgress(id) {
      await wrap(os("capsules", "readwrite").delete(id));
    },
  };
}

/** Store en memoria: se usa cuando IndexedDB no está disponible (el progreso no sobrevive al cerrar la app). */
export function memoryStore(): Store {
  const cards = new Map<string, Card>();
  const logs: ReviewLog[] = [];
  const days = new Map<string, DayProgress>();
  const caps = new Map<string, CapsuleProgress>();
  const units = new Map<string, UnitProgress>();
  return {
    getUnit: async (id) => units.get(id),
    putUnit: async (p) => void units.set(p.unitId, p),
    allUnits: async () => [...units.values()],
    getCard: async (id) => cards.get(id),
    putCard: async (c) => void cards.set(c.id, c),
    allCards: async () => [...cards.values()],
    addReviewLog: async (l) => void logs.push(l),
    allLogs: async () => [...logs],
    getDay: async (date) => days.get(date) ?? { date, reviewsDone: 0, capsulesDone: [] },
    allDays: async () => [...days.values()],
    putDay: async (d) => void days.set(d.date, d),
    clearAll: async () => {
      cards.clear();
      logs.length = 0;
      days.clear();
      caps.clear();
      units.clear();
    },
    getCapsuleProgress: async (id) => caps.get(id),
    putCapsuleProgress: async (p) => void caps.set(p.capsuleId, p),
    clearCapsuleProgress: async (id) => void caps.delete(id),
  };
}
