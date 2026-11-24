import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SessionBlock } from "../state/dayplan";
import type { TodayPlan } from "../state/session";
import type { DayProgress } from "../state/store";
import { secondaryActions, TodayScreen } from "./TodayScreen";
import { WeekBar } from "./kit/WeekBar";

afterEach(cleanup);

const plan = (over: Partial<TodayPlan> = {}, due = 0): TodayPlan => ({
  review: { due, newAvailable: 0, doneToday: 0, cap: 30, seconds: due * 30, filler: 0 },
  unit: null, module: null, route: { done: 0, total: 73 }, stepsToday: 0, ...over,
});
const day = (over: Partial<DayProgress> = {}): DayProgress => ({ date: "2026-11-24", reviewsDone: 0, capsulesDone: [], ...over });
const block = (over: Partial<SessionBlock>): SessionBlock => ({ key: "repaso", strand: "foco", label: "Repaso", title: "Repaso", subtitle: "", seconds: 180, href: "#/repaso", done: false, ...over });

describe("Hoy: la sesión", () => {
  const blocks = [
    block({ subtitle: "Tienes 6 para repasar" }),
    block({ key: "lectura", step: "descubre", label: "Descubre", title: "Lectura y reconstrucción", seconds: 420, href: "#/unidad/u01/descubre" }),
  ];
  it("cada fila de la sesión lleva su etiqueta de hebra", () => {
    render(<TodayScreen plan={plan({}, 6)} day={day()} blocks={blocks} />);
    expect(screen.getAllByText("Estudiar")).toHaveLength(2);
    expect(screen.getByText("Repaso")).toBeTruthy();
    expect(screen.getByText("Descubre")).toBeTruthy();
  });
  it("«Empezar» si hoy no se ha hecho nada y «Continuar» si ya se hizo algo", () => {
    const { unmount } = render(<TodayScreen plan={plan({}, 6)} day={day()} blocks={blocks} />);
    expect(screen.getByText(/^Empezar · Repaso/)).toBeTruthy();
    unmount();
    render(<TodayScreen plan={plan({}, 6)} day={day({ reviewsDone: 2 })} blocks={blocks} />);
    expect(screen.getByText(/^Continuar · Repaso/)).toBeTruthy();
  });
  it("todo hecho: ofrece «Ver la ruta» y no falla", () => {
    render(<TodayScreen plan={plan()} day={day({ reviewsDone: 3 })} blocks={[block({ done: true })]} />);
    const link = screen.getAllByText("Ver la ruta").find((el) => el.closest("a")?.getAttribute("href") === "#/ruta");
    expect(link).toBeTruthy();
  });
});

describe("secondaryActions", () => {
  const a = block({ seconds: 180, href: "#/repaso" }); // el repaso siempre se puede abrir
  const b = block({ seconds: 420, href: "#/b" });
  it("«Solo N min» es el bloque abrible más corto y no repite el principal", () => {
    expect(secondaryActions(plan(), [a, b], "#/b").short).toEqual({ href: "#/repaso", label: "Solo 3 min" });
    expect(secondaryActions(plan(), [a, b], "#/repaso").short).toBeNull(); // el otro dura más de 5 min
  });
  it("con un solo bloque no hay «Solo N min»", () => {
    expect(secondaryActions(plan(), [a], "#/repaso").short).toBeNull();
  });
  it("sin bloques no falla y «Elegir otra cosa» lleva a Practicar", () => {
    expect(secondaryActions(plan(), undefined, "#/ruta")).toEqual({ short: null, other: { href: "#/practicar", label: "Elegir otra cosa" } });
  });
  it("ignora los bloques ya hechos", () => {
    expect(secondaryActions(plan(), [block({ seconds: 60, href: "#/x", done: true }), b], "#/b").short).toBeNull();
  });
});

describe("barra de la semana", () => {
  it("sin datos muestra el texto vacío", () => {
    render(<WeekBar week={{}} />);
    expect(screen.getByText(/aquí verás cuánto tiempo real/)).toBeTruthy();
  });
  it("con datos da los minutos por hebra y señala la que va corta", () => {
    render(<WeekBar week={{ foco: 25 * 60, entrada: 5 * 60, salida: 60 }} />);
    expect(screen.getByText(/Estudiar 25/)).toBeTruthy();
    expect(screen.getByText(/Fluidez va corto esta semana/)).toBeTruthy();
    expect(screen.getByText(/va corto/).closest("p")?.querySelector("a")?.getAttribute("href")).toBe("#/practicar");
  });
});
