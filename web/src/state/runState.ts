/** Estado de un bloque de ejercicios a medias, para retomarlo (efecto Zeigarnik) si se cierra la app. Solo en este dispositivo. */
export type RunSnapshot = {
  sig: string; queue: number[]; pos: number; first: (boolean | null)[]; requeued: number[]; done: number[]; streak: number;
  /** Los ejercicios del bloque, guardados con él: retomarlo no depende de volver a calcularlos (el recuento cambia con los tiempos medidos). */
  items?: unknown[];
  /** Cuándo se guardó (ms); un guardado de más de 7 días se ignora. */
  savedAt?: number;
};
export const RUN_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

const KEY = (k: string) => `italiano-contrastivo.run.${k}`;
export const signature = (ids: string[]) => `${ids.length}:${ids[0] ?? ""}:${ids[ids.length - 1] ?? ""}`;

export function loadRun(key: string, ids: string[]): RunSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY(key));
    if (!raw) return null;
    const s = JSON.parse(raw) as RunSnapshot;
    const ok = s.sig === signature(ids) && Array.isArray(s.queue) && s.queue.every((i) => Number.isInteger(i) && i >= 0 && i < ids.length)
      && Number.isInteger(s.pos) && s.pos >= 0 && s.pos < s.queue.length && Array.isArray(s.first) && s.first.length === ids.length;
    return ok ? s : null;
  } catch {
    return null;
  }
}
/** Guardado con sus propios ejercicios: devuelve null si falta, está dañado, es incoherente o tiene más de 7 días. */
export function loadRunFrozen(key: string, now = Date.now()): RunSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY(key));
    if (!raw) return null;
    const s = JSON.parse(raw) as RunSnapshot;
    const n = Array.isArray(s.items) ? s.items.length : 0;
    const ok = n > 0 && typeof s.savedAt === "number" && now - s.savedAt < RUN_MAX_AGE_MS && Array.isArray(s.queue) && s.queue.every((i) => Number.isInteger(i) && i >= 0 && i < n)
      && Number.isInteger(s.pos) && s.pos >= 0 && s.pos < s.queue.length && Array.isArray(s.first) && s.first.length === n;
    return ok ? s : null;
  } catch {
    return null;
  }
}
export function saveRun(key: string, s: RunSnapshot): void {
  try { localStorage.setItem(KEY(key), JSON.stringify(s)); } catch { /* sin almacenamiento: no se podrá retomar */ }
}
export function clearRun(key: string): void {
  try { localStorage.removeItem(KEY(key)); } catch { /* nada */ }
}
