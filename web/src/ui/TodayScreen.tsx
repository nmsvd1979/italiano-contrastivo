import { STEP_LABEL } from "../state/course";
import type { SessionBlock } from "../state/dayplan";
import { MODULE_STEP_LABEL } from "../state/modules";
import type { TodayPlan } from "../state/session";
import type { DayProgress } from "../state/store";
import type { Seconds } from "../state/strands";
import { totalSeconds } from "../state/strands";
import { DAILY_MIN_SECONDS } from "../state/targets";
import type { ContrastData } from "./kit/ContrastCard";
import { DayRing } from "./kit/DayRing";
import { Icon } from "./kit/Icon";
import { ModuleMotif, toneOf } from "./kit/ModuleMotif";
import { ModuleStrip } from "./kit/ModuleStrip";
import { PathList } from "./kit/PathList";
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

/** Referencia diaria: los minutos de estudio activo de hoy frente a los 15 de guía, en un anillo. No bloquea nada. */
function DailyMinimum({ day }: { day: DayProgress }) {
  const total = totalSeconds(day.seconds ?? {});
  const mins = Math.floor(total / 60);
  const met = total >= DAILY_MIN_SECONDS;
  return (
    <div className="dayrow" role="group" aria-label="Referencia diaria">
      <DayRing seconds={total} goalSeconds={DAILY_MIN_SECONDS} />
      <div className="t">
        <b>{met ? `Hoy llevas ${mins} min` : `Hoy llevas ${mins} de ${DAILY_MIN_SECONDS / 60} min`}</b>
        <small>{met ? "Mínimo de hoy cumplido. Puedes seguir." : "Es solo una guía: el plan sigue aunque pases de 15 min."}</small>
      </div>
    </div>
  );
}

/** `phrase`: un ejemplo real (frase de fuente abierta) de la cápsula de hoy, para abrir la pantalla con el italiano. */
export function TodayScreen({ plan, day, storeError, firstTime, streak, blocks, week, phrase }: { plan: TodayPlan; day: DayProgress; storeError?: string | null; firstTime?: boolean; streak?: Streak; blocks?: SessionBlock[]; week?: Seconds; phrase?: ContrastData }) {
  const pending = plan.review.due + plan.review.newAvailable;
  const { unit, route } = plan;
  const refuerzoPending = !!blocks?.some((b) => b.href === "#/debiles" && !b.done);
  const action = nextAction(plan, refuerzoPending);
  const nothingToday = day.reviewsDone === 0 && plan.stepsToday === 0;
  const moduleIndex = plan.place?.view.index ?? plan.module?.view.index;
  const nowIndex = blocks ? blocks.findIndex((x) => !x.done) : -1;
  return (
    <main className="today" data-tone={moduleIndex === undefined ? undefined : toneOf(moduleIndex)}>
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
        {moduleIndex !== undefined && <ModuleMotif index={moduleIndex} className="motif motif-bg" />}
        {unit ? (
          <>
            <div className="eyebrow">{plan.place ? `${plan.place.level} · Módulo ${plan.place.module} de ${plan.place.modules}${plan.place.capsule ? ` · Cápsula ${plan.place.capsule} de ${plan.place.capsules}` : ""}` : `${unit.view.unit.level} · Unidad ${unit.view.index + 1} de ${route.total}`}</div>
            {phrase ? (
              <>
                <p className="phrase" lang="it" data-long={(phrase.before + phrase.changed + phrase.after).length > 26}>{phrase.before}<mark>{phrase.changed}</mark>{phrase.after}</p>
                <p className="gloss">{phrase.es}</p>
                <p className="unit-title">{unit.view.unit.title}</p>
              </>
            ) : <div className="title" lang="it">{unit.view.unit.title}</div>}
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
      </div>
      <DailyMinimum day={day} />
      {blocks && (
        <PathList items={blocks.map((b, i) => ({ key: `${b.key}-${b.step ?? "r"}-${i}`, label: b.label, subtitle: b.subtitle || undefined, state: b.done ? "done" : i === nowIndex ? "now" : "todo", tag: <Tag strand={b.strand} /> }))} />
      )}
      <p className="tally"><small>Hoy llevas {plural(plan.stepsToday, "paso", "pasos")} y {plural(day.reviewsDone, "repaso", "repasos")}.</small></p>
      {week && <WeekBar week={week} />}
      <div className="actions-bottom above-tabs">
        <a className="button primary block" href={action.href}>{action.href === "#/ruta" ? action.label : `${nothingToday ? "Empezar" : "Continuar"} · ${action.label}`}</a>
      </div>
    </main>
  );
}
