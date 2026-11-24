import type { ContentPack } from "../content/load";
import { isOptional, STEP_LABEL, stepsFor, summary, type UnitView } from "../state/course";
import { stepSeconds } from "../state/steps";
import { formatDuration, loadSamples } from "../state/timing";
import { hitoId, milestoneOpen } from "../state/milestone";
import { isPreview } from "../state/preview";
import { MODULE_STEP_LABEL, moduleSummary, type ModuleView } from "../state/modules";
import { ModuleStrip } from "./kit/ModuleStrip";

const ICON = { completed: "✓", current: "▶", locked: "🔒" } as const;

export function RouteScreen({ views, pack, hito, modules = [] }: { views: UnitView[]; pack: ContentPack; hito?: Record<string, { completed: boolean; best: number | null }>; modules?: ModuleView[] }) {
  const { done, total } = summary(views);
  const ms = moduleSummary(modules);
  const samples = loadSamples();
  const byModules = modules.length > 0;
  const hitoRow = (levelId: string) => {
    const doneIds = new Set(views.filter((v) => v.state === "completed").map((v) => v.unit.id));
    const open = byModules ? modules.every((m) => m.state === "completed") || isPreview() : milestoneOpen(pack, doneIds, "A1", isPreview());
    const h = hito?.[hitoId("A1")];
    const state = h?.completed ? "completed" : open ? "current" : "locked";
    return (
      <li key={`hito-${levelId}`} className="mod-row" data-state={state}>
        <span className="n" aria-hidden="true">★</span>
        <span className="label">
          {open ? <a href="#/hito/A1"><strong>Examen de hito A1</strong></a> : <strong>Examen de hito A1</strong>}
          <small>{h?.completed ? `Aprobado${h.best !== null ? ` (${Math.round(h.best * 100)} %)` : ""}` : open ? "Listo: 40 preguntas de todo A1" : "Se abre al completar todos los módulos de A1"}</small>
        </span>
      </li>
    );
  };
  const moduleRow = (m: ModuleView) => {
    if (m.state === "current") {
      const title = `${m.index + 1}. ${m.module.title}`;
      return (
        <li key={m.module.id} className="mod-card" data-state="current">
          <a href={`#/modulo/${m.module.id}`}><strong>{title}</strong></a>
          <small>{m.module.can_do_es[0]}</small>
          <ModuleStrip view={m} />
          <a className="button primary block" href={m.next && m.next !== "capsulas" ? `#/modulo/${m.module.id}/${m.next}` : `#/modulo/${m.module.id}`}>Continuar · {m.next ? MODULE_STEP_LABEL[m.next] : "Ver el módulo"}</a>
        </li>
      );
    }
    return (
      <li key={m.module.id} className="mod-row" data-state={m.state}>
        <span className="n" aria-hidden="true">{m.state === "completed" ? "✓" : m.index + 1}</span>
        <span className="label">
          {m.state === "locked" ? <strong>{m.module.title}</strong> : <a href={`#/modulo/${m.module.id}`}><strong>{m.module.title}</strong></a>}
          <small>{m.state === "completed" ? `Completado${m.byPlacement ? " (por la prueba de ubicación)" : ""}` : m.module.can_do_es[0]}</small>
        </span>
      </li>
    );
  };
  return (
    <main>
      <h1>Ruta</h1>
      {byModules
        ? <p><b>{ms.done} de {ms.total} módulos completados</b> <small>({done} de {total} cápsulas)</small></p>
        : <p>{done} de {total} unidades completadas. Cada unidad tiene varios pasos; la siguiente se abre cuando apruebas la prueba (80 % o más).</p>}
      <progress max={byModules ? ms.total : total} value={byModules ? ms.done : done} aria-label={byModules ? "Módulos completados" : "Unidades completadas"} />
      {pack.course.levels.map((level) => {
        const units = views.filter((v) => v.unit.level === level.id);
        const planned = pack.course.planned.filter((p) => p.level === level.id);
        if (!units.length && !planned.length) return null;
        const hours = (
          <small>
            En la app hoy: {units.length} {units.length === 1 ? "unidad" : "unidades"}
            {units.length ? ` (${formatDuration(units.reduce((t, v) => t + stepsFor(v.unit).reduce((a, s) => a + stepSeconds(v.unit, s, pack, samples), 0), 0))} de pasos según tiempos supuestos que se ajustan a los tuyos; sin contar repasos)` : ""}.
            Referencia general (blogs de academias, no un dato medido) para llegar al nivel: {level.guided_hours}.
          </small>
        );
        const plannedRows = planned.map((p) => (
          <li key={p.title} className="mod-row" data-state="planned">
            <span className="n" aria-hidden="true">·</span>
            <span className="label"><strong>{p.title}</strong> <small>(próximamente)</small><small>{p.reason}</small></span>
          </li>
        ));
        if (level.id === "A1" && byModules) {
          return (
            <section key={level.id} className="route-level">
              <h2>{level.title}</h2>
              <ul className="mod-list">
                {modules.map(moduleRow)}
                {units.length > 0 && hitoRow(level.id)}
                {plannedRows}
              </ul>
            </section>
          );
        }
        return (
          <section key={level.id}>
            <div className="level-head"><h2>{level.title}</h2></div>
            <p>{hours}</p>
            <ul className="path">
              {units.map((v) => (
                <li key={v.unit.id} data-state={v.state}>
                  <span className="node" aria-hidden="true">{ICON[v.state]}</span>
                  <span className="label">
                  {v.state === "locked" ? <strong>{v.unit.title}</strong> : <a href={`#/unidad/${v.unit.id}`}><strong>{v.unit.title}</strong></a>}
                  <small>
                    {v.state === "completed" ? `Completada${v.progress.mastery === "ubicacion" ? " (por la prueba de ubicación)" : ""}`
                      : v.state === "current" ? `${isOptional(v.unit) ? "Opcional, empieza cuando quieras" : "Siguiente"}: ${STEP_LABEL[v.next ?? "descubre"]} (${formatDuration(stepSeconds(v.unit, v.next ?? "descubre", pack, samples))}) · ${stepsFor(v.unit).filter((s) => v.progress.done[s]).length} de ${stepsFor(v.unit).length} pasos`
                      : isOptional(v.unit) ? "Opcional: se abre al completar la anterior de este bloque" : "Se abre al completar la anterior"}
                  </small>
                  </span>
                </li>
              ))}
              {level.id === "A1" && units.length > 0 && (() => {
                const doneIds = new Set(views.filter((v) => v.state === "completed").map((v) => v.unit.id));
                const open = milestoneOpen(pack, doneIds, "A1", isPreview());
                const h = hito?.[hitoId("A1")];
                return (
                  <li data-state={h?.completed ? "completed" : open ? "current" : "locked"}>
                    <span className="node" aria-hidden="true">{h?.completed ? "★" : open ? "★" : "🔒"}</span>
                    <span className="label">
                      {open ? <a href="#/hito/A1"><strong>Examen de hito A1</strong></a> : <strong>Examen de hito A1</strong>}
                      <small>{h?.completed ? `Aprobado${h.best !== null ? ` (${Math.round(h.best * 100)} %)` : ""}` : open ? "Listo: 40 preguntas de todo A1" : "Se abre al completar todos los módulos de A1"}</small>
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
      {byModules && (
        <details className="how">
          <summary>Cómo funciona</summary>
          <p>Cada módulo es una situación: entras con un texto real, estudias sus cápsulas, produces tú (hablas y escribes), ganas fluidez y cierras con una prueba (80 % o más).</p>
          {pack.course.levels.map((level) => {
            const units = views.filter((v) => v.unit.level === level.id);
            if (!units.length) return null;
            return (
              <p key={level.id}><small>
                {level.title}. En la app hoy: {units.length} {units.length === 1 ? "unidad" : "unidades"}
                {` (${formatDuration(units.reduce((t, v) => t + stepsFor(v.unit).reduce((a, st) => a + stepSeconds(v.unit, st, pack, samples), 0), 0))} de pasos según tiempos supuestos que se ajustan a los tuyos; sin contar repasos)`}.
                Referencia general (blogs de academias, no un dato medido) para llegar al nivel: {level.guided_hours}.
              </small></p>
            );
          })}
        </details>
      )}
    </main>
  );
}
