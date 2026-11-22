import type { Card } from "../generated/card";
import type { Item } from "../generated/item";
import { alignWords, type Alignment } from "./align";
import { newCard } from "./srs";

/**
 * Correcciones → repaso. Cuando una IA (o tú) corrige un texto tuyo, cada oración corregida se vuelve un ejercicio de repaso espaciado:
 * un hueco con lo que cambió (o, si lo único que había era una palabra de más, elegir la versión correcta). Se guarda dentro de la tarjeta
 * (`payload`), así entra a la copia de seguridad y al repaso sin tablas nuevas.
 */
export type Fix = { id: string; wrong: string; right: string; item: Item };
export const MAX_FIXES = 6;

const sentences = (t: string) => t.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
const hash = (s: string) => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };

/** Primer tramo de palabras seguidas marcadas como cambiadas. */
function firstRun(segs: Alignment["mine"]): { start: number; end: number } | null {
  const start = segs.findIndex((s) => s.changed);
  if (start < 0) return null;
  let end = start;
  while (end + 1 < segs.length && segs[end + 1].changed) end++;
  return { start, end };
}

const stripPunct = (w: string) => { const m = w.match(/^([^\p{L}\p{N}']*)(.*?)([^\p{L}\p{N}']*)$/su)!; return { pre: m[1], core: m[2], post: m[3] }; };

export function fixFor(wrong: string, right: string): Fix | null {
  const al = alignWords(wrong, right);              // original = lo que escribiste; mine = lo correcto
  const rightRun = firstRun(al.mine), wrongRun = firstRun(al.original);
  if (!rightRun && !wrongRun) return null;          // iguales
  const id = `fx_${hash(right)}`;
  const base = { id: `it_${id}`, requires_server: false as const, review_status: "validated" as const };
  if (rightRun) {
    const toks = al.mine.map((s) => s.text);
    const first = stripPunct(toks[rightRun.start]), last = stripPunct(toks[rightRun.end]);
    const answer = [first.core, ...toks.slice(rightRun.start + 1, rightRun.end), ...(rightRun.end > rightRun.start ? [last.core] : [])].join(" ");
    const text = [...toks.slice(0, rightRun.start), `${first.pre}___${rightRun.end > rightRun.start ? last.post : first.post}`, ...toks.slice(rightRun.end + 1)].join(" ");
    const before = wrongRun ? al.original.slice(wrongRun.start, wrongRun.end + 1).map((s) => stripPunct(s.text).core).join(" ") : "";
    return { id, wrong, right, item: { ...base, type: "cloze", text, answers: [answer], hint_es: before ? `Antes escribiste: «${before}»` : "Te faltaba una palabra aquí." } as Item };
  }
  // solo sobraba algo: elegir entre la versión correcta y la que escribiste
  return { id, wrong, right, item: { ...base, type: "choice_l1_distractor", prompt_es: "Una de estas frases tiene una palabra de más. ¿Cuál está bien?",
    options: [{ text: right, correct: true }, { text: wrong, correct: false, distractor_kind: "l1_calque" }] } as Item };
}

/** Un ejercicio por oración corregida (se emparejan por posición; si las oraciones no coinciden en número, se toma el texto entero). */
export function fixesFromCorrection(original: string, corrected: string): Fix[] {
  const a = sentences(original), b = sentences(corrected);
  const pairs = a.length === b.length ? a.map((w, i) => [w, b[i]] as const) : [[original.trim(), corrected.trim()] as const];
  const out: Fix[] = [];
  for (const [w, r] of pairs) {
    const f = fixFor(w, r);
    if (f && !out.some((x) => x.id === f.id)) out.push(f);
  }
  return out.slice(0, MAX_FIXES);
}

export const fixCard = (fix: Fix, now: Date): Card => ({ ...newCard({ kind: "writing_fix", ref: fix.id }, "not_applicable", now), payload: { item: fix.item, wrong: fix.wrong, right: fix.right } });
export const fixItemOf = (card: Card): Item | undefined => (card.subject.kind === "writing_fix" ? (card.payload as { item?: Item } | undefined)?.item : undefined);
