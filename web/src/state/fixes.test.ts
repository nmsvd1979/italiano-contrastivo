import { describe, expect, it } from "vitest";
import { schemaValidator } from "../content/schemas";
import { fixCard, fixesFromCorrection, fixFor, fixItemOf } from "./fixes";

describe("correcciones → ejercicios de repaso", () => {
  it("una palabra cambiada se vuelve un hueco con lo que escribiste de pista", () => {
    const f = fixFor("Io ho andato a Roma ieri.", "Io sono andato a Roma ieri.")!;
    expect(f.item).toMatchObject({ type: "cloze", text: "Io ___ andato a Roma ieri.", answers: ["sono"] });
    expect((f.item as { hint_es: string }).hint_es).toBe("Antes escribiste: «ho»");
  });
  it("el hueco no se come la puntuación final", () => {
    const f = fixFor("Vado in Roma.", "Vado a Roma.")!;
    expect(f.item).toMatchObject({ text: "Vado ___ Roma.", answers: ["a"] });
    const g = fixFor("Ho fame e sete", "Ho fame e sete.")!; // solo cambió la puntuación: no es un error
    expect(g).toBeNull();
  });
  it("si solo sobraba una palabra se elige entre la versión correcta y la escrita", () => {
    const f = fixFor("Ho visto a Maria.", "Ho visto Maria.")!;
    expect(f.item.type).toBe("choice_l1_distractor");
    const opts = (f.item as unknown as { options: { text: string; correct: boolean }[] }).options;
    expect(opts.find((o) => o.correct)!.text).toBe("Ho visto Maria.");
    expect(opts.find((o) => !o.correct)!.text).toBe("Ho visto a Maria.");
  });
  it("un texto con varias frases da un ejercicio por frase corregida, y ninguno por las que estaban bien", () => {
    const fixes = fixesFromCorrection("Io ho andato a Roma. Mi piace molto. Ho visto a Maria.", "Io sono andato a Roma. Mi piace molto. Ho visto Maria.");
    expect(fixes.map((f) => f.item.type)).toEqual(["cloze", "choice_l1_distractor"]);
  });
  it("la tarjeta es válida contra el esquema, guarda el ejercicio y se recupera", () => {
    const f = fixFor("Io ho andato a Roma.", "Io sono andato a Roma.")!;
    const card = fixCard(f, new Date("2026-11-22T10:00:00Z"));
    expect(schemaValidator("card")(card)).toBe(true);
    expect(card.subject).toEqual({ kind: "writing_fix", ref: f.id });
    expect(fixItemOf(card)).toEqual(f.item);
    expect(fixItemOf({ ...card, subject: { kind: "lexeme", ref: "x" } })).toBeUndefined();
  });
  it("el mismo error corregido dos veces tiene el mismo id (no se duplica)", () => {
    expect(fixFor("Io ho andato.", "Io sono andato.")!.id).toBe(fixFor("Io ho andato.", "Io sono andato.")!.id);
  });
});
