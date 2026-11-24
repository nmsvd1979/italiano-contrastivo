import { canDoSummary } from "../state/cando";
import { fourWeeks } from "../state/calendar";
import type { ModuleView } from "../state/modules";
import type { DayProgress } from "../state/store";
import type { Seconds } from "../state/strands";
import type { WeakSpot } from "../state/weak";
import { WeekCard } from "./WeekCard";

const DOW = ["L", "M", "X", "J", "V", "S", "D"];
const LABEL = { completado: "módulo completado (prueba de cierre)", saltado: "módulo saltado por la prueba de ubicación", marcado: "marcado por ti", pendiente: "pendiente" } as const;

function total(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 1) return "menos de 1 min";
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

/** «Progreso»: lo que ya sabes hacer (probado o marcado por ti), tu constancia de cuatro semanas y el tiempo real por tipo de práctica. */
export function ProgressScreen({ week, days, today, modules, weak }: { week: Seconds; days: DayProgress[]; today: string; modules: ModuleView[]; weak: { spots: WeakSpot[]; attempts: number; evaluated: number } }) {
  const can = canDoSummary(modules);
  const cal = fourWeeks(days, today);
  return (
    <main>
      <div className="top"><h1>Progreso</h1><a className="tap" href="#/ajustes">Ajustes</a></div>
      {can.total > 0 && (
        <section aria-label="Ya sabes hacer">
          <h2>Ya sabes hacer</h2>
          <p className="figure"><b aria-hidden="true">{can.known}</b><span aria-hidden="true">de {can.total}</span><span className="sr">{can.known} de {can.total}</span></p>
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
          <p><small>«Marcado por ti» es una autoevaluación. «Módulo completado» viene de la prueba de cierre: hasta 12 frases escritas que no evalúan cada punto ni la pronunciación. «Saltado» viene de la prueba de ubicación, que es de reconocimiento. Ninguna es una verificación de un hablante nativo.</small></p>
        </section>
      )}
      <section aria-label="Lo que más te cuesta">
        <h2>Lo que más te cuesta</h2>
        {weak.spots.length > 0 ? (
          <>
            <ul className="weaklist">
              {weak.spots.map((w) => (
                <li key={w.code}>
                  <span className="t"><b>{w.title}</b><span className="pct">{Math.floor(w.accuracy * 100)} %</span></span>
                  <span className="bar" aria-hidden="true"><i style={{ width: `${Math.floor(w.accuracy * 100)}%` }} /></span>
                  <small>{w.ok} de {w.n} a la primera</small>
                </li>
              ))}
            </ul>
            <p><a className="button primary" href="#/debiles">Practicar esto</a></p>
          </>
        ) : weak.evaluated === 0
          ? <p><small>Todavía no hay datos suficientes: un tema aparece cuando llevas al menos 5 intentos en él.</small></p>
          : <p>Ningún tema por debajo del 80 % en las últimas 3 semanas.</p>}
        <p><small>Cuenta solo tu primer intento en cada ejercicio, de los últimos 21 días.</small></p>
      </section>
      <section aria-label="Constancia">
        <h2>Últimas 4 semanas</h2>
        {cal.studiedDays === 0
          ? <p><small>Cuando estudies, aquí verás tu constancia.</small></p>
          : <p><b>{cal.studiedDays} {cal.studiedDays === 1 ? "día" : "días"} de estudio{cal.seconds > 0 ? ` · ${total(cal.seconds)} en total` : ""}</b></p>}
        <div className="cal" aria-hidden="true">
          {DOW.map((l) => <span key={l} className="dow">{l}</span>)}
          {cal.cells.map((c) => <i key={c.date} data-level={c.level} data-future={c.future ? "true" : undefined} />)}
        </div>
        <p className="cal-key"><span><i aria-hidden="true" />menos de 10 min</span><span><i aria-hidden="true" />10 min o más</span></p>
      </section>
      <WeekCard week={week} />
      <p><a className="tap" href="#/acerca">Acerca de la app, licencias y revisión del contenido</a></p>
    </main>
  );
}
