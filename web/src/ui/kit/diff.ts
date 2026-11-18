/** Resalta lo que cambia: devuelve las palabras de la respuesta correcta marcando las que no aparecen en lo que escribió el usuario. */
export type Seg = { text: string; changed: boolean };

const strip = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

export function diffWords(correct: string, chosen: string): Seg[] {
  const have = new Map<string, number>();
  for (const w of chosen.split(/\s+/).filter(Boolean)) have.set(strip(w), (have.get(strip(w)) ?? 0) + 1);
  return correct.split(/\s+/).filter(Boolean).map((w) => {
    const k = strip(w), n = have.get(k) ?? 0;
    if (n > 0) { have.set(k, n - 1); return { text: w, changed: false }; }
    return { text: w, changed: true };
  });
}

/** Frase completa con el hueco rellenado y la respuesta resaltada. */
export function fillSegments(text: string, answer: string): Seg[] {
  const [before, after = ""] = text.split("___");
  return [{ text: before, changed: false }, { text: answer, changed: true }, { text: after, changed: false }];
}
