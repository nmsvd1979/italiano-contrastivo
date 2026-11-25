import { describe, expect, it } from "vitest";
import { gradeWrite, writeItemOf } from "./write";

const OK = ["Io ho fame."];
describe("gradeWrite", () => {
  it("acepta lo que no cambia el sentido: mayúsculas, puntuación y apóstrofo con espacio", () => {
    expect(gradeWrite("io ho fame", OK).result).toBe("ok");
    expect(gradeWrite("Io ho fame!", OK).result).toBe("ok");
    expect(gradeWrite("l' amico è qui", ["L'amico è qui."]).result).toBe("ok");
    expect(gradeWrite("L’amico è qui", ["L'amico è qui."]).result).toBe("ok");
  });
  it("tolera el pronombre io/tu/noi/voi, que el italiano puede omitir, pero no lui/lei", () => {
    expect(gradeWrite("Ho fame", OK).result).toBe("ok");
    expect(gradeWrite("Tu parli italiano", ["Parli italiano."]).result).toBe("ok");
    expect(gradeWrite("Lui parla", ["Lei parla."]).result).toBe("wrong");
    expect(gradeWrite("Lei parla", ["Parla."]).result).toBe("wrong");
  });
  it("tolera lui/lei al comienzo solo si el español nombra al sujeto (él/ella)", () => {
    expect(gradeWrite("Lui non sa suonare la chitarra", ["Non sa suonare la chitarra."], "Él no sabe tocar guitarra.").result).toBe("ok");
    expect(gradeWrite("Non mi ama!", ["Lei non mi ama!"], "¡Ella no me ama!").result).toBe("ok");
    expect(gradeWrite("Lei non mi ama", ["Non mi ama!"], "¡Ella no me ama!").result).toBe("ok");
    expect(gradeWrite("Lei non mi ama", ["Non mi ama!"], "¡No me ama!").result).toBe("wrong");        // sin pista, no
    expect(gradeWrite("Lui non mi ama", ["Non mi ama!"], "¡Ella no me ama!").result).toBe("wrong");   // «lui» con «ella», no
  });
  it("no perdona acentos: avisa que solo falta el acento", () => {
    expect(gradeWrite("Perche no", ["Perché no."]).result).toBe("accent");
    expect(gradeWrite("E qui", ["È qui."]).result).toBe("accent");
  });
  it("marca el calco del español y elige la respuesta guardada más parecida para mostrar la diferencia", () => {
    expect(gradeWrite("Tengo fame", OK).result).toBe("wrong");
    const r = gradeWrite("Sono andato a casa", ["Vado a scuola.", "Sono andato a casa mia."]);
    expect(r.result).toBe("wrong");
    expect(r.best).toBe("Sono andato a casa mia.");
  });
});

import { gradeWord } from "./write";
describe("gradeWord (repaso español → italiano)", () => {
  it("exige la palabra con su artículo", () => {
    expect(gradeWord("il latte", "latte", "il")).toMatchObject({ rating: 3, result: "ok", expected: "il latte" });
    expect(gradeWord("l'acqua", "acqua", "l'")).toMatchObject({ rating: 3 });
    expect(gradeWord("l' acqua", "acqua", "l'").rating).toBe(3);
  });
  it("sin artículo o con un acento mal cuesta «difícil»; con el artículo equivocado (género) es fallo", () => {
    expect(gradeWord("latte", "latte", "il")).toMatchObject({ rating: 2, result: "sin_articulo" });
    expect(gradeWord("il caffe", "caffè", "il")).toMatchObject({ rating: 2, result: "acento" });
    expect(gradeWord("la latte", "latte", "il")).toMatchObject({ rating: 1, result: "articulo" });
  });
  it("otra palabra es fallo; adjetivos y verbos no llevan artículo", () => {
    expect(gradeWord("il pane", "latte", "il").rating).toBe(1);
    expect(gradeWord("Alto", "alto").rating).toBe(3);
    expect(gradeWord("il alto", "alto").rating).toBe(1);
  });
});

describe("writeItemOf: traducciones alternativas de Tatoeba", () => {
  it("acepta la traducción guardada y las alternativas, que van después", () => {
    const item = writeItemOf({ id: "s_1", it: "Vorrei studiare a Parigi.", es: "Me gustaría estudiar en París.", cefr_estimate: "A1", alt: ["Mi piacerebbe studiare a Parigi."] });
    expect(item.accepted_it).toEqual(["Vorrei studiare a Parigi.", "Mi piacerebbe studiare a Parigi."]);
    expect(gradeWrite("Mi piacerebbe studiare a Parigi", item.accepted_it).result).toBe("ok");
    expect(writeItemOf({ id: "s_2", it: "Ciao.", es: "Hola.", cefr_estimate: "A1" }).accepted_it).toEqual(["Ciao."]);
  });
});
