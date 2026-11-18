import { useEffect, useRef, useState } from "react";
import type { ContentPack, Unit } from "../content/load";
import { meaningQuestions, noticeCards, unitSentences } from "../state/steps";
import { recordSample } from "../state/timing";
import { SpeakButton } from "./SpeakButton";
import { FocusHead } from "./kit/FocusHead";

/** «Descubre»: ejemplos reales con el punto clave resaltado, y dos preguntas de inferencia de significado. */
export function NoticeStep({ unit, pack, onFinish, exitHref = "#/" }: { unit: Unit; pack: ContentPack; onFinish: () => void; exitHref?: string }) {
  const cards = noticeCards(unit, pack);
  const questions = meaningQuestions(cards, unitSentences(unit, pack));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const started = useRef(Date.now());
  useEffect(() => { started.current = Date.now(); }, [i]);

  const next = () => {
    recordSample("notice", (Date.now() - started.current) / 1000);
    setPicked(null);
    if (i + 1 >= cards.length + questions.length) onFinish(); else setI(i + 1);
  };

  const head = <FocusHead progress={i / Math.max(1, cards.length + questions.length)} exitHref={exitHref} />;
  if (i < cards.length) {
    const { sentence, start, end, wrong } = cards[i];
    const faulty = sentence.it.slice(0, start) + wrong + sentence.it.slice(end);
    return (
      <div>
        {head}
        <h2>Fíjate ({i + 1} de {cards.length})</h2>
        <p className="big" lang="it">{sentence.it.slice(0, start)}<mark>{sentence.it.slice(start, end)}</mark>{sentence.it.slice(end)}</p>
        <p>{sentence.es}</p>
        <p><small>Error típico de hispanohablantes: <del lang="it">{faulty}</del></small></p>
        <SpeakButton text={sentence.it} />
        <div className="actions-bottom"><button type="button" className="primary block" onClick={next}>Siguiente</button></div>
      </div>
    );
  }
  const q = questions[i - cards.length];
  return (
    <div>
      {head}
      <h2>¿Qué significa? ({i - cards.length + 1} de {questions.length})</h2>
      <p className="big" lang="it">{q.sentence.it}</p>
      <ul className="options">
        {q.options.map((o, k) => (
          <li key={o}>
            <button type="button" disabled={picked !== null} data-state={picked === null ? undefined : k === q.answer ? "correct" : k === picked ? "wrong" : undefined} onClick={() => setPicked(k)}>{o}</button>
          </li>
        ))}
      </ul>
      {picked !== null && (
        <div className="feedback" role="status" data-state={picked === q.answer ? "correct" : "wrong"}>
          <div>
            <p className="head">{picked === q.answer ? "¡Correcto!" : `Significa: «${q.sentence.es}».`}</p>
            <button type="button" className="primary" onClick={next}>{i + 1 >= cards.length + questions.length ? "Terminar" : "Continuar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
