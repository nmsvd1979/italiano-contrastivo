import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DayRing } from "./DayRing";
import { EmptyState } from "./EmptyState";
import { MOTIF_COUNT, toneOf } from "./ModuleMotif";
import { PathList } from "./PathList";
import { Stamp } from "./Stamp";

afterEach(cleanup);

describe("tono y dibujo por módulo", () => {
  it("hay un dibujo por cada uno de los 12 módulos de A1", () => {
    expect(MOTIF_COUNT).toBe(12);
  });
  it("los seis tonos rotan: el módulo 7 repite el tono del 1", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 11].map(toneOf)).toEqual(["1", "2", "3", "4", "5", "6", "1", "6"]);
  });
});

describe("sello", () => {
  it("ganado lleva el tono del módulo y se dice en texto", () => {
    render(<Stamp index={1} earned />);
    const s = screen.getByRole("img", { name: "Sello del módulo 2, ganado" });
    expect(s.getAttribute("data-tone")).toBe("2");
    expect(s.getAttribute("data-earned")).toBe("true");
  });
  it("pendiente se dice en texto y no se anima", () => {
    render(<Stamp index={2} earned={false} fresh />);
    const s = screen.getByRole("img", { name: "Sello del módulo 3, pendiente" });
    expect(s.getAttribute("data-fresh")).toBe("false");
  });
  it("solo se anima el sello ganado y marcado como nuevo", () => {
    render(<Stamp index={0} earned fresh />);
    expect(screen.getByRole("img").getAttribute("data-fresh")).toBe("true");
  });
});

describe("anillo del día", () => {
  it("dice los minutos en texto y no pasa del círculo completo", () => {
    const { container } = render(<DayRing seconds={9 * 60 + 20} goalSeconds={15 * 60} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("9 de 15 minutos de estudio hoy");
    const fg = container.querySelector(".dayring-fg")!;
    const [on, total] = fg.getAttribute("stroke-dasharray")!.split(" ").map(Number);
    expect(on / total).toBeCloseTo((9 * 60 + 20) / 900, 1);
    cleanup();
    const full = render(<DayRing seconds={40 * 60} goalSeconds={15 * 60} />).container.querySelector(".dayring-fg")!;
    const [a, b] = full.getAttribute("stroke-dasharray")!.split(" ").map(Number);
    expect(a).toBeCloseTo(b, 0);
  });
});

describe("camino del plan", () => {
  it("marca lo hecho y lo que toca ahora también con texto", () => {
    render(<PathList items={[
      { key: "a", label: "Repaso", state: "done" },
      { key: "b", label: "Práctica", subtitle: "24 ejercicios", state: "now" },
      { key: "c", label: "Escucha", state: "todo" },
    ]} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-state"))).toEqual(["done", "now", "todo"]);
    expect(screen.getByText("hecho")).toBeTruthy();
    expect(screen.getByText("toca ahora")).toBeTruthy();
    expect(screen.getByText("24 ejercicios")).toBeTruthy();
  });
});

describe("pantalla de estado", () => {
  it("dice qué pasa y ofrece una salida", () => {
    render(<EmptyState title="Sin repasos por ahora" body="Vuelve mañana." action={{ href: "#/", label: "Volver a Hoy" }} />);
    expect(screen.getByRole("heading", { name: "Sin repasos por ahora" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver a Hoy" }).getAttribute("href")).toBe("#/");
  });
});
