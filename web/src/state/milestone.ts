import type { ContentPack, PackSentence, Reading, SpeakingTask, Unit } from "../content/load";
import type { Item } from "../generated/item";
import { emptyProgress } from "./course";
import type { UnitProgress } from "./store";
import { recognitionItems, reserveChoiceItems, rotate } from "./steps";
import { writeItemOf } from "./write";

/**
 * Examen de hito (fuentes): A1 pondera 35 % léxico / 65 % gramática en las 40 preguntas de reconocimiento. Desde 2026-11-23 suma
 * producción (12 frases escritas desde el español, sin «mi versión también es correcta»), escucha (6 dictados), lectura de textos NO vistos
 * (una lectura y un horario, sin traducción) y una tarea oral
 * autoevaluada con rúbrica. Se aprueba con ≥65 % global y ≥50 % en cada parte, y la parte oral exige cumplir la mitad de la rúbrica.
 */
export type Part = "lex" | "gram" | "write" | "listen" | "read";
/** Tamaño del examen de cada nivel. `min` = preguntas mínimas por parte para que la parte cuente: una parte con menos no se aprueba sola (A1 no exige mínimos: se mantiene como estaba). */
export type HitoSize = { lex: number; total: number; write: number; listen: number; listenWords: number; writeWords: number; min: Partial<Record<Part, number>> };
const SIZES: Record<string, HitoSize> = {
  A1: { lex: 0.35, total: 40, write: 12, listen: 6, listenWords: 9, writeWords: 10, min: {} },
  // A2 sigue el examen CILS A2: más escucha (dos escuchas de examen además de los dictados) y producción de frases con passato prossimo e imperfetto.
  A2: { lex: 0.25, total: 40, write: 14, listen: 6, listenWords: 12, writeWords: 12, min: { lex: 8, gram: 24, write: 12, listen: 14, read: 12 } },
};
export const hitoOf = (level: string): HitoSize => SIZES[level] ?? SIZES.A1;
export const HITO = { A1: { lex: SIZES.A1.lex, total: SIZES.A1.total }, WRITE: SIZES.A1.write, LISTEN: SIZES.A1.listen, PASS_GLOBAL: 0.65, PASS_PART: 0.5, PASS_ORAL: 0.5 } as const;
export const partOf = (u: Unit): Part => (u.codes[0].startsWith("ERR_VOC_") ? "lex" : "gram");
export const hitoId = (level: string) => `hito:${level}`;

export type MilestoneItems = { items: Item[]; parts: Part[] };

/** Unidades del nivel en el orden de la ruta: las de sus módulos si el nivel tiene módulos (una unidad sin módulo no se ofrece), si no, las que declaran el nivel. */
export function levelUnits(pack: ContentPack, level: string): Unit[] {
  const inModules = new Set((pack.course.modules ?? []).filter((m) => m.level === level).flatMap((m) => m.units));
  return inModules.size ? pack.course.units.filter((u) => inModules.has(u.id)) : pack.course.units.filter((u) => u.level === level);
}

