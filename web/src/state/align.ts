import type { Seg } from "../ui/kit/diff";

/**
 * Compara dos textos palabra por palabra EN ORDEN (subsecuencia común más larga). A diferencia de `diffWords` (bolsa de palabras),
 * detecta lo que falta, lo que sobra y lo que cambió de lugar, que es lo que importa al reescribir un texto de memoria.
 * Se comparan minúsculas y sin puntuación, pero con acentos: «e» y «è» son palabras distintas.
 */
const key = (w: string) => w.normalize("NFC").toLowerCase().replace(/[’`´]/g, "'").replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
const tokens = (s: string) => s.split(/\s+/).filter((w) => key(w));

export type Alignment = {
  original: Seg[];  // el texto de referencia; `changed` = palabra que no escribiste (o no en su sitio)
  mine: Seg[];      // lo que escribiste; `changed` = palabra que sobra o está fuera de lugar
  matched: number;
  total: number;    // palabras del original
  ratio: number;    // matched / total
};

export function alignWords(original: string, mine: string): Alignment {
  const a = tokens(original), b = tokens(mine);
  const ka = a.map(key), kb = b.map(key);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = ka[i] === kb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const okA = new Array(a.length).fill(false), okB = new Array(b.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (ka[i] === kb[j]) { okA[i] = okB[j] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const matched = dp[0][0];
  return {
    original: a.map((text, i) => ({ text, changed: !okA[i] })),
    mine: b.map((text, j) => ({ text, changed: !okB[j] })),
    matched, total: a.length, ratio: a.length ? matched / a.length : 0,
  };
}
