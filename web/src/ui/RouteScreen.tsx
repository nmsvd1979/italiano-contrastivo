import type { ContentPack } from "../content/load";
import { STEP_LABEL, STEPS, summary, type UnitView } from "../state/course";
import { stepSeconds } from "../state/steps";
import { STEPS as ALL_STEPS } from "../state/course";
import { formatDuration, loadSamples } from "../state/timing";
import { hitoId, milestoneOpen } from "../state/milestone";
import { isPreview } from "../state/preview";

const ICON = { completed: "✓", current: "▶", locked: "🔒" } as const;

export function RouteScreen({ views, pack, hito }: { views: UnitView[]; pack: ContentPack; hito?: Record<string, { completed: boolean; best: number | null }> }) {
  const { done, total } = summary(views);
  const samples = loadSamples();
  return (
    <main>
      <h1>Tu ruta</h1>
      <p>{done} de {total} unidades completadas. Cada unidad son 5 pasos; la siguiente se abre cuando apruebas la prueba (80 % o más).</p>
      <progress max={total} value={done} aria-label="Unidades completadas" />
      {pack.course.levels.map((level) => {
        const units = views.filter((v) => v.unit.level === level.id);
        const planned = pack.course.planned.filter((p) => p.level === level.id);
        if (!units.length && !planned.length) return null;
        return (
          <section key={level.id}>
            <div className="level-head"><h2>{level.title}</h2></div>
            <p><small>
              En la app hoy: {units.length} {units.length === 1 ? "unidad" : "unidades"}
              {units.length ? ` (${formatDuration(units.reduce((t, v) => t + ALL_STEPS.reduce((a, s) => a + stepSeconds(v.unit, s, pack, samples), 0), 0))} de pasos, sin contar repasos)` : ""}.
              Referencia de las fuentes para llegar al nivel: {level.guided_hours}.
            </small></p>
            <ul className="path">
              {units.map((v) => (
                <li key={v.unit.id} data-state={v.state}>
                  <span className="node" aria-hidden="true">{ICON[v.state]}</span>
                  <span className="label">
                  {v.state === "locked" ? <strong>{v.unit.title}</strong> : <a href={`#/unidad/${v.unit.id}`}><strong>{v.unit.title}</strong></a>}
                  <small>
                    {v.state === "completed" ? `Completada${v.progress.mastery === "ubicacion" ? " (por la prueba de ubicación)" : ""}`
                      : v.state === "current" ? `Siguiente: ${STEP_LABEL[v.next ?? "descubre"]} (${formatDuration(stepSeconds(v.unit, v.next ?? "descubre", pack, samples))}) · ${STEPS.filter((s) => v.progress.done[s]).length} de 5 pasos`
                      : "Se abre al completar la anterior"}
                  </small>
                  </span>
                </li>
              ))}
              {level.id === "A1" && units.length > 0 && (() => {
                const done = new Set(views.filter((v) => v.state === "completed").map((v) => v.unit.id));
                const open = milestoneOpen(pack, done, "A1", isPreview());
                const h = hito?.[hitoId("A1")];
                return (
                  <li data-state={h?.completed ? "completed" : open ? "current" : "locked"}>
                    <span className="node" aria-hidden="true">{h?.completed ? "★" : open ? "★" : "🔒"}</span>
                    <span className="label">
                      {open ? <a href="#/hito/A1"><strong>Examen de hito A1</strong></a> : <strong>Examen de hito A1</strong>}
                      <small>{h?.completed ? `Aprobado${h.best !== null ? ` (${Math.round(h.best * 100)} %)` : ""}` : open ? "Listo: 40 preguntas de todo A1" : "Se abre al completar todas las unidades de A1"}</small>
                    </span>
                  </li>
                );
              })()}
              {planned.map((p) => (
                <li key={p.title} data-state="planned">
                  <span className="node" aria-hidden="true">⋯</span>
                  <span className="label"><strong>{p.title}</strong> <small>(próximamente)</small><small>{p.reason}</small></span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
