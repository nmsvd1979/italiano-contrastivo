import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

const schemaFiles = import.meta.glob("../../../schemas/*.schema.json", { eager: true, import: "default" }) as Record<string, object>;

let ajv: Ajv2020 | undefined;

/** Validador compilado de `schemas/<name>.schema.json` (fuente de verdad de los datos). */
export function schemaValidator(name: string): (data: unknown) => boolean {
  if (!ajv) {
    ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    for (const s of Object.values(schemaFiles)) ajv.addSchema(s);
  }
  const v = ajv.getSchema(`https://italiano-contrastivo/schemas/${name}.schema.json`);
  if (!v) throw new Error(`Esquema desconocido: ${name}`);
  return (data) => v(data) as boolean;
}
