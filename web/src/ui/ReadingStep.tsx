import { useRef, useState } from "react";
import { usePlayer } from "../audio/AudioContext";
import type { Reading, ReadingWord } from "../content/load";
import { RULE_TEXT } from "../state/words";
import { Feedback } from "./kit/Feedback";
import { FocusHead } from "./kit/FocusHead";
import { SpeakButton } from "./SpeakButton";
import { stopSay, waitCurrentEnd } from "./speech";

/**
 * «Lectura»: un texto real de un libro abierto, con audio y traducción de cada oración (marcada como traducción de IA),
 * seguido de preguntas de comprensión escritas en español. No se inventa italiano: el texto es el del libro.
 */
export function ReadingStep({ reading, words = {}, onFinish, exitHref = "#/", hideTranslation = false }: {
  reading: Reading; words?: Record<string, ReadingWord>; onFinish: (correct: number, total: number) => void; exitHref?: string;
  /** Examen: sin traducción ni tamices, para medir si entiendes el texto de verdad. */
  hideTranslation?: boolean;
}) {
  const [phase, setPhase] = useState<"read" | "ask">("read");
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [layer, setLayer] = useState(false);           // capa de tamices: palabras tocables y coloreadas por su parentesco con el español
  const [picked1, setPicked1] = useState<{ i: number; w: string } | null>(null);
  const player = usePlayer();
  const [playing, setPlaying] = useState<number | null>(null);   // frase que suena en «Escuchar todo»
  const cancel = useRef(false);
  const listenAll = async () => {
    cancel.current = false;
    for (let i = 0; i < reading.sentences.length && !cancel.current; i++) {
      setPlaying(i);
      const r = await player(reading.sentences[i].it);
      if (r === "superseded" || r === "no_voice") break;
      await waitCurrentEnd();
    }
    setPlaying(null);
  };
  const stopAll = () => { cancel.current = true; stopSay(); setPlaying(null); };
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const hits = useRef(0);
  const toggle = (i: number) => setShown((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  if (phase === "read") {
    return (
      <div>
        <FocusHead progress={0.1} exitHref={exitHref} />
        <h2 lang="it">{reading.title}</h2>
        <p><small>{reading.kind === "dialogo" ? "Diálogo" : reading.kind === "documento" ? "Documento" : "Lectura"} · {reading.source.book} ({reading.source.authors}), {reading.source.license}.{hideTranslation ? "" : " Traducción al español: IA, sin revisar por un nativo."}</small></p>
        {reading.table && (
          <div style={{ overflowX: "auto" }}>
            <table className="doc" lang="it">
              <thead><tr>{reading.table.head.map((h, k) => <th key={k} scope="col">{h}</th>)}</tr></thead>
              <tbody>{reading.table.rows.map((row, r) => <tr key={r}>{row.map((c, k) => (k === 0 ? <th key={k} scope="row">{c}</th> : <td key={k}>{c}</td>))}</tr>)}</tbody>
            </table>
          </div>
        )}
        {!reading.table && <p>
          {playing === null
            ? <button type="button" onClick={() => void listenAll()}>🔊 Escuchar todo el texto</button>
            : <button type="button" onClick={stopAll}>⏹ Detener</button>}{" "}
          <small>Escúchalo primero sin mirar la traducción: es mejor para entrenar el oído.</small>
        </p>}
        {!reading.table && <p>{hideTranslation ? "Toca 🔊 para oír una frase. Aquí no hay traducción: se trata de entender el texto." : layer ? "Toca una palabra para ver qué es y cómo se parece al español; «Traducción» muestra la frase." : "Toca una frase para oírla y ver su traducción."}</p>}
        {Object.keys(words).length > 0 && !hideTranslation && (
          <p><label><input type="checkbox" checked={layer} onChange={(e) => { setLayer(e.target.checked); setPicked1(null); }} /> Ver el parentesco con el español (tamices)</label></p>
        )}
        {layer && <p><small><span className="tok" data-k="transparente">verde</span> se parece al español · <span className="tok" data-k="regular">punteada</span> cambio regular · <span className="tok" data-k="opaca">sombreada</span> opaca (hay que aprenderla). Clasificado por IA, sin revisar por un nativo.</small></p>}
        <div className="reading">
          {reading.sentences.map((s, i) => (
            <p key={s.id} data-playing={playing === i ? "true" : undefined}>
              {s.speaker && <strong className="speaker">{s.speaker}: </strong>}
              <button type="button" className="mini" aria-label={`Escuchar la frase ${i + 1}`} onClick={() => void player(s.it)}>🔊</button>{" "}
              {layer ? (
                <>
                  <span className="sentence-tokens" lang="it">
                    {s.it.split(/([A-Za-zÀ-ÖØ-öø-ÿ]+)/).map((part, k) => {
                      const w = words[part.toLowerCase()];
                      return k % 2 === 1 && w
                        ? <button key={k} type="button" className="tok" data-k={w.k} aria-pressed={picked1?.i === i && picked1.w === part.toLowerCase()} onClick={() => setPicked1({ i, w: part.toLowerCase() })}>{part}</button>
                        : <span key={k}>{part}</span>;
                    })}
                  </span>{" "}
                  <button type="button" className="mini" aria-expanded={shown.has(i)} onClick={() => toggle(i)}>Traducción</button>
                  {picked1?.i === i && (() => {
                    const w = words[picked1.w];
                    return (
                      <span className="wordcard" role="status">
                        <strong lang="it">{picked1.w}</strong> — {w.g}
                        <small> · {w.k === "regular" ? `cambio regular${w.r ? `: ${RULE_TEXT[w.r] ?? w.r}` : ""}` : w.k === "transparente" ? "se parece al español" : "opaca: hay que aprenderla"}</small>
                        {w.ff && <small className="note"> · ⚠ Falso amigo{w.n ? `: ${w.n}` : ""}</small>}
                        {!w.ff && w.n && <small> · {w.n}</small>}
                      </span>
                    );
                  })()}
                </>
              ) : (
                <button type="button" className="sentence" lang="it" aria-expanded={shown.has(i)} onClick={() => (hideTranslation ? void player(s.it) : toggle(i))}>{s.it}</button>
              )}
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
  const next = () => { if (ok) hits.current += 1; setPicked(null); if (q + 1 >= reading.questions.length) onFinish(hits.current, reading.questions.length); else setQ(q + 1); };
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
