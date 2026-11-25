/** Sonido breve al acertar o fallar. Apagado por defecto; se enciende en Ajustes y se guarda solo en este dispositivo. */
const KEY = "italiano-contrastivo.sound";

export function loadSound(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function saveSound(on: boolean): void {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* sin almacenamiento: se aplica ahora pero no se recordará */ }
}

type Ctor = typeof AudioContext;
let ctx: AudioContext | null = null;

/** Notas de cada señal: [frecuencia en Hz, inicio en s, duración en s]. Acierto: dos notas que suben; fallo: una grave. */
export const CUES = { ok: [[660, 0, 0.09], [880, 0.09, 0.12]], bad: [[220, 0, 0.18]] } as const;

/** Toca la señal si el sonido está encendido. Sin Web Audio o sin permiso del navegador no hace nada (nunca falla). */
export function playCue(kind: keyof typeof CUES, enabled: boolean = loadSound()): void {
  if (!enabled) return;
  try {
    const AC: Ctor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    void ctx.resume?.();
    const t0 = ctx.currentTime;
    for (const [freq, at, len] of CUES[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + at);
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + at);
      osc.stop(t0 + at + len + 0.02);
    }
  } catch { /* el sonido es un extra: si falla, no pasa nada */ }
}
