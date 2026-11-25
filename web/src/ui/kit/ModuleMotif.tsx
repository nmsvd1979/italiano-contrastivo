import type { ReactNode } from "react";

/** Tonos de módulo: seis que rotan (módulo 1 → tono 1, módulo 7 → tono 1 otra vez). Se usa como `data-tone`. */
export const TONE_COUNT = 6;
export const toneOf = (moduleIndex: number): string => String((((moduleIndex % TONE_COUNT) + TONE_COUNT) % TONE_COUNT) + 1);

/** Un dibujo de trazo por módulo (48×48), en el orden de la ruta. Se pintan con `currentColor`. */
const MOTIFS: ReactNode[] = [
  /* 1 Saludar y presentarte */ <><path d="M6 10h22a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H16l-6 5v-5H6a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4z" fill="currentColor" fillOpacity=".16" /><path d="M22 30v2a4 4 0 0 0 4 4h6l6 5v-5h2a4 4 0 0 0 4-4v-8a4 4 0 0 0-4-4h-2" /><path d="M10 18h.01M17 18h.01M24 18h.01" strokeWidth="3.4" /></>,
  /* 2 Dar tus datos */ <><path d="M24 38s13-10 13-20a13 13 0 0 0-26 0c0 10 13 20 13 20z" fill="currentColor" fillOpacity=".16" /><circle cx="24" cy="18" r="4.5" /><path d="M5 44c8-3 14 1 22-1 7-1.5 11-1 16-3" strokeDasharray="2 4" /></>,
  /* 3 La clase y tus cosas */ <><path d="M9 38l3-10L33 7l8 8-21 21z" fill="currentColor" fillOpacity=".16" /><path d="M29 11l8 8" /><path d="M12 28l8 8" /><path d="M9 38l3-10 8 8z" fill="currentColor" /><path d="M6 43h36" /></>,
  /* 4 Tu familia */ <><path d="M6 24 24 8l18 16" /><path d="M12 22v18h24V22" fill="currentColor" fillOpacity=".16" /><path d="M34 14V9h4v9" /><path d="M20 40v-7h8v7" /><path d="M24 31c-3-2-4.5-3.4-4.5-5a2.4 2.4 0 0 1 4.5-1.2 2.4 2.4 0 0 1 4.5 1.2c0 1.6-1.5 3-4.5 5z" fill="currentColor" strokeWidth="1.4" /></>,
  /* 5 Rutina y semana */ <><circle cx="24" cy="26" r="15" fill="currentColor" fillOpacity=".16" /><path d="M24 17v9l6 3.5" /><path d="M8 12a8 8 0 0 1 8-7M40 12a8 8 0 0 0-8-7" /><path d="M12 42l3-4M36 42l-3-4" /></>,
  /* 6 Tiempo libre y planes */ <><rect x="6" y="9" width="36" height="32" rx="5" fill="currentColor" fillOpacity=".16" /><path d="M6 19h36M15 5v8M33 5v8" /><path d="M13 28h8M13 35h8" /><path d="M32 25.5l1.7 3.6 3.9.5-2.9 2.7.8 3.9-3.5-2-3.5 2 .8-3.9-2.9-2.7 3.9-.5z" fill="currentColor" strokeWidth="1.2" /></>,
  /* 7 Casa y ciudad */ <><path d="M8 42V16l12-6v32" fill="currentColor" fillOpacity=".16" /><path d="M20 42V22l20 5v15" /><path d="M13 22h.01M13 29h.01M13 36h.01M27 31h.01M33 33h.01M27 38h.01M33 40h.01" strokeWidth="3" /><path d="M4 42h40" /></>,
  /* 8 Comer y beber fuera */ <><path d="M10 16h24v10a12 12 0 0 1-24 0z" fill="currentColor" fillOpacity=".16" /><path d="M34 19h3a5 5 0 0 1 0 10h-3" /><path d="M7 43h30" /><path d="M17 5c-2 2 2 3 0 6M24 5c-2 2 2 3 0 6M31 5c-2 2 2 3 0 6" /></>,
  /* 9 Comprar */ <><path d="M9 16h30l-3 26H12z" fill="currentColor" fillOpacity=".16" /><path d="M17 20v-4a7 7 0 0 1 14 0v4" /><path d="M26 27h9v8l-5 5-9-9z" /><circle cx="31" cy="30.5" r="1" fill="currentColor" /></>,
  /* 10 Cuerpo, salud, tiempo y trabajo */ <><path d="M24 41S6 30 6 18a9 9 0 0 1 18-2 9 9 0 0 1 18 2c0 12-18 23-18 23z" fill="currentColor" fillOpacity=".16" /><path d="M10 24h8l3-6 5 11 3-5h9" /></>,
  /* 11 Contar lo que hiciste */ <><circle cx="24" cy="24" r="16" fill="currentColor" fillOpacity=".16" stroke="none" /><path d="M6 24a18 18 0 1 0 6-13.4L6 16" /><path d="M6 6v10h10" /><path d="M24 14v10l8 4" /></>,
  /* 12 Teléfono, correo y trámites */ <><rect x="5" y="12" width="38" height="26" rx="4" fill="currentColor" fillOpacity=".16" /><path d="m6 15 18 13 18-13" /><rect x="32" y="26" width="8" height="8" rx="1" strokeDasharray="2 2" /></>,
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
