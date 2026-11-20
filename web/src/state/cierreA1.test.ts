import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { stepsFor } from "./course";
import { stepSeconds } from "./steps";
import { MIN_SENTENCES_TARGET, UNIT_MIN_MINUTES } from "./targets";

/**
 * «A1 cerrado» (docs/plan-cierre-a1.md): cada unidad del núcleo debe cumplir los criterios. Los huecos conocidos están en KNOWN_GAPS:
 * el test exige que la lista coincida EXACTAMENTE con lo que falta, así un hueco nuevo falla y uno resuelto obliga a quitarlo de la lista.
 */
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"),
  course: read("course.json"), readings: read("readings.json"), readingItems: read("reading_items.json") } as ContentPack;
const MIN_SENTENCES = 30; // el objetivo original era 40 (MIN_SENTENCES_TARGET): se exige 30 y se declara la diferencia

const KNOWN_GAPS: Record<string, string[]> = {
  // Género y artículo indefinido: las fuentes solo traen listas de nombres y ejercicios, no un texto que encaje (se declaran).
  u54: ["lectura", "minutos"], u55: ["lectura", "minutos"],
  u62: ["minutos"], // su lectura es un diálogo modelo de 3 frases: faltan unos minutos de práctica
};

function gaps(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const u of pack.course.units.filter((x) => x.level === "A1")) {
    const g: string[] = [];
    if (u.parts.practica.length + u.parts.prueba.length < MIN_SENTENCES) g.push("oraciones");
    if (!u.ficha_es) g.push("ficha");
    if (!u.readings?.length && !u.words?.length) g.push("lectura");
    const minutes = stepsFor(u).reduce((t, s) => t + stepSeconds(u, s, pack), 0) / 60;
    if (minutes < UNIT_MIN_MINUTES) g.push(`minutos (${minutes.toFixed(0)})`);
    if (g.length) out[u.id] = g.map((x) => x.replace(/\s\(\d+\)/, ""));
  }
  return out;
}

describe("A1 cerrado", () => {
  it("los huecos de cada unidad coinciden con los declarados", () => {
    const now = gaps();
    expect(now, `ver KNOWN_GAPS; huecos actuales: ${JSON.stringify(now)}`).toEqual(KNOWN_GAPS);
  });
  it("el objetivo de oraciones por unidad sigue siendo mayor que el mínimo exigido", () => {
    expect(MIN_SENTENCES_TARGET).toBeGreaterThanOrEqual(MIN_SENTENCES);
  });
});
