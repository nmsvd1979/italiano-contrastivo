import { canDoSummary } from "../state/cando";
import { fourWeeks } from "../state/calendar";
import type { ModuleView } from "../state/modules";
import type { DayProgress } from "../state/store";
import type { Seconds } from "../state/strands";
import { WeekCard } from "./WeekCard";

const DOW = ["L", "M", "X", "J", "V", "S", "D"];
const LABEL = { probado: "probado", marcado: "marcado por ti", pendiente: "pendiente" } as const;

function total(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 1) return "menos de 1 min";
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

/** «Progreso»: lo que ya sabes hacer (probado o marcado por ti), tu constancia de cuatro semanas y el tiempo real por tipo de práctica. */
export function ProgressScreen({ week, days, today, modules }: { week: Seconds; days: DayProgress[]; today: string; modules: ModuleView[] }) {
  const can = canDoSummary(modules);
  const cal = fourWeeks(days, today);
  return (
    <main>
      <div className="top"><h1>Progreso</h1><a className="tap" href="#/ajustes">Ajustes</a></div>
      {can.total > 0 && (
        <section aria-label="Ya sabes hacer">
          <h2>Ya sabes hacer</h2>
          <p><b>{can.known} de {can.total}</b></p>
          <progress max={can.total} value={can.known} aria-label="«Sé hacer» conseguidos" />
          {can.groups.map((g) => {
            const known = g.items.filter((i) => i.state !== "pendiente").length;
            return (
              <details key={g.moduleId} className="cando-group" open={g.state === "current"}>
                <summary><span>{g.index + 1}. {g.title}</span><small>{known} de {g.items.length}</small></summary>
                <ul className="cando">
                  {g.items.map((i) => (
                    <li key={i.text} data-state={i.state}>
                      <span className="cb" aria-hidden="true">{i.state === "pendiente" ? "" : "✓"}</span>
                      <span>{i.text}{i.state === "pendiente" ? <span className="sr"> · pendiente</span> : <small className="how-known">{LABEL[i.state]}</small>}</span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
          <p><small>«Marcado por ti» es una autoevaluación; «probado» viene de la prueba de cierre del módulo o de la de ubicación. Ninguna es una verificación de un hablante nativo.</small></p>
        </section>
      )}
      <section aria-label="Constancia">
        <h2>Últimas 4 semanas</h2>
        {cal.studiedDays === 0
          ? <p><small>Cuando estudies, aquí verás tu constancia.</small></p>
          : <p><b>{cal.studiedDays} {cal.studiedDays === 1 ? "día" : "días"} de estudio · {total(cal.seconds)} en total</b></p>}
        <div className="cal" aria-hidden="true">
          {DOW.map((l) => <span key={l} className="dow">{l}</span>)}
          {cal.cells.map((c) => <i key={c.date} data-level={c.level} data-future={c.future ? "true" : undefined} />)}
        </div>
      </section>
      <WeekCard week={week} />
      <p><small>Lo que más te cuesta: llegará cuando la app guarde tus aciertos por tipo de error. Hoy no se guardan.</small></p>
      <p><a className="tap" href="#/acerca">Acerca de la app, licencias y revisión del contenido</a></p>
    </main>
  );
}
