import { useEffect, useState } from "react";
import type { ContentPack } from "../content/load";
import { canDoStep, STEP_LABEL, stepsFor, unitViews, type UnitView } from "../state/course";
import { finishStep, finishTest } from "../state/progress";
import { practiceItems, readingOf, reconstructionItems, stepSeconds, testItems, voiceItems } from "../state/steps";
import type { StepId, Store } from "../state/store";
import { formatDuration, loadSamples } from "../state/timing";
import { CapsuleScreen } from "./CapsuleScreen";
import { fromItems, fromVoice, ItemRunner, type RunResult } from "./ItemRunner";
import { Ring } from "./kit/Ring";
import { NoticeStep } from "./NoticeStep";
import { ReadingStep } from "./ReadingStep";
import { WordsStep } from "./WordsStep";

type Done = { passed?: boolean; correct?: number; total?: number };

export function StepScreen({ unitId, step, pack, store }: { unitId: string; step: StepId; pack: ContentPack; store: Store }) {
  const [views, setViews] = useState<UnitView[] | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [phase, setPhase] = useState<"notice" | "rebuild">("notice");
  useEffect(() => {
    store.allUnits().then((all) => setViews(unitViews(pack.course, all)));
  }, [store, pack, done]);
  if (!views) return <p>Cargando…</p>;
  const view = views.find((v) => v.unit.id === unitId);
  if (!view || !stepsFor(view.unit).includes(step)) return <main><p>Esa unidad o paso no existe.</p><p><a className="button" href="#/ruta">Ir a la ruta</a></p></main>;
  if (!canDoStep(view, step)) return <main><p>Todavía no puedes hacer este paso: completa antes los anteriores.</p><p><a className="button" href={`#/unidad/${unitId}`}>Ver la unidad</a></p></main>;
  const { unit } = view;
  const now = () => new Date();

  if (done) return <StepDone view={view} step={step} done={done} pack={pack} />;
  const finish = async (r?: RunResult) => {
    if (step === "prueba" && r) {
      const res = await finishTest(store, unitId, r.correct, r.total, now());
      setDone({ passed: res.passed, correct: r.correct, total: r.total });
    } else {
      await finishStep(store, unitId, step, now());
      setDone(r ? { correct: r.correct, total: r.total } : {});
    }
  };
  const samples = loadSamples();
  const exit = `#/unidad/${unitId}`;
  const run = { exitHref: exit, why: unit.explanation_es };
  return (
    <main className="focus">
      {step === "descubre" && phase === "notice" && (
        <NoticeStep unit={unit} pack={pack} exitHref={exit} onFinish={() => (reconstructionItems(unit, pack, samples).length ? setPhase("rebuild") : void finish())} />
      )}
      {step === "descubre" && phase === "rebuild" && (
        <ItemRunner {...run} persistKey={`${unitId}:descubre`} items={fromItems(reconstructionItems(unit, pack, samples))} requeueWrong onFinish={(r) => void finish(r)} />
      )}
      {step === "palabras" && <WordsStep unit={unit} exitHref={exit} onFinish={() => void finish()} />}
      {step === "lectura" && readingOf(unit, pack) && <ReadingStep reading={readingOf(unit, pack)!} exitHref={exit} onFinish={() => void finish()} />}
      {step === "capsula" && <CapsuleScreen capsule={pack.capsules.find((c) => c.target_error_codes[0] === unit.codes[0])!} store={store} embedded exitHref={exit} onComplete={() => void finish()} />}
      {step === "practica" && <ItemRunner {...run} persistKey={`${unitId}:practica`} items={fromItems(practiceItems(unit, pack, samples))} requeueWrong onFinish={(r) => void finish(r)} />}
      {step === "practica2" && <ItemRunner {...run} persistKey={`${unitId}:practica2`} items={fromItems(practiceItems(unit, pack, samples, undefined, 2))} requeueWrong onFinish={(r) => void finish(r)} />}
      {step === "escucha" && <ItemRunner {...run} persistKey={`${unitId}:escucha`} items={fromVoice(voiceItems(unit, pack, samples))} onFinish={(r) => void finish(r)} />}
      {step === "prueba" && <ItemRunner {...run} persistKey={`${unitId}:prueba`} items={fromItems(testItems(unit, pack))} onFinish={(r) => void finish(r)} />}
    </main>
  );
}

function StepDone({ view, step, done, pack }: { view: UnitView; step: StepId; done: Done; pack: ContentPack }) {
  const { unit } = view;
  const steps = stepsFor(unit);
  const nextStep = steps[steps.indexOf(step) + 1];
  const samples = loadSamples();
  if (step === "prueba") {
    const pct = Math.round(((done.correct ?? 0) / Math.max(1, done.total ?? 1)) * 100);
    return (
      <main className="center">
        {done.passed && <Ring />}
        <h1>{done.passed ? "¡Unidad completada!" : "Casi"}</h1>
        <p>Acertaste {done.correct} de {done.total} ({pct} %). {done.passed ? "Desbloqueaste la siguiente unidad." : "Hacen falta 80 % o más. Vuelve a la práctica: lo que falles se repite, y luego reintentas la prueba."}</p>
        <div className="actions-bottom"><a className="button primary block" href={done.passed ? "#/ruta" : `#/unidad/${unit.id}`}>{done.passed ? "Ver la ruta" : "Volver a la unidad"}</a></div>
      </main>
    );
  }
  return (
    <main className="center">
      <Ring />
      <h1>Paso completado ✓</h1>
      {done.total !== undefined && <p>Acertaste {done.correct} de {done.total} a la primera.</p>}
      {nextStep ? (
        <p>Siguiente: <strong>{STEP_LABEL[nextStep]}</strong> ({formatDuration(stepSeconds(unit, nextStep, pack, samples))}). Puedes seguir ahora o dejarlo para más tarde.</p>
      ) : null}
      <div className="actions-bottom" style={{ gap: 10 }}>
        {nextStep && <a className="button primary" style={{ flex: 1 }} href={`#/unidad/${unit.id}/${nextStep}`}>Seguir</a>}
        <a className="button" style={{ flex: 1 }} href="#/">Hoy</a>
      </div>
    </main>
  );
}
