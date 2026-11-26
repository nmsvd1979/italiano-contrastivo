import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { emptyProgress } from "./course";
import { moduleTestItems, moduleViews } from "./modules";
import { practiceItems } from "./steps";
import { readPack } from "../test/realPack";

/** Relatos con huecos del módulo a2m03: salen en la práctica de su unidad y en el Cierre, y NO entran al repaso espaciado ni a los puntos débiles. */
const pack = { ...readPack(), readingItems: JSON.parse(readFileSync("public/content/reading_items.json", "utf8")), readings: JSON.parse(readFileSync("public/content/readings.json", "utf8")) } as ContentPack;
const unit = pack.course.units.find((u) => u.codes[0] === "ERR_PP_VS_IMPERFETTO")!;
const relatos = pack.readingItems?.[`${unit?.id}:relatos`] ?? [];

describe("relatos de a2m03", () => {
  it("la unidad de trama y fondo trae los siete relatos como ítems cloze_text de su código", () => {
    expect(unit, "falta la unidad de ERR_PP_VS_IMPERFETTO").toBeTruthy();
    expect(relatos.length).toBeGreaterThanOrEqual(7);
    for (const r of relatos) {
      expect(r.type).toBe("cloze_text");
      expect((r as { target_error_codes?: string[] }).target_error_codes).toEqual(["ERR_PP_VS_IMPERFETTO"]);
    }
  });
  it("están en la práctica de la unidad (tanda completa) y fuera de itemsByCode (sin repaso espaciado)", () => {
    const all = [...practiceItems(unit, pack, {}, 10 ** 6, 1), ...practiceItems(unit, pack, {}, 10 ** 6, 2)];
    expect(all.some((i) => i.type === "cloze_text")).toBe(true);
    expect((pack.itemsByCode[unit.codes[0]] ?? []).some((i) => i.type === "cloze_text")).toBe(false);
  });
  it("el Cierre del módulo incluye un relato y cambia en cada reintento", () => {
    const m = pack.course.modules!.find((x) => x.units.includes(unit.id))!;
    const view = moduleViews(pack.course, [{ ...emptyProgress(unit.id), completed: true, testBest: 1, mastery: "prueba" as const }], false).modules.find((v) => v.module.id === m.id)!;
    const a = moduleTestItems(view, pack, 0).filter((i) => i.type === "cloze_text");
    const b = moduleTestItems(view, pack, 1).filter((i) => i.type === "cloze_text");
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0].id).not.toBe(b[0].id);
  });
});
