/**
 * Cabecera del modo concentrado: salir (×) y avance. Con `segments` el avance es una tira de tramos (uno por ejercicio, lleno al hacerlo);
 * sin él (o con muchos ejercicios) es una sola barra que sube con cada acierto.
 */
export function FocusHead({ progress, exitHref, label, count, segments }: { progress: number; exitHref: string; label?: string; count?: string; segments?: { total: number; done: number } }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const tramos = segments && segments.total > 0 && segments.total <= 12 ? segments : null;
  return (
    <div className="focus-head">
      <a className="x" href={exitHref} aria-label="Salir" style={{ textDecoration: "none", fontSize: 24, color: "var(--muted)", padding: "0 6px" }}>×</a>
      {tramos ? (
        <div className="tramos" role="progressbar" aria-label={label ?? "Avance"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          {Array.from({ length: tramos.total }, (_, i) => <i key={i} className={i < tramos.done ? "d" : undefined} />)}
        </div>
      ) : (
        <div className="bar" role="progressbar" aria-label={label ?? "Avance"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
      )}
      {count && <span className="count">{count}</span>}
    </div>
  );
}
