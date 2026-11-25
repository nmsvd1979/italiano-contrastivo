import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8"); // las pruebas web corren desde web/
const light = css.match(/:root\s*\{([^}]*)\}/)![1];
const dark = css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme\]\)\s*\{([^}]*)\}/)![1];   // «automático»: sin data-theme sigue al teléfono
const darkForced = css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/)![1];                                  // oscuro elegido en Ajustes
const vars = (b: string) => Object.fromEntries([...b.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const token = (block: string, name: string) => block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? "";

const channel = (hex: string, i: number) => {
  const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("contraste de las etiquetas de hebra (texto --card sobre el color de la hebra)", () => {
  const themes: [string, string][] = [["claro", light], ["oscuro", dark]];
  const strands = ["--s-in", "--s-form", "--s-out", "--s-flu"];
  for (const [theme, block] of themes) {
    for (const name of strands) {
      it(`${name} en ${theme} llega a 4,5:1`, () => {
        const bg = token(block, name);
        const card = token(block, "--card") || token(light, "--card");
        expect(bg).not.toBe("");
        expect(contrast(bg, card)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe("tema oscuro elegido y tema oscuro automático", () => {
  it("usan exactamente los mismos colores", () => {
    const { ["color-scheme"]: _a, ...forced } = vars(darkForced) as Record<string, string>;
    expect(vars(dark)).toEqual(forced);
    expect(Object.keys(vars(dark)).length).toBeGreaterThan(10);
  });
});

describe("tonos de módulo (seis, rotan por número de módulo)", () => {
  const themes: [string, string][] = [["claro", light], ["oscuro", dark]];
  for (const [theme, block] of themes) {
    for (let n = 1; n <= 6; n++) {
      it(`tono ${n} en ${theme}: el texto sobre el color fuerte y la tinta sobre el tinte llegan a 4,5:1`, () => {
        const strong = token(block, `--t${n}`), tint = token(block, `--t${n}s`), ink = token(block, `--t${n}i`);
        const on = token(block, "--on-tone") || token(light, "--on-tone");
        expect([strong, tint, ink, on].every(Boolean)).toBe(true);
        expect(contrast(on, strong)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(ink, tint)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
  it("los seis tonos son colores distintos", () => {
    expect(new Set([1, 2, 3, 4, 5, 6].map((n) => token(light, `--t${n}`))).size).toBe(6);
  });
});
