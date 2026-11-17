import { STEP_LABEL, STEP_PURPOSE } from "../state/course";
import type { TodayPlan } from "../state/session";
import type { DayProgress } from "../state/store";
import { formatDuration } from "../state/timing";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function TodayScreen({ plan, day, storeError, firstTime }: { plan: TodayPlan; day: DayProgress; storeError?: string | null; firstTime?: boolean }) {
  const pending = plan.review.due + plan.review.newAvailable;
  const { unit, route } = plan;
  return (
    <main>
      <h1>Hoy</h1>
      {storeError && <p role="alert" className="alert">{storeError}</p>}
      {firstTime && (
        <section>
          <h2>Cómo empezar</h2>
          <p>Sigue la ruta: cada unidad trabaja un error típico de quien habla español en 5 pasos cortos (descubrir, cápsula, práctica, escucha y prueba). Haz uno o dos pasos al día; el repaso te devuelve lo aprendido justo antes de olvidarlo. Si ya sabes algo, la <a href="#/ubicacion">prueba de ubicación</a> te deja saltarlo.</p>
        </section>
      )}
      <p><small>Ruta: {route.done} de {route.total} unidades · hoy llevas {plural(plan.stepsToday, "paso", "pasos")} y {plural(day.reviewsDone, "repaso", "repasos")}. Todo se puede hacer por partes.</small></p>
      <section>
        <h2>Tu unidad</h2>
        {unit ? (
          <>
            <p><small>{unit.view.unit.level} · Unidad {unit.view.index + 1} de {route.total}</small></p>
            <p><strong>{unit.view.unit.title}</strong></p>
            <p>Siguiente paso: <strong>{STEP_LABEL[unit.step]}</strong> ({formatDuration(unit.seconds)}). <small>{STEP_PURPOSE[unit.step]}</small></p>
            <p><a className="button" href={`#/unidad/${unit.view.unit.id}/${unit.step}`}>Empezar</a> <a className="button" href="#/ruta">Ver la ruta</a></p>
          </>
        ) : (
          <p>Completaste todas las unidades disponibles. Siguen tus repasos; llegan unidades nuevas cuando se validen más oraciones. <a href="#/ruta">Ver la ruta</a></p>
        )}
      </section>
      <section>
        <h2>Repaso</h2>
        {pending > 0 ? (
          <p>Tienes {pending} para repasar ({formatDuration(plan.review.seconds)}). <a className="button" href="#/repaso">Hacer el repaso</a></p>
        ) : (
          <p>No tienes repasos pendientes ahora. Los repasos aparecen cuando completas cápsulas y pasan unos días.</p>
        )}
      </section>
    </main>
  );
}
