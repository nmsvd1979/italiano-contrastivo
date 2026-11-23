import type { Reading, ReadingSentence, RolePlay, Speaking, SpeakingTask } from "../content/load";

/** Un turno del juego de roles: la voz que habla y su frase (el texto es el del libro). */
export type Turn = { index: number; sentence: ReadingSentence; speaker: string };

export const turnsOf = (rp: RolePlay, reading: Reading): Turn[] =>
  reading.sentences.slice(rp.from, rp.to + 1).map((sentence, i) => ({ index: rp.from + i, sentence, speaker: sentence.speaker ?? "" }));

/** Voces del diálogo en el orden en que aparecen. */
export const speakersOf = (turns: Turn[]): string[] => [...new Set(turns.map((t) => t.speaker))];

/** Tiempo de una vuelta: cada turno cuenta como mucho 90 s (una pausa larga no es estudio). */
export const TURN_CAP_SECONDS = 90;
export const cappedSeconds = (gaps: number[], cap = TURN_CAP_SECONDS): number => Math.round(gaps.reduce((t, g) => t + Math.min(Math.max(g, 0), cap), 0));

export type Rating = "bien" | "casi" | "otra";
export const ratingSummary = (r: Rating[]) => ({ bien: r.filter((x) => x === "bien").length, casi: r.filter((x) => x === "casi").length, otra: r.filter((x) => x === "otra").length });

/** Nombre de cada letra de un texto (tabla del libro; sin tildes). Las letras que la tabla no trae (j, k, w, x, y) quedan sin nombre. */
export type SpelledLetter = { ch: string; name?: string; audio?: string };
export function spell(text: string, alphabet: Speaking["alphabet"]): SpelledLetter[] {
  const by = new Map(alphabet.letters.map((l) => [l.letter, l]));
  return [...text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()].filter((c) => /[a-z]/.test(c)).map((ch) => ({ ch, name: by.get(ch)?.name, audio: by.get(ch)?.audio }));
}

/** Encargo para el modo de voz de una IA gratuita: la app no corrige; lo que dice la IA es una opinión sin verificar. */
export function voicePrompt(task: SpeakingTask): string {
  const qs = task.questions.map((q) => `- ${q.it}`).join("\n");
  return [
    `Eres mi interlocutor de italiano. Soy hispanohablante (Chile) y mi nivel es ${task.level}. Hablemos solo en italiano, con frases cortas y despacio.`,
    `Tema: ${task.title}. Hazme, de una en una, estas preguntas y espera mi respuesta:`,
    qs,
    "Si me equivoco, no me interrumpas: al final dime, en español, los 3 errores más importantes (cita lo que dije y cómo se dice bien), y cuáles son calcos del español.",
    "Si no estás seguro de una corrección, dilo.",
  ].join("\n");
}

/** Qué unidades sugeridas faltan por completar (solo orientativo: nada se bloquea). */
export const missingBefore = (after: string[], done: Set<string>): string[] => after.filter((u) => !done.has(u));
