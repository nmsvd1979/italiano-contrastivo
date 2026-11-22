import type { Item } from "../generated/item";
import type { PackSentence } from "../content/load";

/**
 * Corrección de «Escribe en italiano». Compara con la traducción guardada, que es UNA de varias posibles: por eso se tolera lo que no
 * cambia el sentido (mayúsculas, puntuación, apóstrofo con espacio, pronombre sujeto io/tu/noi/voi, que el italiano puede omitir) y,
 * para lo demás, quien responde puede declarar que su versión también es válida. Los acentos NO se perdonan: «perche» no es «perché».
 */
export type WriteResult = { result: "ok" | "accent" | "wrong"; best: string };

const SUBJECT = /^(io|tu|noi|voi)\s+/;
const clean = (s: string) =>
  s.normalize("NFC").toLowerCase().replace(/[’`´]/g, "'").replace(/'\s+/g, "'").replace(/[.,;:!?¡¿«»"“”()]/g, " ").replace(/\s+/g, " ").trim().replace(SUBJECT, "");
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");

const shared = (a: string, b: string) => {
  const A = new Set(clean(a).split(" "));
  return clean(b).split(" ").filter((w) => A.has(w)).length;
};

export function gradeWrite(answer: string, accepted: string[]): WriteResult {
  const mine = clean(answer);
  for (const a of accepted) if (clean(a) === mine) return { result: "ok", best: a };
  for (const a of accepted) if (fold(clean(a)) === fold(mine)) return { result: "accent", best: a };
  const best = accepted.reduce((b, a) => (shared(answer, a) > shared(answer, b) ? a : b), accepted[0]);
  return { result: "wrong", best };
}

export type WriteItem = Extract<Item, { type?: "translate_es_it" }>;
/** Ítem de escritura armado desde una oración validada: el español de pista y el italiano como respuesta. */
export const writeItemOf = (s: PackSentence, code?: string): WriteItem =>
  ({ id: `write_${s.id}`, type: "translate_es_it", source_es: s.es, accepted_it: [s.it], sentence_id: s.id, requires_server: false, review_status: "validated", ...(code ? { target_error_codes: [code] } : {}) }) as WriteItem;
