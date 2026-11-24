import type { ModuleView } from "./modules";
import type { UnitProgress } from "./store";

/** Clave estable de un «sé hacer» (hash corto del texto): las marcas viven en `done` del progreso del módulo, como las partes `salida:*`. */
export function canDoKey(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `sabe:${h.toString(36)}`;
}

/** Marca o desmarca un «sé hacer» en el progreso de un módulo; no toca nada más. */
export function setCanDo(p: UnitProgress, text: string, on: boolean, now: Date): UnitProgress {
  const key = canDoKey(text);
  const { [key]: _old, ...rest } = p.done;
  return { ...p, done: on ? { ...rest, [key]: now.toISOString() } : rest };
}

export type CanDoItem = { text: string; state: "probado" | "marcado" | "pendiente" };
export type CanDoGroup = { moduleId: string; title: string; index: number; state: ModuleView["state"]; items: CanDoItem[] };

/**
 * Lo que ya sabes hacer: «probado» si el módulo está completado (prueba de cierre ≥ 80 % o prueba de ubicación), «marcado» si lo marcaste tú
 * en el Cierre (autoevaluación) y «pendiente» si no. `known` suma probados y marcados.
 */
export function canDoSummary(modules: ModuleView[]): { known: number; total: number; groups: CanDoGroup[] } {
  const groups: CanDoGroup[] = [];
  let known = 0, total = 0;
  for (const m of modules) {
    if (!m.module.can_do_es.length) continue;
    const items = m.module.can_do_es.map((text): CanDoItem => ({
      text, state: m.state === "completed" ? "probado" : m.progress.done[canDoKey(text)] ? "marcado" : "pendiente",
    }));
    known += items.filter((i) => i.state !== "pendiente").length;
    total += items.length;
    groups.push({ moduleId: m.module.id, title: m.module.title, index: m.index, state: m.state, items });
  }
  return { known, total, groups };
}
