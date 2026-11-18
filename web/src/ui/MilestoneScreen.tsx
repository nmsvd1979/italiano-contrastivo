import { useEffect, useState } from "react";
import type { ContentPack } from "../content/load";
import { HITO, hitoId, milestoneItems, milestoneOpen, milestoneProgress, scoreMilestone } from "../state/milestone";
import { isPreview } from "../state/preview";
import type { Store } from "../state/store";
import { formatDuration, estimateSeconds, loadSamples } from "../state/timing";
import { fromItems, ItemRunner } from "./ItemRunner";
import { Ring } from "./kit/Ring";
import { kindOf } from "../state/steps";

export function MilestoneScreen({ pack, store, level = "A1" }: { pack: ContentPack; store: Store; level?: string }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const [started, setStarted] = useState(false);
  const [res, setRes] = useState<ReturnType<typeof scoreMilestone> | null>(null);
  useEffect(() => {
    store.allUnits().then((u) => setOpen(milestoneOpen(pack, new Set(u.filter((x) => x.completed).map((x) => x.unitId)), level, isPreview())));
  }, [store, pack, level]);
  if (open === null) return <p>Cargando…</p>;
  const { items, parts } = milestoneItems(pack, level);
  if (!open) return <main><h1>Examen de hito {level}</h1><p>Se abre cuando completes todas las unidades de {level}.</p><p><a className="button" href="#/ruta">Ver la ruta</a></p></main>;
  if (res) {
    const pct = (a: number, b: number) => `${a} de ${b}`;
    return (
      <main className="center">
        {res.passed && <Ring />}
        <h1>{res.passed ? `¡Nivel ${level} completado!` : "Todavía no"}</h1>
        <p>Total: {Math.round(res.total * 100)} %. Léxico: {pct(res.lex.correct, res.lex.total)}. Gramática y sonidos: {pct(res.gram.correct, res.gram.total)}.</p>
        <p>{res.passed ? "Cumpliste el criterio de las fuentes: 65 % o más en total y 50 % o más en cada parte." : "Para aprobar hace falta 65 % o más en total y 50 % o más en léxico y en gramática. Repasa las unidades que más te costaron y reintenta cuando quieras."}</p>
        <div className="actions-bottom"><a className="button primary block" href="#/ruta">Ver la ruta</a></div>
      </main>
    );
  }
  if (!started) {
    const secs = items.reduce((s, i) => s + estimateSeconds(kindOf(i), loadSamples()), 0);
    return (
      <main>
        <h1>Examen de hito {level}</h1>
        <p>{items.length} preguntas ({formatDuration(secs)}) con frases de todas las unidades: {Math.round(HITO.A1.lex * 100)} % léxico y {100 - Math.round(HITO.A1.lex * 100)} % gramática y sonidos, como piden las fuentes. Se aprueba con 65 % o más en total y 50 % o más en cada parte. No hay pistas ni repetición de lo fallado.</p>
        <div className="actions-bottom"><button type="button" className="primary block" onClick={() => setStarted(true)}>Empezar</button></div>
      </main>
    );
  }
  return (
    <main className="focus">
      <ItemRunner items={fromItems(items)} exitHref="#/ruta" onFinish={async (r) => {
        const s = scoreMilestone(parts, r.answers);
        const prev = (await store.allUnits()).find((u) => u.unitId === hitoId(level));
        await store.putUnit(milestoneProgress(prev, level, s.total, s.passed, new Date()));
        setRes(s);
      }} />
    </main>
  );
}
