import { describe, expect, it } from "vitest";
import { gradeWrite } from "./write";

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
