import { describe, expect, it } from "vitest";
import { alignWords } from "./align";

describe("alignWords", () => {
  it("un texto idéntico (aunque cambien mayúsculas y puntuación) recupera todo", () => {
    const r = alignWords("Mi chiamo Luca, e tu?", "mi chiamo luca e tu");
    expect(r.ratio).toBe(1);
    expect(r.original.every((s) => !s.changed) && r.mine.every((s) => !s.changed)).toBe(true);
  });
  it("marca lo que falta en el original y lo que sobra en lo escrito", () => {
    const r = alignWords("Ho una sorella e due fratelli", "Ho sorella e tre fratelli");
    expect(r.original.filter((s) => s.changed).map((s) => s.text)).toEqual(["una", "due"]);
    expect(r.mine.filter((s) => s.changed).map((s) => s.text)).toEqual(["tre"]);
    expect(r.matched).toBe(4);
    expect(r.ratio).toBeCloseTo(4 / 6);
  });
  it("respeta el orden: una palabra fuera de lugar no cuenta como recordada dos veces", () => {
    const r = alignWords("a b c", "c b a");
    expect(r.matched).toBe(1);
  });
  it("el acento distingue palabras (e / è)", () => {
    expect(alignWords("Lei è qui", "Lei e qui").matched).toBe(2);
  });
  it("texto vacío: nada recordado y no divide por cero", () => {
    expect(alignWords("Ciao a tutti", "").ratio).toBe(0);
    expect(alignWords("", "Ciao").ratio).toBe(0);
  });
});
