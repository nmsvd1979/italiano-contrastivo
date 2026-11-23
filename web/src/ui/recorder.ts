import { useEffect, useRef, useState } from "react";

export const canRecord = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

/** Grabación local: el audio NO sale del teléfono y no se guarda; solo sirve para escucharte y compararte con el modelo. */
export function useRecorder() {
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  useEffect(() => () => { stream.current?.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const start = async () => {
    setProblem(null);
    if (!canRecord()) { setProblem("Este navegador no puede grabar: dilo en voz alta igualmente."); setPhase("done"); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream.current);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType || "audio/mp4" })));
        setPhase("done");
      };
      rec.current = r;
      r.start();
      setPhase("recording");
    } catch {
      setProblem("No pude usar el micrófono (¿permiso denegado?): dilo en voz alta igualmente.");
      setPhase("done");
    }
  };
  const stop = () => rec.current?.stop();
  const reset = () => { setUrl(null); setProblem(null); setPhase("idle"); };
  return { phase, url, problem, start, stop, reset };
}
