import type { ContentPack, Unit } from "../../content/load";
import { noticeCards, SOUND_CODES } from "../../state/steps";

export type ContrastData = { id: string; es: string; before: string; changed: string; after: string; wrong: string; soundOnly: boolean; author?: string };

/** Ejemplos de contraste de una unidad: frases reales con lo que cambia marcado (las mismas «divergencias» de «Descubre»). */
export function contrastCards(unit: Unit, pack: ContentPack, max = 3): ContrastData[] {
  const soundOnly = SOUND_CODES.has(unit.codes[0]);
  return noticeCards(unit, pack).slice(0, max).map(({ sentence, start, end, wrong }) => ({
    id: sentence.id, es: sentence.es, before: sentence.it.slice(0, start), changed: sentence.it.slice(start, end), after: sentence.it.slice(end), wrong, soundOnly, author: sentence.author,
  }));
}

/** El contraste con forma propia: español en gris, italiano en serif con lo que cambia resaltado y el error típico tachado. */
export function ContrastCard({ data }: { data: ContrastData }) {
  const { es, before, changed, after, wrong, soundOnly } = data;
  return (
    <div className="contrast">
      <span className="l">ES</span><span className="es">{es}</span>
      <span className="l">IT</span><span className="itx" lang="it">{before}<mark>{changed}</mark>{after}</span>
      <span className="rule">{soundOnly ? "Así no se escribe (no sonaría igual)" : "Error típico de hispanohablantes"}: <del lang="it">{before + wrong + after}</del></span>
    </div>
  );
}
