import type { ContentPack, Lexeme, Unit } from "../content/load";
import { newCard } from "./srs";
import type { Store } from "./store";

/** Las palabras de las unidades de vocabulario entran al repaso espaciado con referencia `w:<palabra>` (los falsos amigos usan su id propio). */
export const WORD_PREFIX = "w:";

/** La palabra de una unidad de vocabulario con la forma de un lexema, para mostrarla en el repaso. */
export function wordLexeme(pack: Pick<ContentPack, "course">, ref: string): Lexeme | undefined {
  if (!ref.startsWith(WORD_PREFIX)) return undefined;
  const form = ref.slice(WORD_PREFIX.length);
  for (const u of pack.course.units) {
    const w = u.words?.find((x) => x.form === form);
    if (w) return { id: ref, form: w.form, gloss_es: w.gloss, lexical_type: "neutral", source: `vocabulario: ${u.title}`, audio: w.audio };
  }
  return undefined;
}

/** Al terminar «Palabras» cada palabra de la unidad se vuelve una tarjeta nueva del repaso (una sola vez: repetir el paso no las duplica). */
export async function addWordCards(store: Store, unit: Unit, now: Date): Promise<number> {
  const have = new Set((await store.allCards()).map((c) => c.id));
  let added = 0;
  for (const w of unit.words ?? []) {
    const card = newCard({ kind: "lexeme", ref: `${WORD_PREFIX}${w.form}` }, "neutral", now);
    if (have.has(card.id)) continue;
    await store.putCard(card);
    added++;
  }
  return added;
}
