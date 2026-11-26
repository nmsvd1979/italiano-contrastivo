import { Fragment, useState } from "react";
import type { Item } from "../../generated/item";
import { Feedback } from "../kit/Feedback";

export type ClozeTextItem = Extract<Item, { type?: "cloze_text" }>;

const PASS = 0.8;

/** Relato con huecos: se toca un hueco, se elige entre dos tiempos, y cada respuesta muestra su pista. Aprueba con ≥ `pass_ratio` (0,8) de huecos. */
export function ClozeText({ item, onAnswer }: { item: ClozeTextItem; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<(number | undefined)[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const n = item.gaps.length;
  const done = picked.filter((p) => p !== undefined).length === n;
  const right = item.gaps.filter((g, i) => picked[i] === g.answer).length;
  const passed = right >= Math.ceil((item.pass_ratio ?? PASS) * n - 1e-9);
  const parts = item.text.split(/\{(\d+)\}/);   // texto, índice, texto, índice…

  const choose = (i: number, k: number) => {
    setPicked((p) => { const c = [...p]; c[i] = k; return c; });
    setOpen(null);
    setLast(i);
  };
  return (
    <div className="item cloze-text">
      <div className="ask">
        <p className="eyebrow">Relato · elige el tiempo de cada hueco ({picked.filter((p) => p !== undefined).length} de {n})</p>
        <p className="big" lang="it">
          {parts.map((seg, j) => {
            if (j % 2 === 0) return <Fragment key={j}>{seg}</Fragment>;
            const i = Number(seg) - 1, g = item.gaps[i];
            const p = picked[i];
            const state = p === undefined ? (open === i ? "open" : "idle") : p === g.answer ? "correct" : "wrong";
            return (
              <button key={j} type="button" className="gap" data-state={state} aria-label={`Hueco ${i + 1}`} disabled={p !== undefined}
                onClick={() => setOpen(open === i ? null : i)}>{p === undefined ? "…" : g.options[p]}</button>
            );
          })}
        </p>
      </div>
      {open !== null && (
        <ul className="options gap-options" aria-label={`Opciones del hueco ${open + 1}`}>
          {item.gaps[open].options.map((o, k) => (
            <li key={k}><button type="button" lang="it" onClick={() => choose(open, k)}>{o}</button></li>
          ))}
        </ul>
      )}
      {open === null && last !== null && !done && (
        <p className="why" role="status"><b>{picked[last] === item.gaps[last].answer ? "Bien. " : "Casi. "}</b>{item.gaps[last].why_es}</p>
      )}
      {done && (
        <Feedback ok={passed} lang="es"
          answer={<>{right} de {n} huecos. {passed ? "" : `Se aprueba con ${Math.ceil((item.pass_ratio ?? PASS) * n - 1e-9)}.`}</>}
          why={item.gaps.map((g, i) => picked[i] === g.answer ? null : `Hueco ${i + 1}: ${g.options[g.answer]}. ${g.why_es}`).filter(Boolean).join(" ") || undefined}
          extra={<details><summary>Ver la traducción</summary><p>{item.translation_es}</p></details>}
          onContinue={() => onAnswer(passed)} />
      )}
    </div>
  );
}
