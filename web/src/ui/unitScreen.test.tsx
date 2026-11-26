import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { STEPS, unitViews } from "../state/course";
import { UnitScreen } from "./UnitScreen";

import { readItems } from "../test/realPack";
afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: readItems(), lexemes: read("lexemes.json"), sentences: read("sentences.json"),
  manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
const first = () => unitViews(pack.course, [], false)[0];
const iso = "2026-11-24T10:00:00.000Z";

describe("ficha de la cápsula", () => {
  it("muestra la tira de pasos y un solo botón «Empezar» al paso siguiente", () => {
    const v = first();
    const { container } = render(<UnitScreen view={v} pack={pack} />);
    expect(container.querySelector("ol.ustrip")).not.toBeNull();
    const go = screen.getByRole("link", { name: /^Empezar · / });
    expect(go.getAttribute("href")).toBe(`#/unidad/${v.unit.id}/${v.next}`);
    expect(screen.getAllByRole("link", { name: /^Empezar/ })).toHaveLength(1);
  });
  it("la vuelta lleva al módulo de la unidad", () => {
    const v = first();
    const m = pack.course.modules!.find((x) => x.units.includes(v.unit.id))!;
    render(<UnitScreen view={v} pack={pack} />);
    expect(screen.getByRole("link", { name: `‹ ${m.title}` }).getAttribute("href")).toBe(`#/modulo/${m.id}`);
  });
  it("muestra tarjetas de contraste si la unidad tiene divergencias y no la sección si no", () => {
    const v = first();
    expect(v.unit.divergences.length).toBeGreaterThan(0);
    const { container, unmount } = render(<UnitScreen view={v} pack={pack} />);
    const n = container.querySelectorAll(".contrast").length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(3);
    unmount();
    const bare = render(<UnitScreen view={{ ...v, unit: { ...v.unit, divergences: [] } }} pack={pack} />);
    expect(bare.container.querySelectorAll(".contrast")).toHaveLength(0);
    expect(screen.queryByText("Contraste")).toBeNull();
  });
  it("una unidad completada no ofrece «Empezar» pero deja repetir pasos", () => {
    const v = first();
    const done = { ...v, state: "completed" as const, next: null, progress: { ...v.progress, completed: true, done: Object.fromEntries(STEPS.map((s) => [s, iso])) } };
    render(<UnitScreen view={done} pack={pack} />);
    expect(screen.queryByRole("link", { name: /^Empezar/ })).toBeNull();
    expect(screen.getByRole("link", { name: /^Descubre.*hecho/ })).toBeTruthy();
  });
  it("una unidad bloqueada lo dice y no ofrece botón ni pasos abiertos", () => {
    const v = first();
    render(<UnitScreen view={{ ...v, state: "locked", next: null }} pack={pack} />);
    expect(screen.getByRole("status").textContent).toMatch(/se abre cuando completes la anterior/);
    expect(screen.queryByRole("link", { name: /^Empezar/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /^Descubre/ })).toBeNull();
  });
});
