import { useState } from "react";
import type { Item } from "../../generated/item";
import { useSpanishOf } from "../../audio/AudioContext";
import { SpeakButton } from "../SpeakButton";
import { diffWords } from "../kit/diff";
import { Feedback, Marked } from "../kit/Feedback";

export type ChoiceItem = Extract<Item, { type?: "choice_l1_distractor" }>;

const WHY: Record<string, string> = {
  l1_calque: "Esa versión es un error típico de hispanohablantes.",
  omission: "Esa versión omite algo que el italiano exige.",
  morphological: "Esa forma no existe en italiano.",
  hypercorrection: "Esa versión corrige de más.",
  tense_mismatch: "El tiempo verbal no corresponde.",
  aspect_mismatch: "El aspecto verbal no corresponde.",
  different_word: "Esa opción es otra palabra: no coincide con lo que se pregunta u oye.",
};

export function Choice({ item, onAnswer }: { item: ChoiceItem; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const stateOf = (i: number) => (!answered ? "idle" : item.options[i].correct ? "correct" : i === picked ? "wrong" : "idle");
  const es = useSpanishOf(item.listen ? undefined : (item as ChoiceItem & { sentence_id?: string }).sentence_id); // en «escucha y elige» el español cambiaría el ejercicio
  const right = item.options.find((o) => o.correct)!;
  const chosen = answered ? item.options[picked] : null;
  return (
    <div className="item">
      <div className="ask">
        <p className="eyebrow">{item.prompt_es}</p>
        {es && <><p className="eyebrow">Quieres decir</p><p className="es">{es}</p></>}
        {item.listen && <p><SpeakButton text={right.text} /></p>}
      </div>
      <ul className="options">
        {item.options.map((o, i) => (
          <li key={i}>
            <button type="button" lang="it" data-state={stateOf(i)} disabled={answered} onClick={() => setPicked(i)}>{o.text}</button>
          </li>
        ))}
      </ul>
      {chosen && (
        <Feedback ok={chosen.correct} answer={chosen.correct ? undefined : <Marked segs={diffWords(right.text, chosen.text)} />} said={chosen.correct ? undefined : chosen.text}
          why={chosen.correct ? undefined : WHY[chosen.distractor_kind ?? ""] ?? "Esa opción es un error típico."}
          extra={item.listen ? undefined : <SpeakButton text={right.text} />} onContinue={() => onAnswer(chosen.correct)} />
      )}
    </div>
  );
}
