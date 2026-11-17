import { useEffect, useRef, useState } from "react";
import type { PackSentence } from "../content/load";
import type { Item } from "../generated/item";
import { kindOf } from "../state/steps";
import { estimateSeconds, formatDuration, type Kind, loadSamples, recordSample } from "../state/timing";
import { DictationItem } from "./DictationItem";
import { ItemView } from "./items/ItemView";

export type RunItem = { id: string; kind: Kind; item?: Item; dictation?: PackSentence };
export const fromItems = (items: Item[]): RunItem[] => items.map((item) => ({ id: item.id, kind: kindOf(item), item }));
export const fromDictations = (s: PackSentence[]): RunItem[] => s.map((dictation) => ({ id: `dict_${dictation.id}`, kind: "dictation", dictation }));

export type RunResult = { correct: number; total: number; answers: boolean[] };

/**
 * Recorre una lista de ejercicios mostrando avance y tiempo restante. Mide cuánto tarda cada uno (para que los minutos
 * mostrados se vuelvan reales). Con `requeueWrong`, lo fallado vuelve una vez al final; la nota cuenta solo el primer intento.
 */
export function ItemRunner({ items, requeueWrong = false, onFinish }: { items: RunItem[]; requeueWrong?: boolean; onFinish: (r: RunResult) => void }) {
  const [queue, setQueue] = useState<number[]>(() => items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const first = useRef<(boolean | undefined)[]>(items.map(() => undefined));
  const requeued = useRef(new Set<number>());
  const started = useRef(Date.now());
  useEffect(() => { started.current = Date.now(); }, [pos]);

  const idx = queue[pos];
  const current = items[idx];
  const answer = (correct: boolean) => {
    if (first.current[idx] === undefined) {
      first.current[idx] = correct;
      recordSample(current.kind, (Date.now() - started.current) / 1000);
    }
    let q = queue;
    if (!correct && requeueWrong && !requeued.current.has(idx)) {
      requeued.current.add(idx);
      q = [...queue, idx];
      setQueue(q);
    }
    if (pos + 1 >= q.length) {
      const answers = first.current.map((a) => a === true);
      onFinish({ correct: answers.filter(Boolean).length, total: items.length, answers });
    } else setPos(pos + 1);
  };

  const samples = loadSamples();
  const remaining = queue.slice(pos).reduce((s, i) => s + estimateSeconds(items[i].kind, samples), 0);
  return (
    <div>
      <p className="runner-head"><small>Ejercicio {pos + 1} de {queue.length} · quedan {formatDuration(remaining)}</small></p>
      <progress max={queue.length} value={pos} aria-label="Avance" />
      {current.dictation
        ? <DictationItem key={`${idx}-${pos}`} sentence={current.dictation} onAnswer={answer} />
        : <ItemView key={`${idx}-${pos}`} item={current.item!} onAnswer={answer} />}
    </div>
  );
}
