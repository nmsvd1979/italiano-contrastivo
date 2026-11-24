import type { Seconds } from "../state/strands";
import { WeekCard } from "./WeekCard";

/** «Progreso»: lo medido (hoy, el tiempo real por tipo de práctica); «Ya sabes hacer» llega en la etapa 5 del rediseño. */
export function ProgressScreen({ week }: { week: Seconds }) {
  return (
    <main>
      <div className="top"><h1>Progreso</h1><a className="tap" href="#/ajustes">Ajustes</a></div>
      <WeekCard week={week} />
      <p><a className="tap" href="#/acerca">Acerca de la app, licencias y revisión del contenido</a></p>
    </main>
  );
}
