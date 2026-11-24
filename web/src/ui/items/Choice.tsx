import { useState } from "react";
import type { Item } from "../../generated/item";
import { useSentenceOf } from "../../audio/AudioContext";
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
  const sentence = useSentenceOf((item as ChoiceItem & { sentence_id?: string }).sentence_id);
  const right = item.options.find((o) => o.correct)!;
  // Si las opciones son la frase italiana, el español es lo que se quiere decir. Si las opciones están en español (ejercicios de significado),
  // mostrarlo regalaría la respuesta; y en «escucha y elige» cambiaría el ejercicio.
  const italianOptions = !sentence || right.text.trim() === sentence.it.trim();
  const es = !item.listen && italianOptions ? sentence?.es : undefined;
  const chosen = answered ? item.options[picked] : null;
  return (
    <div className="item">
      <div className="ask">
        {es
          ? <><p className="eyebrow">{item.prompt_es}</p><p className="eyebrow">Quieres decir</p><p className="es">{es}</p></>
          : <p className="es">{item.prompt_es}</p>}
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
        <Feedback ok={chosen.correct} answer={chosen.correct ? undefined : <Marked segs={diffWords(right.text, chosen.text)} />} said={chosen.correct ? undefined : chosen.text} lang={italianOptions ? "it" : "es"}
          why={chosen.correct ? undefined : WHY[chosen.distractor_kind ?? ""] ?? "Esa opción es un error típico."}
          extra={item.listen ? undefined : <SpeakButton text={right.text} />} onContinue={() => onAnswer(chosen.correct)} />
      )}
    </div>
  );
}
