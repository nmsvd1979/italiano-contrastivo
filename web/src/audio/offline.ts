/** Audio sin conexión: baja todos los clips a la caché `audio-v1` (la misma que usa el service worker al reproducir). */
export const AUDIO_CACHE = "audio-v1";

export async function audioUrls(base: string = import.meta.env.BASE_URL ?? "/", fetcher: (u: string) => Promise<Response> = (u) => fetch(u)): Promise<string[]> {
  const [idx, words] = await Promise.all([fetcher(`${base}audio/index.json`), fetcher(`${base}audio/words.json`)]);
  const ids = idx.ok ? ((await idx.json()) as { id: string }[]).map((r) => `${base}audio/tts/${r.id}.mp3`) : [];
  const files = words.ok ? ((await words.json()) as { file: string }[]).map((r) => `${base}audio/words/${r.file}`) : [];
  return [...ids, ...files];
}

const abs = (u: string) => new URL(u, document.baseURI).href;
export const cacheSupported = () => typeof caches !== "undefined";

export async function cachedCount(urls: string[]): Promise<number> {
  if (!cacheSupported()) return 0;
  const cache = await caches.open(AUDIO_CACHE);
  const have = new Set((await cache.keys()).map((r) => r.url));
  return urls.filter((u) => have.has(abs(u))).length;
}

/** Baja los clips que falten, de a pocos a la vez. Devuelve cuántos quedaron guardados y cuántos fallaron. */
export async function downloadAudio(urls: string[], onProgress: (done: number, total: number) => void, concurrency = 4): Promise<{ saved: number; failed: number }> {
  const cache = await caches.open(AUDIO_CACHE);
  const have = new Set((await cache.keys()).map((r) => r.url));
  const todo = urls.filter((u) => !have.has(abs(u)));
  let done = urls.length - todo.length, failed = 0;
  onProgress(done, urls.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, async () => {
    while (next < todo.length) {
      const u = todo[next++];
      try {
        const res = await fetch(u);
        if (!res.ok) throw new Error(String(res.status));
        await cache.put(abs(u), res);
        done++;
      } catch {
        failed++;
      }
      onProgress(done, urls.length);
    }
  }));
  return { saved: done, failed };
}
