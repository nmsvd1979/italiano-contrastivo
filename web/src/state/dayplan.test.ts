import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { BLOCK_OF_STEP, planSession, REFUERZO_KEY } from "./dayplan";
import type { WeakSpot } from "./weak";
import { emptyProgress, markStep, STEPS, stepsFor } from "./course";
import { planToday } from "./session";
import type { DayProgress } from "./store";

const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
const U1 = pack.course.units[0].id;
const NOW = new Date("2026-11-18T12:00:00.000Z");
const day: DayProgress = { date: "2026-11-18", reviewsDone: 0, capsulesDone: [] };
const M1 = pack.course.modules![0].id;
// Con la Entrada del primer módulo hecha, la primera cápsula es la actual; si no, «Hoy» propone la Entrada.
const entradaHecha = { ...emptyProgress(`mod:${M1}`), done: { entrada: NOW.toISOString() } };
const sessionFor = (units = [entradaHecha] as ReturnType<typeof emptyProgress>[], d: DayProgress = day, weak: WeakSpot[] = []) =>
  planSession({ plan: planToday({ pack, cards: [], day: d, now: NOW, units }), day: d, pack, weak });
const WEAK: WeakSpot[] = [{ code: pack.course.units[0].codes[0], unitId: U1, title: "Tema débil", ok: 2, n: 8, accuracy: 0.25 }];

describe("sesión de hoy", () => {
  it("cada paso de la unidad pertenece a un bloque de las fuentes", () => {
    expect(BLOCK_OF_STEP).toEqual({ descubre: "lectura", palabras: "repaso", lectura: "lectura", capsula: "gimnasio", practica: "gimnasio", escucha: "voz", practica2: "gimnasio", prueba: "gimnasio" });
  });
  it("empieza con el repaso y sigue el ciclo de la unidad (lectura primero)", () => {
    const b = sessionFor();
    expect(b[0].key).toBe("repaso");
    expect(b[1]).toMatchObject({ key: "lectura", step: "descubre", done: false });
    expect(b.map((x) => x.step)).toContain("capsula"); // las unidades de vocabulario y de sonidos intercalan «Palabras» antes
  });
  it("no se corta por tiempo: trae todos los pasos que faltan de la cápsula, en orden", () => {
    const b = sessionFor();
    const unit = pack.course.units[0];
    expect(b.filter((x) => x.step).map((x) => x.step)).toEqual(stepsFor(unit));
    expect(b.filter((x) => x.step).every((x) => x.subtitle.length > 0)).toBe(true);
  });
  it("sin temas débiles no hay fila de Refuerzo", () => {
    expect(sessionFor().some((x) => x.label === "Refuerzo")).toBe(false);
  });
  it("con temas débiles el Refuerzo va después del repaso y antes de los pasos", () => {
    const b = sessionFor(undefined, day, WEAK);
    expect(b[1]).toMatchObject({ label: "Refuerzo", href: "#/debiles", done: false, strand: "foco" });
    expect(b[2].step).toBe("descubre");
  });
  it("el Refuerzo queda hecho cuando hoy se anotó la tanda", () => {
    const b = sessionFor(undefined, { ...day, stepsDone: [REFUERZO_KEY] }, WEAK);
    expect(b.find((x) => x.label === "Refuerzo")).toMatchObject({ done: true });
  });
  it("cada bloque lleva su hebra y su etiqueta", () => {
    const b = sessionFor();
    expect(b[0]).toMatchObject({ strand: "foco", label: "Repaso" });
    expect(b[1]).toMatchObject({ strand: "foco", label: "Descubre" });
    const m = sessionFor([]); // sin la Entrada hecha, hoy toca un paso propio del módulo
    expect(m[1]).toMatchObject({ strand: "entrada", label: "Entrada" });
  });
  it("los pasos hechos hoy aparecen como hechos y los demás continúan", () => {
    const u = markStep(emptyProgress(U1), "descubre", NOW);
    const d = { ...day, stepsDone: [`${U1}:descubre`] };
    const b = sessionFor([u], d);
    expect(b.find((x) => x.step === "descubre")).toMatchObject({ done: true });
    expect(b.find((x) => x.step === "capsula")).toMatchObject({ done: false });
  });
  it("con todos los módulos hechos Hoy ofrece el hito y, aprobado, solo el repaso", () => {
    const all = pack.course.units.map((u: { id: string }) => STEPS.reduce((p, s) => markStep({ ...p, completed: true }, s, NOW), emptyProgress(u.id)));
    const mods = pack.course.modules!.map((m) => ({ ...emptyProgress(`mod:${m.id}`), completed: true }));   // y todos los módulos cerrados
    const b = sessionFor([...all, ...mods]);   // sin hito aprobado, el siguiente tramo del camino es el examen de hito
    expect(b.map((x) => x.href)).toEqual(["#/repaso", "#/hito/A1"]);
    const passed = sessionFor([...all, ...mods, { ...emptyProgress("hito:A1"), completed: true }]);   // con el hito aprobado solo queda el repaso: no se ofrece ninguna unidad de otro nivel
    expect(passed.map((x) => x.key)).toEqual(["repaso"]);
  });
  it("al empezar (sin Entrada hecha) la sesión propone la Entrada del primer módulo", () => {
    const b = sessionFor([]);
    expect(b.map((x) => x.key)).toEqual(["repaso", "lectura"]);
    expect(b[1]).toMatchObject({ href: `#/modulo/${M1}/entrada`, done: false });
    expect(b[1].subtitle).toContain("Entrada");
  });
});
