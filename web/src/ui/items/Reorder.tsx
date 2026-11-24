import { useState } from "react";
import type { Item } from "../../generated/item";
import { diffWords } from "../kit/diff";
import { Feedback, Marked } from "../kit/Feedback";

export type ReorderItem = Extract<Item, { type?: "reorder" }>;

export function Reorder({ item, onAnswer }: { item: ReorderItem; onAnswer: (correct: boolean) => void }) {
  const [chosen, setChosen] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const built = chosen.map((i) => item.tokens[i]);
  const prompt = item.prompt_es.match(/^(.*?):\s*«(.+)»\.?$/); // «Ordena las palabras: «Es lo mismo.»» → consigna + frase en español
  return (
    <div className="item">
      <div className="ask">
        {prompt ? <><p className="eyebrow">{prompt[1]}</p><p className="es">{prompt[2]}</p></> : <p className="es">{item.prompt_es}</p>}
      </div>
      <p className="built" aria-label="Tu orden">
        {chosen.map((idx, pos) => (
          <button key={pos} type="button" lang="it" disabled={result !== null} onClick={() => setChosen(chosen.filter((_, p) => p !== pos))}>{item.tokens[idx]}</button>
        ))}
      </p>
      <p className="bank">
        {item.tokens.map((t, i) => (
          <button key={i} type="button" lang="it" disabled={result !== null || chosen.includes(i)} onClick={() => setChosen([...chosen, i])}>{t}</button>
        ))}
      </p>
      {result === null ? (
        <div className="actions-bottom">
          <button type="button" className="primary block" disabled={chosen.length !== item.tokens.length} onClick={() => setResult(built.join(" ") === item.answer.join(" "))}>Comprobar</button>
        </div>
      ) : (
        <Feedback ok={result} answer={result ? undefined : <Marked segs={diffWords(item.answer.join(" "), built.join(" "))} />}
          said={result ? undefined : built.join(" ")} onContinue={() => onAnswer(result)} />
      )}
    </div>
  );
}