/** Elige ítems de las pruebas de las unidades del nivel, de a uno por unidad y por vuelta, respetando la ponderación. */
export function milestoneItems(pack: ContentPack, level = "A1", attempt = 0): MilestoneItems {
  const size = hitoOf(level);
  const units = levelUnits(pack, level);
  const want = { lex: Math.round(size.total * size.lex), gram: size.total - Math.round(size.total * size.lex) };
  const out: MilestoneItems = { items: [], parts: [] };
  for (const part of ["gram", "lex"] as const) {
    const all = units.filter((u) => partOf(u) === part).map((u) => [...rotate(reserveChoiceItems(u, pack), attempt), ...rotate(recognitionItems(u, pack).filter((i) => i.type === "choice_l1_distractor"), attempt)]).filter((p) => p.length);   // primero frases de la reserva (que no viste practicando)
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
  // Relato de examen (cloze_text, `exam: true`): uno por intento, cuenta como gramática (passato prossimo / imperfetto). Los relatos de práctica no entran aquí.
  const relatos = pack.readingItems?.[`hito:${level}:relatos`] ?? [];
  if (relatos.length) { out.items.push(relatos[attempt % relatos.length]); out.parts.push("gram"); }
  return out;
}

/** Elige `n` unidades repartidas por toda la ruta del nivel (no solo las primeras); `shift` desplaza la elección para no coincidir con otra parte. */
const spreadUnits = (units: Unit[], n: number, shift = 0.5): Unit[] =>
  units.length <= n ? units : Array.from({ length: n }, (_, i) => units[Math.min(units.length - 1, Math.floor(((i + shift) * units.length) / n))]);

/** Producción: una frase por unidad, escrita desde el español, de las reservadas de la prueba y distinta de las que ya salieron como reconocimiento. */
export function milestoneWriteItems(pack: ContentPack, level = "A1", used: Set<string> = new Set(), attempt = 0): Item[] {
  const sentences = new Map(pack.sentences.map((s) => [s.id, s]));
  const size = hitoOf(level);
  const units = levelUnits(pack, level).filter((u) => u.productive !== false);   // lo que solo se reconoce no se pide escrito
  const out: Item[] = [];
  for (const u of spreadUnits(units, size.write, 0.5)) {
    const s = [...rotate(u.parts.reserva ?? [], attempt), ...rotate(u.parts.prueba, attempt)].map((id) => sentences.get(id)).find((x): x is PackSentence => !!x && !used.has(x.id) && x.it.split(/\s+/).length <= size.writeWords);
    if (s) { out.push(writeItemOf(s, u.codes[0])); used.add(s.id); }
  }
  return out;
}

/** Escucha: dictados de oraciones de «Escucha» de unidades repartidas (otras unidades y otras frases que las de producción). */
export function milestoneListenSentences(pack: ContentPack, level = "A1", used: Set<string> = new Set()): PackSentence[] {
  const sentences = new Map(pack.sentences.map((s) => [s.id, s]));
  const out: PackSentence[] = [];
  const size = hitoOf(level);
  for (const u of spreadUnits(levelUnits(pack, level), size.listen, 0.15)) {
    const s = u.parts.escucha.map((id) => sentences.get(id)).find((x): x is PackSentence => !!x && !!x.audio && !used.has(x.id) && x.it.split(/\s+/).length <= size.listenWords);
    if (s) { out.push(s); used.add(s.id); }
  }
  return out;
}

/** Lecturas NO vistas del examen (ninguna unidad las usa): un texto y un documento, sin traducción. */
export const milestoneReadings = (pack: ContentPack, level = "A1"): Reading[] =>
  (pack.readings ?? []).filter((r) => r.exam && !r.listen && r.level === level).sort((a, b) => a.id.localeCompare(b.id));

/** Comprensión auditiva: diálogos de examen que solo se escuchan (el texto no se ve) y se responden con preguntas. Cuentan en la parte «escuchar». */
export const milestoneListening = (pack: ContentPack, level = "A1"): Reading[] =>
  (pack.readings ?? []).filter((r) => r.exam && r.listen && r.level === level).sort((a, b) => a.id.localeCompare(b.id));

/** Tarea oral del hito: una del nivel que cambia con cada intento (se autoevalúa con su rúbrica). */
export const milestoneOralTask = (pack: ContentPack, level = "A1", attempt = 0): SpeakingTask | undefined => {
  const tasks = (pack.speaking?.tasks ?? []).filter((t) => t.level === level);
  return tasks.length ? tasks[attempt % tasks.length] : undefined;
};

export function scoreMilestone(parts: Part[], answers: boolean[], level = "A1") {
  const tally = (p: Part) => ({ correct: answers.filter((a, i) => a && parts[i] === p).length, total: parts.filter((x) => x === p).length });
  const lex = tally("lex"), gram = tally("gram"), write = tally("write"), listen = tally("listen"), read = tally("read");
  const total = answers.length ? answers.filter(Boolean).length / answers.length : 0;
  const need = hitoOf(level).min;
  const partOk = (t: { correct: number; total: number }, part: Part) => t.total >= (need[part] ?? 0) && (t.total ? t.correct / t.total : 1) >= HITO.PASS_PART;   // sin el mínimo de preguntas, la parte no se aprueba sola
  const passed = total >= HITO.PASS_GLOBAL && partOk(lex, "lex") && partOk(gram, "gram") && partOk(write, "write") && partOk(listen, "listen") && partOk(read, "read");
  return { lex, gram, write, listen, read, total, passed };
}

/** La parte oral es autoevaluación: se pasa cumpliendo la mitad de la rúbrica. */
export const oralPassed = (checked: number, total: number): boolean => total > 0 && checked / total >= HITO.PASS_ORAL;

export const milestoneProgress = (prev: UnitProgress | undefined, level: string, score: number, passed: boolean, now: Date): UnitProgress => {
  const p = prev ?? emptyProgress(hitoId(level));
  return { ...p, tries: (p.tries ?? 0) + 1, testBest: Math.max(p.testBest ?? 0, score), completed: passed || p.completed, completedAt: passed && !p.completed ? now.toISOString() : p.completedAt };
};

/** El examen se abre al completar todas las unidades del nivel (las de sus módulos, si los tiene) o en modo de prueba. */
export const milestoneOpen = (pack: ContentPack, done: Set<string>, level = "A1", preview = false): boolean =>
  preview || levelUnits(pack, level).every((u) => done.has(u.id));
