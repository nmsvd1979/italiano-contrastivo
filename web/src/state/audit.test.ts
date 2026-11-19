import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { STEPS, stepsFor } from "./course";
import { stepSeconds } from "./steps";
import { A1_TARGET_HOURS, MIN_SENTENCES_TARGET, TARGET_MINUTES, UNIT_TARGET_MINUTES } from "./targets";

const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json") } as ContentPack;

type Row = { id: string; level: string; title: string; sentences: number; items: number; minutes: Record<string, number>; total: number; hasReading: boolean };
const rows = (): Row[] => pack.course.units.map((u) => {
  const minutes = Object.fromEntries(stepsFor(u).map((s) => [s, Math.round(stepSeconds(u, s, pack) / 6) / 10]));
  const total = Object.values(minutes).reduce((a, b) => a + b, 0);
  return { id: u.id, level: u.level, title: u.title, sentences: u.parts.practica.length + u.parts.prueba.length, items: (pack.itemsByCode[u.codes[0]] ?? []).length, minutes, total: Math.round(total * 10) / 10, hasReading: !!(u as { readings?: string[] }).readings?.length };
});

describe("auditoría de contenido: horas reales frente al objetivo", () => {
  it("todas las unidades activas tienen minutos finitos y el informe se puede generar", () => {
    const r = rows();
    expect(r.length).toBeGreaterThan(0);
    for (const x of r) { expect(Number.isFinite(x.total)).toBe(true); expect(x.sentences).toBeGreaterThan(0); }
    if (process.env.AUDIT_WRITE) writeFileSync("../docs/auditoria-contenido.md", report(r));
  });
  it("no se pierde contenido: A1 conserva al menos las horas ya alcanzadas", () => {
    const hours = rows().filter((x) => x.level === "A1").reduce((a, x) => a + x.total, 0) / 60;
    expect(hours).toBeGreaterThanOrEqual(8);
  });
});

function report(r: Row[]): string {
  const a1 = r.filter((x) => x.level === "A1");
  const hours = a1.reduce((a, x) => a + x.total, 0) / 60;
  const lines = [
    "# Auditoría de contenido",
    "",
    `Generada con \`npm --prefix web run audit:content\`. Minutos de pasos con los tiempos a priori (no medidos). Objetivo por unidad: **${UNIT_TARGET_MINUTES} min** (${Object.entries(TARGET_MINUTES).map(([k, v]) => `${k} ${v}`).join(" · ")}); ${MIN_SENTENCES_TARGET} oraciones con audio; 1 lectura.`,
    "",
    `**A1 hoy: ${a1.length} unidades, ${hours.toFixed(1)} h de pasos** (objetivo ${A1_TARGET_HOURS} h con repasos y examen de hito; ${Math.round((a1.length ? a1.reduce((a, x) => a + (UNIT_TARGET_MINUTES - x.total), 0) : 0) / 60 * 10) / 10} h por producir en las unidades existentes, más las unidades nuevas del currículo).`,
    "",
    "| Unidad | Nivel | Oraciones | Ítems | " + STEPS.join(" | ") + " | Total (min) | Falta (min) | Lectura |",
    "|---|---|---|---|" + STEPS.map(() => "---").join("|") + "|---|---|---|",
    ...r.map((x) => `| ${x.id} ${x.title} | ${x.level} | ${x.sentences} | ${x.items} | ${STEPS.map((s) => x.minutes[s] ?? "—").join(" | ")} | ${x.total} | ${Math.max(0, Math.round((UNIT_TARGET_MINUTES - x.total) * 10) / 10)} | ${x.hasReading ? "sí" : "no"} |`),
    "",
  ];
  return lines.join("\n");
}
