import type { Capsule } from "../generated/capsule";
import type { Item } from "../generated/item";
import { schemaValidator } from "./schemas";

export type Lexeme = { id: string; form: string; gloss_es: string; lexical_type: "false_friend" | "neutral"; source: string; audio?: string; art?: string; gdiv?: boolean; ff?: boolean };
export type PackSentence = {
  id: string; it: string; es: string; author?: string; es_author?: string; license?: string;
  source_id?: string; es_source_id?: string; translation_kind?: "direct" | "llm"; cefr_estimate: string; audio?: string;
};
export type Manifest = {
  capsules: string[];
  codes: Record<string, { usable: number; capsule: boolean; reason: string | null }>;
  levels: Record<string, number>;
  reviewers: Record<string, number>;
  sentences_used: number;
  translation_kind: Record<string, number>;
};
export type Unit = {
  id: string; level: string; title: string; goal_es: string; why_here: string; codes: string[]; status: "active"; explanation_es: string;
  parts: { descubre: string[]; practica: string[]; escucha: string[]; prueba: string[] };
  divergences: { id: string; start: number; end: number; wrong: string }[];
  readings?: string[];
  words?: { form: string; gender: string; num: string; gloss: string; audio?: string; art?: string; gdiv?: boolean; ff?: boolean; sieve?: "transparente" | "regular" | "opaca"; rule?: string; note?: string }[];
  ficha_es?: string;
};
export type ReadingSentence = { id: string; it: string; es: string; audio?: string };
export type ReadingQuestion = { prompt_es: string; options: string[]; answer: number; evidence?: number };
export type Reading = {
  id: string; title: string; level: string; kind: "lectura" | "dialogo";
  source: { book: string; authors: string; url: string; license: string };
  translation: string; sentences: ReadingSentence[]; questions: ReadingQuestion[];
};
export type ReadingWord = { g: string; k: "transparente" | "regular" | "opaca"; r?: string; ff?: boolean; n?: string };
export type PlannedUnit = { level: string; title: string; reason: string };
export type Course = { version: number; levels: { id: string; title: string; guided_hours: string }[]; units: Unit[]; planned: PlannedUnit[] };
export type ContentPack = {
  course: Course;
  readings?: Reading[];
  /** Ejercicios derivados de cada lectura (texto del libro): traducir, ordenar y completar. */
  /** Clave «unidad:lectura». */
  readingItems?: Record<string, Item[]>;
  /** Glosa y tamiz de cada palabra de las lecturas (clasificado por IA). */
  readingWords?: Record<string, ReadingWord>;
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
  const [capsules, itemsByCode, lexemes, sentences, manifest, course, readings, readingItems, readingWords] = await Promise.all([
    getJson<Capsule[]>(fetcher, base, "capsules.json"),
    getJson<Record<string, Item[]>>(fetcher, base, "items_by_code.json"),
    getJson<Lexeme[]>(fetcher, base, "lexemes.json"),
    getJson<PackSentence[]>(fetcher, base, "sentences.json"),
    getJson<Manifest>(fetcher, base, "manifest.json"),
    getJson<Course>(fetcher, base, "course.json"),
    getJson<Reading[]>(fetcher, base, "readings.json").catch((): Reading[] => []), // aún no hay lecturas publicadas: no es un error
    getJson<Record<string, Item[]>>(fetcher, base, "reading_items.json").catch((): Record<string, Item[]> => ({})),
    getJson<Record<string, ReadingWord>>(fetcher, base, "reading_words.json").catch((): Record<string, ReadingWord> => ({})),
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
  if (!Array.isArray(course.units) || !Array.isArray(course.levels)) throw new ContentError("La ruta del curso está incompleta.");
  const known = new Set(sentences.map((x) => x.id));
  for (const u of course.units) {
    for (const id of Object.values(u.parts).flat()) if (!known.has(id)) throw new ContentError(`La unidad ${u.id} usa una oración que no está en el paquete (${id}).`);
    if (!capsules.some((c) => c.target_error_codes[0] === u.codes[0])) throw new ContentError(`La unidad ${u.id} no tiene cápsula.`);
  }
  const rd = new Set(readings.map((r) => r.id));
  for (const u of course.units) for (const id of u.readings ?? []) if (!rd.has(id)) throw new ContentError(`La unidad ${u.id} usa una lectura que no está en el paquete (${id}).`);
  return { capsules, itemsByCode, lexemes, sentences, manifest, course, readings, readingItems, readingWords };
}
