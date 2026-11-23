import { useEffect, useRef, useState } from "react";
import type { ContentPack, Lexeme } from "../content/load";
import { GENDER_NOTE, wordLexeme, withArticle } from "../state/words";
import type { Card } from "../generated/card";
import { afterReview, normalizeDay, pickItem, ratingFromAnswer, reviewQueue, type ReviewEntry } from "../state/session";
import { fixItemOf } from "../state/fixes";
import { newCard, review } from "../state/srs";
import { localDate, type Store } from "../state/store";
import { loadSamples } from "../state/timing";
import { SpeakButton } from "./SpeakButton";
import { WordRecall } from "./items/WordRecall";
import { ItemView } from "./items/ItemView";
import { FocusHead } from "./kit/FocusHead";
import { Ring } from "./kit/Ring";
import { RunProvider } from "./kit/RunContext";
import { useStrandTimer } from "./kit/useStrandTimer";

export function ReviewScreen({ pack, store, now }: { pack: ContentPack; store: Store; now?: Date }) {
  const [queue, setQueue] = useState<ReviewEntry[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useStrandTimer(store, "foco");
  const busy = useRef(false); // un segundo toque mientras se guarda no debe calificar dos veces
  useEffect(() => {
    Promise.all([store.allCards(), store.allUnits()]).then(([cards, units]) => setQueue(reviewQueue({ pack, cards, now: now ?? new Date(), units, samples: loadSamples() })));
  }, [pack, store, now]);
  if (!queue) return <p>Cargando…</p>;
  if (queue.length === 0) return <main><p>No tienes repasos pendientes ahora.</p><p><a className="button" href="#/">Volver a Hoy</a></p></main>;
  if (i >= queue.length) return <main className="center"><Ring /><h2>Terminaste esta tanda.</h2><div className="actions-bottom"><a className="button primary block" href="#/">Volver a Hoy</a></div></main>;

  const entry = queue[i];
  const card: Card | null = "card" in entry ? entry.card : null;
  const lexeme: Lexeme | undefined = "lexeme" in entry ? entry.lexeme : card?.subject.kind === "lexeme" ? pack.lexemes.find((l) => l.id === card.subject.ref) ?? wordLexeme(pack, card.subject.ref) : undefined;
  const items = card?.subject.kind === "error_code" ? pack.itemsByCode[card.subject.ref] : undefined;

  if ("filler" in entry) {
    const code = (entry.filler as { target_error_codes?: string[] }).target_error_codes?.[0];
    const advance = async () => {
      const at = now ?? new Date();
      const day = normalizeDay(await store.getDay(localDate(at)), at);
      await store.putDay(afterReview(day));
      setI(i + 1);
    };
    return (
      <main className="focus">
        <RunProvider value={{ why: pack.capsules.find((c) => c.target_error_codes[0] === code)?.explanation.text_es }}>
          <FocusHead progress={i / Math.max(1, queue.length)} exitHref="#/" />
          <p className="runner-meta">Práctica de unidades anteriores · {i + 1} de {queue.length}</p>
          <ItemView key={`${entry.filler.id}-${i}`} item={entry.filler} onAnswer={() => void advance()} />
        </RunProvider>
      </main>
    );
  }

  const grade = async (rating: 1 | 2 | 3 | 4) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await save(rating);
      setSaveError(false);
    } catch {
      setSaveError(true); // no se avanza: la tarjeta sigue pendiente y se puede reintentar
    } finally {
      busy.current = false;
    }
  };
  const save = async (rating: 1 | 2 | 3 | 4) => {
    const at = now ?? new Date();
    const base = card ?? newCard({ kind: "lexeme", ref: lexeme!.id }, "false_friend", at);
    const { card: updated, log } = review(base, rating, at);
    await store.putCard(updated);
    await store.addReviewLog(log);
    const day = normalizeDay(await store.getDay(localDate(at)), at);
    await store.putDay(afterReview(day));
    setRevealed(false);
    setI(i + 1);
  };

  const fixItem = card ? fixItemOf(card) : undefined;
  if (fixItem) {
    return (
      <main className="focus">
        <RunProvider value={{ why: "Esta frase la escribiste tú y una corrección la arregló: es justo el tipo de error que conviene fijar." }}>
          <FocusHead progress={i / Math.max(1, queue.length)} exitHref="#/" />
          <p className="runner-meta">Repaso {i + 1} de {queue.length} · una corrección de tu texto</p>
          {saveError && <p role="alert" className="alert">No se pudo guardar tu respuesta. Inténtalo de nuevo.</p>}
          <ItemView key={`${card!.id}-${i}`} item={fixItem} onAnswer={(c) => grade(ratingFromAnswer(c))} />
        </RunProvider>
      </main>
    );
  }
  if (!lexeme && !(items && items.length)) return <main><p>Este repaso no tiene ejercicios todavía.</p><button type="button" onClick={() => setI(i + 1)}>Saltar</button></main>;
  const why = card?.subject.kind === "error_code" ? pack.capsules.find((c) => c.target_error_codes[0] === card.subject.ref)?.explanation.text_es : undefined;
  return (
    <main className="focus">
      <RunProvider value={{ why }}>
      <FocusHead progress={i / Math.max(1, queue.length)} exitHref="#/" />
      <p className="runner-meta">Repaso {i + 1} de {queue.length}</p>
      {saveError && <p role="alert" className="alert">No se pudo guardar tu respuesta. Inténtalo de nuevo.</p>}
      {lexeme && lexeme.id.startsWith("w:") ? (
        <WordRecall key={`${lexeme.id}-${i}`} lexeme={lexeme} onRate={(r) => void grade(r)} />
      ) : lexeme ? (
        <section>
          <h2 lang="it">{withArticle(lexeme.form, lexeme.art)}</h2>
          <SpeakButton text={lexeme.form} />
          {!revealed ? (
            <p><button type="button" className="primary block" onClick={() => setRevealed(true)}>Mostrar significado</button></p>
          ) : (
            <div>
              <p>{lexeme.gloss_es}</p>
              {lexeme.lexical_type === "false_friend" && <p><small>Falso amigo: no significa lo que parece en español.</small></p>}
              {lexeme.gdiv && <p><small>{GENDER_NOTE}</small></p>}
              <p className="ratings">
                {([["Otra vez", 1], ["Difícil", 2], ["Bien", 3], ["Fácil", 4]] as const).map(([label, r]) => (
                  <button key={r} type="button" onClick={() => grade(r)}>{label}</button>
                ))}
              </p>
            </div>
          )}
        </section>
      ) : (
        <ItemView key={`${card!.id}-${i}`} item={pickItem(items!, card!.fsrs.reps)} onAnswer={(c) => grade(ratingFromAnswer(c))} />
      )}
      </RunProvider>
    </main>
  );
}
