import type { ContentPack, Reading } from "../content/load";

/** Releer y reescuchar a velocidad creciente: la misma lectura tres veces, cada vez más rápido y con menos apoyo (fluidez, no estudio nuevo). */
export type Pass = { rate: number; label: string; showText: boolean; help: string };
export const PASSES: Pass[] = [
  { rate: 0.8, label: "Despacio", showText: true, help: "Sigue el texto con los ojos mientras lo oyes." },
  { rate: 1, label: "Normal", showText: true, help: "Sigue el texto; intenta ir un poco por delante de la voz." },
  { rate: 1.15, label: "Rápido", showText: false, help: "Sin mirar el texto: solo escucha y entiende. Si te pierdes, míralo." },
];

/** Lecturas de las unidades que ya completaste (lo que ya entiendes: la fluidez se entrena con material fácil). */
export function fluencyReadings(pack: ContentPack, done: Set<string>): Reading[] {
  const ids = new Set(pack.course.units.filter((u) => done.has(u.id)).flatMap((u) => u.readings ?? []));
  return (pack.readings ?? []).filter((r) => ids.has(r.id) && r.sentences.every((s) => s.audio));
}
