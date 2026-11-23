import { useEffect, useMemo, useState } from "react";
import type { ContentPack } from "../content/load";
import { HITO, hitoId, milestoneItems, milestoneListenSentences, milestoneOpen, milestoneOralTask, milestoneProgress, milestoneWriteItems, oralPassed, type Part, scoreMilestone } from "../state/milestone";
import { isPreview } from "../state/preview";
import type { Store } from "../state/store";
import { formatDuration, estimateSeconds, loadSamples } from "../state/timing";
import { fromDictations, fromItems, ItemRunner, type RunItem } from "./ItemRunner";
import { Ring } from "./kit/Ring";
import { kindOf } from "../state/steps";
import { TaskRun } from "./SpeakingScreen";

type Result = ReturnType<typeof scoreMilestone> & { oral: { checked: number; total: number } | null; passedAll: boolean };

export function MilestoneScreen({ pack, store, level = "A1" }: { pack: ContentPack; store: Store; level?: string }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<"intro" | "run" | "oral" | "done">("intro");
  const [partial, setPartial] = useState<ReturnType<typeof scoreMilestone> | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  useEffect(() => {
    store.allUnits().then((u) => setOpen(milestoneOpen(pack, new Set(u.filter((x) => x.completed).map((x) => x.unitId)), level, isPreview())));
  }, [store, pack, level]);
  const exam = useMemo(() => {
    const rec = milestoneItems(pack, level);
    const used = new Set(rec.items.map((i) => (i as { sentence_id?: string }).sentence_id).filter((x): x is string => !!x));
    const write = milestoneWriteItems(pack, level, used);
    const listen = milestoneListenSentences(pack, level, used);
    const run: RunItem[] = [...fromItems(rec.items), ...fromItems(write), ...fromDictations(listen)];
    const parts: Part[] = [...rec.parts, ...write.map((): Part => "write"), ...listen.map((): Part => "listen")];
    return { run, parts, write: write.length, listen: listen.length, recognition: rec.items.length };
  }, [pack, level]);
  const task = milestoneOralTask(pack, level);
  if (open === null) return <p>Cargando…</p>;
  if (!open) return <main><h1>Examen de hito {level}</h1><p>Se abre cuando completes todas las unidades de {level}.</p><p><a className="button" href="#/ruta">Ver la ruta</a></p></main>;

  const save = async (s: ReturnType<typeof scoreMilestone>, oral: { checked: number; total: number } | null) => {
    const passedAll = s.passed && (oral === null || oralPassed(oral.checked, oral.total));
    const prev = (await store.allUnits()).find((u) => u.unitId === hitoId(level));
    await store.putUnit(milestoneProgress(prev, level, s.total, passedAll, new Date()));
    setRes({ ...s, oral, passedAll });
    setPhase("done");
  };

  if (phase === "done" && res) {
    const pct = (a: number, b: number) => `${a} de ${b}`;
    return (
      <main className="center">
        {res.passedAll && <Ring />}
        <h1>{res.passedAll ? `¡Nivel ${level} completado!` : "Todavía no"}</h1>
        <p>Total: {Math.round(res.total * 100)} %. Léxico: {pct(res.lex.correct, res.lex.total)}. Gramática y sonidos: {pct(res.gram.correct, res.gram.total)}.
          {res.write.total > 0 && <> Escribir: {pct(res.write.correct, res.write.total)}.</>}{res.listen.total > 0 && <> Escuchar: {pct(res.listen.correct, res.listen.total)}.</>}
          {res.oral && <> Hablar (autoevaluación): {pct(res.oral.checked, res.oral.total)} puntos de la rúbrica.</>}</p>
        <p>{res.passedAll
          ? "Cumpliste el criterio: 65 % o más en total, 50 % o más en cada parte y la mitad de la rúbrica oral."
          : "Para aprobar hace falta 65 % o más en total, 50 % o más en cada parte (léxico, gramática, escribir y escuchar) y la mitad de la rúbrica oral. Repasa las unidades que más te costaron y reintenta cuando quieras."}</p>
        {res.oral && <p><small>La parte oral la evalúas tú: la app no mide pronunciación. Leer un texto que no hayas visto antes todavía no forma parte del examen.</small></p>}
        <div className="actions-bottom"><a className="button primary block" href="#/ruta">Ver la ruta</a></div>
      </main>
    );
  }
  if (phase === "intro") {
    const secs = exam.run.reduce((s, i) => s + estimateSeconds(i.kind, loadSamples()), 0);
    return (
      <main>
        <h1>Examen de hito {level}</h1>
        <p>{exam.recognition} preguntas de reconocimiento ({Math.round(HITO.A1.lex * 100)} % léxico y {100 - Math.round(HITO.A1.lex * 100)} % gramática y sonidos), {exam.write} frases para <strong>escribir en italiano desde el español</strong> y {exam.listen} dictados ({formatDuration(secs)} en total){task ? ", y al final una tarea oral que te autoevalúas con una rúbrica" : ""}.</p>
        <p>Se aprueba con 65 % o más en total y 50 % o más en cada parte{task ? "; en la parte oral, cumpliendo la mitad de la rúbrica" : ""}. No hay pistas, ni repetición de lo fallado, ni «mi versión también es correcta».</p>
        <div className="actions-bottom"><button type="button" className="primary block" onClick={() => setPhase("run")}>Empezar</button></div>
      </main>
    );
  }
  if (phase === "run") {
    return (
      <main className="focus">
        <ItemRunner items={exam.run} exitHref="#/ruta" overrideBudget={0} onFinish={async (r) => {
          const s = scoreMilestone(exam.parts, r.answers);
          if (task) { setPartial(s); setPhase("oral"); } else await save(s, null);
        }} />
      </main>
    );
  }
  return (
    <main>
      <p className="runner-meta">Última parte: hablar</p>
      <TaskRun task={task!} store={store} onExit={() => setPhase("intro")} onComplete={(checked, total) => void save(partial!, { checked, total })} />
    </main>
  );
}
