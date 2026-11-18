/** Modo de prueba: todas las unidades abiertas y un progreso APARTE (otra base de datos), para revisar el contenido sin tocar el real. */
const KEY = "italiano-contrastivo.preview";
export const PREVIEW_DB = "italiano-contrastivo-preview";
export const REAL_DB = "italiano-contrastivo";

export function isPreview(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function setPreview(on: boolean): void {
  try { if (on) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
}
