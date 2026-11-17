import type { Capsule } from "../generated/capsule";
import type { Item } from "../generated/item";
import { schemaValidator } from "./schemas";

export type Lexeme = { id: string; form: string; gloss_es: string; lexical_type: "false_friend"; source: string };
export type PackSentence = {
  id: string; it: string; es: string; author?: string; es_author?: string; license?: string;
  source_id?: string; es_source_id?: string; translation_kind?: "direct" | "llm"; cefr_estimate: string;
};
export type Manifest = {
  capsules: string[];
  codes: Record<string, { usable: number; capsule: boolean; reason: string | null }>;
  levels: Record<string, number>;
  reviewers: Record<string, number>;
  sentences_used: number;
  translation_kind: Record<string, number>;
};
export type ContentPack = {
  capsules: Capsule[];
  itemsByCode: Record<string, Item[]>;
  lexemes: Lexeme[];
  sentences: PackSentence[];
  manifest: Manifest;
};

export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentError";
  }
}

type Fetcher = (url: string) => Promise<Response>;

async function getJson<T>(fetcher: Fetcher, base: string, file: string): Promise<T> {
  let res: Response;
  try {
    res = await fetcher(`${base}content/${file}`);
  } catch {
    throw new ContentError(`No se pudo descargar ${file}.`);
  }
  if (!res.ok) throw new ContentError(`No se pudo descargar ${file} (error ${res.status}).`);
  try {
    return (await res.json()) as T;
  } catch {
    throw new ContentError(`${file} no es un JSON válido.`);
  }
}

export async function loadContent(fetcher: Fetcher = (u) => fetch(u), base: string = import.meta.env.BASE_URL ?? "/"): Promise<ContentPack> {
  const [capsules, itemsByCode, lexemes, sentences, manifest] = await Promise.all([
    getJson<Capsule[]>(fetcher, base, "capsules.json"),
    getJson<Record<string, Item[]>>(fetcher, base, "items_by_code.json"),
    getJson<Lexeme[]>(fetcher, base, "lexemes.json"),
    getJson<PackSentence[]>(fetcher, base, "sentences.json"),
    getJson<Manifest>(fetcher, base, "manifest.json"),
  ]);
  const vCapsule = schemaValidator("capsule");
  const vItem = schemaValidator("item");
  for (const c of capsules) {
    if (!vCapsule(c)) throw new ContentError(`La cápsula ${c.id} no cumple el esquema.`);
  }
  for (const [code, items] of Object.entries(itemsByCode)) {
    for (const it of items) if (!vItem(it)) throw new ContentError(`El ítem ${it.id} del código ${code} no cumple el esquema.`);
  }
  if (!Array.isArray(manifest.capsules)) throw new ContentError("El manifiesto del contenido está incompleto.");
  return { capsules, itemsByCode, lexemes, sentences, manifest };
}
