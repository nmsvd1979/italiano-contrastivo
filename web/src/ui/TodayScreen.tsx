import { STEP_LABEL } from "../state/course";
import type { SessionBlock } from "../state/dayplan";
import { MODULE_STEP_LABEL } from "../state/modules";
import type { TodayPlan } from "../state/session";
import type { DayProgress } from "../state/store";
import type { Seconds } from "../state/strands";
import { formatDuration } from "../state/timing";
import { Tag } from "./kit/Tag";
import { WeekBar } from "./kit/WeekBar";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export type Streak = { streak: number; studiedToday: boolean; protectorUsed: boolean };

/** Qué hace «Continuar»: primero el repaso si hay tarjetas vencidas, si no el siguiente paso de tu unidad. */
export function nextAction(plan: TodayPlan): { href: string; label: string } {
  const pending = plan.review.due + plan.review.newAvailable;
  if (plan.review.due > 0) return { href: "#/repaso", label: `Repaso · ${formatDuration(plan.review.seconds)}` };
  if (plan.unit) return { href: `#/unidad/${plan.unit.view.unit.id}/${plan.unit.step}`, label: `${STEP_LABEL[plan.unit.step]} · ${formatDuration(plan.unit.seconds)}` };
  if (plan.module) return { href: `#/modulo/${plan.module.view.module.id}/${plan.module.step}`, label: `${MODULE_STEP_LABEL[plan.module.step]} · ${formatDuration(plan.module.seconds)}` };
  if (pending + plan.review.filler > 0) return { href: "#/repaso", label: `Repaso · ${formatDuration(plan.review.seconds)}` };
  return { href: "#/ruta", label: "Ver la ruta" };
}

const SHORT_SECONDS = 5 * 60;
/** Lo que se puede abrir ya: el repaso y el paso actual de la unidad o del módulo (los pasos siguientes siguen bloqueados). */
function openableHrefs(plan: TodayPlan): Set<string> {
  const hrefs = new Set(["#/repaso"]);
  if (plan.unit) hrefs.add(`#/unidad/${plan.unit.view.unit.id}/${plan.unit.step}`);
  if (plan.module) hrefs.add(`#/modulo/${plan.module.view.module.id}/${plan.module.step}`);
  return hrefs;
}
/** Salidas de «Hoy»: «Solo N min» (el bloque abrible más corto de hasta 5 min, si no es el principal) y «Elegir otra cosa». */
export function secondaryActions(plan: TodayPlan, blocks: SessionBlock[] | undefined, primaryHref: string): { short: { href: string; label: string } | null; other: { href: string; label: string } } {
  const openable = openableHrefs(plan);
  const candidates = (blocks ?? []).filter((b) => !b.done && b.seconds <= SHORT_SECONDS && b.href !== primaryHref && openable.has(b.href)).sort((x, y) => x.seconds - y.seconds);
  const first = candidates[0];
  return {
    short: first ? { href: first.href, label: `Solo ${Math.ceil(first.seconds / 60)} min` } : null,
    other: { href: "#/practicar", label: "Elegir otra cosa" },
  };
}

export function TodayScreen({ plan, day, storeError, firstTime, streak, blocks, week }: { plan: TodayPlan; day: DayProgress; storeError?: string | null; firstTime?: boolean; streak?: Streak; blocks?: SessionBlock[]; week?: Seconds }) {
  const pending = plan.review.due + plan.review.newAvailable;
  const { unit, route } = plan;
  const action = nextAction(plan);
  const nothingToday = day.reviewsDone === 0 && plan.stepsToday === 0;
  const extra = secondaryActions(plan, blocks, action.href);
  const reviewDone = day.reviewsDone > 0 && pending === 0;
  const unitDone = plan.stepsToday > 0;
  return (
    <main className="today">
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
        <details className="how">
          <summary>Cómo empezar</summary>
          <p>Sigue la ruta: cada módulo es una situación (por ejemplo, presentarte): entras con un texto real, estudias sus cápsulas, hablas y escribes tú, y cierras con una prueba. Haz uno o dos al día; el repaso te devuelve lo aprendido justo antes de olvidarlo. Si ya sabes algo, la <a href="#/ubicacion">prueba de ubicación</a> te deja saltarlo.</p>
        </details>
      )}
      <div className="hero">
        {unit ? (
          <>
            <div className="eyebrow">{unit.view.unit.level} · Unidad {unit.view.index + 1} de {route.total}</div>
            <div className="title" lang="it">{unit.view.unit.title}</div>
          </>
        ) : plan.module ? (
          <>
            <div className="eyebrow">{plan.module.view.module.level} · Módulo {plan.module.view.index + 1}</div>
            <div className="title">{plan.module.view.module.title}</div>
            <p><small>Ahora: {MODULE_STEP_LABEL[plan.module.step]}</small></p>
          </>
        ) : (
          <div className="title">Completaste todas las unidades disponibles. <a href="#/ruta">Ver la ruta</a></div>
        )}
        {blocks && (
          <ul className="blocks">
            {blocks.map((b, i) => (
              <li key={`${b.key}-${b.step ?? "r"}-${i}`} data-done={b.done} data-next={!b.done && blocks.findIndex((x) => !x.done) === i}>
                <Tag strand={b.strand} />
                <span className="t"><b>{b.label}</b>{b.subtitle && <small>{b.subtitle}</small>}</span>
                <span className="min">{b.done ? "✓" : formatDuration(b.seconds)}</span>
              </li>
            ))}
          </ul>
        )}
        <p><small>Hoy llevas {plural(plan.stepsToday, "paso", "pasos")} y {plural(day.reviewsDone, "repaso", "repasos")}. Cada bloque se puede hacer por separado.</small></p>
      </div>
      {week && <WeekBar week={week} />}
      <div className="actions-bottom above-tabs">
        <div className="secondary">
          {extra.short && <a className="button" href={extra.short.href}>{extra.short.label}</a>}
          <a className="button" href={extra.other.href}>{extra.other.label}</a>
        </div>
        <a className="button primary block" href={action.href}>{action.href === "#/ruta" ? action.label : `${nothingToday ? "Empezar" : "Continuar"} · ${action.label}`}</a>
      </div>
    </main>
  );
}
