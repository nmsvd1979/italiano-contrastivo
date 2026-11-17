import { useEffect, useRef, useState } from "react";
import type { ContentPack, Unit } from "../content/load";
import { meaningQuestions, noticeCards, unitSentences } from "../state/steps";
import { recordSample } from "../state/timing";
import { SpeakButton } from "./SpeakButton";

/** «Descubre»: ejemplos reales con el punto clave resaltado, y dos preguntas de inferencia de significado. */
export function NoticeStep({ unit, pack, onFinish }: { unit: Unit; pack: ContentPack; onFinish: () => void }) {
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

  if (i < cards.length) {
    const { sentence, start, end, wrong } = cards[i];
    const faulty = sentence.it.slice(0, start) + wrong + sentence.it.slice(end);
    return (
      <section>
        <h2>Fíjate ({i + 1} de {cards.length})</h2>
        <p className="big" lang="it">{sentence.it.slice(0, start)}<mark>{sentence.it.slice(start, end)}</mark>{sentence.it.slice(end)}</p>
        <p>{sentence.es}</p>
        <p><small>Error típico de hispanohablantes: <del lang="it">{faulty}</del></small></p>
        <SpeakButton text={sentence.it} />
        <p><button type="button" onClick={next}>Siguiente</button></p>
      </section>
    );
  }
  const q = questions[i - cards.length];
  return (
    <section>
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
        <div>
          <p role="status" data-state={picked === q.answer ? "correct" : "wrong"}>{picked === q.answer ? "¡Correcto!" : `Significa: «${q.sentence.es}».`}</p>
          <button type="button" onClick={next}>{i + 1 >= cards.length + questions.length ? "Terminar" : "Continuar"}</button>
        </div>
      )}
    </section>
  );
}
