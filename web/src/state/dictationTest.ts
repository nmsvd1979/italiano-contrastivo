import type { ContentPack } from "../content/load";
import { alignWords } from "./align";
import { gradeWrite } from "./write";

/**
 * Prueba técnica del dictado (2026-11-22): ¿sirve el reconocimiento de voz del iPhone como comprobador de pronunciación?
 * Hay dos preguntas distintas. (1) ¿Entiende frases normales en italiano? (2) ¿Distingue una consonante simple de una doble
 * (nono / nonno), o corrige tu pronunciación hacia la palabra más probable? Solo si (2) funciona sirve para detectar errores.
 */
export type DictItem = { id: string; kind: "frase" | "par"; say: string; other?: string; unit?: string };

const PAIRS: [string, string][] = [["il nonno", "il nono"], ["una palla", "una pala"], ["la penna", "la pena"]];
const UNITS = ["u64", "u63", "u18", "u19", "u20"]; // consonantes dobles, gn/z, c/g, sc, gli

export function buildDictationItems(pack: Pick<ContentPack, "course" | "sentences">, perUnit = 2): DictItem[] {
  const byId = new Map(pack.sentences.map((s) => [s.id, s]));
  const items: DictItem[] = [];
  for (const id of UNITS) {
    const unit = pack.course.units.find((u) => u.id === id);
    if (!unit) continue;
    const picked = unit.parts.escucha.map((sid) => byId.get(sid)).filter((s): s is NonNullable<typeof s> => !!s && s.it.split(/\s+/).length <= 7).slice(0, perUnit);
    for (const s of picked) items.push({ id: `f_${s.id}`, kind: "frase", say: s.it, unit: id });
  }
  for (const [a, b] of PAIRS) {
    items.push({ id: `p_${a}`, kind: "par", say: a, other: b }, { id: `p_${b}`, kind: "par", say: b, other: a });
  }
  return items;
}

export type Outcome = "exacto" | "cerca" | "lejos" | "fiel" | "confundido" | "otro";
export type Method = "teclado" | "navegador";
export type Attempt = { id: string; kind: DictItem["kind"]; say: string; heard: string; method: Method; outcome: Outcome; ratio: number };

export function classify(item: DictItem, heard: string): { outcome: Outcome; ratio: number } {
  const ratio = alignWords(item.say, heard).ratio;
  if (item.kind === "par") {
    if (gradeWrite(heard, [item.say]).result === "ok") return { outcome: "fiel", ratio };
    if (item.other && gradeWrite(heard, [item.other]).result === "ok") return { outcome: "confundido", ratio };
    return { outcome: "otro", ratio };
  }
  if (gradeWrite(heard, [item.say]).result === "ok") return { outcome: "exacto", ratio };
  return { outcome: ratio >= 0.8 ? "cerca" : "lejos", ratio };
}

export type Summary = { method: Method; frases: { n: number; exacto: number; cerca: number }; pares: { n: number; fiel: number; confundido: number } };

export function summarize(attempts: Attempt[], method: Method): Summary {
  const mine = attempts.filter((a) => a.method === method);
  const frases = mine.filter((a) => a.kind === "frase"), pares = mine.filter((a) => a.kind === "par");
  const count = (xs: Attempt[], o: Outcome) => xs.filter((a) => a.outcome === o).length;
  return { method, frases: { n: frases.length, exacto: count(frases, "exacto"), cerca: count(frases, "cerca") }, pares: { n: pares.length, fiel: count(pares, "fiel"), confundido: count(pares, "confundido") } };
}

/** Veredicto honesto a partir de los números (umbrales míos, no de una fuente). */
export function verdict(s: Summary): string {
  if (s.frases.n === 0 && s.pares.n === 0) return "Sin datos de este método.";
  const frases = s.frases.n ? (s.frases.exacto + s.frases.cerca) / s.frases.n : 0;
  const pares = s.pares.n ? s.pares.fiel / s.pares.n : 0;
  if (s.frases.n && frases < 0.6) return "No entiende bien tu italiano: no sirve como comprobador.";
  if (s.pares.n < 4) return "Faltan pares para saber si distingue consonantes simples de dobles.";
  if (pares >= 0.8) return "Entiende las frases y distingue simple/doble: podría servir como comprobador (hay que confirmarlo con más uso).";
  return "Entiende las frases pero NO distingue simple/doble: sirve para saber si te entienden, no para corregir geminadas.";
}

export function reportText(attempts: Attempt[], env: string): string {
  const line = (s: Summary) => `${s.method}: frases ${s.frases.exacto} exactas + ${s.frases.cerca} cercanas de ${s.frases.n}; pares ${s.pares.fiel} fieles y ${s.pares.confundido} confundidos de ${s.pares.n}. ${verdict(s)}`;
  return [`Prueba de dictado — ${env}`, line(summarize(attempts, "teclado")), line(summarize(attempts, "navegador")), "", ...attempts.map((a) => `${a.method} | ${a.kind} | dije «${a.say}» | escribió «${a.heard}» | ${a.outcome}`)].join("\n");
}
