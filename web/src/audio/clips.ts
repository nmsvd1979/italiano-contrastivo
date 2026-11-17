import type { ContentPack } from "../content/load";

export type AudioIndex = Set<string>;

/** Ids de los clips disponibles. Si el índice no se puede descargar, no hay clips (se usará la voz del sistema). */
export async function loadAudioIndex(
  fetcher: (url: string) => Promise<Response> = (u) => fetch(u),
  base: string = import.meta.env.BASE_URL ?? "/",
): Promise<AudioIndex> {
  try {
    const res = await fetcher(`${base}audio/index.json`);
    if (!res.ok) return new Set();
    const rows = (await res.json()) as { id: string }[];
    return new Set(rows.map((r) => r.id));
  } catch {
    return new Set();
  }
}

/** Id del clip de un texto exacto (oración o palabra del paquete). Un texto editado o un distractor no tiene. */
export function audioIdFor(text: string, pack: Pick<ContentPack, "sentences" | "lexemes">): string | undefined {
  return pack.sentences.find((s) => s.it === text)?.audio ?? pack.lexemes.find((l) => l.form === text)?.audio;
}

/** Palabra → archivo de grabación nativa (`audio/words/<archivo>`). Sin el archivo o sin red: vacío. */
export async function loadNativeWords(
  fetcher: (url: string) => Promise<Response> = (u) => fetch(u),
  base: string = import.meta.env.BASE_URL ?? "/",
): Promise<Map<string, string>> {
  try {
    const res = await fetcher(`${base}audio/words.json`);
    if (!res.ok) return new Map();
    const rows = (await res.json()) as { form: string; file: string }[];
    return new Map(rows.map((r) => [r.form, r.file]));
  } catch {
    return new Map();
  }
}
