import { describe, expect, it } from "vitest";
import type { Course, HumanSentence } from "../content/load";
import { HUMAN_DICTATION_SIZE, humanDictationId, humanDictationRound, isHumanDictation } from "./humanDictation";

const course = { modules: [{ id: "m01", level: "A1" }, { id: "m02", level: "A1" }, { id: "m03", level: "A1" }, { id: "a2m01", level: "A2" }] } as unknown as Course;
const bank = (m: string, n: number): HumanSentence[] => Array.from({ length: n }, (_, i) => ({ id: `${m}_${i}`, module: m, it: `Frase ${m} ${i}.`, es: "x", tatoeba: `${i}` }));

describe("dictado con voz humana", () => {
  it("usa primero el módulo y completa con anteriores del mismo nivel, nunca posteriores", () => {
    const pack = { course, listeningHuman: [...bank("m01", 10), ...bank("m02", 3), ...bank("m03", 10)] };
    const r = humanDictationRound(pack, "m02");
    expect(r).toHaveLength(HUMAN_DICTATION_SIZE);
    expect(r.filter((s) => s.id.startsWith("m02")).length).toBe(3);
    expect(r.some((s) => s.id.startsWith("m03"))).toBe(false);
    expect(humanDictationRound(pack, "m01").every((s) => s.id.startsWith("m01"))).toBe(true);
    expect(humanDictationRound({ course, listeningHuman: bank("m01", 10) }, "a2m01")).toEqual([]);   // otro nivel: no mezcla
  });
  it("cambia con el intento y es estable con el mismo", () => {
    const pack = { course, listeningHuman: bank("m01", 20) };
    const ids = (n: number) => humanDictationRound(pack, "m01", n).map((s) => s.id).join();
    expect(ids(2)).toBe(ids(2));
    expect(new Set([0, 1, 2, 3].map(ids)).size).toBeGreaterThan(1);
  });
  it("el id del dictado no es una lectura", () => {
    expect(humanDictationId("m04")).toBe("vh_m04");
    expect(isHumanDictation("vh_m04")).toBe(true);
    expect(isHumanDictation("ls_m04")).toBe(false);
  });
});
