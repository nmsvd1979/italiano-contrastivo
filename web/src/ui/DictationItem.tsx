import { useState } from "react";
import { useSay } from "../audio/AudioContext";
import type { PackSentence } from "../content/load";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const clean = (s: string) => s.toLowerCase().replace(/[’`´]/g, "'").replace(/[.,;:!?¿¡"«»()\-–—]/g, " ").replace(/\s+/g, " ").trim();

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export type DictationVerdict = "exact" | "accent" | "near" | "wrong";
/** Compara lo escrito con la frase: ignora mayúsculas y puntuación; una tilde mal puesta o una letra de más/menos cuentan como «casi». */
export function judgeDictation(typed: string, target: string): DictationVerdict {
  const a = clean(typed), b = clean(target);
  if (a === b) return "exact";
  if (strip(a) === strip(b)) return "accent";
  if (b.length >= 12 && distance(strip(a), strip(b)) <= 1) return "near";
  return "wrong";
}

const NOTE: Record<DictationVerdict, string> = {
  exact: "¡Correcto!", accent: "Correcto, pero revisa las tildes.", near: "Casi: te faltó o te sobró una letra.", wrong: "No coincide con lo que se dijo.",
};

export function DictationItem({ sentence, onAnswer }: { sentence: PackSentence; onAnswer: (correct: boolean) => void }) {
  const { play } = useSay(sentence.it);
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<DictationVerdict | null>(null);
  return (
    <section>
      <p>Escucha la frase y escríbela en italiano.</p>
      <p><button type="button" onClick={() => void play()}>🔊 Escuchar</button></p>
      <textarea lang="it" rows={2} aria-label="Lo que escuchaste" value={value} disabled={verdict !== null} autoCapitalize="off" autoCorrect="off" spellCheck={false}
        onChange={(e) => setValue(e.target.value)} />
      {verdict === null ? (
        <button type="button" disabled={!value.trim()} onClick={() => setVerdict(judgeDictation(value, sentence.it))}>Comprobar</button>
      ) : (
        <div>
          <p role="status" data-state={verdict === "wrong" ? "wrong" : "correct"}>{NOTE[verdict]}</p>
          <p>Era: <strong lang="it">{sentence.it}</strong></p>
          <p><small>{sentence.es}</small></p>
          <button type="button" onClick={() => onAnswer(verdict !== "wrong")}>Continuar</button>
        </div>
      )}
    </section>
  );
}
