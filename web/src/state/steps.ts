import type { ContentPack, PackSentence, Unit } from "../content/load";
import type { Item } from "../generated/item";
import type { StepId } from "./store";
import type { Kind, Samples } from "./timing";
import { estimateSeconds } from "./timing";

import { TARGET_MINUTES } from "./targets";

export const PRACTICE_TARGET_SECONDS = TARGET_MINUTES.practica * 60; // cada tanda de práctica
/** Presupuesto de cada bloque de la sesión de las fuentes (segundos): lectura 7 min, voz 8 min. */
export const LECTURA_SECONDS = 7 * 60;
export const VOZ_SECONDS = TARGET_MINUTES.escucha * 60;
export const DICTATIONS_IN_VOICE = 6;
export const TEST_ITEMS = 10;
export const PRACTICE_MAX = 40;

export const kindOf = (item: Item): Kind =>
  item.type === "choice_l1_distractor" ? "choice" : item.type === "cloze" ? "cloze" : item.type === "reorder" ? "reorder" : "translate";

const sentenceIndex = (pack: ContentPack) => new Map(pack.sentences.map((s) => [s.id, s]));
const unitItems = (unit: Unit, pack: ContentPack, sentenceIds: string[]): Map<string, Item[]> => {
  const wanted = new Set(sentenceIds);
  const map = new Map<string, Item[]>(sentenceIds.map((id) => [id, []]));
  for (const it of pack.itemsByCode[unit.codes[0]] ?? []) {
    const sid = (it as Item & { sentence_id?: string }).sentence_id;
    if (sid && wanted.has(sid)) map.get(sid)!.push(it);
  }
  return map;
};
const ORDER: Record<string, number> = { choice_l1_distractor: 0, cloze: 1, reorder: 2 };

/**
 * Práctica: da vueltas por las oraciones de la unidad; en cada vuelta toma un tipo de ejercicio distinto por oración
 * (elección → hueco → orden) hasta llegar al tiempo objetivo. Sin repetir ítems.
 */
export function practiceItems(unit: Unit, pack: ContentPack, samples: Samples = {}, targetSeconds = PRACTICE_TARGET_SECONDS, part: 1 | 2 = 1): Item[] {
  const bySentence = unitItems(unit, pack, unit.parts.practica);
  for (const list of bySentence.values()) list.sort((a, b) => (ORDER[a.type ?? ""] ?? 9) - (ORDER[b.type ?? ""] ?? 9));
  // Secuencia completa: en cada vuelta cada oración aporta un tipo distinto (elección → hueco → orden), sin repetir ítems.
  const seq: Item[] = [];
  for (let round = 0; round < 3; round++) {
    for (const [i, id] of unit.parts.practica.entries()) {
      const list = bySentence.get(id) ?? [];
      const it = list[(i + round) % Math.max(1, list.length)];
      if (it && !seq.includes(it)) seq.push(it);
    }
  }
  // La tanda 1 toma ítems hasta el tiempo objetivo; la tanda 2 sigue donde terminó la 1 (otras frases u otros tipos).
  const take = (from: number): Item[] => {
    const out: Item[] = [];
    let seconds = 0;
    for (let i = from; i < seq.length && seconds < targetSeconds && out.length < PRACTICE_MAX; i++) {
      out.push(seq[i]);
      seconds += estimateSeconds(kindOf(seq[i]), samples);
    }
    return out;
  };
  const first = take(0);
  const chosen = part === 1 ? first : take(first.length);
  // Andamiaje: de reconocer (elección) a recordar (hueco) y a producir (orden); dentro de cada tipo se conserva el orden.
  return chosen.map((it, i) => ({ it, i })).sort((a, b) => (ORDER[a.it.type ?? ""] ?? 9) - (ORDER[b.it.type ?? ""] ?? 9) || a.i - b.i).map((x) => x.it);
}

/** Prueba: solo oraciones reservadas (no están en la práctica). Una elección por oración y huecos/orden para completar 10. */
export function testItems(unit: Unit, pack: ContentPack): Item[] {
  const bySentence = unitItems(unit, pack, unit.parts.prueba);
  const out: Item[] = [];
  for (const [id] of [...bySentence]) {
    const choice = bySentence.get(id)!.find((x) => x.type === "choice_l1_distractor");
    if (choice) out.push(choice);
  }
  for (const [id, list] of bySentence) {
    if (out.length >= TEST_ITEMS) break;
    const extra = list.find((x) => x.type === "cloze") ?? list.find((x) => x.type === "reorder");
    if (extra && !out.includes(extra)) out.push(extra);
  }
  for (const [id, list] of bySentence) {
    if (out.length >= TEST_ITEMS) break;
    const extra = list.find((x) => !out.includes(x));
    if (extra) out.push(extra);
  }
  return out.slice(0, TEST_ITEMS);
}

/**
 * Reconstrucción (andamiaje inverso): huecos solo en el punto de divergencia, sobre las oraciones de la unidad, hasta llenar
 * lo que le queda al bloque de lectura (7 min menos las tarjetas y preguntas de «Descubre»). Prefiere hueco, luego orden y elección.
 */
export function reconstructionItems(unit: Unit, pack: ContentPack, samples: Samples = {}): Item[] {
  const t = (k: Kind, n = 1) => estimateSeconds(k, samples) * n;
  const target = LECTURA_SECONDS - (t("notice", unit.parts.descubre.length) + t("choice", 2));
  const order = [...new Set([...unit.parts.descubre, ...unit.parts.escucha, ...unit.parts.practica])];
  const bySentence = unitItems(unit, pack, order);
  const out: Item[] = [];
  let seconds = 0;
  for (const type of ["cloze", "reorder", "choice_l1_distractor"]) {
    for (const id of order) {
      if (seconds >= target || out.length >= 18) break;
      const it = bySentence.get(id)?.find((x) => x.type === type);
      if (it) { out.push(it); seconds += estimateSeconds(kindOf(it), samples); }
    }
  }
  return out;
}

