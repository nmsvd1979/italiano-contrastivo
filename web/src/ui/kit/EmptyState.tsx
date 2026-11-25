import type { ReactNode } from "react";

/** Pantalla de estado (cargando, bloqueado, sin repasos): dice qué pasa y deja una salida clara. */
export function EmptyState({ title, body, action, children }: { title: string; body?: string; action?: { href: string; label: string }; children?: ReactNode }) {
  return (
    <main className="empty">
      <h1>{title}</h1>
      {body && <p>{body}</p>}
      {children}
      {action && <p><a className="button primary" href={action.href}>{action.label}</a></p>}
    </main>
  );
}
