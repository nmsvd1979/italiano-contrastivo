import { createContext, type ReactNode, useContext } from "react";
import type { ContentPack } from "../content/load";
import { say, type SpeakResult } from "../ui/speech";
import { type AudioIndex, audioIdFor } from "./clips";

type Value = { pack: Pick<ContentPack, "sentences" | "lexemes">; index: AudioIndex } | null;
const Ctx = createContext<Value>(null);

export function AudioProvider({ pack, index, children }: { pack: Pick<ContentPack, "sentences" | "lexemes">; index: AudioIndex; children: ReactNode }) {
  return <Ctx.Provider value={{ pack, index }}>{children}</Ctx.Provider>;
}

/** Cómo sonará un texto: con clip (voz sintética) o con la voz del sistema, y la función que lo reproduce. */
export function useSay(text: string): { source: "clip" | "system"; play: () => Promise<SpeakResult> } {
  const ctx = useContext(Ctx);
  const clipId = ctx ? audioIdFor(text, ctx.pack) : undefined;
  const hasClip = !!clipId && !!ctx?.index.has(clipId);
  return { source: hasClip ? "clip" : "system", play: () => say(text, { clipId, index: ctx?.index }) };
}
