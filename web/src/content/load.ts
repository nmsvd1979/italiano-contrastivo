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
export type ReadingSentence = { id: string; it: string; es: string; audio?: string; speaker?: string };
export type ReadingQuestion = { prompt_es: string; options: string[]; answer: number; evidence?: number };
export type Reading = {
  id: string; title: string; level: string; kind: "lectura" | "dialogo" | "documento";
  /** Lectura NO vista: solo la usa el examen de hito (ninguna unidad). */
  exam?: boolean;
  /** Documento (horario, agenda): tabla con las celdas tal cual del libro. */
  table?: { head: string[]; rows: string[][] };
  source: { book: string; authors: string; url: string; license: string };
  translation: string; sentences: ReadingSentence[]; questions: ReadingQuestion[];
};
export type ReadingWord = { g: string; k: "transparente" | "regular" | "opaca"; r?: string; ff?: boolean; n?: string };
/** Un recurso externo verificado (la app solo enlaza: no copia ni aloja su contenido). */
export type ResourceKind = "video" | "podcast" | "audio" | "lectura" | "diccionario" | "pronunciacion" | "curso" | "examen" | "referencia";
export type Resource = {
  id: string; title: string; url: string; kind: ResourceKind;
  levels: ("A1" | "A2" | "B1" | "B2")[];            // niveles para los que lo recomendamos (criterio del proyecto + lo que declara el sitio)
  lang: "it" | "es" | "en" | "mixto";                // idioma en que se explica
  cost: "gratis" | "freemium" | "pago";
  strand: "entrada" | "foco" | "fluidez";            // a qué hebra suma el tiempo que registres
  note: string; task: string; warning?: string; verified: string;
};
/** Habla guiada (`speaking.json`): juegos de roles sobre diálogos de las lecturas, tareas orales del libro y el alfabeto. */
export type SpeakingQuestion = { it: string; es: string; audio?: string };
export type RolePlay = { id: string; title: string; function_es: string; reading: string; from: number; to: number; after: string[]; goal_es: string };
export type SpeakingTask = {
  id: string; title: string; function_es: string; level: string; minutes: number; after: string[]; intro_es: string; adaptation: string;
  source: { book: string; authors: string; url: string; license: string; chapter: string };
  questions: SpeakingQuestion[]; checklist_es: string[];
};
export type Speaking = {
  version: number; note: string;
  alphabet: { source: { book: string; authors: string; url: string; license: string }; letters: { letter: string; name: string; audio?: string }[]; missing_es: string };
  phrases?: { title: string; intro_es: string; groups: { id: string; title: string; missing_es: string; source: { book: string; authors: string; url: string; license: string; chapter: string }; items: SpeakingQuestion[] }[] };
  roleplays: RolePlay[]; tasks: SpeakingTask[];
};
export type PlannedUnit = { level: string; title: string; reason: string };
/** Módulo temático: una situación comunicativa con su texto de entrada, sus cápsulas (unidades), su salida y su cierre. */
export type CourseModule = {
  id: string; level: string; title: string;
  can_do_es: string[];                 // «sé hacer»: lo que podrás hacer al terminar
  units: string[];                     // cápsulas (ids de unidad), en orden
  entry_reading: string;               // texto real de entrada
  roleplays: string[]; tasks: string[]; phrase_groups: string[];   // salida (ids de speaking.json)
  library: string; library_task_es: string;                        // 10 minutos sugeridos de la Biblioteca
  gap_es?: string;                     // lo que le falta al módulo, declarado
};
export type Course = { version: number; levels: { id: string; title: string; guided_hours: string }[]; modules?: CourseModule[]; units: Unit[]; planned: PlannedUnit[] };
export type ContentPack = {
  course: Course;
  readings?: Reading[];
  /** Ejercicios derivados de cada lectura (texto del libro): traducir, ordenar y completar. */
  /** Clave «unidad:lectura». */
  readingItems?: Record<string, Item[]>;
  /** Glosa y tamiz de cada palabra de las lecturas (clasificado por IA). */
  readingWords?: Record<string, ReadingWord>;
  library?: Resource[];
  speaking?: Speaking | null;
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
  const [capsules, itemsByCode, lexemes, sentences, manifest, course, readings, readingItems, readingWords, library, speaking] = await Promise.all([
    getJson<Capsule[]>(fetcher, base, "capsules.json"),
    getJson<Record<string, Item[]>>(fetcher, base, "items_by_code.json"),
    getJson<Lexeme[]>(fetcher, base, "lexemes.json"),
    getJson<PackSentence[]>(fetcher, base, "sentences.json"),
    getJson<Manifest>(fetcher, base, "manifest.json"),
    getJson<Course>(fetcher, base, "course.json"),
    getJson<Reading[]>(fetcher, base, "readings.json").catch((): Reading[] => []), // aún no hay lecturas publicadas: no es un error
    getJson<Record<string, Item[]>>(fetcher, base, "reading_items.json").catch((): Record<string, Item[]> => ({})),
    getJson<Record<string, ReadingWord>>(fetcher, base, "reading_words.json").catch((): Record<string, ReadingWord> => ({})),
    getJson<Resource[]>(fetcher, base, "library.json").catch((): Resource[] => []),
    getJson<Speaking | null>(fetcher, base, "speaking.json").catch((): Speaking | null => null),
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
  return { capsules, itemsByCode, lexemes, sentences, manifest, course, readings, readingItems, readingWords, library, speaking };
}
