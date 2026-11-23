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
    if (w) return { id: ref, form: w.form, gloss_es: w.gloss, lexical_type: "neutral", source: `vocabulario: ${u.title}`, audio: w.audio, art: w.art, gdiv: w.gdiv, ff: w.ff };
  }
  return undefined;
}

/** Al terminar «Palabras» cada palabra de la unidad se vuelve una tarjeta nueva del repaso (una sola vez: repetir el paso no las duplica). */
export async function addWordCards(store: Store, unit: Unit, now: Date): Promise<number> {
  const have = new Set((await store.allCards()).map((c) => c.id));
  let added = 0;
  for (const w of unit.words ?? []) {
    const card = newCard({ kind: "lexeme", ref: `${WORD_PREFIX}${w.form}` }, lexicalTypeOf(w), now);
    if (have.has(card.id)) continue;
    await store.putCard(card);
    added++;
  }
  return added;
}

/** La palabra con su artículo italiano («il latte», «l'acqua»); sin artículo (adjetivos, verbos) queda igual. */
export const withArticle = (form: string, art?: string): string => (art ? (art.endsWith("'") ? art + form : `${art} ${form}`) : form);
export const GENDER_NOTE = "En español es del otro género: no lo deduzcas.";
export const falseFriendNote = (form: string, gloss: string): string => `Falso amigo: se parece a «${form}» en español, pero significa ${gloss}.`;

/** Tamiz de la palabra (EuroComRom, tamices 1–4): qué tan reconocible es para quien habla español. */
export type Sieve = "transparente" | "regular" | "opaca";
export const SIEVE_LABEL: Record<Sieve, string> = { transparente: "se parece al español", regular: "cambio regular", opaca: "opaca: hay que aprenderla" };
/** Correspondencias regulares español → italiano (las etiquetas las fija pipeline/vocab/sieves.json). */
export const RULE_TEXT: Record<string, string> = {
  "cion-zione": "-ción → -zione", "dad-ta": "-dad → -tà", "ch-tt": "ch → tt (noche → notte)", "ll-chi": "ll → chi (llave → chiave)", "ll-pi": "ll → pi (llano → piano)",
  "fl-fi": "fl → fi (flor → fiore)", "pl-pi": "pl → pi", "ie-e": "ie → e (tierra → terra)", "ue-o": "ue → o (puerta → porta)", "ue-uo": "ue → uo (fuego → fuoco)",
  "n-gn": "ñ → gn (montaña → montagna)", "j-gli": "j → gli (hijo → figlio)", "j-cchi": "j → cchi (ojo → occhio)", "h-f": "h → f (hacer → fare)", "u-o": "u → o (dulce → dolce)",
  "x-s": "x → s (examen → esame)", "doble": "consonante doble en italiano (taza → tazza)", "inf-e": "-ar/-er/-ir → -are/-ere/-ire", "otro": "otra correspondencia",
};
export const sieveText = (w: { sieve?: Sieve; rule?: string }): string =>
  w.sieve === "regular" ? `${SIEVE_LABEL.regular}${w.rule ? `: ${RULE_TEXT[w.rule] ?? w.rule}` : ""}` : w.sieve ? SIEVE_LABEL[w.sieve] : "";

/** Tipo léxico de la tarjeta: calibra FSRS (parecidas = intervalos largos; falso amigo = cortos). */
export const lexicalTypeOf = (w: { sieve?: Sieve; ff?: boolean }): "cognate" | "neutral" | "false_friend" =>
  w.ff ? "false_friend" : w.sieve === "transparente" || w.sieve === "regular" ? "cognate" : "neutral";
