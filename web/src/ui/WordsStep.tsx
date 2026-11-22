import { useState } from "react";
import type { Unit } from "../content/load";
import { FocusHead } from "./kit/FocusHead";
import { SpeakButton } from "./SpeakButton";
import { falseFriendNote, GENDER_NOTE, withArticle } from "../state/words";

const KIND: Record<string, string> = { "m|s": "masculino", "f|s": "femenino", "m|p": "masculino plural", "f|p": "femenino plural", "-|s": "masculino y femenino", "-|p": "plural", "-|-": "no cambia" };

/**
 * «Palabras»: la lista del tema con significado y audio. Se puede tapar el significado para comprobar de memoria
 * (autoevaluación: no se califica). Las palabras salen de `vocab_a1.yaml`; las glosas son traducciones básicas del proyecto.
 */
export function WordsStep({ unit, onFinish, exitHref = "#/" }: { unit: Unit; onFinish: () => void; exitHref?: string }) {
  const words = unit.words ?? [];
  const [hide, setHide] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const toggle = (f: string) => setShown((s) => { const n = new Set(s); if (n.has(f)) n.delete(f); else n.add(f); return n; });
  return (
    <div>
      <FocusHead progress={0.1} exitHref={exitHref} />
      <h2>Palabras del tema</h2>
      <p>{words.length} palabras. Escúchalas y repítelas en voz alta. Luego tapa los significados y comprueba cuántas recuerdas.</p>
      <p><label><input type="checkbox" checked={hide} onChange={(e) => { setHide(e.target.checked); setShown(new Set()); }} /> Tapar los significados</label></p>
      <ul className="words">
        {words.map((w) => (
          <li key={w.form}>
            <strong lang="it">{withArticle(w.form, w.art)}</strong> <SpeakButton text={w.form} />
            <br />
            {hide && !shown.has(w.form)
              ? <button type="button" onClick={() => toggle(w.form)}>Ver significado</button>
              : <span>{w.gloss}{KIND[`${w.gender}|${w.num}`] && <small> ({KIND[`${w.gender}|${w.num}`]})</small>}
                  {w.gdiv && <small className="note"> · ⚠ {GENDER_NOTE}</small>}
                  {w.ff && <small className="note"> · ⚠ {falseFriendNote(w.form, w.gloss)}</small>}</span>}
          </li>
        ))}
      </ul>
      <div className="actions-bottom"><button type="button" className="primary block" onClick={onFinish}>Ya las repasé</button></div>
    </div>
  );
}
