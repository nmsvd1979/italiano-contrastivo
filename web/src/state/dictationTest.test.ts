import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { type Attempt, buildDictationItems, classify, reportText, summarize, verdict } from "./dictationTest";

const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { course: read("course.json"), sentences: read("sentences.json") } as Pick<ContentPack, "course" | "sentences">;

describe("prueba del dictado", () => {
  it("arma frases cortas de las unidades de sonidos y pares simple/doble en las dos direcciones", () => {
    const items = buildDictationItems(pack);
    const frases = items.filter((i) => i.kind === "frase"), pares = items.filter((i) => i.kind === "par");
    expect(frases.length).toBeGreaterThanOrEqual(8);
    expect(frases.every((f) => f.say.split(/\s+/).length <= 7)).toBe(true);
    expect(pares.length).toBe(6);
    const nonno = pares.find((p) => p.say === "il nonno")!, nono = pares.find((p) => p.say === "il nono")!;
    expect(nonno.other).toBe("il nono");
    expect(nono.other).toBe("il nonno");
  });
  it("clasifica las frases: exacta, cercana o lejos", () => {
    const item = { id: "f", kind: "frase" as const, say: "Mio nonno vive a Roma." };
    expect(classify(item, "mio nonno vive a roma").outcome).toBe("exacto");
    expect(classify(item, "Mio nonno vive a Rimini").outcome).toBe("cerca"); // 4 de 5 palabras
    expect(classify(item, "Mio nonno mangia pane").outcome).toBe("lejos"); // 2 de 5
    expect(classify({ ...item, say: "Mio nonno vive a Roma con noi" }, "Mio nonno vive a Roma con voi").outcome).toBe("cerca");
  });
  it("en los pares distingue fiel (escribió lo que dijiste) de confundido (escribió el otro)", () => {
    const par = { id: "p", kind: "par" as const, say: "il nono", other: "il nonno" };
    expect(classify(par, "Il nono.").outcome).toBe("fiel");
    expect(classify(par, "il nonno").outcome).toBe("confundido");
    expect(classify(par, "il monte").outcome).toBe("otro");
  });
  it("resume por método y da un veredicto prudente", () => {
    const mk = (kind: Attempt["kind"], outcome: Attempt["outcome"], method: Attempt["method"] = "teclado"): Attempt => ({ id: Math.random() + "", kind, say: "x", heard: "x", method, outcome, ratio: 1 });
    const bueno = [...Array(8).fill(0).map(() => mk("frase", "exacto")), ...Array(6).fill(0).map(() => mk("par", "fiel"))];
    expect(verdict(summarize(bueno, "teclado"))).toMatch(/podría servir/);
    const sordo = [...Array(8).fill(0).map(() => mk("frase", "exacto")), ...Array(6).fill(0).map(() => mk("par", "confundido"))];
    expect(verdict(summarize(sordo, "teclado"))).toMatch(/NO distingue/);
    const malo = Array(8).fill(0).map(() => mk("frase", "lejos"));
    expect(verdict(summarize(malo, "teclado"))).toMatch(/No entiende/);
    expect(verdict(summarize(bueno, "navegador"))).toBe("Sin datos de este método.");
    expect(reportText(bueno, "iPhone prueba")).toContain("Prueba de dictado — iPhone prueba");
  });
});
