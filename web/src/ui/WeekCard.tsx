import { type Seconds, STRAND_HELP, STRAND_LABEL, STRANDS, totalSeconds } from "../state/strands";

const mins = (s: number) => (s < 60 ? (s > 0 ? "<1" : "0") : String(Math.round(s / 60)));

/** «Tu semana»: tiempo ACTIVO real por hebra en los últimos 7 días. Medido, no estimado. */
export function WeekCard({ week }: { week: Seconds }) {
  const total = totalSeconds(week);
  if (total === 0) {
    return <section aria-label="Tu semana"><h2>Tu semana</h2><p><small>Cuando estudies, aquí verás cuánto tiempo real dedicas a cada tipo de práctica: entender, estudiar la lengua, escribir y hablar, y fluidez.</small></p></section>;
  }
  const low = total >= 20 * 60 ? [...STRANDS].sort((a, b) => (week[a] ?? 0) - (week[b] ?? 0))[0] : null;
  return (
    <section aria-label="Tu semana">
      <h2>Tu semana</h2>
      <p><small>{mins(total)} min de estudio activo en 7 días (se deja de contar tras 2 min sin tocar la pantalla).</small></p>
      <ul className="week">
        {STRANDS.map((s) => (
          <li key={s}>
            <span className="t"><b>{STRAND_LABEL[s]}</b> <span>{mins(week[s] ?? 0)} min</span></span>
            <span className="bar" aria-hidden="true"><i style={{ width: `${Math.round(((week[s] ?? 0) / total) * 100)}%` }} /></span>
            <small>{STRAND_HELP[s]}</small>
          </li>
        ))}
      </ul>
      {low && <p><small>La que menos trabajas esta semana es «{STRAND_LABEL[low]}». Un curso equilibrado reparte el tiempo en partes parecidas (guía de Nation, orientativa). La app cubre sobre todo «Estudiar la lengua»: entender y fluidez se completan con exposición fuera de ella.</small></p>}
    </section>
  );
}
