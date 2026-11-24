import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { shortDuration } from "../../state/timing";

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
  it("los minutos no se parten ni empujan el texto", () => {
    expect(rule(".blocks .min")).toMatch(/white-space:\s*nowrap/);
  });
  it("shortDuration es corta: «<1 min» o «≈ N min»", () => {
    expect(shortDuration(10)).toBe("<1 min");
    expect(shortDuration(30)).toBe("<1 min");
    expect(shortDuration(60)).toBe("≈ 1 min");
    expect(shortDuration(480)).toBe("≈ 8 min");
    expect(shortDuration(500)).toBe("≈ 8 min");
  });
});
