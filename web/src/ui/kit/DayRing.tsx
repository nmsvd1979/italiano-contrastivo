const R = 21;
const LEN = 2 * Math.PI * R;

/** Anillo de los minutos de estudio de hoy frente a la referencia diaria. No bloquea nada; solo muestra cuánto llevas. */
export function DayRing({ seconds, goalSeconds }: { seconds: number; goalSeconds: number }) {
  const mins = Math.floor(seconds / 60);
  const share = Math.min(1, Math.max(0, seconds / goalSeconds));
  return (
    <svg className="dayring" viewBox="0 0 52 52" role="img" aria-label={`${mins} de ${goalSeconds / 60} minutos de estudio hoy`}>
      <circle cx="26" cy="26" r={R} fill="none" stroke="var(--fill)" strokeWidth="6" />
      <circle className="dayring-fg" cx="26" cy="26" r={R} fill="none" stroke="var(--c, var(--accent))" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(share * LEN).toFixed(1)} ${LEN.toFixed(1)}`} transform="rotate(-90 26 26)" />
      <text x="26" y="30" textAnchor="middle" fontSize="13" fontWeight="650" fill="var(--ink)">{mins}′</text>
    </svg>
  );
}
