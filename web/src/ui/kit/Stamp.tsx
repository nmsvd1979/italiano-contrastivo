import { ModuleMotif, toneOf } from "./ModuleMotif";

/**
 * Sello de un módulo: su dibujo dentro de un círculo con borde punteado, ladeado como un sello de goma.
 * Completado: a color y ladeado. Pendiente: en gris, derecho. `fresh` lo estampa con una animación (una sola vez, al ganarlo).
 */
export function Stamp({ index, earned, size = "md", fresh = false, label }: { index: number; earned: boolean; size?: "sm" | "md" | "lg"; fresh?: boolean; label?: string }) {
  return (
    <span className="stamp" data-tone={toneOf(index)} data-earned={earned} data-size={size} data-fresh={fresh && earned} role="img" aria-label={label ?? (earned ? `Sello del módulo ${index + 1}, ganado` : `Sello del módulo ${index + 1}, pendiente`)}>
      <ModuleMotif index={index} />
    </span>
  );
}
