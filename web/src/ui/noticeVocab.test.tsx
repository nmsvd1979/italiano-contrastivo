import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack, Unit } from "../content/load";
import { NoticeStep } from "./NoticeStep";

afterEach(cleanup);
const sentences = [{ id: "s1", it: "Ciao, tu sei Ana?", es: "Hola, ¿eres Ana?", cefr_estimate: "A1" }];
const pack = { sentences } as unknown as ContentPack;
const unit = (code: string) => ({ id: "u01", codes: [code], divergences: [{ id: "s1", start: 0, end: 4, wrong: "Buongiorno" }], parts: { practica: ["s1"] } }) as unknown as Unit;
const show = (code: string) => render(<NoticeStep unit={unit(code)} pack={pack} onFinish={() => undefined} />);

describe("«Descubre»: qué dice bajo el ejemplo", () => {
  it("en vocabulario no llama «error típico» a otra palabra", () => {
    show("ERR_VOC_SALUTI");
    expect(screen.getByText(/No es lo mismo/)).toBeTruthy();
    expect(screen.queryByText(/Error típico/)).toBeNull();
    expect(screen.getByText("Buongiorno, tu sei Ana?").tagName).not.toBe("DEL");
  });
  it("en gramática sigue diciendo «Error típico de hispanohablantes» con la forma tachada", () => {
    show("ERR_PRESENT_ESSERE_AVERE");
    expect(screen.getByText(/Error típico de hispanohablantes/)).toBeTruthy();
    expect(screen.getByText("Buongiorno, tu sei Ana?").tagName).toBe("DEL");
  });
  it("en sonidos sigue diciendo «Así no se escribe»", () => {
    show("ERR_C_G_PALATAL");
    expect(screen.getByText(/Así no se escribe/)).toBeTruthy();
  });
});
