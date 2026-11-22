import { useState } from "react";
import type { ContentPack, Unit } from "../content/load";
import type { Item } from "../generated/item";
import { placeUnits } from "../state/progress";
import { kindOf, recognitionItems } from "../state/steps";
import type { Store } from "../state/store";
import { estimateSeconds, formatDuration, loadSamples } from "../state/timing";
import { fromItems, ItemRunner } from "./ItemRunner";

export const PLACEMENT_PER_UNIT = 3;

/** Ítems de ubicación: 3 por unidad, tomados de las oraciones reservadas de su prueba. */
export function placementPlan(units: Unit[], pack: ContentPack): { unit: Unit; items: Item[] }[] {
  return units.map((unit) => ({ unit, items: recognitionItems(unit, pack).filter((i) => i.type === "choice_l1_distractor").slice(0, PLACEMENT_PER_UNIT) }));
}

export const STOP_AFTER_MISSES = 2;
/** La prueba es adaptativa: se detiene cuando fallas dos unidades seguidas (no hace falta seguir preguntando lo que aún no sabes). */
export const shouldStop = (mastered: boolean[]): boolean => mastered.length >= STOP_AFTER_MISSES && mastered.slice(-STOP_AFTER_MISSES).every((m) => !m);

export function PlacementScreen({ pack, store, units }: { pack: ContentPack; store: Store; units: Unit[] }) {
  const plan = placementPlan(units, pack).filter((p) => p.items.length === PLACEMENT_PER_UNIT); // solo unidades que se pueden evaluar
  const samples = loadSamples();
  const total = plan.reduce((s, p) => s + p.items.reduce((a, i) => a + estimateSeconds(kindOf(i), samples), 0), 0);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [result, setResult] = useState<{ mastered: Unit[]; start?: Unit } | null>(null);

  const finish = async (all: boolean[]) => {
    const mastered = plan.filter((_, i) => all[i]).map((p) => p.unit);
    await placeUnits(store, mastered, new Date());
    const done = new Set(mastered.map((u) => u.id));
    setResult({ mastered, start: units.find((u) => !done.has(u.id)) });
  };

  if (result) {
    return (
      <main>
        <h1>Tu punto de partida</h1>
        {result.mastered.length ? (
          <>
            <p>Ya dominas {result.mastered.length} {result.mastered.length === 1 ? "unidad" : "unidades"}; quedaron completadas y volverán en tus repasos:</p>
            <ul>{result.mastered.map((u) => <li key={u.id}>{u.title}</li>)}</ul>
          </>
        ) : <p>Ninguna unidad salió dominada: empiezas desde el principio, que es lo normal.</p>}
        {result.start && <p>Empiezas en: <strong>{result.start.level} · {result.start.title}</strong>.</p>}
        <p><small>Esto mide solo lo que enseña esta app (errores típicos de hispanohablantes, presente, sonidos…). No es tu nivel CEFR: para eso usa un test externo.</small></p>
        <div className="actions-bottom"><a className="button primary block" href="#/ruta">Ver mi ruta</a></div>
      </main>
    );
  }
  if (!started) {
    return (
      <main>
        <h1>Prueba de ubicación</h1>
        <p>Preguntas de 3 en 3 por unidad, en el orden de la ruta. Si aciertas las 3, la unidad se marca como dominada y la saltas. Se detiene sola cuando fallas dos unidades seguidas: si empiezas de cero, dura un par de minutos; el máximo es ≈{formatDuration(total)}. Si dudas, responde lo que te suene mejor.</p>
        <div className="actions-bottom"><button type="button" className="primary block" onClick={() => setStarted(true)}>Empezar</button></div>
      </main>
    );
  }
  const cur = plan[idx];
  return (
    <main className="focus">
      <p className="runner-meta">Unidad {idx + 1} de {plan.length} · {cur.unit.level}</p>
      <ItemRunner key={cur.unit.id} items={fromItems(cur.items)} exitHref="#/" onFinish={(r) => {
        const next = [...flags, r.answers.every(Boolean)];
        setFlags(next);
        if (shouldStop(next) || idx + 1 >= plan.length) void finish(next);
        else setIdx(idx + 1);
      }} />
    </main>
  );
}
