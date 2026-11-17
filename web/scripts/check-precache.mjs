// Tras `vite build`: el service worker debe precachear la app, el contenido y el audio, o no hay modo sin conexión.
import { readFileSync, readdirSync, existsSync } from "node:fs";

const sw = readFileSync("dist/sw.js", "utf8");
const list = (dir, prefix) => (existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith(".")).map((f) => `${prefix}${f}`) : []);
const needed = [
  "index.html",
  ...list("public/content", "content/"),
  ...list("public/audio", "audio/").filter((f) => !f.endsWith("/tts") && !f.endsWith("/words")),
  ...list("public/audio/tts", "audio/tts/"),
  ...list("public/audio/words", "audio/words/"),
];
const missing = needed.filter((f) => !sw.includes(`"${f}"`) && !sw.includes(`'${f}'`));
if (!existsSync("dist/manifest.webmanifest")) missing.push("manifest.webmanifest");
if (missing.length) {
  console.error(`El service worker no precachea: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`precache ok: ${needed.length} archivos de la app, el contenido y el audio`);
