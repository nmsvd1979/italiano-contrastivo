import type { AudioIndex } from "../audio/clips";

export type SpeakResult = "native" | "clip" | "system" | "no_voice";

/** Lee un texto en italiano con la voz del sistema (iPhone: voz it-IT instalada). */
export async function speakItalian(text: string): Promise<"ok" | "no_voice"> {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return "no_voice";
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().replace("_", "-").startsWith("it"));
  if (!voice) return "no_voice";
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = "it-IT";
  synth.cancel();
  synth.speak(u);
  return "ok";
}

let current: HTMLAudioElement | null = null;

/** Reproduce un texto: grabación nativa → clip precalculado → voz del sistema → "no_voice". Un nuevo `say` detiene el audio anterior. */
export async function say(text: string, opts: { nativeFile?: string; clipId?: string; index?: AudioIndex; base?: string } = {}): Promise<SpeakResult> {
  current?.pause();
  current = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
  const { nativeFile, clipId, index, base = import.meta.env.BASE_URL ?? "/" } = opts;
  const attempts: [SpeakResult, string][] = [];
  if (nativeFile) attempts.push(["native", `${base}audio/words/${nativeFile}`]);
  if (clipId && index?.has(clipId)) attempts.push(["clip", `${base}audio/tts/${clipId}.mp3`]);
  for (const [kind, url] of attempts) {
    try {
      const audio = new Audio(url);
      await audio.play();
      current = audio;
      return kind;
    } catch {
      /* sin permiso o archivo ausente: sigue con la siguiente opción */
    }
  }
  return (await speakItalian(text)) === "ok" ? "system" : "no_voice";
}
