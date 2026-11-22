import type { DayProgress, StepId, Store } from "./store";
import { localDate } from "./store";

/**
 * Las cuatro hebras de un curso equilibrado (Nation): entender mensajes, producir mensajes, estudiar la lengua y ganar fluidez con material
 * fácil. Es una guía de reparto, no una proporción demostrada (el propio autor la presenta como criterio para auditar un curso). La app
 * mide el tiempo ACTIVO real por hebra para que el reparto se vea, en vez de suponerlo.
 */
export type Strand = "entrada" | "foco" | "salida" | "fluidez";
export const STRANDS: Strand[] = ["entrada", "foco", "salida", "fluidez"];
export const STRAND_LABEL: Record<Strand, string> = { entrada: "Entender", foco: "Estudiar la lengua", salida: "Escribir y hablar", fluidez: "Fluidez" };
export const STRAND_HELP: Record<Strand, string> = {
  entrada: "leer y escuchar para entender el mensaje (lecturas, textos, series, podcasts)",
  foco: "estudiar la forma: ver reglas, practicar, repasar tarjetas",
  salida: "producir tú: escribir frases y textos, hablar",
  fluidez: "repetir y reconocer rápido lo que ya sabes (escucha y repetición)",
};
/** Qué hebra trabaja cada paso de una unidad. */
export const STRAND_OF_STEP: Record<StepId, Strand> = { descubre: "foco", palabras: "foco", lectura: "entrada", capsula: "foco", practica: "foco", practica2: "foco", escucha: "fluidez", prueba: "salida" };

export type Seconds = Partial<Record<Strand, number>>;
/** Una pausa de más de 2 minutos sin tocar la pantalla (o la app en segundo plano) no cuenta como estudio. */
export const IDLE_MS = 120_000;

export const addSeconds = (day: DayProgress, strand: Strand, seconds: number): DayProgress =>
  ({ ...day, seconds: { ...day.seconds, [strand]: (day.seconds?.[strand] ?? 0) + seconds } });

export function lastDates(today: string, n = 7): string[] {
  const base = new Date(`${today}T12:00:00`);
  return Array.from({ length: n }, (_, i) => localDate(new Date(base.getTime() - i * 86_400_000)));
}

/** Segundos por hebra en los últimos `n` días (incluido hoy). */
export function weekTotals(days: DayProgress[], today: string, n = 7): Seconds {
  const keep = new Set(lastDates(today, n));
  const out: Seconds = {};
  for (const d of days) if (keep.has(d.date)) for (const s of STRANDS) if (d.seconds?.[s]) out[s] = (out[s] ?? 0) + d.seconds[s]!;
  return out;
}

export const totalSeconds = (s: Seconds): number => STRANDS.reduce((t, k) => t + (s[k] ?? 0), 0);

/** Suma segundos a la hebra del día de hoy. No debe romper el estudio si falla el guardado. */
export async function addDaySeconds(store: Store, strand: Strand, seconds: number, now = new Date()): Promise<void> {
  try {
    const day = await store.getDay(localDate(now));
    await store.putDay(addSeconds(day, strand, seconds));
  } catch { /* sin almacenamiento: se pierde esta medición, no el estudio */ }
}
