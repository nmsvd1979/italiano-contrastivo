import { describe, expect, it } from "vitest";
import pairs from "./calque-pairs.json";
import sentences from "../../public/content/sentences.json";
import { detectErrors } from "./detect";

const codes = (t: string) => detectErrors(t).map((e) => e.code);

describe("detectErrors: errores típicos del español", () => {
  const casos: [string, string][] = [
    ["Ho andato a casa.", "ERR_AUX_ESSERE"],
    ["Maria ha arrivata tardi.", "ERR_AUX_ESSERE"],
    ["Vado in Roma domani.", "ERR_PREP_PLACE"],
    ["Vivo a Italia.", "ERR_PREP_PLACE"],
    ["Ci sono un gatto in giardino.", "ERR_CE_AGREEMENT"],
    ["C'è due libri sul tavolo.", "ERR_CE_AGREEMENT"],
    ["Vedo a Marco ogni giorno.", "ERR_PERSONAL_A"],
    ["Mia casa è grande.", "ERR_POSSESSIVE_ARTICLE"],
    ["Vado a la scuola.", "ERR_PREP_ARTICLE_CONTRACTION"],
    ["Il libro è in il cassetto.", "ERR_PREP_ARTICLE_CONTRACTION"],
    ["Sono più alto che lui.", "ERR_COMPARATIVE_DI"],
    ["Io tengo fame.", "ERR_TENERE_AVERE"],
  ];
  it.each(casos)("%s → %s", (texto, code) => expect(codes(texto)).toContain(code));

  it("da posiciones que cubren el tramo erróneo", () => {
    const e = detectErrors("Vedo a Marco.")[0];
    expect("Vedo a Marco.".slice(e.start, e.end)).toBe("a ");
    expect(e.suggestion).toBe("");
  });
});

describe("detectErrors: no marca italiano correcto", () => {
  it.each([
    "Sono andato a casa.", "Vado a Roma.", "Vivo in Italia.", "C'è un gatto.", "Ci sono due libri.",
    "Vedo Marco.", "La mia casa è grande.", "Mio fratello è alto.", "Questo è mio.", "Vado alla scuola.",
    "Il libro è nel cassetto.", "Sono più alto di lui.", "Ho fame.", "Ho mangiato la pizza.", "Ha salito le scale.",
    "È più bello che utile.", "Casa mia è grande.", "Ho un amico mio che vive a Roma.", "Mamma mia che bello.", "Dio mio!", "Di là c'è un bar.",
  ])("%s", (t) => expect(detectErrors(t)).toEqual([]));

  it("ninguna oración validada del paquete sale marcada", () => {
    for (const s of sentences as { it: string }[]) expect(detectErrors(s.it), s.it).toEqual([]);
  });
});

describe("detectErrors con los calcos del corpus", () => {
  it("cada calco generado se detecta con su código", () => {
    // «ha uscito / ha entrato / ha salito» son válidos como transitivos: el detector no los marca a propósito.
    const hueco = /\b(ha|ho|hai|abbiamo|avete|hanno|ed ha)\s+(uscit|entrat|salit|sces)/i;
    for (const p of pairs.filter((q) => !hueco.test(q.wrong))) expect(codes(p.wrong), p.wrong).toContain(p.code);
  });
});
