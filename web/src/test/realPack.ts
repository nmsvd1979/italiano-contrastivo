import { readFileSync } from "node:fs";
import type { ContentPack } from "../content/load";

const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));

/** El paquete real publicado (lo que lee la app). Las pruebas que necesitan contenido de verdad parten de aquí. */
export function readPack(): ContentPack {
  return { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
}

/**
 * Curso de ejemplo de dos niveles hecho con contenido real: A1 = módulos m01 y m02; A2 = el contenido de m03 con el id `a2m01`;
 * más u12 (B1, sin módulo). Así se prueba la ruta entre niveles sin esperar a que A2 exista. `a2Milestone` activa el hito del nivel A2.
 */
export function twoLevelPack(a2Milestone = false): ContentPack {
  const pack = readPack();
  const c = pack.course;
  const [m1, m2, m3] = c.modules!;
  const a2 = { ...m3, id: "a2m01", level: "A2" };
  const inModules = new Set([...m1.units, ...m2.units, ...a2.units]);
  const units = c.units.filter((u) => inModules.has(u.id)).map((u) => (a2.units.includes(u.id) ? { ...u, level: "A2" } : u));
  const b1 = c.units.find((u) => u.id === "u12")!;
  const title = (id: string) => c.levels.find((l) => l.id === id)?.title ?? id;
  return {
    ...pack,
    course: {
      ...c,
      levels: [
        { id: "A1", title: title("A1"), guided_hours: "40–50 h", milestone: true },
        { id: "A2", title: title("A2"), guided_hours: "90–100 h", milestone: a2Milestone },
        { id: "B1", title: title("B1"), guided_hours: "" },
      ],
      modules: [m1, m2, a2],
      units: [...units, b1],
    },
  } as ContentPack;
}
