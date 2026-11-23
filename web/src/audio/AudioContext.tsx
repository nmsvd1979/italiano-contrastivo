import { createContext, type ReactNode, useContext } from "react";
import type { ContentPack } from "../content/load";
import { say, type SpeakResult } from "../ui/speech";
import { type AudioIndex, audioIdFor } from "./clips";

type Pack = Pick<ContentPack, "sentences" | "lexemes" | "readings"> & Partial<Pick<ContentPack, "course">>;
type Value = { pack: Pack; index: AudioIndex; words: Map<string, string> } | null;
const Ctx = createContext<Value>(null);

export function AudioProvider({ pack, index, words = new Map(), children }: { pack: Pack; index: AudioIndex; words?: Map<string, string>; children: ReactNode }) {
  return <Ctx.Provider value={{ pack, index, words }}>{children}</Ctx.Provider>;
}

/** Reproduce cualquier texto (los de una lectura, por ejemplo) con el mismo criterio que `useSay`: nativo → clip → voz del sistema. */
export function usePlayer(): (text: string, rate?: number) => Promise<SpeakResult> {
  const ctx = useContext(Ctx);
  return (text, rate = 1) => {
    const clipId = ctx ? audioIdFor(text, ctx.pack) : undefined;
    return say(text, { nativeFile: ctx?.words.get(text), clipId, index: ctx?.index, rate });
  };
}

/** Cómo sonará un texto: con clip (voz sintética) o con la voz del sistema, y la función que lo reproduce. */
export function useSay(text: string): { source: "native" | "clip" | "system"; play: (rate?: number) => Promise<SpeakResult> } {
  const ctx = useContext(Ctx);
  const clipId = ctx ? audioIdFor(text, ctx.pack) : undefined;
  const hasClip = !!clipId && !!ctx?.index.has(clipId);
  const nativeFile = ctx?.words.get(text);
  return { source: nativeFile ? "native" : hasClip ? "clip" : "system", play: (rate = 1) => say(text, { nativeFile, clipId, index: ctx?.index, rate }) };
}
