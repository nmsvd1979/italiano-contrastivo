import { useState } from "react";
import type { ContentPack, Unit } from "../content/load";
import type { Item } from "../generated/item";
import { placeUnits } from "../state/progress";
import { kindOf, testItems } from "../state/steps";
import type { Store } from "../state/store";
import { estimateSeconds, formatDuration, loadSamples } from "../state/timing";
import { fromItems, ItemRunner } from "./ItemRunner";

export const PLACEMENT_PER_UNIT = 3;

/** Ítems de ubicación: 3 por unidad, tomados de las oraciones reservadas de su prueba. */
export function placementPlan(units: Unit[], pack: ContentPack): { unit: Unit; items: Item[] }[] {
  return units.map((unit) => ({ unit, items: testItems(unit, pack).filter((i) => i.type === "choice_l1_distractor").slice(0, PLACEMENT_PER_UNIT) }));
}

export function PlacementScreen({ pack, store, units }: { pack: ContentPack; store: Store; units: Unit[] }) {
  const plan = placementPlan(units, pack);
  const flat = plan.flatMap((p) => p.items);
  const samples = loadSamples();
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);
  if (result) {
    return (
      <main>
        <h1>Resultado de la ubicación</h1>
        {result.length ? <><p>Ya dominas estas unidades y quedaron completadas (volverán en tus repasos):</p><ul>{result.map((t) => <li key={t}>{t}</li>)}</ul></>
          : <p>Ninguna unidad salió dominada: empiezas desde el principio, que es lo normal.</p>}
        <p><a className="button" href="#/ruta">Ver mi ruta</a></p>
      </main>
    );
  }
  if (!started) {
    return (
      <main>
        <h1>Prueba de ubicación</h1>
        <p>{flat.length} preguntas, {formatDuration(flat.reduce((s, i) => s + estimateSeconds(kindOf(i), samples), 0))}. Si aciertas las 3 de una unidad, se marca como dominada y la saltas. Si dudas, responde lo que te suene mejor: no pasa nada por fallar.</p>
        <button type="button" onClick={() => setStarted(true)}>Empezar</button>
      </main>
    );
  }
  return (
    <main>
      <h1>Ubicación</h1>
      <ItemRunner items={fromItems(flat)} onFinish={async (r) => {
        let at = 0;
        const mastered: Unit[] = [];
        for (const p of plan) {
          const mine = r.answers.slice(at, at + p.items.length);
          at += p.items.length;
          if (p.items.length === PLACEMENT_PER_UNIT && mine.every(Boolean)) mastered.push(p.unit);
        }
        await placeUnits(store, mastered, new Date());
        setResult(mastered.map((u) => u.title));
      }} />
    </main>
  );
}
