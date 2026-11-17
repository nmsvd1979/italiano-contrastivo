import { useState } from "react";
import type { Item } from "../../generated/item";

export type ClozeItem = Extract<Item, { type?: "cloze" }>;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").replace(/’/g, "'").toLowerCase();

export function Cloze({ item, onAnswer }: { item: ClozeItem; onAnswer: (correct: boolean) => void }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [before, after] = item.text.split("___");
  return (
    <div className="item">
      {item.hint_es && <p><small>Pista: {item.hint_es}</small></p>}
      <p>
        {before}
        <input aria-label="Respuesta" value={value} disabled={result !== null} autoCapitalize="off" autoCorrect="off"
          onChange={(e) => setValue(e.target.value)} />
        {after}
      </p>
      {result === null ? (
        <button type="button" disabled={!value.trim()} onClick={() => setResult(item.answers.some((a) => norm(a) === norm(value)))}>Comprobar</button>
      ) : (
        <div role="status" data-state={result ? "correct" : "wrong"}>
          <p>{result ? "¡Correcto!" : `La respuesta era «${item.answers[0]}».`}</p>
          <button type="button" onClick={() => onAnswer(result)}>Continuar</button>
        </div>
      )}
    </div>
  );
}
