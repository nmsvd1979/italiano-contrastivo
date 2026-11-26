import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { readPack } from "../test/realPack";
import { emptyProgress } from "./course";
import { moduleProgressId, moduleViews } from "./modules";
import { planToday } from "./session";
import type { UnitProgress } from "./store";

const NOW = new Date("2026-11-26T12:00:00");
const day = { date: "2026-11-26", reviewsDone: 0, capsulesDone: [] as string[] };

/** El mismo curso real con un nivel A2 añadido (un módulo con u09–u11) y los hitos declarados: lo que verá el usuario cuando A2 exista. */
function withA2Shell(pack: ContentPack): ContentPack {
  const c = pack.course;
  const a2 = { ...c.modules![0], id: "a2m01", level: "A2", units: ["u09", "u10", "u11"] };
  return { ...pack, course: { ...c, levels: c.levels.map((l) => (l.id === "A1" ? { ...l, milestone: true } : l.id === "A2" ? { ...l, milestone: false } : l)), modules: [...c.modules!, a2] } } as ContentPack;
}

/** Progreso como el de un usuario real a medias: m01–m04 completos, m05 con la Entrada y una cápsula, u09 completada por la prueba de ubicación. */
function midProgress(pack: ContentPack): UnitProgress[] {
  const mods = pack.course.modules!;
  const out: UnitProgress[] = [];
  const iso = NOW.toISOString();
  for (const m of mods.slice(0, 4)) {
    for (const id of m.units) out.push({ ...emptyProgress(id), completed: true, completedAt: iso, mastery: "prueba" });
    out.push({ ...emptyProgress(moduleProgressId(m)), completed: true, completedAt: iso, done: { entrada: iso, cierre: iso }, mastery: "prueba" });
  }
  out.push({ ...emptyProgress(moduleProgressId(mods[4])), done: { entrada: iso } });
  out.push({ ...emptyProgress(mods[4].units[0]), completed: true, completedAt: iso, mastery: "prueba" });
  out.push({ ...emptyProgress("u09"), completed: true, completedAt: iso, mastery: "ubicacion" });
  return out;
}

describe("agregar el nivel A2 no cambia lo que ve quien está a medias en A1", () => {
  const pack = readPack();
  const shelled = withA2Shell(pack);
  const progress = midProgress(pack);

  it("los estados de los 12 módulos A1 y de sus unidades son idénticos", () => {
    const before = moduleViews(pack.course, progress);
    const after = moduleViews(shelled.course, progress);
    const slim = (mv: ReturnType<typeof moduleViews>) => ({
      modules: mv.modules.filter((m) => m.module.level === "A1").map((m) => [m.module.id, m.state, m.next, m.steps.map((s) => [s.id, s.done, s.open])]),
      units: mv.units.filter((v) => v.unit.level === "A1").map((v) => [v.unit.id, v.state, v.next]),
    });
    expect(slim(after)).toEqual(slim(before));
  });

  it("Hoy ofrece lo mismo: la misma unidad, el mismo paso y el mismo lugar", () => {
    const a = planToday({ pack, cards: [], day, now: NOW, units: progress });
    const b = planToday({ pack: shelled, cards: [], day, now: NOW, units: progress });
    expect(b.unit?.view.unit.id).toBe(a.unit?.view.unit.id);
    expect(b.unit?.step).toBe(a.unit?.step);
    expect(b.module?.step).toBe(a.module?.step);
    expect(b.place?.module).toBe(a.place?.module);
    expect(b.place?.modules).toBe(a.place?.modules);
    expect(b.milestone).toEqual(a.milestone);
  });

  it("el nivel A2 queda cerrado hasta que el hito A1 esté aprobado, aunque una unidad suya se haya saltado por ubicación", () => {
    const mv = moduleViews(shelled.course, progress);
    const a2 = mv.modules.find((m) => m.module.id === "a2m01")!;
    expect(a2.state).toBe("locked");
    expect(a2.number).toBe(1);
  });

  it("toda unidad del curso conserva ejercicios (las tarjetas de repaso `error_code:*` ya guardadas siguen teniendo qué mostrar)", () => {
    for (const u of pack.course.units) expect((pack.itemsByCode[u.codes[0]] ?? []).length, u.id).toBeGreaterThan(0);
  });
});
