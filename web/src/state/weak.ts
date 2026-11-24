import type { ContentPack, Course } from "../content/load";
import type { Item } from "../generated/item";
import type { DayProgress } from "./store";
import { lastDates } from "./strands";

/** Intentos mínimos de un tema para opinar sobre él, aciertos por debajo de los cuales es «débil» y días que se miran. Valores del proyecto. */
export const WEAK_MIN_ATTEMPTS = 5;
export const WEAK_ACCURACY = 0.8;
export const WEAK_WINDOW_DAYS = 21;

export type WeakSpot = { code: string; unitId: string; title: string; ok: number; n: number; accuracy: number };

/**
 * Lo que más te cuesta: los temas (códigos de error) con peor precisión en el primer intento durante las últimas 3 semanas (contando hoy).
 * Solo se opina de un tema con al menos 5 intentos; un tema sin unidad en el curso se omite. `attempts` es el total de intentos de la ventana
 * y `evaluated` cuántos temas (con unidad) llegaron al mínimo de intentos: juntos distinguen «aún no hay datos» de «no hay temas débiles».
 */
export function weakSpots(days: DayProgress[], course: Course, today: string, max = 3): { spots: WeakSpot[]; attempts: number; evaluated: number } {
  const keep = new Set(lastDates(today, WEAK_WINDOW_DAYS));
  const totals = new Map<string, { ok: number; n: number }>();
  let attempts = 0;
  for (const d of days) {
    if (!keep.has(d.date)) continue;
    for (const [code, a] of Object.entries(d.attempts ?? {})) {
      if (!a || !Number.isFinite(a.ok) || !Number.isFinite(a.n)) continue;   // datos dañados (copia editada): se ignoran
      const t = totals.get(code) ?? { ok: 0, n: 0 };
      totals.set(code, { ok: t.ok + a.ok, n: t.n + a.n });
      attempts += a.n;
    }
  }
  const unitOf = new Map(course.units.map((u) => [u.codes[0], u]));
  const spots: WeakSpot[] = [];
  let evaluated = 0;
  for (const [code, t] of totals) {
    const unit = unitOf.get(code);
    const accuracy = t.n ? t.ok / t.n : 1;
    if (unit && t.n >= WEAK_MIN_ATTEMPTS) evaluated++;
    if (unit && t.n >= WEAK_MIN_ATTEMPTS && accuracy < WEAK_ACCURACY) spots.push({ code, unitId: unit.id, title: unit.title, ok: t.ok, n: t.n, accuracy });
  }
  spots.sort((a, b) => a.accuracy - b.accuracy || b.n - a.n);
  return { spots: spots.slice(0, max), attempts, evaluated };
}

const TYPES = new Set(["choice_l1_distractor", "cloze", "reorder"]);
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h; };

/**
 * Una tanda de ejercicios de los puntos débiles: reparte por turnos entre ellos (el más débil primero), sin repetir y hasta `max`.
 * Cada tema empieza en una posición que depende de la fecha, para que no sea siempre la misma tanda.
 */
export function weakItems(spots: WeakSpot[], pack: Pick<ContentPack, "itemsByCode">, today: string, max = 10): Item[] {
  const pools = spots.map((s) => {
    const all = (pack.itemsByCode[s.code] ?? []).filter((i) => TYPES.has(i.type ?? ""));
    const start = all.length ? hash(`${today}:${s.code}`) % all.length : 0;
    return [...all.slice(start), ...all.slice(0, start)];
  });
  const out: Item[] = [];
  const seen = new Set<string>();
  for (let round = 0; out.length < max && pools.some((p) => round < p.length); round++) {
    for (const p of pools) {
      const item = p[round];
      if (item && !seen.has(item.id) && out.length < max) { seen.add(item.id); out.push(item); }
    }
  }
  return out;
}
