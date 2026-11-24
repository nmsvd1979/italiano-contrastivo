import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8"); // las pruebas web corren desde web/
const light = css.match(/:root\s*\{([^}]*)\}/)![1];
const dark = css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/)![1];
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
