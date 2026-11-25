import { useRef, useState } from "react";
import { usePlayer } from "../audio/AudioContext";
import type { InterviewQuestion } from "../content/load";
import { addDaySeconds } from "../state/strands";
import type { Store } from "../state/store";
import { useRecorder } from "./recorder";

type Mark = "bien" | "casi" | "otra";
const MAX_SECONDS = 15 * 60;

/**
 * «Preguntas por voz»: la app hace preguntas solo por audio, en orden al azar, y respondes sin guion; te grabas, después ves la pregunta escrita,
 * te escuchas y te autoevalúas. Sin servidor no hay corrección automática: la nota es tuya. «Otra vez» repite la pregunta una vez al final.
 */
export function InterviewRun({ questions, store, onExit, onComplete }: { questions: InterviewQuestion[]; store: Store; onExit: () => void; onComplete?: () => void }) {
  const player = usePlayer();
  const rec = useRecorder();
  const [queue, setQueue] = useState(questions);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"intro" | "ask" | "check" | "done">("intro");
  const [marks, setMarks] = useState<Mark[]>([]);
  const retried = useRef(new Set<string>());
  const started = useRef(0);
  const q = queue[i];

  const ask = (next: InterviewQuestion) => { rec.reset(); setPhase("ask"); void player(next.it); };
  const rate = (m: Mark) => {
    setMarks((x) => [...x, m]);
    let next = queue;
    if (m === "otra" && !retried.current.has(q.id)) { retried.current.add(q.id); next = [...queue, q]; setQueue(next); }
    if (i + 1 < next.length) { setI(i + 1); ask(next[i + 1]); return; }
    void addDaySeconds(store, "salida", Math.min(MAX_SECONDS, Math.round((Date.now() - started.current) / 1000)));
    setPhase("done");
  };
  const count = (m: Mark) => marks.filter((x) => x === m).length;
  const authored = questions.some((x) => x.authored), fromBook = questions.some((x) => !x.authored);

  if (phase === "intro") {
    return (
      <main>
        <h1>Preguntas por voz</h1>
        <p>Vas a oír {questions.length} preguntas en italiano, <strong>sin verlas escritas</strong> y en orden al azar. Responde en voz alta con una frase completa, como en una conversación. Te puedes grabar para escucharte después.</p>
        <p><small>Si no entiendes, dilo en italiano —«Può ripetere, per favore?»— y vuelve a oírla. La app no escucha tu respuesta: al final tú decides cómo te fue.</small></p>
        <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={() => { started.current = Date.now(); ask(queue[0]); }}>🎧 Empezar</button></div>
        <p><button type="button" onClick={onExit}>‹ Volver</button></p>
      </main>
    );
  }
  if (phase === "done") {
    return (
      <main>
        <h1>Ronda terminada</h1>
        <p role="status">Bien: {count("bien")} · Casi: {count("casi")} · Otra vez: {count("otra")}.</p>
        <p>{count("otra") + count("casi") > count("bien") ? "Conviene repetir la ronda otro día: las preguntas cambian de orden y algunas de tema." : "Buen trabajo: respondiste sin guion."}</p>
        <p><small>{fromBook ? "Algunas preguntas son de Piacere! (CC BY-NC-SA). " : ""}{authored ? "Otras las escribió la IA para esta app, sin revisión de un nativo. " : ""}Traducciones: IA. El tiempo se sumó a «Escribir y hablar».</small></p>
        <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={() => (onComplete ? onComplete() : onExit())}>Volver a la Salida</button></div>
      </main>
    );
  }
  return (
    <main>
      <p role="status">🎧 Pregunta {i + 1} de {queue.length}</p>
      <p><button type="button" onClick={() => void player(q.it)}>🔊 Oír otra vez</button></p>
      {phase === "ask" && (
        <>
          <p><small>La pregunta no se muestra: escúchala y responde.</small></p>
          {rec.phase === "idle" && <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={() => void rec.start()}>🎙 Grabar mi respuesta</button></div>}
          {rec.phase === "recording" && <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={() => { rec.stop(); setPhase("check"); }}>⏹ Terminé de responder</button></div>}
          {rec.phase === "done" && (
            <>
              {rec.problem && <p role="status"><small>{rec.problem}</small></p>}
              <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={() => setPhase("check")}>Ya respondí</button></div>
            </>
          )}
        </>
      )}
      {phase === "check" && (
        <>
          <p lang="it" style={{ fontSize: "1.25em" }}>«{q.it}»</p>
          <p><small>{q.es}</small></p>
          {rec.url && <p><audio controls src={rec.url} aria-label="Tu respuesta" style={{ width: "100%" }} /></p>}
          <p>¿Entendiste la pregunta y respondiste con una frase completa en italiano?</p>
          <div className="actions-bottom" style={{ display: "flex", gap: 8 }}>
            <button type="button" className="primary" onClick={() => rate("bien")}>Bien</button>
            <button type="button" onClick={() => rate("casi")}>Casi</button>
            <button type="button" onClick={() => rate("otra")}>Otra vez</button>
          </div>
        </>
      )}
    </main>
  );
}
