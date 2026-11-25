import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CUES, loadSound, playCue, saveSound } from "./sound";

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("sonido de acierto y error", () => {
  it("está apagado por defecto y se recuerda al encenderlo", () => {
    expect(loadSound()).toBe(false);
    saveSound(true);
    expect(loadSound()).toBe(true);
    saveSound(false);
    expect(loadSound()).toBe(false);
  });
  it("apagado no toca nada ni crea el contexto de audio", () => {
    const AC = vi.fn();
    vi.stubGlobal("AudioContext", AC);
    playCue("ok");
    expect(AC).not.toHaveBeenCalled();
  });
  it("encendido toca una nota por cada elemento de la señal", () => {
    const osc = { type: "", frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    osc.connect.mockReturnValue({ connect: vi.fn() });
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    const ctx = { currentTime: 0, destination: {}, resume: vi.fn(), createOscillator: () => osc, createGain: () => gain };
    vi.stubGlobal("AudioContext", vi.fn(function () { return ctx; }));
    playCue("ok", true);
    expect(osc.start).toHaveBeenCalledTimes(CUES.ok.length);
    playCue("bad", true);
    expect(osc.start).toHaveBeenCalledTimes(CUES.ok.length + CUES.bad.length);
  });
  it("si el navegador falla, no lanza error", () => {
    vi.stubGlobal("AudioContext", vi.fn(function () { throw new Error("sin permiso"); }));
    expect(() => playCue("bad", true)).not.toThrow();
  });
});
