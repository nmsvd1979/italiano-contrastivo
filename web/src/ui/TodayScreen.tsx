import { STEP_LABEL } from "../state/course";
import type { SessionBlock } from "../state/dayplan";
import { MODULE_STEP_LABEL } from "../state/modules";
import type { TodayPlan } from "../state/session";
import type { DayProgress } from "../state/store";
import type { Seconds } from "../state/strands";
import { totalSeconds } from "../state/strands";
import { DAILY_MIN_SECONDS } from "../state/targets";
import { Icon } from "./kit/Icon";
import { ModuleStrip } from "./kit/ModuleStrip";
import { Tag } from "./kit/Tag";
import { WeekBar } from "./kit/WeekBar";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export type Streak = { streak: number; studiedToday: boolean; protectorUsed: boolean };

/** Qué hace «Continuar»: primero el repaso si hay tarjetas vencidas, luego el refuerzo si toca y, si no, el siguiente paso de tu unidad. */
export function nextAction(plan: TodayPlan, refuerzoPending = false): { href: string; label: string } {
  const pending = plan.review.due + plan.review.newAvailable;
  if (plan.review.due > 0) return { href: "#/repaso", label: "Repaso" };
  if (refuerzoPending) return { href: "#/debiles", label: "Refuerzo" };
  if (plan.unit) return { href: `#/unidad/${plan.unit.view.unit.id}/${plan.unit.step}`, label: STEP_LABEL[plan.unit.step] };
  if (plan.module) return { href: `#/modulo/${plan.module.view.module.id}/${plan.module.step}`, label: MODULE_STEP_LABEL[plan.module.step] };
  if (plan.milestone && !plan.milestone.passed) return { href: `#/hito/${plan.milestone.level}`, label: `Examen de hito ${plan.milestone.level}` };
  if (pending + plan.review.filler > 0) return { href: "#/repaso", label: "Repaso" };
  return { href: "#/ruta", label: "Ver la ruta" };
}

/** Referencia diaria: los minutos de estudio activo de hoy frente a los 15 de guía. No bloquea nada. */
function DailyMinimum({ day }: { day: DayProgress }) {
  const total = totalSeconds(day.seconds ?? {});
  const mins = Math.floor(total / 60);
  const met = total >= DAILY_MIN_SECONDS;
  return (
    <section className="daily" aria-label="Referencia diaria">
      <div className="top"><span>{met ? `Hoy llevas ${mins} min` : `Hoy llevas ${mins} de ${DAILY_MIN_SECONDS / 60} min`}</span><small>referencia diaria</small></div>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={DAILY_MIN_SECONDS / 60} aria-valuenow={Math.min(mins, DAILY_MIN_SECONDS / 60)} aria-label="Minutos de estudio de hoy"><i style={{ width: `${Math.min(100, (total / DAILY_MIN_SECONDS) * 100)}%` }} /></div>
      <small>{met ? "Mínimo de hoy cumplido. Puedes seguir." : "Es solo una guía: el plan sigue aunque pases de 15 min."}</small>
    </section>
  );
}

export function TodayScreen({ plan, day, storeError, firstTime, streak, blocks, week }: { plan: TodayPlan; day: DayProgress; storeError?: string | null; firstTime?: boolean; streak?: Streak; blocks?: SessionBlock[]; week?: Seconds }) {
  const pending = plan.review.due + plan.review.newAvailable;
  const { unit, route } = plan;
  const refuerzoPending = !!blocks?.some((b) => b.href === "#/debiles" && !b.done);
  const action = nextAction(plan, refuerzoPending);
  const nothingToday = day.reviewsDone === 0 && plan.stepsToday === 0;
  return (
    <main className="today">
      <div className="top">
        <h1>Hoy</h1>
        {streak && streak.streak > 0 && (
          <span className="chip" title={streak.protectorUsed ? "Un día sin estudiar se perdonó (protector semanal)" : undefined}>
            <Icon name="racha" />{plural(streak.streak, "día", "días")}{streak.studiedToday ? "" : " · estudia hoy"}
          </span>
        )}
      </div>
      {storeError && <p role="alert" className="alert">{storeError}</p>}
      {firstTime && (
        <details className="how">
          <summary>Cómo empezar</summary>
          <p>Aquí está tu plan de hoy, en orden: cada módulo es una situación (por ejemplo, presentarte): entras con un texto real, estudias sus cápsulas, hablas y escribes tú, y cierras con una prueba. Solo tienes que seguir las filas; el repaso te devuelve lo aprendido justo antes de olvidarlo. Como referencia, apunta a unos 15 minutos al día. Si ya sabes algo, la <a href="#/ubicacion">prueba de ubicación</a> te deja saltarlo.</p>
        </details>
      )}
      <div className="hero">
        {unit ? (
          <>
            <div className="eyebrow">{plan.place ? `${plan.place.level} · Módulo ${plan.place.module} de ${plan.place.modules}${plan.place.capsule ? ` · Cápsula ${plan.place.capsule} de ${plan.place.capsules}` : ""}` : `${unit.view.unit.level} · Unidad ${unit.view.index + 1} de ${route.total}`}</div>
            <div className="title" lang="it">{unit.view.unit.title}</div>
          </>
        ) : plan.module ? (
          <>
            <div className="eyebrow">{plan.module.view.module.level} · Módulo {plan.module.view.index + 1}{plan.place ? ` de ${plan.place.modules}` : ""}</div>
            <div className="title">{plan.module.view.module.title}</div>
            <p><small>Ahora: {MODULE_STEP_LABEL[plan.module.step]}</small></p>
          </>
        ) : plan.milestone && !plan.milestone.passed ? (
          <>
            <div className="eyebrow">{plan.milestone.level} · Último paso</div>
            <div className="title">Examen de hito {plan.milestone.level}</div>
            <p><small>Completaste los módulos. Ahora la prueba de todo el nivel.</small></p>
          </>
        ) : plan.milestone ? (
          <div className="title">{plan.milestone.level} completo. El siguiente nivel está en construcción. <a href="#/ruta">Ver la ruta</a></div>
        ) : (
          <div className="title">Completaste todas las unidades disponibles. <a href="#/ruta">Ver la ruta</a></div>
        )}
        {plan.place && <ModuleStrip view={plan.place.view} />}
        {blocks && (
          <ul className="blocks">
            {blocks.map((b, i) => (
              <li key={`${b.key}-${b.step ?? "r"}-${i}`} data-done={b.done} data-next={!b.done && blocks.findIndex((x) => !x.done) === i}>
                <span className="mk" aria-hidden="true">{b.done ? "✓" : ""}</span>
                <span className="t"><b>{b.label}</b>{b.subtitle && <small>{b.subtitle}</small>}<Tag strand={b.strand} /></span>
                {b.done && <span className="sr">hecho</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="tally"><small>Hoy llevas {plural(plan.stepsToday, "paso", "pasos")} y {plural(day.reviewsDone, "repaso", "repasos")}.</small></p>
      </div>
      <DailyMinimum day={day} />
      {week && <WeekBar week={week} />}
      <div className="actions-bottom above-tabs">
        <a className="button primary block" href={action.href}>{action.href === "#/ruta" ? action.label : `${nothingToday ? "Empezar" : "Continuar"} · ${action.label}`}</a>
      </div>
    </main>
  );
}
