import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SessionBlock } from "../state/dayplan";
import type { TodayPlan } from "../state/session";
import type { DayProgress } from "../state/store";
import { nextAction, TodayScreen } from "./TodayScreen";
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

describe("Hoy: referencia diaria y plan por contenido", () => {
  it("no hay «Solo N min», «Elegir otra cosa» ni minutos por fila", () => {
    render(<TodayScreen plan={plan({}, 6)} day={day()} blocks={[block({ seconds: 180 }), block({ key: "lectura", step: "descubre", label: "Descubre", seconds: 420, href: "#/unidad/u01/descubre" })]} />);
    expect(screen.queryByText(/Solo \d+ min/)).toBeNull();
    expect(screen.queryByText("Elegir otra cosa")).toBeNull();
    expect(screen.queryByText(/≈|<1 min/)).toBeNull();
    expect(document.querySelector('a[href="#/practicar"]')).toBeNull();
  });
  it("muestra los minutos de hoy frente a los 15 de referencia", () => {
    render(<TodayScreen plan={plan()} day={day({ seconds: { foco: 5 * 60, fluidez: 4 * 60 + 30 } })} />);
    expect(screen.getByText("Hoy llevas 9 de 15 min")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("9");
  });
  it("al llegar a 15 min dice que el mínimo está cumplido y que puede seguir", () => {
    render(<TodayScreen plan={plan()} day={day({ seconds: { foco: 16 * 60 } })} />);
    expect(screen.getByText("Hoy llevas 16 min")).toBeTruthy();
    expect(screen.getByText(/Mínimo de hoy cumplido/)).toBeTruthy();
  });
  it("sin tiempo medido muestra 0 de 15", () => {
    render(<TodayScreen plan={plan()} day={day()} />);
    expect(screen.getByText("Hoy llevas 0 de 15 min")).toBeTruthy();
  });
  it("el botón principal pasa al Refuerzo cuando toca y no hay repaso vencido", () => {
    const refuerzo = block({ label: "Refuerzo", href: "#/debiles" });
    render(<TodayScreen plan={plan()} day={day()} blocks={[refuerzo]} />);
    expect(screen.getByText(/^Empezar · Refuerzo/).closest("a")?.getAttribute("href")).toBe("#/debiles");
  });
  it("el repaso vencido va antes que el Refuerzo", () => {
    expect(nextAction(plan({}, 4), true)).toEqual({ href: "#/repaso", label: "Repaso" });
    expect(nextAction(plan(), true)).toEqual({ href: "#/debiles", label: "Refuerzo" });
    expect(nextAction(plan(), false)).toEqual({ href: "#/ruta", label: "Ver la ruta" });
  });
  it("el encabezado dice módulo y cápsula i de k", () => {
    const unit = { view: { unit: { id: "u02", level: "A1", title: "Ser y estar" }, index: 1 }, step: "practica", seconds: 600 } as unknown as TodayPlan["unit"];
    render(<TodayScreen plan={plan({ unit, place: { level: "A1", module: 3, title: "Presentarte", capsule: 2, capsules: 5 } })} day={day()} />);
    expect(screen.getByText("A1 · Módulo 3 · Cápsula 2 de 5")).toBeTruthy();
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
    expect(screen.getByText(/va corto/).closest("p")?.querySelector("a")).toBeNull();
  });
});
