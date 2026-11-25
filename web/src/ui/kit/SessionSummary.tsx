import type { ContrastData } from "./ContrastCard";
import { Ring } from "./Ring";

const R = 58;
const LEN = 2 * Math.PI * R;

/** Anillo con los aciertos a la primera: el arco es la parte acertada; el número va dentro y dicho en texto. */
export function ScoreRing({ correct, total }: { correct: number; total: number }) {
  const share = total > 0 ? Math.min(1, Math.max(0, correct / total)) : 0;
  return (
    <div className="scorering" role="img" aria-label={`${correct} de ${total} a la primera`}>
      <svg viewBox="0 0 132 132" aria-hidden="true">
        <circle cx="66" cy="66" r={R} fill="none" stroke="var(--fill)" strokeWidth="10" />
        {share > 0 && <circle className="scorering-fg" cx="66" cy="66" r={R} fill="none" stroke="var(--ok)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(share * LEN).toFixed(1)} ${LEN.toFixed(1)}`} transform="rotate(-90 66 66)" />}
      </svg>
      <div className="scorering-c" aria-hidden="true"><b>{correct}/{total}</b><small>a la primera</small></div>
    </div>
  );
}

/**
 * Lo que dejó la sesión, con datos que la app ya guarda: aciertos a la primera, minutos de estudio de hoy, palabras nuevas de hoy,
 * un ejemplo real del contraste practicado y cuántos ejercicios se fallaron (esos cuentan para «Lo que más te cuesta»).
 * No hay puntos ni premios: solo qué pasó.
 */
export function SessionSummary({ correct, total, daySeconds, newWords, fixed }: { correct?: number; total?: number; daySeconds?: number; newWords?: number; fixed?: ContrastData }) {
  const hasScore = correct !== undefined && total !== undefined && total > 0;
  const missed = hasScore ? total - correct : 0;
  const mins = daySeconds === undefined ? undefined : Math.floor(daySeconds / 60);
  return (
    <div className="summary">
      {hasScore ? <ScoreRing correct={correct} total={total} /> : <Ring />}
      {(mins !== undefined || (newWords ?? 0) > 0) && (
        <div className="stats">
          {mins !== undefined && <div><b>{mins} min</b><small>de estudio hoy</small></div>}
          {(newWords ?? 0) > 0 && <div><b>{newWords}</b><small>{newWords === 1 ? "palabra nueva hoy" : "palabras nuevas hoy"}</small></div>}
        </div>
      )}
      {fixed && (
        <div className="fixed">
          <h3>Hoy practicaste</h3>
          <p className="es">{fixed.es}</p>
          <p className="itx" lang="it">{fixed.before}<mark>{fixed.changed}</mark>{fixed.after}</p>
        </div>
      )}
      {missed > 0 && <p className="missed"><small>Fallaste {missed} {missed === 1 ? "ejercicio" : "ejercicios"} a la primera: cuentan para «Lo que más te cuesta».</small></p>}
    </div>
  );
}
