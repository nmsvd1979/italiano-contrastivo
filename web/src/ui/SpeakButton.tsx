import { useState } from "react";
import { useSay } from "../audio/AudioContext";

export function SpeakButton({ text }: { text: string }) {
  const { source, play } = useSay(text);
  const [noVoice, setNoVoice] = useState(false);
  return (
    <span className="speak">
      <button type="button" onClick={async () => setNoVoice((await play()) === "no_voice")}>🔊 Escuchar</button>
      <small> {source === "native" ? "grabación de un hablante nativo" : source === "clip" ? "voz sintética" : "voz del sistema"}</small>
      {noVoice && <small role="status"> Tu iPhone no tiene voz italiana instalada.</small>}
    </span>
  );
}
