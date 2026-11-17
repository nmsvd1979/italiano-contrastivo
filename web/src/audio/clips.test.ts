import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioIdFor, loadAudioIndex } from "./clips";
import { say } from "../ui/speech";

class FakeAudio {
  static made: FakeAudio[] = [];
  static failPlay = false;
  paused = false;
  constructor(public src: string) { FakeAudio.made.push(this); }
  play() { return FakeAudio.failPlay ? Promise.reject(new Error("NotAllowed")) : Promise.resolve(); }
  pause() { this.paused = true; }
}

const voices = (list: { lang: string }[]) =>
  vi.stubGlobal("speechSynthesis", { getVoices: () => list, speak: vi.fn(), cancel: vi.fn() });

beforeEach(() => {
  FakeAudio.made = [];
  FakeAudio.failPlay = false;
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  voices([]);
});
afterEach(() => vi.unstubAllGlobals());

describe("say", () => {
  it("reproduce el clip si su id está en el índice", async () => {
    const r = await say("Ho fame.", { clipId: "abc123abc123", index: new Set(["abc123abc123"]), base: "/" });
    expect(r).toBe("clip");
    expect(FakeAudio.made[0].src).toBe("/audio/tts/abc123abc123.mp3");
  });
  it("si play() falla cae a la voz del sistema, y a no_voice si no hay", async () => {
    FakeAudio.failPlay = true;
    const opts = { clipId: "abc123abc123", index: new Set(["abc123abc123"]), base: "/" };
    expect(await say("Ho fame.", opts)).toBe("no_voice");
    voices([{ lang: "it-IT" }]);
    expect(await say("Ho fame.", opts)).toBe("system");
  });
  it("sin clip en el índice o sin clipId usa la voz del sistema y no crea audio", async () => {
    voices([{ lang: "it-IT" }]);
    expect(await say("Ho fame.", { clipId: "000000000000", index: new Set(), base: "/" })).toBe("system");
    expect(await say("Ho fame.")).toBe("system");
    expect(FakeAudio.made).toHaveLength(0);
  });
  it("un segundo say detiene el audio anterior", async () => {
    const opts = (id: string) => ({ clipId: id, index: new Set(["a00000000000", "b00000000000"]), base: "/" });
    await say("uno", opts("a00000000000"));
    await say("dos", opts("b00000000000"));
    expect(FakeAudio.made[0].paused).toBe(true);
    expect(FakeAudio.made[1].paused).toBe(false);
  });
});

describe("audioIdFor", () => {
  const pack = {
    sentences: [{ id: "s1", it: "Ho fame.", es: "x", cefr_estimate: "A1", audio: "111111111111" }],
    lexemes: [{ id: "lx_burro", form: "burro", gloss_es: "mantequilla", lexical_type: "false_friend" as const, source: "s", audio: "222222222222" }],
  };
  it("devuelve el audio de una oración o palabra exacta", () => {
    expect(audioIdFor("Ho fame.", pack)).toBe("111111111111");
    expect(audioIdFor("burro", pack)).toBe("222222222222");
  });
  it("devuelve undefined para un texto editado o un distractor", () => {
    expect(audioIdFor("Ho fame", pack)).toBeUndefined();
    expect(audioIdFor("Tengo fame.", pack)).toBeUndefined();
  });
});

describe("loadAudioIndex", () => {
  it("devuelve los ids del índice", async () => {
    const f = async () => new Response(JSON.stringify([{ id: "aaaaaaaaaaaa" }, { id: "bbbbbbbbbbbb" }]));
    expect([...(await loadAudioIndex(f, "/"))].sort()).toEqual(["aaaaaaaaaaaa", "bbbbbbbbbbbb"]);
  });
  it("con 404 o error de red devuelve un conjunto vacío sin lanzar", async () => {
    expect((await loadAudioIndex(async () => new Response("no", { status: 404 }), "/")).size).toBe(0);
    expect((await loadAudioIndex(async () => { throw new Error("offline"); }, "/")).size).toBe(0);
  });
});
