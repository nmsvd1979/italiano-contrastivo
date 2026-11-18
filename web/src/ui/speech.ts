import type { AudioIndex } from "../audio/clips";

export type SpeakResult = "native" | "clip" | "system" | "no_voice" | "superseded";

/** Lee un texto en italiano con la voz del sistema (iPhone: voz it-IT instalada). */
export async function speakItalian(text: string, rate = 1): Promise<"ok" | "no_voice"> {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return "no_voice";
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().replace("_", "-").startsWith("it"));
  if (!voice) return "no_voice";
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = "it-IT";
  u.rate = rate;
  synth.cancel();
  synth.speak(u);
  return "ok";
}

let current: HTMLAudioElement | null = null;
let seq = 0; // cada `say` toma un turno: si llega otro antes de que el primero arranque, el primero se descarta

/** Detiene lo que esté sonando y descarta cualquier `say` aún por arrancar. */
export function stopSay(): void {
  seq++;
  current?.pause();
  current = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
}

/** Reproduce un texto: grabación nativa → clip precalculado → voz del sistema → "no_voice". Un nuevo `say` detiene el audio anterior. */
export async function say(text: string, opts: { nativeFile?: string; clipId?: string; index?: AudioIndex; base?: string; rate?: number } = {}): Promise<SpeakResult> {
  const turn = ++seq;
  current?.pause();
  current = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
  const { nativeFile, clipId, index, base = import.meta.env.BASE_URL ?? "/", rate = 1 } = opts;
  const attempts: [SpeakResult, string][] = [];
  if (nativeFile) attempts.push(["native", `${base}audio/words/${nativeFile}`]);
  if (clipId && index?.has(clipId)) attempts.push(["clip", `${base}audio/tts/${clipId}.mp3`]);
  for (const [kind, url] of attempts) {
    const audio = new Audio(url);
    audio.playbackRate = rate;
    current = audio;
    try {
      await audio.play();
      if (turn !== seq) {
        audio.pause();
        return "superseded";
      }
      return kind;
    } catch {
      if (turn !== seq) return "superseded";
      if (current === audio) current = null; // sin permiso o archivo ausente: sigue con la siguiente opción
    }
  }
  if (turn !== seq) return "superseded";
  return (await speakItalian(text, rate)) === "ok" ? "system" : "no_voice";
}
