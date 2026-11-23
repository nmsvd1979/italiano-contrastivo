import type { ContentPack } from "../content/load";
import { STEP_LABEL } from "../state/course";
import { MODULE_STEP_LABEL, MODULE_STEP_PURPOSE, MODULE_STEP_SECONDS, type ModuleNext, type ModuleStepId, type ModuleView, salidaKey, salidaMissing } from "../state/modules";
import { formatDuration } from "../state/timing";

const READY = { done: "✓", open: "▶", locked: "🔒" } as const;

/** Un módulo: lo que sabrás hacer y sus cinco pasos (Entrada, Cápsulas, Salida, Fluidez, Cierre). */
export function ModuleScreen({ view, pack }: { view: ModuleView; pack: ContentPack }) {
  const { module } = view;
  const entry = (pack.readings ?? []).find((r) => r.id === module.entry_reading);
  const part = (k: "habla" | "escritura") => !!view.progress.done[salidaKey(k)];
  return (
    <main>
      <p><a href="#/ruta" style={{ textDecoration: "none" }}>← Ruta</a></p>
      <p><small>{module.level} · Módulo {view.index + 1}</small></p>
      <h1>{module.title}</h1>
      <h2>Al terminar sabrás</h2>
      <ul>{module.can_do_es.map((c) => <li key={c}>{c}</li>)}</ul>
      {module.gap_es && <p className="note"><small>⚠ Lo que le falta a este módulo: {module.gap_es}</small></p>}
      {view.state === "locked" && <p role="status">Este módulo se abre cuando completes el anterior.</p>}
      <ol className="steps">
        {view.steps.map((s) => {
          const status = s.done ? "done" : s.open ? "open" : "locked";
          const isNext = view.next === s.id;
          const secs = s.id === "capsulas" ? 0 : MODULE_STEP_SECONDS[s.id as ModuleStepId];
          return (
            <li key={s.id} data-done={s.done} data-next={isNext}>
              <strong>{READY[status]} {MODULE_STEP_LABEL[s.id]}</strong>{" "}
              <small>{secs ? formatDuration(secs) : `${view.units.filter((u) => u.progress.completed).length} de ${view.units.length} cápsulas`}{s.done && s.id !== "capsulas" ? " · hecho ✓" : ""}</small>
              <br /><small>{MODULE_STEP_PURPOSE[s.id]}</small>
              {s.id === "entrada" && entry && <><br /><small lang="it">Texto: «{entry.title}»</small></>}
              {s.id === "salida" && !s.done && (
                <><br /><small>{salidaMissing(module, view.progress).length === 0 ? "Listo." : `Falta: ${salidaMissing(module, view.progress).map((k) => (k === "habla" ? "una práctica hablada" : "un mensaje escrito tuyo")).join(" y ")}.`}
                  {part("habla") ? " Hablada ✓." : ""}{part("escritura") ? " Escrita ✓." : ""}</small></>
              )}
              {s.id === "capsulas" && (
                <ul className="path" style={{ marginTop: 6 }}>
                  {view.units.map((u) => (
                    <li key={u.unit.id} data-state={u.state}>
                      <span className="node" aria-hidden="true">{u.state === "completed" ? "✓" : u.state === "current" ? "▶" : "🔒"}</span>
                      <span className="label">
                        {u.state === "locked" ? <strong>{u.unit.title}</strong> : <a href={`#/unidad/${u.unit.id}`}><strong>{u.unit.title}</strong></a>}
                        <small>{u.state === "completed" ? "Completada" : u.state === "current" ? `Siguiente: ${STEP_LABEL[u.next ?? "descubre"]}` : "Se abre al completar la anterior"}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {s.id !== "capsulas" && s.open && <p><a className={isNext ? "button primary" : "button"} href={`#/modulo/${module.id}/${s.id}`}>{s.done ? "Repetir" : isNext ? "Empezar" : "Hacer"}</a></p>}
            </li>
          );
        })}
      </ol>
      {(module.extra_readings ?? []).length > 0 && (
        <section aria-label="Textos reales para leer">
          <h2>Textos para leer (opcional)</h2>
          <p><small>Documentos y mensajes como los que verás de verdad. Léelos sin traducción y responde las preguntas.</small></p>
          <ul>
            {module.extra_readings!.map((id) => {
              const r = (pack.readings ?? []).find((x) => x.id === id);
              return r ? <li key={id}><a href={`#/modulo/${module.id}/texto/${id}`} lang="it">{r.title}</a>{r.authored ? <small> · escrito por la IA</small> : null}</li> : null;
            })}
          </ul>
        </section>
      )}
      {view.progress.testBest !== null && <p><small>Mejor nota en la prueba de cierre: {Math.round(view.progress.testBest * 100)} %.</small></p>}
    </main>
  );
}

export type { ModuleNext };
