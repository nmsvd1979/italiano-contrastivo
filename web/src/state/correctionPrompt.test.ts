import { describe, expect, it } from "vitest";
import { buildCorrectionPrompt, CORRECTED_MARK, extractCorrected } from "./correctionPrompt";

describe("encargo de corrección", () => {
  it("lleva el nivel, la regla de no reescribir, la marca de salida y el texto del usuario", () => {
    const p = buildCorrectionPrompt({ level: "A2", text: "  Io ho andato a Roma.  ", task: "contar mi fin de semana" });
    expect(p).toContain("nivel A2");
    expect(p).toContain("No reescribas lo que está bien");
    expect(p).toContain(CORRECTED_MARK);
    expect(p).toContain("contar mi fin de semana");
    expect(p).toContain('"""\nIo ho andato a Roma.\n"""');
    expect(p).not.toContain("congiuntivo en todos sus usos"); // el alcance es el del nivel, no el de B2
  });
  it("sin tarea no deja una línea vacía de relleno", () => {
    expect(buildCorrectionPrompt({ level: "A1", text: "Ciao" })).not.toContain("Lo que quería hacer");
  });
  it("extrae el texto corregido tras la marca, con o sin formato", () => {
    expect(extractCorrected("Errores: …\n\nTEXTO CORREGIDO:\nSono andato a Roma.")).toBe("Sono andato a Roma.");
    expect(extractCorrected("…\n**TEXTO CORREGIDO:**\n\n> «Sono andato a Roma.»")).toBe("Sono andato a Roma.");
    expect(extractCorrected("Sin marca, solo comentarios")).toBeNull();
    expect(extractCorrected("TEXTO CORREGIDO:   ")).toBeNull();
  });
});
