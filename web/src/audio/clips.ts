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
export function audioIdFor(text: string, pack: Pick<ContentPack, "sentences" | "lexemes" | "readings"> & Partial<Pick<ContentPack, "course" | "speaking">>): string | undefined {
  return pack.sentences.find((s) => s.it === text)?.audio ?? pack.lexemes.find((l) => l.form === text)?.audio
    ?? pack.readings?.flatMap((r) => r.sentences).find((s) => s.it === text)?.audio
    ?? pack.course?.units.flatMap((u) => u.words ?? []).find((w) => w.form === text)?.audio
    ?? pack.speaking?.tasks.flatMap((t) => t.questions).find((q) => q.it === text)?.audio
    ?? pack.speaking?.alphabet.letters.find((l) => l.name === text)?.audio
    ?? pack.speaking?.phrases?.groups.flatMap((g) => g.items).find((q) => q.it === text)?.audio;
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
