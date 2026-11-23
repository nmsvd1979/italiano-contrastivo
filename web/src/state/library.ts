import type { Resource, ResourceKind } from "../content/load";

export const KIND_LABEL: Record<ResourceKind, string> = {
  video: "Video", podcast: "Podcast", audio: "Audio", lectura: "Lectura", diccionario: "Diccionario", pronunciacion: "Pronunciación", curso: "Curso o libro", examen: "Exámenes de práctica", referencia: "Referencia",
};
export const LANG_LABEL: Record<Resource["lang"], string> = { it: "explica en italiano", es: "explica en español", en: "explica en inglés", mixto: "explica en varios idiomas" };
export type LevelFilter = Resource["levels"][number] | "todos";
export const LEVEL_FILTERS: LevelFilter[] = ["A1", "A2", "B1", "B2", "todos"];

/** Recursos de un nivel (o todos), los gratuitos primero y luego por tipo y título: orden estable. */
export function pick(library: Resource[], level: LevelFilter, kind: ResourceKind | "todos" = "todos"): Resource[] {
  const cost = { gratis: 0, freemium: 1, pago: 2 } as const;
  return library
    .filter((r) => (level === "todos" || r.levels.includes(level)) && (kind === "todos" || r.kind === kind))
    .sort((a, b) => cost[a.cost] - cost[b.cost] || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
}
export const kindsIn = (library: Resource[]): ResourceKind[] => [...new Set(library.map((r) => r.kind))].sort();
