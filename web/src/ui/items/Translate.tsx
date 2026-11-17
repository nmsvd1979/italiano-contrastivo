import { useState } from "react";
import type { Item } from "../../generated/item";

export type TranslateItem = Extract<Item, { type?: "translate_es_it" }>;

const words = (s: string) => s.split(/\s+/).filter(Boolean);
const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

/** Calentamiento (trigger): el usuario intenta traducir y luego ve el contraste. No se califica. */
export function Translate({ item, onDone }: { item: TranslateItem; onDone: () => void }) {
  const [attempt, setAttempt] = useState("");
  const [shown, setShown] = useState(false);
  const mine = new Set(words(attempt).map(clean));
  const target = item.accepted_it[0];
  return (
    <div className="item">
      <p>Traduce al italiano: «{item.source_es}»</p>
      <textarea aria-label="Tu traducción" value={attempt} rows={2} disabled={shown} autoCapitalize="off" autoCorrect="off" onChange={(e) => setAttempt(e.target.value)} />
      {!shown ? (
        <p><button type="button" onClick={() => setShown(true)}>Ver la respuesta</button></p>
      ) : (
        <div role="status">
          <p>En italiano se dice: {words(target).map((w, i) => (mine.has(clean(w)) ? <span key={i}>{w} </span> : <mark key={i}>{w} </mark>))}</p>
          <p><small>Lo resaltado es lo que tu intento no tenía.</small></p>
          <button type="button" onClick={onDone}>Continuar</button>
        </div>
      )}
    </div>
  );
}
