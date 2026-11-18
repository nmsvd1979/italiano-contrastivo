import type { ContentPack, PackSentence, Unit } from "../content/load";
import type { Item } from "../generated/item";
import type { Kind, Samples } from "./timing";
import { estimateSeconds } from "./timing";

export const PRACTICE_TARGET_SECONDS = 6 * 60;
export const TEST_ITEMS = 10;
export const PRACTICE_MAX = 30;

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
export function practiceItems(unit: Unit, pack: ContentPack, samples: Samples = {}, targetSeconds = PRACTICE_TARGET_SECONDS): Item[] {
  const bySentence = unitItems(unit, pack, unit.parts.practica);
  for (const list of bySentence.values()) list.sort((a, b) => (ORDER[a.type ?? ""] ?? 9) - (ORDER[b.type ?? ""] ?? 9));
  const out: Item[] = [];
  let seconds = 0;
  for (let round = 0; round < 3 && seconds < targetSeconds && out.length < PRACTICE_MAX; round++) {
    for (const [i, id] of unit.parts.practica.entries()) {
      const list = bySentence.get(id) ?? [];
      const it = list[(i + round) % Math.max(1, list.length)];
      if (!it || out.includes(it)) continue;
      out.push(it);
      seconds += estimateSeconds(kindOf(it), samples);
      if (seconds >= targetSeconds || out.length >= PRACTICE_MAX) break;
    }
  }
  // Andamiaje: de reconocer (elección) a recordar (hueco) y a producir (orden); dentro de cada tipo se conserva el orden.
  return out.map((it, i) => ({ it, i })).sort((a, b) => (ORDER[a.it.type ?? ""] ?? 9) - (ORDER[b.it.type ?? ""] ?? 9) || a.i - b.i).map((x) => x.it);
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
export function stepSeconds(unit: Unit, step: "descubre" | "capsula" | "practica" | "escucha" | "prueba", pack: ContentPack, samples: Samples = {}): number {
  const t = (k: Kind, n = 1) => estimateSeconds(k, samples) * n;
  switch (step) {
    case "descubre": return t("notice", unit.parts.descubre.length) + t("choice", 2);
    case "capsula": {
      const cap = pack.capsules.find((c) => c.target_error_codes[0] === unit.codes[0]);
      return t("translate") + 20 + (cap?.retrieval.reduce((s, it) => s + estimateSeconds(kindOf(it as Item), samples), 0) ?? 0);
    }
    case "practica": return practiceItems(unit, pack, samples).reduce((s, it) => s + estimateSeconds(kindOf(it), samples), 0);
    case "escucha": return t("dictation", unit.parts.escucha.length);
    case "prueba": return testItems(unit, pack).reduce((s, it) => s + estimateSeconds(kindOf(it), samples), 0);
  }
}
