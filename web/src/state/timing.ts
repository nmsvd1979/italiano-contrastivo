/** Cuánto tarda cada tipo de ejercicio. Valores a priori conservadores que se reemplazan por lo MEDIDO en el uso real. */
export type Kind = "choice" | "cloze" | "reorder" | "translate" | "dictation" | "notice" | "flashcard";

export const PRIORS: Record<Kind, number> = { choice: 12, cloze: 20, reorder: 30, translate: 45, dictation: 50, notice: 25, flashcard: 15 };
export type Samples = Partial<Record<Kind, number[]>>;
const MAX_SAMPLES = 30;
const FULL_WEIGHT = 5; // con 5 mediciones la estimación depende solo de ellas

/** Segundos esperados: mezcla el a priori con las mediciones hasta tener 5; luego la mediana. */
export function estimateSeconds(kind: Kind, samples: Samples = {}): number {
  const xs = samples[kind] ?? [];
  if (xs.length >= FULL_WEIGHT) {
    const s = [...xs].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  return (PRIORS[kind] * (FULL_WEIGHT - xs.length) + xs.reduce((a, b) => a + b, 0)) / FULL_WEIGHT;
}

/** Una medición plausible: ignora olvidos (app abierta sin tocar) y toques instantáneos. */
export const plausible = (seconds: number) => seconds >= 1 && seconds <= 240;

export function addSample(samples: Samples, kind: Kind, seconds: number): Samples {
  if (!plausible(seconds)) return samples;
  return { ...samples, [kind]: [...(samples[kind] ?? []), seconds].slice(-MAX_SAMPLES) };
}

export const totalSeconds = (kinds: Kind[], samples: Samples = {}) => kinds.reduce((t, k) => t + estimateSeconds(k, samples), 0);

/** «≈ 5 min» para bloques largos; «menos de 1 min» / «≈ 40 s» para los cortos (no se redondea 40 s a 1 min). */
export function formatDuration(seconds: number): string {
  if (seconds < 20) return "menos de 1 min";
  if (seconds < 90) return `≈ ${Math.round(seconds / 10) * 10} s`;
  return `≈ ${Math.max(2, Math.round(seconds / 60))} min`;
}

const KEY = "italiano-contrastivo.timing.v1";
export function loadSamples(): Samples {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}
export function recordSample(kind: Kind, seconds: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(addSample(loadSamples(), kind, seconds)));
  } catch {
    // sin almacenamiento: se sigue con los valores a priori
  }
}
