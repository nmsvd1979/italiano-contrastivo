import { useState } from "react";
import { speakItalian } from "./speech";

export function SpeakButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "ok" | "no_voice">("idle");
  return (
    <span className="speak">
      <button type="button" onClick={async () => setStatus(await speakItalian(text))}>🔊 Escuchar</button>
      <small> voz del sistema</small>
      {status === "no_voice" && <small role="status"> Tu iPhone no tiene voz italiana instalada.</small>}
    </span>
  );
}
