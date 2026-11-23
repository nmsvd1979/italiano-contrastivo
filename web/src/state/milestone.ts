import type { ContentPack, PackSentence, Reading, SpeakingTask, Unit } from "../content/load";
import type { Item } from "../generated/item";
import { emptyProgress } from "./course";
import type { UnitProgress } from "./store";
import { recognitionItems } from "./steps";
import { writeItemOf } from "./write";

/**
 * Examen de hito (fuentes): A1 pondera 35 % léxico / 65 % gramática en las 40 preguntas de reconocimiento. Desde 2026-11-23 suma
 * producción (12 frases escritas desde el español, sin «mi versión también es correcta»), escucha (6 dictados), lectura de textos NO vistos
 * (una lectura y un horario, sin traducción) y una tarea oral
 * autoevaluada con rúbrica. Se aprueba con ≥65 % global y ≥50 % en cada parte, y la parte oral exige cumplir la mitad de la rúbrica.
 */
export const HITO = { A1: { lex: 0.35, total: 40 }, WRITE: 12, LISTEN: 6, PASS_GLOBAL: 0.65, PASS_PART: 0.5, PASS_ORAL: 0.5 } as const;
export type Part = "lex" | "gram" | "write" | "listen" | "read";
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

/** Elige `n` unidades repartidas por toda la ruta del nivel (no solo las primeras); `shift` desplaza la elección para no coincidir con otra parte. */
const spreadUnits = (units: Unit[], n: number, shift = 0.5): Unit[] =>
  units.length <= n ? units : Array.from({ length: n }, (_, i) => units[Math.min(units.length - 1, Math.floor(((i + shift) * units.length) / n))]);

/** Producción: una frase por unidad, escrita desde el español, de las reservadas de la prueba y distinta de las que ya salieron como reconocimiento. */
export function milestoneWriteItems(pack: ContentPack, level = "A1", used: Set<string> = new Set()): Item[] {
  const sentences = new Map(pack.sentences.map((s) => [s.id, s]));
  const units = pack.course.units.filter((u) => u.level === level);
  const out: Item[] = [];
  for (const u of spreadUnits(units, HITO.WRITE, 0.5)) {
    const s = u.parts.prueba.map((id) => sentences.get(id)).find((x): x is PackSentence => !!x && !used.has(x.id) && x.it.split(/\s+/).length <= 10);
    if (s) { out.push(writeItemOf(s, u.codes[0])); used.add(s.id); }
  }
  return out;
}

/** Escucha: dictados de oraciones de «Escucha» de unidades repartidas (otras unidades y otras frases que las de producción). */
export function milestoneListenSentences(pack: ContentPack, level = "A1", used: Set<string> = new Set()): PackSentence[] {
  const sentences = new Map(pack.sentences.map((s) => [s.id, s]));
  const out: PackSentence[] = [];
  for (const u of spreadUnits(pack.course.units.filter((x) => x.level === level), HITO.LISTEN, 0.15)) {
    const s = u.parts.escucha.map((id) => sentences.get(id)).find((x): x is PackSentence => !!x && !!x.audio && !used.has(x.id) && x.it.split(/\s+/).length <= 9);
    if (s) { out.push(s); used.add(s.id); }
  }
  return out;
}

/** Lecturas NO vistas del examen (ninguna unidad las usa): un texto y un documento, sin traducción. */
export const milestoneReadings = (pack: ContentPack, level = "A1"): Reading[] =>
  (pack.readings ?? []).filter((r) => r.exam && r.level === level).sort((a, b) => a.id.localeCompare(b.id));

/** Tarea oral del hito: la primera del nivel (se autoevalúa con su rúbrica). */
export const milestoneOralTask = (pack: ContentPack, level = "A1"): SpeakingTask | undefined => pack.speaking?.tasks.find((t) => t.level === level);

export function scoreMilestone(parts: Part[], answers: boolean[]) {
  const tally = (p: Part) => ({ correct: answers.filter((a, i) => a && parts[i] === p).length, total: parts.filter((x) => x === p).length });
  const lex = tally("lex"), gram = tally("gram"), write = tally("write"), listen = tally("listen"), read = tally("read");
  const total = answers.length ? answers.filter(Boolean).length / answers.length : 0;
  const ratio = (t: { correct: number; total: number }) => (t.total ? t.correct / t.total : 1);
  const passed = total >= HITO.PASS_GLOBAL && [lex, gram, write, listen, read].every((t) => ratio(t) >= HITO.PASS_PART);
  return { lex, gram, write, listen, read, total, passed };
}

/** La parte oral es autoevaluación: se pasa cumpliendo la mitad de la rúbrica. */
export const oralPassed = (checked: number, total: number): boolean => total > 0 && checked / total >= HITO.PASS_ORAL;

export const milestoneProgress = (prev: UnitProgress | undefined, level: string, score: number, passed: boolean, now: Date): UnitProgress => {
  const p = prev ?? emptyProgress(hitoId(level));
  return { ...p, testBest: Math.max(p.testBest ?? 0, score), completed: passed || p.completed, completedAt: passed && !p.completed ? now.toISOString() : p.completedAt };
};

/** El examen se abre al completar todas las unidades del nivel (o en modo de prueba). */
export const milestoneOpen = (pack: ContentPack, done: Set<string>, level = "A1", preview = false): boolean =>
  preview || pack.course.units.filter((u) => u.level === level).every((u) => done.has(u.id));
