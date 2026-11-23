const TABS = [
  { href: "#/", ico: "●", label: "Hoy", match: (h: string) => h === "#/" || h === "" || h === "#" },
  { href: "#/ruta", ico: "☰", label: "Ruta", match: (h: string) => h.startsWith("#/ruta") || h.startsWith("#/unidad") },
  { href: "#/escribir", ico: "✎", label: "Escribir", match: (h: string) => h.startsWith("#/escribir") },
  { href: "#/hablar", ico: "🎙", label: "Hablar", match: (h: string) => h.startsWith("#/hablar") },
  { href: "#/biblioteca", ico: "📚", label: "Biblioteca", match: (h: string) => h.startsWith("#/biblioteca") },
  { href: "#/ajustes", ico: "⚙", label: "Ajustes", match: (h: string) => h.startsWith("#/ajustes") || h.startsWith("#/acerca") },
];

export function TabBar({ hash }: { hash: string }) {
  return (
    <nav className="tabbar" aria-label="Principal">
      {TABS.map((t) => (
        <a key={t.href} href={t.href} aria-current={t.match(hash) ? "page" : undefined}>
          <span className="ico" aria-hidden="true">{t.ico}</span>{t.label}
        </a>
      ))}
    </nav>
  );
}

/** Pantallas de trabajo: sin menú ni distracciones. */
export const isFocusRoute = (hash: string) => /^#\/(unidad\/u\d+\/\w+|repaso|capsula\/|ubicacion|hito\/)/.test(hash);
