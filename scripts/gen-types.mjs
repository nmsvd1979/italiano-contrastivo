// Genera tipos TS desde schemas/*.schema.json → web/src/generated/types.d.ts. No editar a mano la salida.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";
import { loadSchemas } from "./schemas.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://italiano-contrastivo/schemas/";
// El parser resuelve $ref relativos contra el cwd e ignora $id: se vuelven absolutos.
const absolutize = (n) =>
  Array.isArray(n) ? n.map(absolutize)
  : n && typeof n === "object"
    ? Object.fromEntries(Object.entries(n).map(([k, v]) =>
        [k, k === "$ref" && typeof v === "string" && !v.startsWith("#") && !v.startsWith("http") ? BASE + v : absolutize(v)]))
    : n;
const byUrl = new Map(loadSchemas().map((s) => [s.$id, absolutize(s)]));

const resolver = {
  order: 1,
  canRead: (f) => f.url.startsWith(BASE),
  read: (f) => JSON.stringify(byUrl.get(f.url.split("#")[0])),
};

const dir = join(root, "web", "src", "generated");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
// Un archivo por esquema: los tipos compartidos (p. ej. Item dentro de Capsule) se re-emiten sin chocar.
for (const name of ["error-code", "lexeme", "sentence", "item", "capsule", "card", "review-log", "error-event", "slm-feedback"]) {
  const schema = byUrl.get(`${BASE}${name}.schema.json`);
  const ts = await compile(schema, schema.title, { bannerComment: "/* AUTO-GENERADO por scripts/gen-types.mjs desde schemas/. No editar a mano. */", additionalProperties: false, $refOptions: { resolve: { local: resolver, http: false } } });
  writeFileSync(join(dir, `${name}.d.ts`), ts);
}
console.log("ok");
