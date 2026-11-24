import { useState } from "react";
import { gradeWrite, type WriteItem } from "../../state/write";
import { SpeakButton } from "../SpeakButton";
import { diffWords } from "../kit/diff";
import { Feedback, Marked } from "../kit/Feedback";
import { useRun } from "../kit/RunContext";

/**
 * «Escribe en italiano»: ves la frase en español y la escribes de memoria. Se corrige contra la traducción guardada; si tu versión
 * es distinta pero también correcta, lo declaras tú («también es válida») y cuenta como acierto. No hay IA ni servidor: es una
 * comparación, y por eso se dice con franqueza cuando puede equivocarse.
 */
export function Write({ item, onAnswer, allowOverride = true }: { item: WriteItem; onAnswer: (correct: boolean) => void; allowOverride?: boolean }) {
  const [value, setValue] = useState("");
  const [graded, setGraded] = useState<ReturnType<typeof gradeWrite> | null>(null);
  const [override, setOverride] = useState(false);
  const budget = useRun().overrides;   // en la prueba de unidad: un comodín por prueba
  const ok = graded?.result === "ok" || override;
  return (
    <div className="item">
      <div className="ask"><p className="eyebrow">Escribe en italiano</p><p className="es">{item.source_es}</p></div>
      <textarea lang="it" aria-label="Tu traducción" rows={2} value={value} disabled={graded !== null} autoCapitalize="off" autoCorrect="off" spellCheck={false}
        onChange={(e) => setValue(e.target.value)} />
      {graded === null ? (
        <div className="actions-bottom"><button type="button" className="primary block" disabled={!value.trim()} onClick={() => setGraded(gradeWrite(value, item.accepted_it))}>Comprobar</button></div>
      ) : (
        <Feedback ok={ok}
          answer={ok && !override ? <span>{graded.best}</span> : <Marked segs={diffWords(graded.best, value)} />}
          said={ok ? undefined : value}
          why={graded.result === "accent" ? "Las palabras son las correctas: lo que falta es el acento (en italiano cambia la palabra o su pronunciación)." : graded.result === "wrong" ? "Lo marcado es lo que tu versión no tenía." : undefined}
          extra={<>
            <SpeakButton text={graded.best} />
            {graded.result === "wrong" && allowOverride && !override && (budget && budget.left <= 0
              ? <p><small>Ya usaste el comodín de esta prueba: aquí la respuesta cuenta como fallo.</small></p>
              : <p><button type="button" onClick={() => { budget?.use(); setOverride(true); }}>Mi versión también es correcta</button><br />
                <small>Solo hay una respuesta guardada y a veces el italiano admite otra: tú decides.{budget ? ` Te queda ${budget.left} ${budget.left === 1 ? "comodín" : "comodines"} en esta prueba.` : ""}</small></p>)}
          </>}
          onContinue={() => onAnswer(ok)} />
      )}
    </div>
  );
}
