import type { ReactNode } from "react";
import { useRun } from "./RunContext";
import type { Seg } from "./diff";

export const Marked = ({ segs }: { segs: Seg[] }) => (
  <>{segs.map((s, i) => (s.changed ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>)).reduce<ReactNode[]>((a, n, i) => (i ? [...a, " ", n] : [n]), [])}</>
);

/**
 * Hoja inferior de retroalimentación: al acertar, confirmación breve; al fallar, la respuesta correcta con lo que cambia
 * resaltado, «¿Por qué?» (explicación en el momento) y el aviso de que el ejercicio volverá.
 */
export function Feedback({ ok, answer, why, extra, onContinue }: { ok: boolean; answer?: ReactNode; why?: string; extra?: ReactNode; onContinue: () => void }) {
  const run = useRun();
  const explanation = [why, run.why].filter(Boolean).join(" ");
  return (
    <div className="feedback" role="status" data-state={ok ? "correct" : "wrong"}>
      <div>
        <p className="head">{ok ? "¡Correcto!" : "Casi. Así se dice:"}</p>
        {!ok && answer && <p className="answer" lang="it">{answer}</p>}
        {ok && answer && <p className="answer" lang="it">{answer}</p>}
        {extra}
        {!ok && explanation && (
          <details>
            <summary>¿Por qué?</summary>
            <p>{explanation}</p>
          </details>
        )}
        {!ok && run.requeue && <p className="again">Este ejercicio volverá al final para que lo repases.</p>}
        <button type="button" className="primary" onClick={onContinue}>Continuar</button>
      </div>
    </div>
  );
}
