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
