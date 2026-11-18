import { afterEach, describe, expect, it } from "vitest";
import { isPreview, PREVIEW_DB, REAL_DB, setPreview } from "./preview";

afterEach(() => localStorage.clear());
describe("modo de prueba", () => {
  it("empieza apagado y se puede encender y apagar", () => {
    expect(isPreview()).toBe(false);
    setPreview(true);
    expect(isPreview()).toBe(true);
    setPreview(false);
    expect(isPreview()).toBe(false);
  });
  it("usa una base de datos distinta de la real", () => expect(PREVIEW_DB).not.toBe(REAL_DB));
});
