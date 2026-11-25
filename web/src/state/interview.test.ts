import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Course, Speaking } from "../content/load";
import { INTERVIEW_OWN, INTERVIEW_SIZE, interviewRound } from "./interview";

const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const course = read("course.json") as Course;
const speaking = read("speaking.json") as Speaking;
const a1 = course.modules!.filter((m) => m.level === "A1");

describe("preguntas por voz (contenido real de A1)", () => {
  it("cada módulo A1 arma una ronda de 6 preguntas distintas, todas con audio", () => {
    for (const m of a1) {
      const r = interviewRound(speaking, course, m.id);
      expect(r.length, m.id).toBe(INTERVIEW_SIZE);
      expect(new Set(r.map((q) => q.id)).size, m.id).toBe(r.length);
      expect(r.every((q) => !!q.audio), m.id).toBe(true);
    }
  });
  it("como máximo 4 son del tema del módulo y el resto repasa módulos anteriores; nunca de módulos posteriores", () => {
    for (const [k, m] of a1.entries()) {
      const r = interviewRound(speaking, course, m.id);
      const later = new Set(a1.slice(k + 1).map((x) => x.id));
      expect(r.some((q) => later.has(q.module)), m.id).toBe(false);
      if (k > 0) expect(r.filter((q) => q.module === m.id).length, m.id).toBeLessThanOrEqual(INTERVIEW_OWN);
    }
    expect(interviewRound(speaking, course, "m01").every((q) => q.module === "m01")).toBe(true);   // sin módulos anteriores: todas de m01
  });
  it("es estable con la misma semilla y cambia con otra", () => {
    const ids = (n: number) => interviewRound(speaking, course, "m06", n).map((q) => q.id).join();
    expect(ids(3)).toBe(ids(3));
    expect(new Set([0, 1, 2, 3, 4].map(ids)).size).toBeGreaterThan(1);
  });
  it("un módulo desconocido o sin banco no rompe", () => {
    expect(interviewRound(speaking, course, "zz")).toEqual([]);
    expect(interviewRound(null, course, "m01")).toEqual([]);
  });
});
