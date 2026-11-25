import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { moduleViews } from "../state/modules";
import { EmptyState, Loading } from "./kit/EmptyState";
import { ModuleScreen } from "./ModuleScreen";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const course = read("course.json") as ContentPack["course"];
const pack = { course, readings: [] } as unknown as ContentPack;

describe("módulo con tono y motivo", () => {
  it("la cabecera lleva el tono del módulo, su dibujo y cuántas etapas van", () => {
    const view = moduleViews(course, [], false).modules[1];
    const { container } = render(<ModuleScreen view={view} pack={pack} />);
    expect(container.querySelector("main.module")?.getAttribute("data-tone")).toBe("2");
    expect(container.querySelector("header.mhead svg.motif")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: view.module.title })).toBeTruthy();
    expect(screen.getByText(/de \d+ etapas hechas/)).toBeTruthy();
  });
});

describe("pantallas de estado", () => {
  it("«Cargando…» sigue diciéndose en texto y se anuncia como estado", () => {
    render(<Loading />);
    expect(screen.getByRole("status").textContent).toBe("Cargando…");
  });
  it("un estado sin repasos da título, motivo y salida", () => {
    render(<EmptyState title="No tienes repasos pendientes ahora." body="Cuando vuelvan tarjetas, aparecerán en Hoy." action={{ href: "#/", label: "Volver a Hoy" }} />);
    expect(screen.getByText("Cuando vuelvan tarjetas, aparecerán en Hoy.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver a Hoy" })).toBeTruthy();
  });
});
