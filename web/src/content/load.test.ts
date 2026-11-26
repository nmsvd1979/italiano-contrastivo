// @vitest-environment node
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { ContentError, loadContent } from "./load";

const dir = join(__dirname, "../../public/content");
const read = (name: string) => readFileSync(join(dir, name), "utf8");

function serve(overrides: Record<string, unknown> = {}) {
  return async (url: string) => {
    const name = basename(url);
    if (name in overrides) return new Response(JSON.stringify(overrides[name]));
    return new Response(read(name));
  };
}

describe("loadContent", () => {
  it("carga el paquete real y todo valida", async () => {
    const pack = await loadContent(serve(), "/");
    expect(pack.capsules.length).toBeGreaterThan(0);
    expect(pack.capsules[0].retrieval.length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(pack.itemsByCode).length).toBe(pack.capsules.length);
    expect(pack.lexemes.every((l) => l.lexical_type === "false_friend")).toBe(true);
    expect(pack.manifest.capsules).toEqual(pack.capsules.map((c) => c.id));
  });

  it("lanza ContentError en español si una cápsula tiene 3 ítems de recuperación", async () => {
    const caps = JSON.parse(read("capsules.json"));
    caps[0].retrieval = caps[0].retrieval.slice(0, 3);
    const err = await loadContent(serve({ "capsules.json": caps }), "/").catch((e) => e);
    expect(err).toBeInstanceOf(ContentError);
    expect(err.message).toMatch(/cápsula/i);
    expect(err.message).toContain(caps[0].id);
  });

  it("los ejercicios viajan en un archivo por nivel, todos bajo el tope del precache, y se unen al cargar", async () => {
    const manifest = JSON.parse(read("manifest.json"));
    expect(Object.keys(manifest.item_files)).toContain("A1");
    for (const f of Object.values<string>(manifest.item_files)) expect(readFileSync(join(dir, f)).length, f).toBeLessThan(6 * 1024 * 1024 * 0.85);
    const pack = await loadContent(serve(), "/");
    const merged = Object.assign({}, ...Object.values<string>(manifest.item_files).map((f) => JSON.parse(read(f))));
    expect(Object.keys(pack.itemsByCode).sort()).toEqual(Object.keys(merged).sort());
  });

  it("sin `item_files` en el manifiesto lee el archivo único de antes", async () => {
    const manifest = JSON.parse(read("manifest.json"));
    const merged = Object.assign({}, ...Object.values<string>(manifest.item_files).map((f) => JSON.parse(read(f))));
    delete manifest.item_files;
    const pack = await loadContent(serve({ "manifest.json": manifest, "items_by_code.json": merged }), "/");
    expect(Object.keys(pack.itemsByCode)).toHaveLength(Object.keys(merged).length);
  });

  it("lanza ContentError si un ítem de repaso no valida", async () => {
    const items = JSON.parse(read("items_A1.json"));
    const code = Object.keys(items)[0];
    items[code][0].options = [];
    await expect(loadContent(serve({ "items_A1.json": items }), "/")).rejects.toBeInstanceOf(ContentError);
  });

  it("lanza ContentError si un archivo no se puede descargar", async () => {
    const fetcher = async () => new Response("no", { status: 404 });
    await expect(loadContent(fetcher, "/")).rejects.toBeInstanceOf(ContentError);
  });
});
