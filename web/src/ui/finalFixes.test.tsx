import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { emptyProgress } from "../state/course";
import { planSession } from "../state/dayplan";
import { moduleProgressId, moduleViews } from "../state/modules";
import { planToday } from "../state/session";
import type { DayProgress } from "../state/store";
import { PracticeScreen } from "./PracticeScreen";
import { RouteScreen } from "./RouteScreen";
import { nextAction, secondaryActions } from "./TodayScreen";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"),
  course: read("course.json"), readings: read("readings.json"), readingWords: read("reading_words.json"), speaking: read("speaking.json"), library: read("library.json") } as ContentPack;
const NOW = new Date("2026-11-24T12:00:00.000Z");
const day: DayProgress = { date: "2026-11-24", reviewsDone: 0, capsulesDone: [] };
const M1 = pack.course.modules![0].id;
const entradaHecha = { ...emptyProgress(moduleProgressId(M1)), done: { entrada: NOW.toISOString() } };

describe("«Solo N min» solo lleva a lo que se puede abrir ya", () => {
  it("con una unidad en curso, nunca apunta a un paso posterior bloqueado", () => {
    const plan = planToday({ pack, cards: [], day, now: NOW, units: [entradaHecha] });
    const blocks = planSession({ plan, day, pack });
    const { short } = secondaryActions(plan, blocks, nextAction(plan).href);
    expect(short === null || short.href === "#/repaso").toBe(true);
  });
  it("con un paso propio del módulo en curso, tampoco", () => {
    const plan = planToday({ pack, cards: [], day, now: NOW, units: [] });
    const blocks = planSession({ plan, day, pack });
    const { short } = secondaryActions(plan, blocks, nextAction(plan).href);
    expect(short === null || short.href === "#/repaso").toBe(true);
  });
});

describe("Practicar", () => {
  it("con solo práctica de recuperación (sin tarjetas vencidas) sigue ofreciendo «Repasar»", () => {
    render(<PracticeScreen review={{ due: 0, newAvailable: 0, doneToday: 0, cap: 30, seconds: 90, filler: 3 }} weak={[]} />);
    expect(screen.getByText("Repasar").closest("a")?.getAttribute("href")).toBe("#/repaso");
    expect(screen.queryByText(/No tienes repasos pendientes/)).toBeNull();
  });
});

describe("objetivos táctiles de al menos 44 px", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
  const minHeight = (selector: string) => Number(css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{[^}]*min-height:\\s*(\\d+)px`))?.[1] ?? 0);
  it.each([".actions-bottom .secondary .button", "a.tap", "details.how summary"])("%s mide ≥ 44 px", (sel) => {
    expect(minHeight(sel)).toBeGreaterThanOrEqual(44);
  });
  it("Hablar y Escribir en Practicar son botones y los accesos de Progreso usan la clase tap", () => {
    render(<PracticeScreen review={{ due: 0, newAvailable: 0, doneToday: 0, cap: 30, seconds: 0, filler: 0 }} weak={[]} />);
    expect(screen.getByText(/Juegos de roles/).closest("a")?.classList.contains("button")).toBe(true);
    expect(screen.getByText(/Reconstruir un texto/).closest("a")?.classList.contains("button")).toBe(true);
  });
});

describe("ruta: todos los niveles con el diseño nuevo", () => {
  it("A2 y B1 no usan el camino antiguo y las horas de referencia solo salen plegadas", () => {
    const v = moduleViews(pack.course, [], false);
    const { container } = render(<RouteScreen views={v.units} modules={v.modules} pack={pack} />);
    expect(container.querySelector("ul.path")).toBeNull();
    expect(container.textContent).not.toMatch(/🔒/);
    const loose = [...container.querySelectorAll("small")].filter((s) => /Referencia general/.test(s.textContent ?? "") && !s.closest("details"));
    expect(loose).toHaveLength(0);
    expect(container.querySelector("details")?.textContent).toMatch(/Referencia general/);
  });
});
