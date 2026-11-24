import { useState } from "react";
import type { Item } from "../../generated/item";
import { fillSegments } from "../kit/diff";
import { Feedback, Marked } from "../kit/Feedback";

export type ClozeItem = Extract<Item, { type?: "cloze" }>;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").replace(/’/g, "'").toLowerCase();

export function Cloze({ item, onAnswer }: { item: ClozeItem; onAnswer: (correct: boolean) => void }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [before, after] = item.text.split("___");
  return (
    <div className="item">
      {item.hint_es && <p><small>Pista: {item.hint_es}</small></p>}
      <p className="big" lang="it">
        {before}
        <input lang="it" aria-label="Respuesta" value={value} disabled={result !== null} autoCapitalize="off" autoCorrect="off" size={Math.max(5, value.length + 1)}
          onChange={(e) => setValue(e.target.value)} />
        {after}
      </p>
      {result === null ? (
        <div className="actions-bottom">
          <button type="button" className="primary block" disabled={!value.trim()} onClick={() => setResult(item.answers.some((a) => norm(a) === norm(value)))}>Comprobar</button>
        </div>
      ) : (
        <Feedback ok={result} answer={result ? undefined : <Marked segs={fillSegments(item.text, item.answers[0])} />}
          said={result ? undefined : `${before}${value.trim()}${after}`} onContinue={() => onAnswer(result)} />
      )}
    </div>
  );
}
