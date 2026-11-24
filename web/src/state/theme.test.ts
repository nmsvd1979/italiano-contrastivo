import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, loadTheme, saveTheme } from "./theme";

beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute("data-theme"); });
afterEach(() => vi.restoreAllMocks());

describe("apariencia", () => {
  it("por defecto es claro (como el diseño), no el modo del teléfono", () => {
    expect(loadTheme()).toBe("claro");
  });
  it("guarda y recupera la elección", () => {
    for (const t of ["claro", "oscuro", "auto"] as const) { saveTheme(t); expect(loadTheme()).toBe(t); }
  });
  it("un valor guardado inválido, o sin almacenamiento, vuelve a claro sin fallar", () => {
    localStorage.setItem("italiano-contrastivo.theme", "rosa");
    expect(loadTheme()).toBe("claro");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("bloqueado"); });
    expect(loadTheme()).toBe("claro");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("bloqueado"); });
    expect(() => saveTheme("oscuro")).not.toThrow();
  });
  it("applyTheme pone data-theme: claro=light, oscuro=dark y auto lo quita (sigue al teléfono)", () => {
    const root = document.documentElement;
    applyTheme("oscuro"); expect(root.getAttribute("data-theme")).toBe("dark");
    applyTheme("claro"); expect(root.getAttribute("data-theme")).toBe("light");
    applyTheme("auto"); expect(root.hasAttribute("data-theme")).toBe(false);
  });
});
