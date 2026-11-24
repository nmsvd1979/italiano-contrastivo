const PATHS = {
  hoy: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>,
  ruta: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M8 5h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7" /></>,
  practicar: <path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />,
  biblioteca: <path d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z" />,
  progreso: <path d="M5 20v-6M12 20V5M19 20v-9" />,
  racha: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-1.8.8-3 1.8-4 .2 1.6 1 2.6 2 3 .3-3 .2-6 1.2-9z" />,
  voz: <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
};
export type IconName = keyof typeof PATHS;

/** Iconos de trazo de la barra de pestañas (sin emoji: se ven igual en todos los dispositivos). */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  );
}
