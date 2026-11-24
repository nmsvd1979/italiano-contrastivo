/** Cabecera del modo concentrado: salir (×) y barra de avance que sube con cada acierto. */
export function FocusHead({ progress, exitHref, label, count }: { progress: number; exitHref: string; label?: string; count?: string }) {
  return (
    <div className="focus-head">
      <a className="x" href={exitHref} aria-label="Salir" style={{ textDecoration: "none", fontSize: 24, color: "var(--muted)", padding: "0 6px" }}>×</a>
      <div className="bar" role="progressbar" aria-label={label ?? "Avance"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <i style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
      </div>
      {count && <span className="count">{count}</span>}
    </div>
  );
}
