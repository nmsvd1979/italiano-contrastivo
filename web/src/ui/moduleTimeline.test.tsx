import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { emptyProgress } from "../state/course";
import { moduleProgressId, moduleViews } from "../state/modules";
import type { UnitProgress } from "../state/store";
import { ModuleScreen, moduleAction } from "./ModuleScreen";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"),
  course: read("course.json"), readings: read("readings.json"), readingWords: read("reading_words.json"), speaking: read("speaking.json"), library: read("library.json") } as ContentPack;
const mods = pack.course.modules!;
const M1 = mods[0];
const at = "2026-11-24T10:00:00.000Z";
const entradaHecha: UnitProgress = { ...emptyProgress(moduleProgressId(M1.id)), done: { entrada: at } };
const placed = (id: string): UnitProgress => ({ ...emptyProgress(id), completed: true, testBest: 1, mastery: "ubicacion" });
const m1 = (all: UnitProgress[]) => moduleViews(pack.course, all, false).modules[0];

describe("acción del módulo", () => {
  it("apunta al paso siguiente de la cápsula en curso, no a la pantalla de la unidad", () => {
    const v = m1([entradaHecha]);
    const u = v.units[0];
    expect(v.next).toBe("capsulas");
    expect(moduleAction(v, pack)?.href).toBe(`#/unidad/${u.unit.id}/${u.next}`);
  });
  it("sin la Entrada hecha apunta a la Entrada del módulo", () => {
    expect(moduleAction(m1([]), pack)).toMatchObject({ href: `#/modulo/${M1.id}/entrada` });
    expect(moduleAction(m1([]), pack)?.label).toMatch(/^Entrada · /);
  });
  it("un módulo bloqueado o completado no tiene acción", () => {
    expect(moduleViews(pack.course, [], false).modules[1].state).toBe("locked");
    expect(moduleAction(moduleViews(pack.course, [], false).modules[1], pack)).toBeNull();
    const done = m1(M1.units.map(placed));
    expect(done.state).toBe("completed");
    expect(moduleAction(done, pack)).toBeNull();
  });
});

describe("módulo como línea de tiempo", () => {
  it("muestra las seis etapas (con Textos reales: la escucha) y su estado en texto", () => {
    const { container } = render(<ModuleScreen view={m1([entradaHecha])} pack={pack} />);
    const items = container.querySelectorAll("ol.tl > li");
    expect(items).toHaveLength(6);
    expect(items[0].textContent).toMatch(/Entrada.*hecho/);
    expect(items[1].textContent).toMatch(/Cápsulas.*toca ahora/);
    expect(items[2].textContent).toMatch(/Textos reales.*pendiente/);
    expect(items[3].textContent).toMatch(/Salida.*pendiente/);
  });
  it("la cápsula en curso enlaza directo a su paso y tiene un enlace «Ficha»", () => {
    const v = m1([entradaHecha]);
    const u = v.units[0];
    render(<ModuleScreen view={v} pack={pack} />);
    const direct = screen.getByRole("link", { name: new RegExp(`^${u.unit.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
    expect(direct.getAttribute("href")).toBe(`#/unidad/${u.unit.id}/${u.next}`);
    expect(within(direct.closest("li")!).getByRole("link", { name: "Ficha" }).getAttribute("href")).toBe(`#/unidad/${u.unit.id}`);
  });
  it("una cápsula bloqueada no es un enlace", () => {
    const v = m1([entradaHecha]);
    render(<ModuleScreen view={v} pack={pack} />);
    expect(screen.queryByRole("link", { name: new RegExp(`^${v.units[1].unit.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })).toBeNull();
  });
  it("hay un botón fijo «Continuar» con la acción del módulo", () => {
    render(<ModuleScreen view={m1([entradaHecha])} pack={pack} />);
    const u = m1([entradaHecha]).units[0];
    expect(screen.getByRole("link", { name: /^Continuar · / }).getAttribute("href")).toBe(`#/unidad/${u.unit.id}/${u.next}`);
  });
  it("un módulo completado deja repetir sus pasos y no ofrece «Continuar»", () => {
    render(<ModuleScreen view={m1(M1.units.map(placed))} pack={pack} />);
    expect(screen.queryByRole("link", { name: /^Continuar · / })).toBeNull();
    expect(screen.getByRole("link", { name: /^Entrada/ }).getAttribute("href")).toBe(`#/modulo/${M1.id}/entrada`);
  });
  it("un módulo bloqueado lo dice y no ofrece pasos", () => {
    render(<ModuleScreen view={moduleViews(pack.course, [], false).modules[1]} pack={pack} />);
    expect(screen.getByRole("status").textContent).toMatch(/se abre cuando completes el anterior/);
    expect(screen.queryByRole("link", { name: /^Continuar · / })).toBeNull();
  });
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const capLinks = (v: ReturnType<typeof m1>) => v.units.map((u) => screen.queryByRole("link", { name: new RegExp(`^${esc(u.unit.title)}`) }));
  it("con la Entrada sin hacer ninguna cápsula es un enlace (aún no se puede entrar)", () => {
    const v = m1([]);
    render(<ModuleScreen view={v} pack={pack} />);
    expect(capLinks(v).every((l) => l === null)).toBe(true);
    expect(screen.queryByRole("link", { name: "Ficha" })).toBeNull();
  });
  it("en un módulo bloqueado ninguna cápsula es un enlace", () => {
    const v = moduleViews(pack.course, [], false).modules[1];
    render(<ModuleScreen view={v} pack={pack} />);
    expect(capLinks(v).every((l) => l === null)).toBe(true);
  });
  it("en el modo de prueba (todo abierto) las cápsulas sí son enlaces", () => {
    const v = moduleViews(pack.course, [], true).modules[0];
    render(<ModuleScreen view={v} pack={pack} />);
    expect(capLinks(v).every((l) => l !== null)).toBe(true);
  });
  it("una cápsula bloqueada lo dice en texto, no solo en color", () => {
    const v = m1([entradaHecha]);
    const { container } = render(<ModuleScreen view={v} pack={pack} />);
    const locked = container.querySelectorAll('.caps li[data-state="locked"]');
    expect(locked.length).toBeGreaterThan(0);
    for (const li of locked) expect(li.textContent).toMatch(/bloqueada/);
  });
});
describe("toques del módulo", () => {
  const css = readFileSync(`${process.cwd()}/src/styles.css`, "utf8");
  it("el título de la cápsula mide al menos 44 px", () => {
    expect(Number(css.match(/\.caps a\.cap-title\s*\{[^}]*min-height:\s*(\d+)px/)?.[1] ?? 0)).toBeGreaterThanOrEqual(44);
  });
});
