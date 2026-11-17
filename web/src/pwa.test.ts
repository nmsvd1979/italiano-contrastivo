import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadAudio, cachedCount } from "./audio/offline";
import { checkForUpdate, repairApp, watchUpdates } from "./pwa";

class FakeWorker extends EventTarget { state = "installing"; }
class FakeReg extends EventTarget {
  installing: FakeWorker | null = null;
  waiting = null;
  updated = 0;
  unregistered = false;
  async update() { this.updated++; }
  async unregister() { this.unregistered = true; return true; }
}
function fakeSW(hasController: boolean) {
  const sw = Object.assign(new EventTarget(), { controller: hasController ? {} : null, reg: new FakeReg(), getRegistration() { return Promise.resolve(this.reg); }, getRegistrations() { return Promise.resolve([this.reg]); } });
  vi.stubGlobal("navigator", { serviceWorker: sw });
  return sw;
}
afterEach(() => vi.unstubAllGlobals());
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("actualizaciones", () => {
  it("avisa que descarga y recarga cuando la versión nueva toma el control", async () => {
    const sw = fakeSW(true);
    const states: string[] = [], reload = vi.fn();
    const stop = watchUpdates((s) => states.push(s), reload);
    await tick();
    sw.reg.installing = new FakeWorker();
    sw.reg.dispatchEvent(new Event("updatefound"));
    expect(states).toEqual(["downloading"]);
    sw.dispatchEvent(new Event("controllerchange"));
    sw.dispatchEvent(new Event("controllerchange")); // una sola recarga
    expect(reload).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe("reloading");
    stop();
  });
  it("la primera instalación no recarga ni avisa", async () => {
    const sw = fakeSW(false);
    const states: string[] = [], reload = vi.fn();
    watchUpdates((s) => states.push(s), reload);
    await tick();
    sw.reg.installing = new FakeWorker();
    sw.reg.dispatchEvent(new Event("updatefound"));
    sw.dispatchEvent(new Event("controllerchange"));
    expect(states).toEqual([]);
    expect(reload).not.toHaveBeenCalled();
  });
  it("si la instalación falla vuelve a «idle»", async () => {
    const sw = fakeSW(true);
    const states: string[] = [];
    watchUpdates((s) => states.push(s), vi.fn());
    await tick();
    const w = new FakeWorker();
    sw.reg.installing = w;
    sw.reg.dispatchEvent(new Event("updatefound"));
    w.state = "redundant";
    w.dispatchEvent(new Event("statechange"));
    expect(states).toEqual(["downloading", "idle"]);
  });
  it("sin service worker no hace nada", async () => {
    vi.stubGlobal("navigator", {});
    const stop = watchUpdates(() => { throw new Error("no debe llamarse"); }, vi.fn());
    stop();
    expect(await checkForUpdate()).toBe("unsupported");
  });
  it("buscar actualización consulta al servidor", async () => {
    const sw = fakeSW(true);
    expect(await checkForUpdate()).toBe("none");
    expect(sw.reg.updated).toBe(1);
    sw.reg.installing = new FakeWorker();
    expect(await checkForUpdate()).toBe("downloading");
  });
  it("reparar borra service worker y cachés de la app pero conserva el audio", async () => {
    const sw = fakeSW(true);
    const deleted: string[] = [];
    vi.stubGlobal("caches", { keys: async () => ["workbox-precache-v2", "audio-v1"], delete: async (k: string) => { deleted.push(k); return true; } });
    const reload = vi.fn();
    await repairApp(reload);
    expect(sw.reg.unregistered).toBe(true);
    expect(deleted).toEqual(["workbox-precache-v2"]);
    expect(reload).toHaveBeenCalled();
  });
});

describe("audio sin conexión", () => {
  function fakeCaches() {
    const store = new Map<string, Response>();
    const cache = { keys: async () => [...store.keys()].map((url) => ({ url })), put: async (u: string, r: Response) => void store.set(u, r) };
    vi.stubGlobal("caches", { open: async () => cache });
    return store;
  }
  it("baja solo lo que falta y cuenta lo guardado y lo fallido", async () => {
    const store = fakeCaches();
    const base = document.baseURI;
    store.set(new URL("./audio/tts/a.mp3", base).href, new Response("x"));
    vi.stubGlobal("fetch", vi.fn(async (u: string) => (u.includes("bad") ? new Response("no", { status: 404 }) : new Response("audio"))));
    const urls = ["./audio/tts/a.mp3", "./audio/tts/b.mp3", "./audio/tts/bad.mp3"];
    expect(await cachedCount(urls)).toBe(1);
    const progress: number[] = [];
    const r = await downloadAudio(urls, (d) => progress.push(d));
    expect(r).toEqual({ saved: 2, failed: 1 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2); // a.mp3 ya estaba
    expect(await cachedCount(urls)).toBe(2);
    expect(progress[0]).toBe(1);
  });
});
