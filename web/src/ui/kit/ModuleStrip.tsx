import { MODULE_STEP_LABEL, type ModuleNext, type ModuleView } from "../../state/modules";

export type Stage = { id: ModuleNext; label: string; state: "done" | "current" | "todo" };

/** Las cinco etapas del módulo (Entrada, Cápsulas, Salida, Fluidez, Cierre) con su estado. */
export const stageStates = (view: ModuleView): Stage[] =>
  view.steps.map((s) => ({ id: s.id, label: MODULE_STEP_LABEL[s.id], state: s.done ? "done" : view.next === s.id ? "current" : "todo" }));

/** Tira de etapas: un segmento por etapa (lleno = hecha, a medias = la que toca) y su nombre debajo. */
export function ModuleStrip({ view }: { view: ModuleView }) {
  return (
    <ol className="strip" aria-label="Etapas del módulo">
      {stageStates(view).map((s) => (
        <li key={s.id} data-state={s.state}><i aria-hidden="true" /><span>{s.label}</span></li>
      ))}
    </ol>
  );
}
