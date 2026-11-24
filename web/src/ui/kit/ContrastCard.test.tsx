import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack, Unit } from "../../content/load";
import { ContrastCard, type ContrastData, contrastCards } from "./ContrastCard";

afterEach(cleanup);

const sentences = [1, 2, 3, 4].map((n) => ({ id: `s${n}`, it: "Tu sei Tom?", es: "¿Tú eres Tom?", author: `a${n}` }));
const pack = { sentences } as unknown as ContentPack;
const unit = (over: Partial<Unit> = {}) => ({ id: "u01", codes: ["ERR_PRESENT_ESSERE_AVERE"], divergences: sentences.map((s) => ({ id: s.id, start: 3, end: 6, wrong: "siete" })), ...over }) as unknown as Unit;

describe("tarjeta de contraste", () => {
  it("contrastCards arma antes/cambio/después con la frase y su traducción", () => {
    expect(contrastCards(unit(), pack, 1)).toEqual([{ id: "s1", es: "¿Tú eres Tom?", before: "Tu ", changed: "sei", after: " Tom?", wrong: "siete", soundOnly: false, vocab: false, author: "a1" }]);
  });
  it("devuelve como máximo 3 y lista vacía si la unidad no tiene divergencias", () => {
    expect(contrastCards(unit(), pack)).toHaveLength(3);
    expect(contrastCards(unit({ divergences: [] }), pack)).toEqual([]);
  });
  it("ignora divergencias cuya frase no está en el paquete", () => {
    expect(contrastCards(unit({ divergences: [{ id: "nope", start: 0, end: 1, wrong: "x" }] }), pack)).toEqual([]);
  });
  it("la tarjeta resalta lo que cambia y muestra el error típico", () => {
    const data: ContrastData = { id: "s1", es: "¿Tú eres Tom?", before: "Tu ", changed: "sei", after: " Tom?", wrong: "siete", soundOnly: false, vocab: false, author: "a1" };
    render(<ContrastCard data={data} />);
    expect(screen.getByText("sei").tagName).toBe("MARK");
    expect(screen.getByText(/Error típico de hispanohablantes/)).toBeTruthy();
    expect(screen.getByText("Tu siete Tom?").tagName).toBe("DEL");
    expect(screen.getByText("¿Tú eres Tom?")).toBeTruthy();
  });
  it("en unidades de sonidos dice «Así no se escribe»", () => {
    const u = unit({ codes: ["ERR_C_G_PALATAL"] });
    expect(contrastCards(u, pack, 1)[0].soundOnly).toBe(true);
    render(<ContrastCard data={{ ...contrastCards(u, pack, 1)[0] }} />);
    expect(screen.getByText(/Así no se escribe/)).toBeTruthy();
    expect(screen.queryByText(/Error típico de hispanohablantes/)).toBeNull();
  });
  it("en unidades de vocabulario no llama «error típico» a otra palabra", () => {
    const u = unit({ codes: ["ERR_VOC_SALUTI"] });
    const data = contrastCards(u, pack, 1)[0];
    expect(data.vocab).toBe(true);
    render(<ContrastCard data={data} />);
    expect(screen.getByText(/No es lo mismo/)).toBeTruthy();
    expect(screen.queryByText(/Error típico/)).toBeNull();
    expect(screen.getByText("Tu siete Tom?").tagName).not.toBe("DEL");
  });
});
