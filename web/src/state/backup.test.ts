import { describe, expect, it } from "vitest";
import { BackupError, exportBackup, parseBackup, restoreBackup } from "./backup";
import { newCard, review } from "./srs";
import { memoryStore } from "./store";

const NOW = new Date("2026-11-17T15:00:00.000Z");

async function filled() {
  const store = memoryStore();
  const { card, log } = review(newCard({ kind: "error_code", ref: "ERR_AUX_ESSERE" }, "neutral", NOW), 3, NOW);
  await store.putCard(card);
  await store.addReviewLog(log);
  await store.putDay({ date: "2026-11-17", reviewsDone: 2, capsulesDone: ["cap_err_aux_essere"] });
  return store;
}

describe("copia de seguridad", () => {
  it("exporta y restaura el mismo progreso en un almacén vacío", async () => {
    const a = await filled();
    const backup = parseBackup(JSON.stringify(await exportBackup(a, NOW)));
    const b = memoryStore();
    await restoreBackup(b, backup);
    expect(await b.allCards()).toEqual(await a.allCards());
    expect(await b.allLogs()).toEqual(await a.allLogs());
    expect(await b.allDays()).toEqual(await a.allDays());
  });
  it("restaurar reemplaza lo que había, no lo duplica", async () => {
    const a = await filled();
    const backup = parseBackup(JSON.stringify(await exportBackup(a, NOW)));
    await restoreBackup(a, backup);
    expect((await a.allLogs()).length).toBe(1);
    expect((await a.allCards()).length).toBe(1);
  });
  it.each([
    ["no es JSON", "hola"],
    ["es de otra app", JSON.stringify({ app: "otra", version: 1, cards: [], logs: [], days: [] })],
    ["versión desconocida", JSON.stringify({ app: "italiano-contrastivo", version: 2, cards: [], logs: [], days: [] })],
    ["tarjeta dañada", JSON.stringify({ app: "italiano-contrastivo", version: 1, cards: [{ id: "x" }], logs: [], days: [] })],
    ["día dañado", JSON.stringify({ app: "italiano-contrastivo", version: 1, cards: [], logs: [], days: [{ date: "ayer" }] })],
  ])("rechaza un archivo que %s", (_n, text) => expect(() => parseBackup(text)).toThrow(BackupError));
  it("un archivo inválido no borra el progreso (se valida antes de restaurar)", async () => {
    const a = await filled();
    expect(() => parseBackup("{")).toThrow(BackupError);
    expect((await a.allCards()).length).toBe(1);
  });
});
