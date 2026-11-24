import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PracticeScreen } from "./PracticeScreen";
import { ProgressScreen } from "./ProgressScreen";
import { TabBar } from "./kit/TabBar";

afterEach(cleanup);

const review = (due: number) => ({ due, newAvailable: 0, doneToday: 0, cap: 30, seconds: due * 30, filler: 0 });

describe("barra de pestañas", () => {
  it("hay cinco pestañas en orden", () => {
    render(<TabBar hash="#/" />);
    const links = screen.getByRole("navigation").querySelectorAll("a");
    expect([...links].map((a) => a.textContent)).toEqual(["Hoy", "Ruta", "Practicar", "Biblioteca", "Progreso"]);
  });
  it.each(["#/practicar", "#/hablar", "#/escribir"])("Practicar está activa en %s", (hash) => {
    render(<TabBar hash={hash} />);
    expect(screen.getByText("Practicar").closest("a")?.getAttribute("aria-current")).toBe("page");
  });
  it.each(["#/progreso", "#/ajustes", "#/acerca"])("Progreso está activa en %s", (hash) => {
    render(<TabBar hash={hash} />);
    expect(screen.getByText("Progreso").closest("a")?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Practicar").closest("a")?.getAttribute("aria-current")).toBeNull();
  });
  it("cada pestaña lleva un icono SVG y ningún emoji", () => {
    render(<TabBar hash="#/" />);
    for (const a of screen.getByRole("navigation").querySelectorAll("a")) {
      expect(a.querySelector("svg")).not.toBeNull();
      expect(a.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe("Practicar", () => {
  it("con repasos pendientes muestra el conteo y enlaza al repaso", () => {
    render(<PracticeScreen review={review(6)} />);
    expect(screen.getByText(/6 tarjetas/)).toBeTruthy();
    expect(screen.getByText("Repasar").closest("a")?.getAttribute("href")).toBe("#/repaso");
  });
  it("sin repasos pendientes lo dice", () => {
    render(<PracticeScreen review={review(0)} />);
    expect(screen.getByText(/No tienes repasos pendientes ahora/)).toBeTruthy();
  });
  it("enlaza a Hablar y a Escribir", () => {
    render(<PracticeScreen review={review(0)} />);
    expect(screen.getByText(/Juegos de roles/).closest("a")?.getAttribute("href")).toBe("#/hablar");
    expect(screen.getByText(/Reconstruir un texto/).closest("a")?.getAttribute("href")).toBe("#/escribir");
  });
});

describe("Progreso", () => {
  it("enlaza a Ajustes y a Acerca de", () => {
    render(<ProgressScreen week={{}} />);
    expect(screen.getByRole("heading", { name: "Progreso" })).toBeTruthy();
    expect(screen.getByText("Ajustes").closest("a")?.getAttribute("href")).toBe("#/ajustes");
    expect(screen.getByText(/Acerca de la app/).closest("a")?.getAttribute("href")).toBe("#/acerca");
  });
});
