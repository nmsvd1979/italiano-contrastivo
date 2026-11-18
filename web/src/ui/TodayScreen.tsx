import { STEP_LABEL } from "../state/course";
import type { TodayPlan } from "../state/session";
import type { DayProgress } from "../state/store";
import { formatDuration } from "../state/timing";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export type Streak = { streak: number; studiedToday: boolean; protectorUsed: boolean };

/** Qué hace «Continuar»: primero el repaso si hay tarjetas vencidas, si no el siguiente paso de tu unidad. */
export function nextAction(plan: TodayPlan): { href: string; label: string } {
  const pending = plan.review.due + plan.review.newAvailable;
  if (plan.review.due > 0) return { href: "#/repaso", label: `Repaso · ${formatDuration(plan.review.seconds)}` };
  if (plan.unit) return { href: `#/unidad/${plan.unit.view.unit.id}/${plan.unit.step}`, label: `${STEP_LABEL[plan.unit.step]} · ${formatDuration(plan.unit.seconds)}` };
  if (pending > 0) return { href: "#/repaso", label: `Repaso · ${formatDuration(plan.review.seconds)}` };
  return { href: "#/ruta", label: "Ver la ruta" };
}

export function TodayScreen({ plan, day, storeError, firstTime, streak }: { plan: TodayPlan; day: DayProgress; storeError?: string | null; firstTime?: boolean; streak?: Streak }) {
  const pending = plan.review.due + plan.review.newAvailable;
  const { unit, route } = plan;
  const action = nextAction(plan);
  const reviewDone = day.reviewsDone > 0 && pending === 0;
  const unitDone = plan.stepsToday > 0;
  return (
    <main>
      <div className="top">
        <h1>Hoy</h1>
        {streak && streak.streak > 0 && (
          <span className="chip" title={streak.protectorUsed ? "Un día sin estudiar se perdonó (protector semanal)" : undefined}>
            🔥 {plural(streak.streak, "día", "días")}{streak.studiedToday ? "" : " · estudia hoy"}
          </span>
        )}
      </div>
      {storeError && <p role="alert" className="alert">{storeError}</p>}
      {firstTime && (
        <section>
          <h2>Cómo empezar</h2>
          <p>Sigue la ruta: cada unidad trabaja un error típico de quien habla español en 5 pasos cortos. Haz uno o dos al día; el repaso te devuelve lo aprendido justo antes de olvidarlo. Si ya sabes algo, la <a href="#/ubicacion">prueba de ubicación</a> te deja saltarlo.</p>
        </section>
      )}
      <div className="hero">
        {unit ? (
          <>
            <div className="eyebrow">{unit.view.unit.level} · Unidad {unit.view.index + 1} de {route.total}</div>
            <div className="title" lang="it">{unit.view.unit.title}</div>
          </>
        ) : (
          <div className="title">Completaste todas las unidades disponibles. <a href="#/ruta">Ver la ruta</a></div>
        )}
        <div className="bar seg" aria-hidden="true">
          <i style={{ flex: 5, background: reviewDone ? "var(--b1)" : "var(--line)" }} />
          <i style={{ flex: 10, background: unitDone ? "var(--b2)" : "var(--line)" }} />
          <i style={{ flex: 8, background: "var(--line)", opacity: .5 }} />
          <i style={{ flex: 7, background: "var(--line)", opacity: .5 }} />
        </div>
        <ul className="blocks">
          <li data-done={reviewDone} data-next={action.href === "#/repaso"}>
            <span className="dot" style={{ background: "var(--b1)" }} />
            <span className="t"><b>① Repaso</b><small>{pending > 0 ? `Tienes ${pending} para repasar` : "No tienes repasos pendientes ahora."}</small></span>
            <span className="min">{pending > 0 ? formatDuration(plan.review.seconds) : "✓"}</span>
          </li>
          <li data-done={unitDone} data-next={!!unit && action.href.startsWith("#/unidad")}>
            <span className="dot" style={{ background: "var(--b2)" }} />
            <span className="t"><b>② Tu unidad</b><small>{unit ? `${STEP_LABEL[unit.step]} · paso siguiente` : "Sin pasos pendientes"}</small></span>
            <span className="min">{unit ? formatDuration(unit.seconds) : "—"}</span>
          </li>
          <li data-soon="true"><span className="dot" style={{ background: "var(--b3)" }} /><span className="t"><b>③ Sonidos y voz</b><small>Próximamente</small></span><span className="min">8 min</span></li>
          <li data-soon="true"><span className="dot" style={{ background: "var(--b4)" }} /><span className="t"><b>④ Lectura</b><small>Próximamente</small></span><span className="min">7 min</span></li>
        </ul>
        <p><small>Hoy llevas {plural(plan.stepsToday, "paso", "pasos")} y {plural(day.reviewsDone, "repaso", "repasos")}. Cada bloque se puede hacer por separado.</small></p>
      </div>
      <div className="actions-bottom above-tabs">
        <a className="button primary block" href={action.href}>Continuar · {action.label}</a>
      </div>
    </main>
  );
}
