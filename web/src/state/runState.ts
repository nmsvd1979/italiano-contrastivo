/** Estado de un bloque de ejercicios a medias, para retomarlo (efecto Zeigarnik) si se cierra la app. Solo en este dispositivo. */
export type RunSnapshot = { sig: string; queue: number[]; pos: number; first: (boolean | null)[]; requeued: number[]; done: number[]; streak: number };

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
export function saveRun(key: string, s: RunSnapshot): void {
  try { localStorage.setItem(KEY(key), JSON.stringify(s)); } catch { /* sin almacenamiento: no se podrá retomar */ }
}
export function clearRun(key: string): void {
  try { localStorage.removeItem(KEY(key)); } catch { /* nada */ }
}
