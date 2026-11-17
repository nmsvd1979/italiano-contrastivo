// Tras `vite build`: el service worker debe precachear la app y todo el contenido, o no hay modo sin conexión.
import { readFileSync, readdirSync, existsSync } from "node:fs";

const sw = readFileSync("dist/sw.js", "utf8");
const content = readdirSync("public/content");
const needed = ["index.html", ...content.map((f) => `content/${f}`)];
const missing = needed.filter((f) => !sw.includes(`"${f}"`) && !sw.includes(`'${f}'`));
if (!existsSync("dist/manifest.webmanifest")) missing.push("manifest.webmanifest");
if (missing.length) {
  console.error(`El service worker no precachea: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`precache ok: ${needed.length} archivos de la app y el contenido`);
