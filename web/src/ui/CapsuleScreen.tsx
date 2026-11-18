import { useEffect, useRef, useState } from "react";
import type { Capsule } from "../generated/capsule";
import { type CapsuleState, initialState, next, score, toProgress, type CapsuleEvent } from "../state/capsuleMachine";
import { afterCapsule, closeCapsule, normalizeDay } from "../state/session";
import { localDate, type Store } from "../state/store";
import { ItemView } from "./items/ItemView";
import { Translate, type TranslateItem } from "./items/Translate";
import { FocusHead } from "./kit/FocusHead";
import { RunProvider } from "./kit/RunContext";

export function CapsuleScreen({ capsule, store, now, embedded = false, onComplete, exitHref = "#/" }: { capsule: Capsule; store: Store; now?: Date; embedded?: boolean; onComplete?: () => void; exitHref?: string }) {
  const [state, setState] = useState<CapsuleState | null>(null);
  const [saveError, setSaveError] = useState(false);
  const busy = useRef(false); // un segundo toque mientras se guarda no debe registrar dos veces
  useEffect(() => {
    store.getCapsuleProgress(capsule.id).then((saved) => setState(initialState(capsule, saved)));
  }, [capsule, store]);
  if (!state) return <p>Cargando…</p>;

  const advance = async (e: CapsuleEvent) => {
    const s = next(state, capsule, e);
    setState(s);
    const p = toProgress(s, capsule.id);
    if (p) await store.putCapsuleProgress(p);
  };
  const finish = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await close();
      setSaveError(false);
      onComplete?.();
    } catch {
      setSaveError(true); // el progreso de la cápsula sigue guardado: se puede volver a pulsar «Terminar»
    } finally {
      busy.current = false;
    }
  };
  const close = async () => {
    const at = now ?? new Date();
    const res = closeCapsule(capsule, state, await store.allCards(), at);
    if (res) {
      await store.putCard(res.card);
      await store.addReviewLog(res.log);
    }
    const day = normalizeDay(await store.getDay(localDate(at)), at);
    await store.putDay(afterCapsule(day, capsule.id));
    await store.clearCapsuleProgress(capsule.id);
    setState(next(state, capsule, { type: "continue" }));
  };

  const { correct, total } = score(state, capsule);
  const Wrapper = embedded ? "div" : "main";
  const total2 = capsule.retrieval.length;
  const progress = state.phase === "trigger" ? 0.05 : state.phase === "explanation" ? 0.2 : state.phase === "retrieval" ? 0.3 + 0.6 * (state.index / Math.max(1, total2)) : state.phase === "closing" ? 0.95 : 1;
  return (
    <Wrapper className={embedded ? undefined : "focus"}>
      <RunProvider value={{ why: capsule.explanation.text_es }}>
      <FocusHead progress={progress} exitHref={exitHref} />
      {state.phase === "trigger" && <Translate item={capsule.trigger as TranslateItem} onDone={() => advance({ type: "continue" })} />}
      {state.phase === "explanation" && (
        <section>
          <h2>Explicación</h2>
          <p>{capsule.explanation.text_es}</p>
          <div className="actions-bottom"><button type="button" className="primary block" onClick={() => advance({ type: "continue" })}>Entendido</button></div>
        </section>
      )}
      {state.phase === "retrieval" && (
        <section>
          <h2>Práctica: {state.index + 1} de {total}</h2>
          <ItemView key={capsule.retrieval[state.index].id} item={capsule.retrieval[state.index]}
            onAnswer={(c) => advance({ type: "answer", itemId: capsule.retrieval[state.index].id, correct: c })} />
        </section>
      )}
      {state.phase === "closing" && (
        <section>
          <h2>Cierre</h2>
          <p>Acertaste {correct} de {total}.</p>
          <p><small>Este tema volverá en tus repasos.</small></p>
          {saveError && <p role="alert" className="alert">No se pudo guardar. Inténtalo de nuevo.</p>}
          <div className="actions-bottom"><button type="button" className="primary block" onClick={finish}>Terminar</button></div>
        </section>
      )}
      {state.phase === "done" && (
        <section>
          <h2>Cápsula completada.</h2>
          <p><a className="button primary" href="#/">Volver a Hoy</a></p>
        </section>
      )}
      </RunProvider>
    </Wrapper>
  );
}
