import type { ReactNode } from "react";

export type PathItem = { key: string; label: string; subtitle?: string; state: "done" | "now" | "todo"; tag?: ReactNode };

/** Plan como camino: puntos unidos por una línea (hecho con ✓, el que toca ahora destacado, lo demás pendiente). */
export function PathList({ items, label = "Plan de hoy" }: { items: PathItem[]; label?: string }) {
  return (
    <ol className="pathlist" aria-label={label}>
      {items.map((i) => (
        <li key={i.key} data-state={i.state}>
          <span className="pdot" aria-hidden="true">{i.state === "done" ? "✓" : ""}</span>
          <span className="ptext"><b>{i.label}</b>{i.subtitle && <small>{i.subtitle}</small>}</span>
          {i.tag}
          {i.state === "done" && <span className="sr">hecho</span>}
          {i.state === "now" && <span className="sr">toca ahora</span>}
        </li>
      ))}
    </ol>
  );
}
