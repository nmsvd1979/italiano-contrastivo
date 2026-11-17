import { useState } from "react";
import type { Item } from "../../generated/item";
import { SpeakButton } from "../SpeakButton";

export type ChoiceItem = Extract<Item, { type?: "choice_l1_distractor" }>;

const WHY: Record<string, string> = {
  l1_calque: "Esa versión es un calco del español.",
  omission: "Esa versión omite algo que el italiano exige.",
  morphological: "Esa forma no existe en italiano.",
  hypercorrection: "Esa versión corrige de más.",
  tense_mismatch: "El tiempo verbal no corresponde.",
  aspect_mismatch: "El aspecto verbal no corresponde.",
};

export function Choice({ item, onAnswer }: { item: ChoiceItem; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const stateOf = (i: number) => (!answered ? "idle" : item.options[i].correct ? "correct" : i === picked ? "wrong" : "idle");
  const right = item.options.find((o) => o.correct)!;
  const chosen = answered ? item.options[picked] : null;
  return (
    <div className="item">
      <p>{item.prompt_es}</p>
      <ul className="options">
        {item.options.map((o, i) => (
          <li key={i}>
            <button type="button" data-state={stateOf(i)} disabled={answered} onClick={() => setPicked(i)}>{o.text}</button>
          </li>
        ))}
      </ul>
      {chosen && (
        <div role="status">
          <p>{chosen.correct ? "¡Correcto!" : `${WHY[chosen.distractor_kind ?? ""] ?? "Esa opción es un error típico."} La correcta es «${right.text}».`}</p>
          <SpeakButton text={right.text} />
          <p><button type="button" onClick={() => onAnswer(chosen.correct)}>Continuar</button></p>
        </div>
      )}
    </div>
  );
}
