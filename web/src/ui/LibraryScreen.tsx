import { useEffect, useState } from "react";
import type { ContentPack, Resource, ResourceKind } from "../content/load";
import { currentView } from "../state/course";
import { moduleViews } from "../state/modules";
import { KIND_LABEL, kindsIn, LANG_LABEL, LEVEL_FILTERS, type LevelFilter, pick } from "../state/library";
import { addDaySeconds, STRAND_LABEL } from "../state/strands";
import type { Store } from "../state/store";

const MINUTES = [5, 10, 20, 30];

/**
 * Biblioteca: recursos externos verificados, por nivel, con una tarea concreta de 10 minutos cada uno. La app enseña la lengua, pero
 * entender y la fluidez salen sobre todo de exponerte a italiano real; lo que hagas fuera se registra aquí y suma a «Tu semana».
 */
export function LibraryScreen({ pack, store }: { pack: ContentPack; store: Store }) {
  const library = pack.library ?? [];
  const [level, setLevel] = useState<LevelFilter>("A1");
  const [kind, setKind] = useState<ResourceKind | "todos">("todos");
  const [logged, setLogged] = useState<Record<string, number>>({});
  useEffect(() => { // por defecto, el nivel de la unidad en la que vas
    store.allUnits().then((u) => {
      const cur = currentView(moduleViews(pack.course, u).units)?.unit.level.replace("+", "") as LevelFilter | undefined;
      if (cur && LEVEL_FILTERS.includes(cur)) setLevel(cur);
    }).catch(() => undefined);
  }, [pack, store]);

  const log = async (r: Resource, minutes: number) => {
    await addDaySeconds(store, r.strand, minutes * 60);
    setLogged((l) => ({ ...l, [r.id]: (l[r.id] ?? 0) + minutes }));
  };
  const items = pick(library, level, kind);
  return (
    <main>
      <h1>Biblioteca</h1>
      <p>Italiano real para oír y leer, con una tarea corta en cada recurso. La app no es dueña de ese contenido ni lo revisó un nativo.</p>
      <details className="how">
        <summary>Cómo usarla</summary>
        <p>La app te enseña la lengua, pero <strong>entender y ganar fluidez</strong> salen sobre todo de oír y leer italiano real. Elige un recurso de tu nivel, haz su tarea de 10 minutos y, lo que hagas fuera, regístralo: suma a «Tu semana».</p>
        <p><small>Los enlaces se verificaron al armar esta lista ({library[0]?.verified ?? "sin fecha"}), pero los sitios cambian.</small></p>
      </details>
      <div role="group" aria-label="Nivel" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
        {LEVEL_FILTERS.map((l) => <button key={l} type="button" aria-pressed={level === l} className={level === l ? "primary" : ""} style={{ minHeight: 36, padding: "4px 12px" }} onClick={() => setLevel(l)}>{l === "todos" ? "Todos" : l}</button>)}
      </div>
      <label htmlFor="lib-kind">Tipo</label>{" "}
      <select id="lib-kind" value={kind} onChange={(e) => setKind(e.target.value as ResourceKind | "todos")}>
        <option value="todos">Todos</option>
        {kindsIn(library).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
      </select>
      {library.length === 0 && <p role="status">Todavía no hay recursos cargados.</p>}
      {library.length > 0 && items.length === 0 && <p role="status">No hay recursos de ese tipo para ese nivel.</p>}
      <ul className="library">
        {items.map((r) => (
          <li key={r.id}>
            <h2><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></h2>
            <p><small>{KIND_LABEL[r.kind]} · {r.cost} · {LANG_LABEL[r.lang]} · {r.levels.join("–")}</small></p>
            <p>{r.note}</p>
            <p><strong>10 minutos:</strong> {r.task}</p>
            {r.warning && <p className="note"><small>⚠ {r.warning}</small></p>}
            <details>
              <summary>Registrar el tiempo que le dediqué</summary>
              <p>{MINUTES.map((m) => <button key={m} type="button" style={{ minHeight: 36, padding: "4px 12px", marginRight: 6 }} onClick={() => void log(r, m)}>{m} min</button>)}</p>
              <p><small>Suma a «{STRAND_LABEL[r.strand]}».</small></p>
            </details>
            {logged[r.id] ? <p role="status"><small>Registrado: {logged[r.id]} min en «{STRAND_LABEL[r.strand]}».</small></p> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
