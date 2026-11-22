import type { ContentPack, Unit } from "../content/load";
import type { Item } from "../generated/item";
import { emptyProgress } from "./course";
import type { UnitProgress } from "./store";
import { recognitionItems } from "./steps";

/** Examen de hito (fuentes): A1 pondera 35 % léxico / 65 % gramática. Se aprueba con ≥65 % global y ≥50 % en cada parte. */
export const HITO = { A1: { lex: 0.35, total: 40 }, PASS_GLOBAL: 0.65, PASS_PART: 0.5 } as const;
export type Part = "lex" | "gram";
export const partOf = (u: Unit): Part => (u.codes[0].startsWith("ERR_VOC_") ? "lex" : "gram");
export const hitoId = (level: string) => `hito:${level}`;

export type MilestoneItems = { items: Item[]; parts: Part[] };

/** Elige ítems de las pruebas de las unidades del nivel, de a uno por unidad y por vuelta, respetando la ponderación. */
export function milestoneItems(pack: ContentPack, level = "A1"): MilestoneItems {
  const units = pack.course.units.filter((u) => u.level === level);
  const want = { lex: Math.round(HITO.A1.total * HITO.A1.lex), gram: HITO.A1.total - Math.round(HITO.A1.total * HITO.A1.lex) };
  const out: MilestoneItems = { items: [], parts: [] };
  for (const part of ["gram", "lex"] as const) {
    const all = units.filter((u) => partOf(u) === part).map((u) => recognitionItems(u, pack).filter((i) => i.type === "choice_l1_distractor")).filter((p) => p.length);
    // Si hay más unidades que preguntas, se toman unidades repartidas a lo largo de TODA la ruta (no solo las primeras); si hay menos, se da otra vuelta.
    const pools = all.length > want[part] ? Array.from({ length: want[part] }, (_, i) => all[Math.floor(((i + 0.5) * all.length) / want[part])]) : all;
    for (let round = 0; out.parts.filter((p) => p === part).length < want[part] && round < 12; round++) {
      let added = false;
      for (const pool of pools) {
        if (out.parts.filter((p) => p === part).length >= want[part]) break;
        const it = pool[round];
        if (it) { out.items.push(it); out.parts.push(part); added = true; }
      }
      if (!added) break;
    }
  }
  return out;
}

export function scoreMilestone(parts: Part[], answers: boolean[]) {
  const tally = (p: Part) => ({ correct: answers.filter((a, i) => a && parts[i] === p).length, total: parts.filter((x) => x === p).length });
  const lex = tally("lex"), gram = tally("gram");
  const total = answers.length ? answers.filter(Boolean).length / answers.length : 0;
  const ratio = (t: { correct: number; total: number }) => (t.total ? t.correct / t.total : 1);
  const passed = total >= HITO.PASS_GLOBAL && ratio(lex) >= HITO.PASS_PART && ratio(gram) >= HITO.PASS_PART;
  return { lex, gram, total, passed };
}

export const milestoneProgress = (prev: UnitProgress | undefined, level: string, score: number, passed: boolean, now: Date): UnitProgress => {
  const p = prev ?? emptyProgress(hitoId(level));
  return { ...p, testBest: Math.max(p.testBest ?? 0, score), completed: passed || p.completed, completedAt: passed && !p.completed ? now.toISOString() : p.completedAt };
};

/** El examen se abre al completar todas las unidades del nivel (o en modo de prueba). */
export const milestoneOpen = (pack: ContentPack, done: Set<string>, level = "A1", preview = false): boolean =>
  preview || pack.course.units.filter((u) => u.level === level).every((u) => done.has(u.id));
