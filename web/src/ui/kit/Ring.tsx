/** Anillo que se cierra al terminar un bloque. */
export function Ring({ label = "✓" }: { label?: string }) {
  return (
    <svg className="ring" viewBox="0 0 100 100" role="img" aria-label="Completado">
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--line)" strokeWidth="8" />
      <circle className="fg" cx="50" cy="50" r="46" fill="none" stroke="var(--ok)" strokeWidth="8" strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="62" textAnchor="middle" fontSize="38" fill="var(--ok)">{label}</text>
    </svg>
  );
}
