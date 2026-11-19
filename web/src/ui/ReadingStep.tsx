import { useState } from "react";
import type { Reading } from "../content/load";
import { Feedback } from "./kit/Feedback";
import { FocusHead } from "./kit/FocusHead";
import { SpeakButton } from "./SpeakButton";

/**
 * «Lectura»: un texto real de un libro abierto, con audio y traducción de cada oración (marcada como traducción de IA),
 * seguido de preguntas de comprensión escritas en español. No se inventa italiano: el texto es el del libro.
 */
export function ReadingStep({ reading, onFinish, exitHref = "#/" }: { reading: Reading; onFinish: () => void; exitHref?: string }) {
  const [phase, setPhase] = useState<"read" | "ask">("read");
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const toggle = (i: number) => setShown((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  if (phase === "read") {
    return (
      <div>
        <FocusHead progress={0.1} exitHref={exitHref} />
        <h2 lang="it">{reading.title}</h2>
        <p><small>{reading.kind === "dialogo" ? "Diálogo" : "Lectura"} · {reading.source.book} ({reading.source.authors}), {reading.source.license}. Traducción al español: IA, sin revisar por un nativo.</small></p>
        <p>Toca una frase para oírla y ver su traducción.</p>
        <div className="reading">
          {reading.sentences.map((s, i) => (
            <p key={s.id}>
              <button type="button" className="sentence" lang="it" aria-expanded={shown.has(i)} onClick={() => toggle(i)}>{s.it}</button>
              {shown.has(i) && <span className="gloss"><small>{s.es}</small> <SpeakButton text={s.it} /></span>}
            </p>
          ))}
        </div>
        <div className="actions-bottom"><button type="button" className="primary block" onClick={() => setPhase("ask")}>Ya lo leí: preguntas</button></div>
      </div>
    );
  }
  const question = reading.questions[q];
  const ok = picked === question.answer;
  const next = () => { setPicked(null); if (q + 1 >= reading.questions.length) onFinish(); else setQ(q + 1); };
  return (
    <div>
      <FocusHead progress={0.2 + 0.8 * (q / reading.questions.length)} exitHref={exitHref} />
      <p className="runner-meta">Pregunta {q + 1} de {reading.questions.length}</p>
      <h2>{question.prompt_es}</h2>
      <ul className="options">
        {question.options.map((o, i) => (
          <li key={i}><button type="button" disabled={picked !== null} data-state={picked === null ? undefined : i === question.answer ? "correct" : i === picked ? "wrong" : undefined} onClick={() => setPicked(i)}>{o}</button></li>
        ))}
      </ul>
      {picked !== null && (
        <Feedback ok={ok} answer={question.evidence !== undefined ? reading.sentences[question.evidence].it : undefined}
          why={ok ? undefined : "Mira la frase del texto que responde a la pregunta."} onContinue={next} />
      )}
    </div>
  );
}
