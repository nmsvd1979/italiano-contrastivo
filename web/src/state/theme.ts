/** Apariencia: «claro» (el diseño de la app, por defecto), «oscuro» o «auto» (sigue el modo del teléfono). Se guarda solo en este dispositivo. */
export type Theme = "claro" | "oscuro" | "auto";
const KEY = "italiano-contrastivo.theme";

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "oscuro" || v === "auto" || v === "claro" ? v : "claro";
  } catch {
    return "claro";
  }
}
export function saveTheme(theme: Theme): void {
  try { localStorage.setItem(KEY, theme); } catch { /* sin almacenamiento: se aplica ahora pero no se recordará */ }
}
/** «auto» quita `data-theme` (la hoja de estilos sigue entonces el modo del teléfono); las otras lo fuerzan. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme === "oscuro" ? "dark" : "light");
}
