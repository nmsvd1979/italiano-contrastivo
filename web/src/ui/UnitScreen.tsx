import type { ContentPack } from "../content/load";
import { canDoStep, STEP_LABEL, STEP_PURPOSE, STEPS, type UnitView } from "../state/course";
import { stepSeconds } from "../state/steps";
import { formatDuration, loadSamples } from "../state/timing";

export function UnitScreen({ view, pack }: { view: UnitView; pack: ContentPack }) {
  const { unit, progress } = view;
  const samples = loadSamples();
  const total = STEPS.reduce((t, s) => t + stepSeconds(unit, s, pack, samples), 0);
  return (
    <main>
      <p><a href="#/ruta" style={{ textDecoration: "none" }}>← Ruta</a></p>
      <p><small>{unit.level} · Unidad {view.index + 1}</small></p>
      <h1 lang="it">{unit.title}</h1>
      <p>{unit.goal_es}</p>
      <p><small>Por qué aquí: {unit.why_here} Unidad completa: {formatDuration(total)} repartidos en 5 pasos que puedes hacer en días distintos.</small></p>
      {view.state === "locked" && <p role="status">Esta unidad se abre cuando completes la anterior.</p>}
      <ol className="steps">
        {STEPS.map((s) => {
          const done = !!progress.done[s];
          const open = canDoStep(view, s);
          const isNext = view.next === s;
          return (
            <li key={s} data-done={done} data-next={isNext}>
              <strong>{STEP_LABEL[s]}</strong> <small>{formatDuration(stepSeconds(unit, s, pack, samples))}{done ? " · hecho ✓" : ""}</small>
              <br /><small>{STEP_PURPOSE[s]}</small>
              {open && <p><a className={isNext ? "button primary" : "button"} href={`#/unidad/${unit.id}/${s}`}>{done ? "Repetir" : isNext ? "Empezar" : "Hacer"}</a></p>}
            </li>
          );
        })}
      </ol>
      {progress.testBest !== null && <p><small>Mejor nota en la prueba: {Math.round(progress.testBest * 100)} %.</small></p>}
    </main>
  );
}
