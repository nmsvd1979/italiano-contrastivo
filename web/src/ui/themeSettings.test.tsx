import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { memoryStore } from "../state/store";
import { loadTheme } from "../state/theme";
import { SettingsScreen } from "./SettingsScreen";

afterEach(cleanup);
beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute("data-theme"); });

describe("Ajustes: apariencia", () => {
  it("ofrece Claro, Oscuro y Como el teléfono, con Claro marcado por defecto", () => {
    render(<SettingsScreen store={memoryStore()} memoryOnly={false} />);
    expect(screen.getByRole("heading", { name: "Apariencia" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Claro" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Oscuro" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Como el teléfono" }).getAttribute("aria-pressed")).toBe("false");
  });
  it("elegir Oscuro lo aplica y lo guarda; Como el teléfono quita el forzado", () => {
    render(<SettingsScreen store={memoryStore()} memoryOnly={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Oscuro" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(loadTheme()).toBe("oscuro");
    expect(screen.getByRole("button", { name: "Oscuro" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Como el teléfono" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(loadTheme()).toBe("auto");
  });
});
