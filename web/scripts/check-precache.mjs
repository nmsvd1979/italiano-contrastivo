// Tras `vite build`: el service worker debe precachear la app y el contenido (sin ellos no hay modo sin conexión) y
// NO el audio (se baja aparte a la caché `audio-v1`; precachearlo hace pesada la instalación y la actualización).
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";

const sw = readFileSync("dist/sw.js", "utf8");
const list = (dir, prefix) => (existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith(".") && statSync(`${dir}/${f}`).isFile()).map((f) => `${prefix}${f}`) : []);
const needed = ["index.html", "manifest.webmanifest", ...list("public/content", "content/"), "audio/index.json", "audio/words.json"];
const missing = needed.filter((f) => !sw.includes(`"${f}"`));
const mp3 = [...sw.matchAll(/url:"([^"]+\.mp3)"/g)].map((m) => m[1]);
const precacheUrls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
const bytes = precacheUrls.reduce((t, u) => t + (existsSync(`dist/${u}`) ? statSync(`dist/${u}`).size : 0), 0);
let bad = false;
if (missing.length) { console.error(`El service worker no precachea: ${missing.join(", ")}`); bad = true; }
if (mp3.length) { console.error(`El precache no debe incluir audio (${mp3.length} mp3): se instalaría lento y puede abortarse.`); bad = true; }
if (!sw.includes("audio-v1")) { console.error("Falta la caché de audio en tiempo de ejecución (audio-v1)."); bad = true; }
if (bytes > 5_000_000) { console.error(`El precache pesa ${(bytes / 1e6).toFixed(1)} MB (tope 5 MB: el contenido del curso crece; el audio sigue aparte).`); bad = true; }
if (bad) process.exit(1);
console.log(`precache ok: ${precacheUrls.length} archivos, ${(bytes / 1e6).toFixed(2)} MB (app y contenido; audio aparte)`);
