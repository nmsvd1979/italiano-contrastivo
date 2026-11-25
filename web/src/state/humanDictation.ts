import type { ContentPack, HumanSentence, PackSentence } from "../content/load";

/** Frases por ronda del dictado con voz humana. */
export const HUMAN_DICTATION_SIZE = 8;
/** Id del dictado de un módulo dentro de «Textos reales» (`extra_readings`): no es una lectura. */
export const humanDictationId = (moduleId: string) => `vh_${moduleId}`;
export const isHumanDictation = (id: string) => id.startsWith("vh_");

function shuffle<T>(xs: T[], seed: number): T[] {
  const out = [...xs];
  let s = (seed * 2654435761) >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const asSentence = (h: HumanSentence): PackSentence => ({ id: h.id, it: h.it, es: h.es, cefr_estimate: "A1", source_id: h.tatoeba });

/**
 * Ronda del dictado con voz humana de un módulo: primero frases del módulo y, si no alcanzan 8, de los módulos anteriores del mismo nivel;
 * en orden al azar (estable por `attempt`). Las frases suenan con la grabación de Tatoeba, no con la voz sintética.
 */
export function humanDictationRound(pack: Pick<ContentPack, "course" | "listeningHuman">, moduleId: string, attempt = 0): PackSentence[] {
  const mods = pack.course.modules ?? [];
  const me = mods.find((m) => m.id === moduleId);
  if (!me) return [];
  const earlier = new Set(mods.slice(0, mods.indexOf(me)).filter((m) => m.level === me.level).map((m) => m.id));
  const bank = pack.listeningHuman ?? [];
  const seed = [...moduleId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11) + attempt * 131;
  const own = shuffle(bank.filter((h) => h.module === moduleId), seed);
  const prev = shuffle(bank.filter((h) => earlier.has(h.module)), seed + 1);
  return shuffle([...own, ...prev].slice(0, HUMAN_DICTATION_SIZE), seed + 2).map(asSentence);
}
