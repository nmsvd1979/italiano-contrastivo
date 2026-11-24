import { useEffect, useRef, useState } from "react";
import type { PackSentence } from "../content/load";
import type { Item } from "../generated/item";
import { clearRun, loadRun, loadRunFrozen, saveRun, signature, type RunSnapshot } from "../state/runState";
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
  // Un bloque a medias se retoma con sus propios ejercicios (guardados con él); un guardado antiguo, sin ellos, solo vale si la lista coincide.
  const [resume] = useState<{ saved: RunSnapshot | null; list: RunItem[] }>(() => {
    if (!persistKey) return { saved: null, list: items };
    const frozen = loadRunFrozen(persistKey);
    if (frozen) return { saved: frozen, list: frozen.items as RunItem[] };
    return { saved: loadRun(persistKey, items.map((i) => i.id)), list: items };
  });
  const { saved } = resume;
  const list = persistKey ? resume.list : items;   // sin guardado, la lista es la que llega (como antes)
  const ids = list.map((i) => i.id);
  const [queue, setQueue] = useState<number[]>(() => saved?.queue ?? list.map((_, i) => i));
  const [pos, setPos] = useState(saved?.pos ?? 0);
  const [done, setDone] = useState<number[]>(saved?.done ?? []);
  const [streak, setStreak] = useState(saved?.streak ?? 0);
  const first = useRef<(boolean | null)[]>(saved?.first ?? list.map(() => null));
  const requeued = useRef(new Set<number>(saved?.requeued ?? []));
  const started = useRef(Date.now());
  useEffect(() => { started.current = Date.now(); }, [pos]);

  const idx = queue[pos];
  const current = list[idx];
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
      onFinish({ correct: answers.filter(Boolean).length, total: list.length, answers });
    } else {
      setPos(pos + 1);
      if (persistKey) saveRun(persistKey, { sig: signature(ids), queue: q, pos: pos + 1, first: first.current, requeued: [...requeued.current], done: nextDone, streak: nextStreak, items: list, savedAt: Date.now() });
    }
  };

  return (
    <RunProvider value={{ why, fichaHref, requeue: requeueWrong && !requeued.current.has(idx), overrides: overrideBudget === undefined ? undefined : { left: overridesLeft, use: () => setOverridesLeft((n) => Math.max(0, n - 1)) } }}>
      <FocusHead progress={list.length ? done.length / list.length : 0} exitHref={exitHref} count={`${pos + 1} / ${queue.length}`} />
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
