import { type ReactNode, useEffect } from "react";
import { useRun } from "./RunContext";
import type { Seg } from "./diff";

/** `glue`: lo que se pone entre segmentos (un espacio para palabras; nada para una frase con el hueco rellenado). */
export const Marked = ({ segs, glue = " " }: { segs: Seg[]; glue?: string }) => (
  <>{segs.map((s, i) => (s.changed ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>)).reduce<ReactNode[]>((a, n, i) => (i ? [...a, glue, n] : [n]), [])}</>
);

/**
 * Hoja inferior de corrección. Al acertar, confirmación breve. Al fallar: «Dijiste» (tachado) frente a «Se dice» (con lo que cambia
 * resaltado), el porqué del ejercicio a la vista, la regla de la unidad plegada, «Ver ficha» si hay ficha y el aviso de que volverá.
 */
export function Feedback({ ok, answer, said, why, extra, lang = "it", onContinue }: { ok: boolean; answer?: ReactNode; said?: ReactNode; why?: string; extra?: ReactNode; lang?: "it" | "es"; onContinue: () => void }) {
  const run = useRun();
  // el primer intento cuenta al comprobar: salir con la × tras fallar no lo convierte en acierto
  useEffect(() => { run.onCheck?.(ok); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="feedback" role="status" data-state={ok ? "correct" : "wrong"}>
      <div>
        <p className="head">{ok ? "¡Correcto!" : "Casi"}</p>
        {ok && answer && <p className="answer" lang={lang}>{answer}</p>}
        {!ok && said && answer && (
          <dl className="cmp">
            <dt>Dijiste</dt><dd lang={lang}><del>{said}</del></dd>
            <dt>Se dice</dt><dd lang={lang} className="answer">{answer}</dd>
          </dl>
        )}
        {!ok && !said && answer && <p className="answer" lang={lang}>{answer}</p>}
        {!ok && why && <p className="why">{why}</p>}
        {extra}
        {!ok && (run.why || run.fichaHref) && (
          <div className="acts">
            {run.why && (
              <details>
                <summary>Ver la regla</summary>
                <p>{run.why}</p>
              </details>
            )}
            {run.fichaHref && <a className="button" href={run.fichaHref} onClick={onContinue}>Ver ficha</a>}
          </div>
        )}
        {!ok && run.requeue && <p className="again">Este ejercicio volverá al final para que lo repases.</p>}
        <button type="button" className="primary" onClick={onContinue}>Continuar</button>
      </div>
    </div>
  );
}
