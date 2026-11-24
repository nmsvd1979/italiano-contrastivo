import { type Seconds, STRAND_TAG, STRANDS, totalSeconds } from "../../state/strands";

const mins = (s: number) => (s < 60 ? (s > 0 ? "<1" : "0") : String(Math.round(s / 60)));
const COLOR = { entrada: "var(--s-in)", foco: "var(--s-form)", salida: "var(--s-out)", fluidez: "var(--s-flu)" } as const;

/** La semana en una barra apilada: tiempo ACTIVO real por tipo de práctica, con una frase si alguna va corta. */
export function WeekBar({ week }: { week: Seconds }) {
  const total = totalSeconds(week);
  if (total === 0) {
    return <section aria-label="Tu semana"><h2>Esta semana</h2><p><small>Cuando estudies, aquí verás cuánto tiempo real dedicas a cada tipo de práctica.</small></p></section>;
  }
  const low = total >= 20 * 60 ? [...STRANDS].sort((a, b) => (week[a] ?? 0) - (week[b] ?? 0))[0] : null;
  return (
    <section aria-label="Tu semana">
      <div className="top"><h2>Esta semana</h2><small>{mins(total)} min</small></div>
      <div className="stack" aria-hidden="true">
        {STRANDS.filter((s) => (week[s] ?? 0) > 0).map((s) => <i key={s} style={{ flex: week[s], background: COLOR[s] }} />)}
      </div>
      <p className="week-legend"><small>{STRANDS.map((s) => `${STRAND_TAG[s]} ${mins(week[s] ?? 0)}`).join(" · ")}</small></p>
      {low && <p><small>{STRAND_TAG[low]} va corto esta semana.</small></p>}
    </section>
  );
}
