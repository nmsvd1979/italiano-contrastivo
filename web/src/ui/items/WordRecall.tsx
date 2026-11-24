import { useState } from "react";
import type { Lexeme } from "../../content/load";
import { falseFriendNote, GENDER_NOTE, withArticle } from "../../state/words";
import { gradeWord, type WordGrade } from "../../state/write";
import { SpeakButton } from "../SpeakButton";
import { Feedback } from "../kit/Feedback";

const MESSAGE: Record<WordGrade["result"], string> = {
  ok: "", sin_articulo: "Te faltó el artículo: en italiano el sustantivo se aprende con él.", acento: "Casi: revisa el acento.",
  articulo: "La palabra es esa, pero el artículo no: ojo con el género (no siempre coincide con el español).", wrong: "",
};

/**
 * Repaso de una palabra en dirección español → italiano: ves la glosa y escribes la palabra con su artículo. Recordar (producir) fija más que
 * reconocer; por eso no se muestra la palabra italiana antes. Si tu respuesta es otra palabra válida (sinónimo), lo declaras tú.
 */
export function WordRecall({ lexeme, onRate }: { lexeme: Lexeme & { gdiv?: boolean; ff?: boolean }; onRate: (rating: 1 | 2 | 3) => void }) {
  const [value, setValue] = useState("");
  const [graded, setGraded] = useState<WordGrade | null>(null);
  const [override, setOverride] = useState(false);
  const rating = override ? 3 : graded?.rating ?? 1;
  return (
    <div className="item">
      <div className="ask"><p className="eyebrow">Escribe en italiano</p><p className="es">{lexeme.gloss_es}</p></div>
      <input lang="it" aria-label="Tu respuesta" value={value} disabled={graded !== null} autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{ width: "100%" }}
        onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && value.trim() && !graded) setGraded(gradeWord(value, lexeme.form, lexeme.art)); }} />
      {graded === null ? (
        <div className="actions-bottom"><button type="button" className="primary block" disabled={!value.trim()} onClick={() => setGraded(gradeWord(value, lexeme.form, lexeme.art))}>Comprobar</button></div>
      ) : (
        <Feedback ok={rating === 3} answer={<span>{graded.expected}</span>} said={rating === 3 ? undefined : value}
          why={override ? undefined : MESSAGE[graded.result] || undefined}
          extra={<>
            <SpeakButton text={lexeme.form} />
            {lexeme.gdiv && <p><small>{GENDER_NOTE}</small></p>}
            {lexeme.ff && <p><small>{falseFriendNote(lexeme.form, lexeme.gloss_es)}</small></p>}
            {graded.result === "wrong" && !override && (
              <p><button type="button" onClick={() => setOverride(true)}>Mi respuesta también es válida (otra palabra)</button></p>)}
          </>}
          onContinue={() => onRate(rating)} />
      )}
    </div>
  );
}
