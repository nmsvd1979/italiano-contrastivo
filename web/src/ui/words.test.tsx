import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Course } from "../content/load";
import { isOptional, stepsFor, unitViews } from "../state/course";
import { stepSeconds } from "../state/steps";
import type { ContentPack } from "../content/load";
import { WordsStep } from "./WordsStep";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const course: Course = read("course.json");
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course } as ContentPack;
const vocab = course.units.find((u) => u.words?.length)!;

describe("paso «Palabras»", () => {
  it("solo las unidades de vocabulario lo tienen, justo después de «Descubre»", () => {
    expect(stepsFor(vocab).slice(0, 2)).toEqual(["descubre", "palabras"]);
    const grammar = course.units.find((u) => !u.words?.length)!;
    expect(stepsFor(grammar)).not.toContain("palabras");
  });
  it("muestra cada palabra con su significado, y se pueden tapar para comprobar de memoria", () => {
    const onFinish = vi.fn();
    render(<WordsStep unit={vocab} onFinish={onFinish} />);
    const w = vocab.words![0];
    expect(screen.getByText(w.form)).toBeTruthy();
    expect(screen.getAllByText(new RegExp(w.gloss.replace(/[()]/g, "\\$&"))).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText("Tapar los significados"));
    expect(screen.getAllByText("Ver significado").length).toBe(vocab.words!.length);
    fireEvent.click(screen.getAllByText("Ver significado")[0]);
    expect(screen.getAllByText("Ver significado").length).toBe(vocab.words!.length - 1);
    fireEvent.click(screen.getByText("Ya las repasé"));
    expect(onFinish).toHaveBeenCalled();
  });
  it("el paso tiene duración estimada por palabra", () => {
    expect(stepSeconds(vocab, "palabras", pack)).toBe(vocab.words!.length * 15);
  });
});

describe("unidades opcionales (vocabulario ampliado)", () => {
  it("tienen su propia cadena: no bloquean ni se bloquean por el camino principal", () => {
    const views = unitViews(course, [], false);
    const core = views.filter((v) => !isOptional(v.unit));
    const opt = views.filter((v) => isOptional(v.unit));
    expect(opt.length).toBeGreaterThan(0);
    expect(core.filter((v) => v.state === "current").length).toBe(1);
    expect(opt.filter((v) => v.state === "current").length).toBe(1);
    expect(core.every((v) => v.unit.level !== "A1+")).toBe(true);
  });
});
