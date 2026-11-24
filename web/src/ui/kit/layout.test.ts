import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
const rule = (selector: string) => css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

describe("zona segura del iPhone (barra inferior del sistema)", () => {
  it("el alto de la barra de pestañas suma la zona segura, para que no aplaste los iconos", () => {
    expect(rule(".tabbar")).toMatch(/height:\s*calc\(var\(--tab-h\)\s*\+\s*env\(safe-area-inset-bottom/);
  });
  it("el contenido deja sitio para la barra con su zona segura", () => {
    expect(rule("main, #root > p:not(.banner)")).toMatch(/padding:[^;]*calc\(var\(--tab-h\)\s*\+\s*env\(safe-area-inset-bottom[^;]*\+\s*110px\)/);
    expect(rule("main.today")).toMatch(/env\(safe-area-inset-bottom/);
  });
});

describe("Hoy: filas de la sesión", () => {
  it("la referencia diaria usa la barra a todo el ancho", () => {
    expect(rule(".today .daily .bar")).toMatch(/width:\s*100%/);
  });
});
