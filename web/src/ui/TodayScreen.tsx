import { STEP_LABEL } from "../state/course";
import { BLOCKS, type SessionBlock } from "../state/dayplan";
import type { TodayPlan } from "../state/session";
import type { DayProgress } from "../state/store";
import type { Seconds } from "../state/strands";
import { formatDuration } from "../state/timing";
import { WeekCard } from "./WeekCard";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export type Streak = { streak: number; studiedToday: boolean; protectorUsed: boolean };

/** Qué hace «Continuar»: primero el repaso si hay tarjetas vencidas, si no el siguiente paso de tu unidad. */
export function nextAction(plan: TodayPlan): { href: string; label: string } {
  const pending = plan.review.due + plan.review.newAvailable;
  if (plan.review.due > 0) return { href: "#/repaso", label: `Repaso · ${formatDuration(plan.review.seconds)}` };
  if (plan.unit) return { href: `#/unidad/${plan.unit.view.unit.id}/${plan.unit.step}`, label: `${STEP_LABEL[plan.unit.step]} · ${formatDuration(plan.unit.seconds)}` };
  if (pending + plan.review.filler > 0) return { href: "#/repaso", label: `Repaso · ${formatDuration(plan.review.seconds)}` };
  return { href: "#/ruta", label: "Ver la ruta" };
}

export function TodayScreen({ plan, day, storeError, firstTime, streak, blocks, week }: { plan: TodayPlan; day: DayProgress; storeError?: string | null; firstTime?: boolean; streak?: Streak; blocks?: SessionBlock[]; week?: Seconds }) {
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
          <p>Sigue la ruta: cada unidad trabaja un punto del italiano en pasos cortos (ver, practicar, escuchar, probar). Haz uno o dos al día; el repaso te devuelve lo aprendido justo antes de olvidarlo. Si ya sabes algo, la <a href="#/ubicacion">prueba de ubicación</a> te deja saltarlo.</p>
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
        {blocks && (
          <>
            <div className="bar seg" aria-hidden="true">
              {blocks.map((b, i) => <i key={i} style={{ flex: Math.max(1, Math.round(b.seconds / 60)), background: b.done ? BLOCKS[b.key].color : "var(--line)" }} />)}
            </div>
            <ul className="blocks">
              {blocks.map((b, i) => (
                <li key={`${b.key}-${b.step ?? "r"}-${i}`} data-done={b.done} data-next={!b.done && blocks.findIndex((x) => !x.done) === i}>
                  <span className="dot" style={{ background: BLOCKS[b.key].color }} />
                  <span className="t"><b>{BLOCKS[b.key].n} {b.title}</b><small>{b.subtitle}</small></span>
                  <span className="min">{b.done ? "✓" : formatDuration(b.seconds)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p><small>Hoy llevas {plural(plan.stepsToday, "paso", "pasos")} y {plural(day.reviewsDone, "repaso", "repasos")}. Cada bloque se puede hacer por separado.</small></p>
      </div>
      {week && <WeekCard week={week} />}
      <div className="actions-bottom above-tabs">
        <a className="button primary block" href={action.href}>Continuar · {action.label}</a>
      </div>
    </main>
  );
}
