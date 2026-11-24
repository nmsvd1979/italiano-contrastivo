import type { ContentPack } from "../content/load";
import { canDoStep, STEP_LABEL, stepsFor, type UnitView } from "../state/course";
import { stepSeconds } from "../state/steps";
import { formatDuration, loadSamples } from "../state/timing";
import { ContrastCard, contrastCards } from "./kit/ContrastCard";
import { UnitStrip } from "./kit/UnitStrip";

/** La ficha de una cápsula: sus pasos como tira, el contraste con el español y un solo botón al paso que toca. */
export function UnitScreen({ view, pack }: { view: UnitView; pack: ContentPack }) {
  const { unit, progress } = view;
  const samples = loadSamples();
  const total = stepsFor(unit).reduce((t, s) => t + stepSeconds(unit, s, pack, samples), 0);
  const module = (pack.course.modules ?? []).find((m) => m.units.includes(unit.id));
  const cards = contrastCards(unit, pack);
  const next = view.next && canDoStep(view, view.next) ? view.next : null;
  return (
    <main className="unit">
      <p><a className="tap" href={module ? `#/modulo/${module.id}` : "#/ruta"} style={{ textDecoration: "none" }}>‹ {module ? module.title : "Ruta"}</a></p>
      <p><small>{unit.level} · Unidad {view.index + 1}</small></p>
      <h1 lang="it">{unit.title}</h1>
      <p>{unit.goal_es}</p>
      {view.state === "locked" && <p role="status">Esta unidad se abre cuando completes la anterior.</p>}
      <UnitStrip view={view} />
      {cards.length > 0 && (
        <section aria-label="Contraste">
          <h2>Contraste</h2>
          {cards.map((c) => <ContrastCard key={c.id} data={c} />)}
        </section>
      )}
      {unit.ficha_es && (
        <details className="ficha" open={progress.done.descubre === undefined}>
          <summary><strong>Ficha de la unidad</strong></summary>
          {unit.ficha_es.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </details>
      )}
      <p><small>Por qué aquí: {unit.why_here} Unidad completa: {formatDuration(total)} repartidos en {stepsFor(unit).length} pasos que puedes hacer en días distintos.</small></p>
      {progress.testBest !== null && <p><small>Mejor nota en la prueba: {Math.round(progress.testBest * 100)} %.</small></p>}
      {next && (
        <div className="actions-bottom above-tabs">
          <a className="button primary block" href={`#/unidad/${unit.id}/${next}`}>Empezar · {STEP_LABEL[next]} · {formatDuration(stepSeconds(unit, next, pack, samples))}</a>
        </div>
      )}
    </main>
  );
}
