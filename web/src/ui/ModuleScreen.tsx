import type { ContentPack } from "../content/load";
import { STEP_LABEL, stepsFor } from "../state/course";
import { MODULE_STEP_LABEL, MODULE_STEP_SECONDS, type ModuleNext, type ModuleStepId, type ModuleView, salidaKey, salidaMissing } from "../state/modules";
import { stepSeconds } from "../state/steps";
import type { Strand } from "../state/strands";
import { formatDuration, loadSamples, type Samples } from "../state/timing";
import { Tag } from "./kit/Tag";

const STRAND_OF: Record<ModuleNext, Strand> = { entrada: "entrada", capsulas: "foco", salida: "salida", fluidez: "fluidez", cierre: "salida" };
const STATE_TEXT = { done: "hecho", current: "toca ahora", todo: "pendiente" } as const;

/** Qué hace el botón fijo del módulo: ir directo al paso que toca (el de la cápsula en curso, o el propio del módulo). Null si no hay nada que hacer ahora. */
export function moduleAction(view: ModuleView, pack: ContentPack, samples: Samples = {}): { href: string; label: string } | null {
  if (view.state !== "current" || !view.next) return null;
  if (view.next === "capsulas") {
    const u = view.units.find((x) => x.state === "current" && x.next);
    if (!u || !u.next) return null;
    return { href: `#/unidad/${u.unit.id}/${u.next}`, label: `${STEP_LABEL[u.next]} · ${formatDuration(stepSeconds(u.unit, u.next, pack, samples))}` };
  }
  return { href: `#/modulo/${view.module.id}/${view.next}`, label: `${MODULE_STEP_LABEL[view.next]} · ${formatDuration(MODULE_STEP_SECONDS[view.next as ModuleStepId])}` };
}

/** Un módulo: lo que sabrás hacer y sus cinco etapas (Entrada, Cápsulas, Salida, Fluidez, Cierre) como línea de tiempo. */
export function ModuleScreen({ view, pack }: { view: ModuleView; pack: ContentPack }) {
  const { module } = view;
  const samples = loadSamples();
  const entry = (pack.readings ?? []).find((r) => r.id === module.entry_reading);
  const action = moduleAction(view, pack, samples);
  const part = (k: "habla" | "escritura") => !!view.progress.done[salidaKey(k)];
  const capsulesDone = view.units.filter((u) => u.progress.completed).length;
  return (
    <main className="module">
      <p><a className="tap" href="#/ruta" style={{ textDecoration: "none" }}>‹ Ruta</a></p>
      <p><small>{module.level} · Módulo {view.index + 1}</small></p>
      <h1>{module.title}</h1>
      {view.state === "locked" && <p role="status">Este módulo se abre cuando completes el anterior.</p>}
      <ol className="tl" aria-label="Etapas del módulo">
        {view.steps.map((s) => {
          const state = s.done ? "done" : view.next === s.id ? "current" : "todo";
          const secs = s.id === "capsulas" ? 0 : MODULE_STEP_SECONDS[s.id as ModuleStepId];
          const head = (
            <span className="h">
              <b>{MODULE_STEP_LABEL[s.id]}<span className="sr"> · {STATE_TEXT[state]}</span></b>
              <Tag strand={STRAND_OF[s.id]} />
            </span>
          );
          return (
            <li key={s.id} className="st" data-state={state}>
              <span className="dot" aria-hidden="true">{state === "done" ? "✓" : ""}</span>
              <div className="body">
                {s.id !== "capsulas" && s.open
                  ? <a className="row" href={`#/modulo/${module.id}/${s.id}`}>{head}</a>
                  : <div className="row">{head}</div>}
                <small>{s.id === "capsulas" ? `${capsulesDone} de ${view.units.length} cápsulas` : formatDuration(secs)}{s.done && s.id !== "capsulas" ? " · repetir" : ""}</small>
                {s.id === "entrada" && entry && <small lang="it">Texto: «{entry.title}»</small>}
                {s.id === "salida" && !s.done && (
                  <small>{salidaMissing(module, view.progress).length === 0 ? "Listo." : `Falta: ${salidaMissing(module, view.progress).map((k) => (k === "habla" ? "una práctica hablada" : "un mensaje escrito tuyo")).join(" y ")}.`}
                    {part("habla") ? " Hablada ✓." : ""}{part("escritura") ? " Escrita ✓." : ""}</small>
                )}
                {s.id === "capsulas" && (
                  <ul className="caps">
                    {view.units.map((u) => {
                      const steps = stepsFor(u.unit);
                      const doneSteps = steps.filter((st) => u.progress.done[st]).length;
                      const isNow = u.state === "current" && !!u.next;
                      return (
                        <li key={u.unit.id} data-state={u.state}>
                          {u.state === "locked"
                            ? <span className="cap-title">{u.unit.title}</span>
                            : <a className="cap-title" href={isNow ? `#/unidad/${u.unit.id}/${u.next}` : `#/unidad/${u.unit.id}`}>{u.unit.title}</a>}
                          <span className="pips" role="img" aria-label={u.state === "completed" ? "Completada" : `${doneSteps} de ${steps.length} pasos hechos`}>
                            {steps.map((st) => <i key={st} className={u.progress.done[st] || u.state === "completed" ? "d" : ""} />)}
                          </span>
                          {isNow && <a className="tap" href={`#/unidad/${u.unit.id}`}>Ficha</a>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {module.gap_es && <p className="note"><small>⚠ Lo que le falta a este módulo: {module.gap_es}</small></p>}
      <details className="how">
        <summary>Al terminar sabrás</summary>
        <ul>{module.can_do_es.map((c) => <li key={c}>{c}</li>)}</ul>
      </details>
      {(module.extra_readings ?? []).length > 0 && (
        <details className="how" aria-label="Textos reales para leer">
          <summary>Textos para leer (opcional)</summary>
          <p><small>Documentos y mensajes como los que verás de verdad. Léelos sin traducción y responde las preguntas.</small></p>
          <ul>
            {module.extra_readings!.map((id) => {
              const r = (pack.readings ?? []).find((x) => x.id === id);
              return r ? <li key={id}><a href={`#/modulo/${module.id}/texto/${id}`} lang="it">{r.title}</a>{r.authored ? <small> · escrito por la IA</small> : null}</li> : null;
            })}
          </ul>
        </details>
      )}
      {view.progress.testBest !== null && <p><small>Mejor nota en la prueba de cierre: {Math.round(view.progress.testBest * 100)} %.</small></p>}
      {action && (
        <div className="actions-bottom above-tabs">
          <a className="button primary block" href={action.href}>Continuar · {action.label}</a>
        </div>
      )}
    </main>
  );
}

export type { ModuleNext };
