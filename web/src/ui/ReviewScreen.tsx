import { useEffect, useState } from "react";
import type { ContentPack, Lexeme } from "../content/load";
import type { Card } from "../generated/card";
import { afterReview, normalizeDay, pickItem, ratingFromAnswer, reviewQueue, type ReviewEntry } from "../state/session";
import { newCard, review } from "../state/srs";
import { localDate, type Store } from "../state/store";
import { SpeakButton } from "./SpeakButton";
import { ItemView } from "./items/ItemView";

export function ReviewScreen({ pack, store, now }: { pack: ContentPack; store: Store; now?: Date }) {
  const [queue, setQueue] = useState<ReviewEntry[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    store.allCards().then((cards) => setQueue(reviewQueue({ pack, cards, now: now ?? new Date() })));
  }, [pack, store, now]);
  if (!queue) return <p>Cargando…</p>;
  if (queue.length === 0) return <main><p>No tienes repasos pendientes ahora.</p><p><a className="button" href="#/">Volver a Hoy</a></p></main>;
  if (i >= queue.length) return <main><h2>Terminaste esta tanda.</h2><p><a className="button" href="#/">Volver a Hoy</a></p></main>;

  const entry = queue[i];
  const card: Card | null = "card" in entry ? entry.card : null;
  const lexeme: Lexeme | undefined = "lexeme" in entry ? entry.lexeme : card?.subject.kind === "lexeme" ? pack.lexemes.find((l) => l.id === card.subject.ref) : undefined;
  const items = card?.subject.kind === "error_code" ? pack.itemsByCode[card.subject.ref] : undefined;

  const grade = async (rating: 1 | 2 | 3 | 4) => {
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

  if (!lexeme && !(items && items.length)) return <main><p>Este repaso no tiene ejercicios todavía.</p><button type="button" onClick={() => setI(i + 1)}>Saltar</button></main>;
  return (
    <main>
      <p><small>Repaso {i + 1} de {queue.length}</small></p>
      {lexeme ? (
        <section>
          <h2>{lexeme.form}</h2>
          <SpeakButton text={lexeme.form} />
          {!revealed ? (
            <p><button type="button" onClick={() => setRevealed(true)}>Mostrar significado</button></p>
          ) : (
            <div>
              <p>{lexeme.gloss_es}</p>
              <p><small>Falso amigo: no significa lo que parece en español.</small></p>
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
    </main>
  );
}
