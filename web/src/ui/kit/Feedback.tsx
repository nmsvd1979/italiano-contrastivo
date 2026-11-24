import type { ReactNode } from "react";
import { useRun } from "./RunContext";
import type { Seg } from "./diff";

export const Marked = ({ segs }: { segs: Seg[] }) => (
  <>{segs.map((s, i) => (s.changed ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>)).reduce<ReactNode[]>((a, n, i) => (i ? [...a, " ", n] : [n]), [])}</>
);

/**
 * Hoja inferior de corrección. Al acertar, confirmación breve. Al fallar: «Dijiste» (tachado) frente a «Se dice» (con lo que cambia
 * resaltado), el porqué del ejercicio a la vista, la regla de la unidad plegada, «Ver ficha» si hay ficha y el aviso de que volverá.
 */
export function Feedback({ ok, answer, said, why, extra, onContinue }: { ok: boolean; answer?: ReactNode; said?: ReactNode; why?: string; extra?: ReactNode; onContinue: () => void }) {
  const run = useRun();
  return (
    <div className="feedback" role="status" data-state={ok ? "correct" : "wrong"}>
      <div>
        <p className="head">{ok ? "¡Correcto!" : "Casi"}</p>
        {ok && answer && <p className="answer" lang="it">{answer}</p>}
        {!ok && said && answer && (
          <dl className="cmp">
            <dt>Dijiste</dt><dd lang="it"><del>{said}</del></dd>
            <dt>Se dice</dt><dd lang="it" className="answer">{answer}</dd>
          </dl>
        )}
        {!ok && !said && answer && <p className="answer" lang="it">{answer}</p>}
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
            {run.fichaHref && <a className="button" href={run.fichaHref}>Ver ficha</a>}
          </div>
        )}
        {!ok && run.requeue && <p className="again">Este ejercicio volverá al final para que lo repases.</p>}
        <button type="button" className="primary" onClick={onContinue}>Continuar</button>
      </div>
    </div>
  );
}
