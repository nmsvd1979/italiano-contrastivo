import { Icon, type IconName } from "./Icon";

const TABS: { href: string; ico: IconName; label: string; match: (h: string) => boolean }[] = [
  { href: "#/", ico: "hoy", label: "Hoy", match: (h) => h === "#/" || h === "" || h === "#" },
  { href: "#/ruta", ico: "ruta", label: "Ruta", match: (h) => h.startsWith("#/ruta") || h.startsWith("#/unidad") || h.startsWith("#/modulo") },
  { href: "#/biblioteca", ico: "biblioteca", label: "Biblioteca", match: (h) => h.startsWith("#/biblioteca") },
  { href: "#/progreso", ico: "progreso", label: "Progreso", match: (h) => h.startsWith("#/progreso") || h.startsWith("#/ajustes") || h.startsWith("#/acerca") || h.startsWith("#/practicar") || h.startsWith("#/hablar") || h.startsWith("#/escribir") },
];

export function TabBar({ hash }: { hash: string }) {
  return (
    <nav className="tabbar" aria-label="Principal">
      {TABS.map((t) => (
        <a key={t.href} href={t.href} aria-current={t.match(hash) ? "page" : undefined}>
          <Icon name={t.ico} />{t.label}
        </a>
      ))}
    </nav>
  );
}

/** Pantallas de trabajo: sin menú ni distracciones. */
export const isFocusRoute = (hash: string) => /^#\/(unidad\/u\d+\/\w+|modulo\/m\d+\/(?:entrada|cierre|texto\/\w+)|repaso|debiles|capsula\/|ubicacion|hito\/)/.test(hash);
