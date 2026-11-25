import type { ReactNode } from "react";

/** Tonos de módulo: seis que rotan (módulo 1 → tono 1, módulo 7 → tono 1 otra vez). Se usa como `data-tone`. */
export const TONE_COUNT = 6;
export const toneOf = (moduleIndex: number): string => String((((moduleIndex % TONE_COUNT) + TONE_COUNT) % TONE_COUNT) + 1);

/** Un dibujo de trazo por módulo (48×48), en el orden de la ruta. Se pintan con `currentColor`. */
const MOTIFS: ReactNode[] = [
  /* 1 Saludar y presentarte */ <><path d="M6 10h22a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H16l-6 5v-5H6a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4z" /><path d="M22 30v2a4 4 0 0 0 4 4h6l6 5v-5h2a4 4 0 0 0 4-4v-8a4 4 0 0 0-4-4h-2" /></>,
  /* 2 Dar tus datos */ <><path d="M24 44s14-12 14-23a14 14 0 0 0-28 0c0 11 14 23 14 23z" /><circle cx="24" cy="21" r="5" /></>,
  /* 3 La clase y tus cosas */ <><path d="M8 38l4-14 22-16 6 8-22 16z" /><path d="M12 24l8 10" /><path d="M6 42h36" /></>,
  /* 4 Tu familia */ <><path d="M6 24 24 8l18 16" /><path d="M12 22v18h24V22" /><path d="M20 40V30h8v10" /></>,
  /* 5 Rutina y semana */ <><circle cx="24" cy="25" r="16" /><path d="M24 15v10l7 4" /><path d="M16 5l-4 4M32 5l4 4" /></>,
  /* 6 Tiempo libre y planes */ <><rect x="6" y="9" width="36" height="32" rx="5" /><path d="M6 19h36M15 5v8M33 5v8" /><path d="M16 28h4M24 28h4M16 35h4" /></>,
  /* 7 Casa y ciudad */ <><path d="M6 42V18l10-6v30M16 42V8l12 6v28M28 42V22l14 4v16" /><path d="M4 42h40" /></>,
  /* 8 Comer y beber fuera */ <><path d="M10 14h24v12a12 12 0 0 1-24 0z" /><path d="M34 17h3a5 5 0 0 1 0 10h-3" /><path d="M8 42h28" /></>,
  /* 9 Comprar */ <><path d="M9 16h30l-3 26H12z" /><path d="M17 20v-4a7 7 0 0 1 14 0v4" /></>,
  /* 10 Cuerpo, salud, tiempo y trabajo */ <><path d="M24 41S6 30 6 18a9 9 0 0 1 18-2 9 9 0 0 1 18 2c0 12-18 23-18 23z" /></>,
  /* 11 Contar lo que hiciste */ <><path d="M14 10 6 18l8 8" /><path d="M6 18h22a12 12 0 0 1 0 24H16" /></>,
  /* 12 Teléfono, correo y trámites */ <><rect x="5" y="10" width="38" height="28" rx="4" /><path d="m6 13 18 14 18-14" /></>,
];
export const MOTIF_COUNT = MOTIFS.length;

/** Dibujo del módulo (por posición en la ruta, desde 0). Decorativo: el nombre del módulo va al lado, escrito. */
export function ModuleMotif({ index, className = "motif" }: { index: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {MOTIFS[((index % MOTIF_COUNT) + MOTIF_COUNT) % MOTIF_COUNT]}
    </svg>
  );
}
