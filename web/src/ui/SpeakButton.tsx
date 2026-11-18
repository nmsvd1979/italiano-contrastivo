import { useEffect, useRef, useState } from "react";
import { useSay } from "../audio/AudioContext";
import { stopSay } from "./speech";

export function SpeakButton({ text }: { text: string }) {
  const { source, play } = useSay(text);
  const [noVoice, setNoVoice] = useState(false);
  const started = useRef(false);
  useEffect(() => () => { if (started.current) stopSay(); }, []); // al pasar al ítem siguiente el audio no sigue sonando
  const go = async (rate: number) => {
    started.current = true;
    const r = await play(rate);
    if (r === "superseded") return;
    setNoVoice(r === "no_voice");
    setHeard(r === "no_voice" ? null : r);
  };
  const [heard, setHeard] = useState<"native" | "clip" | "system" | null>(null); // lo que sonó de verdad, no lo previsto
  return (
    <span className="speak">
      <button type="button" onClick={() => go(1)}>🔊 Escuchar</button>
      <button type="button" aria-label="Escuchar más lento" onClick={() => go(0.7)}>🐢 Lento</button>
      <small> {(heard ?? source) === "native" ? "grabación de un hablante nativo" : (heard ?? source) === "clip" ? "voz sintética" : "voz del sistema"}</small>
      {noVoice && <small role="status"> Tu iPhone no tiene voz italiana instalada.</small>}
    </span>
  );
}
