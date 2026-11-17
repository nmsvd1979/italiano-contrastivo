import { describe, expect, it } from "vitest";
import { addSample, estimateSeconds, formatDuration, PRIORS, plausible, totalSeconds } from "./timing";

describe("tiempos", () => {
  it("sin mediciones usa el a priori", () => expect(estimateSeconds("cloze")).toBe(PRIORS.cloze));
  it("con pocas mediciones mezcla a priori y medido", () => {
    expect(estimateSeconds("choice", { choice: [2, 2] })).toBeCloseTo((12 * 3 + 4) / 5);
  });
  it("con 5 o más usa la mediana (un olvido no lo arruina)", () => {
    expect(estimateSeconds("choice", { choice: [8, 9, 10, 11, 200] })).toBe(10);
  });
  it("descarta mediciones implausibles y limita el historial", () => {
    expect(plausible(0.2)).toBe(false);
    expect(plausible(600)).toBe(false);
    expect(addSample({}, "choice", 600)).toEqual({});
    let s = {};
    for (let i = 0; i < 40; i++) s = addSample(s, "choice", 10);
    expect((s as { choice: number[] }).choice.length).toBe(30);
  });
  it("suma por tipos", () => expect(totalSeconds(["choice", "cloze"])).toBe(PRIORS.choice + PRIORS.cloze));
  it("formatea sin inflar los bloques cortos", () => {
    expect(formatDuration(10)).toBe("menos de 1 min");
    expect(formatDuration(45)).toBe("≈ 50 s");
    expect(formatDuration(300)).toBe("≈ 5 min");
    expect(formatDuration(100)).toBe("≈ 2 min");
  });
});
