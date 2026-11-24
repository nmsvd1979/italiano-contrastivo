import type { CSSProperties } from "react";
import { canDoStep, STEP_LABEL, stepsFor, type UnitView } from "../../state/course";
import type { StepId } from "../../state/store";

/** Nombres cortos para la tira: igual que los de la unidad salvo la prueba. */
export const STEP_SHORT: Record<StepId, string> = { ...STEP_LABEL, prueba: "Prueba" };
const STATE_TEXT = { done: "hecho", current: "toca ahora", todo: "pendiente" } as const;

export type UnitStepState = { id: StepId; label: string; state: "done" | "current" | "todo"; open: boolean };

/** Estado de cada paso de la unidad: hecho, el que toca ahora o pendiente; `open` si se puede entrar ya. */
export const unitStepStates = (view: UnitView): UnitStepState[] =>
  stepsFor(view.unit).map((id) => ({ id, label: STEP_SHORT[id], state: view.progress.done[id] ? "done" : view.next === id ? "current" : "todo", open: canDoStep(view, id) }));

/** Los pasos de la unidad como tira: los abiertos son enlaces al paso; el estado va también en texto (no solo en color). */
export function UnitStrip({ view }: { view: UnitView }) {
  const steps = unitStepStates(view);
  const cols = steps.length <= 5 ? steps.length : Math.ceil(steps.length / 2); // en dos filas iguales cuando son muchos, para que las etiquetas no se partan
  return (
    <ol className="ustrip" aria-label="Pasos de la unidad" style={{ "--cols": cols } as CSSProperties}>
      {steps.map((s) => {
        const inner = <><i aria-hidden="true" /><span>{s.label}<span className="sr"> · {STATE_TEXT[s.state]}</span></span></>;
        return (
          <li key={s.id} data-state={s.state}>
            {s.open ? <a href={`#/unidad/${view.unit.id}/${s.id}`}>{inner}</a> : <div>{inner}</div>}
          </li>
        );
      })}
    </ol>
  );
}
