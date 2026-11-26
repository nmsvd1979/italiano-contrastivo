// Tras `vite build`: el service worker debe precachear la app y el contenido (sin ellos no hay modo sin conexión) y
// NO el audio (se baja aparte a la caché `audio-v1`; precachearlo hace pesada la instalación y la actualización).
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";

const sw = readFileSync("dist/sw.js", "utf8");
const list = (dir, prefix) => (existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith(".") && statSync(`${dir}/${f}`).isFile()).map((f) => `${prefix}${f}`) : []);
const needed = ["index.html", "manifest.webmanifest", ...list("public/content", "content/").filter((f) => !/ATTRIBUZIONI-/.test(f)), "audio/index.json", "audio/words.json"];
const missing = needed.filter((f) => !sw.includes(`"${f}"`));
const mp3 = [...sw.matchAll(/url:"([^"]+\.mp3)"/g)].map((m) => m[1]);
const precacheUrls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
const bytes = precacheUrls.reduce((t, u) => t + (existsSync(`dist/${u}`) ? statSync(`dist/${u}`).size : 0), 0);
// El tope total crece con los niveles que ya tienen módulos (A1 solo: 11 MB; con A2: 16 MB…); el tope por archivo (6 MiB) no cambia.
const course = JSON.parse(readFileSync("public/content/course.json", "utf8"));
const levels = new Set((course.modules ?? []).map((m) => m.level)).size || 1;
const CAP = { 1: 11_000_000, 2: 16_000_000, 3: 22_000_000 }[levels] ?? 28_000_000;
const FILE_CAP = 6 * 1024 * 1024;
let bad = false;
for (const f of list("public/content", "content/")) {
  const size = statSync(`public/${f}`).size;
  if (/\/items_.*\.json$/.test(f) && size > FILE_CAP * 0.85) console.warn(`Aviso: ${f} pesa ${(size / 1048576).toFixed(2)} MiB (el tope por archivo es 6 MiB): hay que partirlo.`);
}
if (missing.length) { console.error(`El service worker no precachea: ${missing.join(", ")}`); bad = true; }
if (mp3.length) { console.error(`El precache no debe incluir audio (${mp3.length} mp3): se instalaría lento y puede abortarse.`); bad = true; }
if (!sw.includes("audio-v1")) { console.error("Falta la caché de audio en tiempo de ejecución (audio-v1)."); bad = true; }
if (bytes > CAP) { console.error(`El precache pesa ${(bytes / 1e6).toFixed(1)} MB (tope ${CAP / 1e6} MB con ${levels} nivel(es) con módulos; comprimido llega a ≈1 MB): el contenido del curso crece; el audio sigue aparte).`); bad = true; }
if (bad) process.exit(1);
console.log(`precache ok: ${precacheUrls.length} archivos, ${(bytes / 1e6).toFixed(2)} MB (app y contenido; audio aparte)`);
