import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas");

export function loadSchemas() {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".schema.json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}

export function makeAjv() {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  for (const s of loadSchemas()) ajv.addSchema(s);
  return ajv;
}

export const schemaId = (name) => `https://italiano-contrastivo/schemas/${name}.schema.json`;
