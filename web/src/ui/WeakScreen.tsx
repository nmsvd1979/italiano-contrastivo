import { useEffect, useState } from "react";
import type { ContentPack } from "../content/load";
import type { Item } from "../generated/item";
import { localDate, type Store } from "../state/store";
import { weakItems, weakSpots } from "../state/weak";
import { fromItems, ItemRunner, type RunResult } from "./ItemRunner";
import { useStrandTimer } from "./kit/useStrandTimer";

/** Una tanda de hasta 10 ejercicios de los temas que más te cuestan (los de peor precisión en las últimas 3 semanas). */
export function WeakScreen({ pack, store }: { pack: ContentPack; store: Store }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  useStrandTimer(store, "foco", items !== null && items.length > 0 && result === null);
  useEffect(() => {
    store.allDays().then((days) => {
      const today = localDate(new Date());
      setItems(weakItems(weakSpots(days, pack.course, today).spots, pack, today));
    });
  }, [store, pack]);
  if (!items) return <p>Cargando…</p>;
  if (items.length === 0) {
    return <main><p>No tienes puntos débiles ahora: ningún tema con al menos 5 intentos por debajo del 80 % en las últimas 3 semanas.</p><p><a className="button" href="#/practicar">Volver a Practicar</a></p></main>;
  }
  if (result) {
    return (
      <main className="center">
        <h1>Tanda terminada</h1>
        <p>Acertaste {result.correct} de {result.total} a la primera. Cada intento cuenta para saber qué te cuesta menos con el tiempo.</p>
        <div className="actions-bottom" style={{ gap: 10 }}>
          <a className="button primary" style={{ flex: 1 }} href="#/progreso">Ver Progreso</a>
          <a className="button" style={{ flex: 1 }} href="#/practicar">Practicar</a>
        </div>
      </main>
    );
  }
  return <main className="focus"><ItemRunner items={fromItems(items)} requeueWrong exitHref="#/practicar" onFinish={setResult} /></main>;
}
