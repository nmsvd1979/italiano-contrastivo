import { ModuleMotif, toneOf } from "./ModuleMotif";

/**
 * Sello de un módulo: su dibujo dentro de un círculo con borde punteado, ladeado como un sello de goma.
 * Completado: a color y ladeado. Pendiente: en gris, derecho. `fresh` lo estampa con una animación (una sola vez, al ganarlo).
 */
/** `number` = posición del módulo dentro de su nivel (para la etiqueta); sin él, la global. */
export function Stamp({ index, earned, size = "md", fresh = false, label, number }: { index: number; earned: boolean; size?: "sm" | "md" | "lg"; fresh?: boolean; label?: string; number?: number }) {
  return (
    <span className="stamp" data-tone={toneOf(index)} data-earned={earned} data-size={size} data-fresh={fresh && earned} role="img" aria-label={label ?? (earned ? `Sello del módulo ${number ?? index + 1}, ganado` : `Sello del módulo ${number ?? index + 1}, pendiente`)}>
      <ModuleMotif index={index} />
    </span>
  );
}
