import { useEffect, useRef, useState } from "react";
import type { PackSentence } from "../content/load";
import type { Item } from "../generated/item";
import { clearRun, loadRun, saveRun, signature } from "../state/runState";
import { kindOf } from "../state/steps";
import { type Kind, recordSample } from "../state/timing";
import { DictationItem } from "./DictationItem";
import { ItemView } from "./items/ItemView";
import { SpeakItem } from "./SpeakItem";
import { FocusHead } from "./kit/FocusHead";
import { RunProvider } from "./kit/RunContext";

export type RunItem = { id: string; kind: Kind; item?: Item; dictation?: PackSentence; shadow?: PackSentence };
export const fromItems = (items: Item[]): RunItem[] => items.map((item) => ({ id: item.id, kind: kindOf(item), item }));
export const fromVoice = (v: { kind: "dictation" | "shadow"; sentence: PackSentence }[]): RunItem[] =>
  v.map((x) => (x.kind === "dictation" ? { id: `dict_${x.sentence.id}`, kind: "dictation" as const, dictation: x.sentence } : { id: `shadow_${x.sentence.id}`, kind: "shadow" as const, shadow: x.sentence }));
export const fromDictations = (s: PackSentence[]): RunItem[] => s.map((dictation) => ({ id: `dict_${dictation.id}`, kind: "dictation", dictation }));

export type RunResult = { correct: number; total: number; answers: boolean[] };

/**
 * Recorre una lista de ejercicios en modo concentrado: salir (×), barra que sube con cada acierto y se estanca con el error,
 * y tiempo restante. Mide cuánto tarda cada ejercicio. Con `requeueWrong`, lo fallado vuelve una vez al final; la nota
 * cuenta solo el primer intento. Con `persistKey` se puede retomar a la mitad.
 */
export function ItemRunner({ items, requeueWrong = false, onFinish, exitHref = "#/", why, fichaHref, persistKey, overrideBudget }: {
  items: RunItem[]; requeueWrong?: boolean; onFinish: (r: RunResult) => void; exitHref?: string; why?: string; fichaHref?: string; persistKey?: string; overrideBudget?: number;
}) {
  const [overridesLeft, setOverridesLeft] = useState(overrideBudget ?? 0);
  const ids = items.map((i) => i.id);
  const saved = useRef(persistKey ? loadRun(persistKey, ids) : null).current;
  const [queue, setQueue] = useState<number[]>(() => saved?.queue ?? items.map((_, i) => i));
  const [pos, setPos] = useState(saved?.pos ?? 0);
  const [done, setDone] = useState<number[]>(saved?.done ?? []);
  const [streak, setStreak] = useState(saved?.streak ?? 0);
  const first = useRef<(boolean | null)[]>(saved?.first ?? items.map(() => null));
  const requeued = useRef(new Set<number>(saved?.requeued ?? []));
  const started = useRef(Date.now());
  useEffect(() => { started.current = Date.now(); }, [pos]);

  const idx = queue[pos];
  const current = items[idx];
  const answer = (correct: boolean) => {
    if (first.current[idx] === null) {
      first.current[idx] = correct;
      recordSample(current.kind, (Date.now() - started.current) / 1000);
    }
    let q = queue;
    const willRequeue = !correct && requeueWrong && !requeued.current.has(idx);
    if (willRequeue) {
      requeued.current.add(idx);
      q = [...queue, idx];
      setQueue(q);
    }
    const nextDone = correct || !willRequeue ? [...new Set([...done, idx])] : done;
    const nextStreak = correct ? streak + 1 : 0;
    setDone(nextDone);
    setStreak(nextStreak);
    if (pos + 1 >= q.length) {
      if (persistKey) clearRun(persistKey);
      const answers = first.current.map((a) => a === true);
      onFinish({ correct: answers.filter(Boolean).length, total: items.length, answers });
    } else {
      setPos(pos + 1);
      if (persistKey) saveRun(persistKey, { sig: signature(ids), queue: q, pos: pos + 1, first: first.current, requeued: [...requeued.current], done: nextDone, streak: nextStreak });
    }
  };

  return (
    <RunProvider value={{ why, fichaHref, requeue: requeueWrong && !requeued.current.has(idx), overrides: overrideBudget === undefined ? undefined : { left: overridesLeft, use: () => setOverridesLeft((n) => Math.max(0, n - 1)) } }}>
      <FocusHead progress={items.length ? done.length / items.length : 0} exitHref={exitHref} count={`${pos + 1} / ${queue.length}`} />
      {saved && pos === saved.pos && pos > 0 && <p className="runner-meta">Retomado donde lo dejaste</p>}
      {streak > 0 && streak % 5 === 0 && <p className="cheer" role="note">¡{streak} aciertos seguidos!</p>}
      {current.dictation
        ? <DictationItem key={`${idx}-${pos}`} sentence={current.dictation} onAnswer={answer} />
        : current.shadow
          ? <SpeakItem key={`${idx}-${pos}`} sentence={current.shadow} onAnswer={answer} />
          : <ItemView key={`${idx}-${pos}`} item={current.item!} onAnswer={answer} />}
    </RunProvider>
  );
}
