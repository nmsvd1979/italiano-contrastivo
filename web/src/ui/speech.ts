import type { AudioIndex } from "../audio/clips";

export type SpeakResult = "clip" | "system" | "no_voice";

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

/** Reproduce un texto: clip precalculado → voz del sistema → "no_voice". Un nuevo `say` detiene el audio anterior. */
export async function say(text: string, opts: { clipId?: string; index?: AudioIndex; base?: string } = {}): Promise<SpeakResult> {
  current?.pause();
  current = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
  const { clipId, index, base = import.meta.env.BASE_URL ?? "/" } = opts;
  if (clipId && index?.has(clipId)) {
    try {
      const audio = new Audio(`${base}audio/tts/${clipId}.mp3`);
      await audio.play();
      current = audio;
      return "clip";
    } catch {
      /* sin permiso o archivo ausente: sigue con la voz del sistema */
    }
  }
  return (await speakItalian(text)) === "ok" ? "system" : "no_voice";
}
