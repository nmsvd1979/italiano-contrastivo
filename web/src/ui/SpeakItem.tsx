import { useEffect, useRef, useState } from "react";
import { useSay } from "../audio/AudioContext";
import type { PackSentence } from "../content/load";

type Rating = "bien" | "casi" | "otra";
const canRecord = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

/**
 * Escuchar y repetir: oyes el modelo, te grabas, te escuchas y te autoevalúas. La grabación NO sale del teléfono y no se guarda.
 * Sin micrófono o sin permiso se repite en voz alta igualmente y se autoevalúa. No se puede medir la pronunciación sin análisis
 * de voz: la nota es tuya y no cuenta para la prueba de la unidad.
 */
export function SpeakItem({ sentence, onAnswer }: { sentence: PackSentence; onAnswer: (correct: boolean) => void }) {
  const { play } = useSay(sentence.it);
  const [phase, setPhase] = useState<"listen" | "recording" | "review">("listen");
  const [url, setUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  useEffect(() => () => { stream.current?.getTracks().forEach((t) => t.stop()); if (url) URL.revokeObjectURL(url); }, [url]);

  const start = async () => {
    if (!canRecord()) { setProblem("Este navegador no puede grabar: repítela en voz alta y evalúate."); setPhase("review"); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream.current);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType || "audio/mp4" })));
        setPhase("review");
      };
      rec.current = r;
      r.start();
      setPhase("recording");
    } catch {
      setProblem("No pude usar el micrófono (¿permiso denegado?): repítela en voz alta y evalúate.");
      setPhase("review");
    }
  };
  const rate = (r: Rating) => onAnswer(r !== "otra");

  return (
    <section className="item">
      <p>Escucha y repite en voz alta.</p>
      <p className="big" lang="it">{sentence.it}</p>
      <p><small>{sentence.es}</small></p>
      <p className="speak">
        <button type="button" onClick={() => void play(1)}>🔊 Escuchar</button>
        <button type="button" aria-label="Escuchar más lento" onClick={() => void play(0.7)}>🐢 Lento</button>
      </p>
      {phase === "listen" && <div className="actions-bottom"><button type="button" className="primary block" onClick={() => void start()}>🎙 Grabarme</button></div>}
      {phase === "recording" && <div className="actions-bottom"><button type="button" className="primary block" onClick={() => rec.current?.stop()}>⏹ Terminar</button></div>}
      {phase === "review" && (
        <div className="feedback" role="status" data-state="correct">
          <div>
            <p className="head">¿Cómo sonó?</p>
            {problem && <p>{problem}</p>}
            {url && <p><audio controls src={url} aria-label="Tu grabación" style={{ width: "100%" }} /></p>}
            <p className="again">Compárate con el modelo. Esta nota es solo tuya: no hay análisis automático de pronunciación.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="primary" style={{ flex: 1 }} onClick={() => rate("bien")}>Bien</button>
              <button type="button" style={{ flex: 1 }} onClick={() => rate("casi")}>Casi</button>
              <button type="button" style={{ flex: 1 }} onClick={() => rate("otra")}>Otra vez</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