/** Frases para repetir en voz alta: cortas y distintas de las del dictado. */
export function shadowSentences(unit: Unit, pack: ContentPack, n = 14): PackSentence[] {
  const idx = sentenceIndex(pack);
  const heard = new Set(unit.parts.escucha.slice(0, DICTATIONS_IN_VOICE));
  const words = (x: PackSentence) => x.it.split(/\s+/).length;
  return unit.parts.practica.filter((id) => !heard.has(id)).map((id) => idx.get(id)).filter((x): x is PackSentence => !!x && !!x.audio && words(x) <= 9)
    .sort((a, b) => words(a) - words(b)).slice(0, n);
}

export type VoiceItem = { kind: "dictation"; sentence: PackSentence } | { kind: "shadow"; sentence: PackSentence };
/** Bloque «Sonidos y voz»: dictados y luego repetir en voz alta, hasta ≈8 min. */
export function voiceItems(unit: Unit, pack: ContentPack, samples: Samples = {}): VoiceItem[] {
  const dict: VoiceItem[] = dictationSentences(unit, pack).slice(0, DICTATIONS_IN_VOICE).map((sentence) => ({ kind: "dictation", sentence }));
  let seconds = dict.length * estimateSeconds("dictation", samples);
  const out = [...dict];
  for (const sentence of shadowSentences(unit, pack)) {
    if (seconds >= VOZ_SECONDS) break;
    out.push({ kind: "shadow", sentence });
    seconds += estimateSeconds("shadow", samples);
  }
  return out;
}

export const dictationSentences = (unit: Unit, pack: ContentPack): PackSentence[] => {
  const idx = sentenceIndex(pack);
  return unit.parts.escucha.map((id) => idx.get(id)).filter((s): s is PackSentence => !!s);
};

export type NoticeCard = { sentence: PackSentence; start: number; end: number; wrong: string };
export const unitSentences = (unit: Unit, pack: ContentPack): PackSentence[] => {
  const idx = sentenceIndex(pack);
  return unit.parts.practica.map((id) => idx.get(id)).filter((x): x is PackSentence => !!x);
};
export const noticeCards = (unit: Unit, pack: ContentPack): NoticeCard[] => {
  const idx = sentenceIndex(pack);
  return unit.divergences.flatMap((d) => {
    const sentence = idx.get(d.id);
    return sentence ? [{ sentence, start: d.start, end: d.end, wrong: d.wrong }] : [];
  });
};

export type MeaningQuestion = { sentence: PackSentence; options: string[]; answer: number };
/**
 * Preguntas de inferencia: «¿qué significa?» con 3 traducciones (la real y dos de otras oraciones de la unidad con
 * traducción distinta). Los distractores salen de toda la unidad, no solo de las tarjetas mostradas.
 */
export function meaningQuestions(cards: NoticeCard[], pool: PackSentence[] = [], count = 2): MeaningQuestion[] {
  const universe = [...cards.map((c) => c.sentence), ...pool];
  return cards.slice(0, count).map(({ sentence }, qi) => {
    const others: string[] = [];
    for (const s of universe) {
      if (others.length >= 2) break;
      if (s.es !== sentence.es && !others.includes(s.es)) others.push(s.es);
    }
    const options = [...others];
    const answer = (qi + 1) % (others.length + 1);
    options.splice(answer, 0, sentence.es);
    return { sentence, options, answer };
  });
}

/** Segundos estimados de cada paso de la unidad (la cápsula cuenta explicación + trigger + sus ítems). */
export function readingOf(unit: Unit, pack: ContentPack) {
  return (pack.readings ?? []).find((r) => unit.readings?.includes(r.id));
}

/** Segundos estimados de cada paso de la unidad (la cápsula cuenta explicación + trigger + sus ítems). */
export function stepSeconds(unit: Unit, step: StepId, pack: ContentPack, samples: Samples = {}): number {
  const t = (k: Kind, n = 1) => estimateSeconds(k, samples) * n;
  const sum = (items: Item[]) => items.reduce((s, it) => s + estimateSeconds(kindOf(it), samples), 0);
  switch (step) {
    case "descubre": return t("notice", unit.parts.descubre.length) + t("choice", 2) + sum(reconstructionItems(unit, pack, samples));
    case "lectura": {
      const r = readingOf(unit, pack);
      return r ? t("notice", r.sentences.length) + t("choice", r.questions.length) : 0; // leer + oír + comprobar cada oración, y responder
    }
    case "capsula": {
      const cap = pack.capsules.find((c) => c.target_error_codes[0] === unit.codes[0]);
      return t("translate") + 20 + (cap?.retrieval.reduce((s, it) => s + estimateSeconds(kindOf(it as Item), samples), 0) ?? 0);
    }
    case "practica": return sum(practiceItems(unit, pack, samples, PRACTICE_TARGET_SECONDS, 1));
    case "practica2": return sum(practiceItems(unit, pack, samples, PRACTICE_TARGET_SECONDS, 2));
    case "escucha": return voiceItems(unit, pack, samples).reduce((a, v) => a + estimateSeconds(v.kind, samples), 0);
    case "prueba": return sum(testItems(unit, pack));
  }
}
