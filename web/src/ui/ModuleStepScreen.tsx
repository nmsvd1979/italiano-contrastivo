import { useEffect, useRef, useState } from "react";
import type { ContentPack, CourseModule, RolePlay, SpeakingTask } from "../content/load";
import { canDoKey, setCanDo } from "../state/cando";
import { emptyProgress } from "../state/course";
import { finishModuleStep, finishModuleTest, finishSalidaPart } from "../state/progress";
import { type ModuleStepId, type ModuleView, MODULE_STEP_LABEL, moduleProgressId, moduleTestItems, moduleViews, salidaKey, salidaMissing } from "../state/modules";
import type { Store } from "../state/store";
import { fromItems, ItemRunner, type RunResult } from "./ItemRunner";
import { Ring } from "./kit/Ring";
import { useStrandTimer } from "./kit/useStrandTimer";
import { ReadingStep } from "./ReadingStep";
import { FluencyRun, PhrasesPanel, RolePlayRun, TaskRun } from "./SpeakingScreen";
import { OwnText } from "./WriteScreen";

type Mode = { kind: "menu" } | { kind: "roleplay"; rp: RolePlay } | { kind: "task"; task: SpeakingTask } | { kind: "write" } | { kind: "phrases" };

/** Pasos propios de un módulo: Entrada, Salida, Fluidez y Cierre (las cápsulas son las unidades de siempre). */
export function ModuleStepScreen({ moduleId, step, pack, store }: { moduleId: string; step: ModuleStepId; pack: ContentPack; store: Store }) {
  const [view, setView] = useState<ModuleView | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { store.allUnits().then((all) => setView(moduleViews(pack.course, all).modules.find((m) => m.module.id === moduleId) ?? null)); }, [store, pack, moduleId, tick]);
  if (!view) return <p>Cargando…</p>;
  const stepState = view.steps.find((s) => s.id === step);
  if (!stepState) return <main><p>Ese paso no existe.</p><p><a className="button" href="#/ruta">Ir a la ruta</a></p></main>;
  if (!stepState.open) return <main><p>Todavía no puedes hacer este paso: completa antes los anteriores del módulo.</p><p><a className="button" href={`#/modulo/${moduleId}`}>Ver el módulo</a></p></main>;
  const exit = `#/modulo/${moduleId}`;
  const reload = () => setTick((t) => t + 1);
  if (step === "entrada") return <Entrada view={view} pack={pack} store={store} exit={exit} onDone={reload} />;
  if (step === "salida") return <Salida view={view} pack={pack} store={store} exit={exit} onChange={reload} />;
  if (step === "fluidez") return <Fluidez view={view} pack={pack} store={store} exit={exit} onDone={reload} />;
  return <Cierre view={view} pack={pack} store={store} exit={exit} onDone={reload} />;
}

const Done = ({ title, text, exit, next }: { title: string; text: string; exit: string; next?: { href: string; label: string } }) => (
  <main className="center">
    <Ring />
    <h1>{title}</h1>
    <p>{text}</p>
    <div className="actions-bottom" style={{ gap: 10 }}>
      {next && <a className="button primary" style={{ flex: 1 }} href={next.href}>{next.label}</a>}
      <a className="button" style={{ flex: 1 }} href={exit}>Ver el módulo</a>
    </div>
  </main>
);

function Entrada({ view, pack, store, exit, onDone }: { view: ModuleView; pack: ContentPack; store: Store; exit: string; onDone: () => void }) {
  const [done, setDone] = useState(false);
  useStrandTimer(store, "entrada", !done);
  const reading = (pack.readings ?? []).find((r) => r.id === view.module.entry_reading);
  if (!reading) return <main><p>No encuentro el texto de entrada de este módulo.</p></main>;
  if (done) return <Done title="Entrada completada ✓" text="Ya viste la situación en italiano real. Ahora vienen las cápsulas: cada una trabaja un punto de lo que acabas de leer." exit={exit} next={{ href: exit, label: "Seguir con las cápsulas" }} />;
  return <main className="focus"><ReadingStep reading={reading} words={pack.readingWords} exitHref={exit} onFinish={() => { void finishModuleStep(store, view.module.id, "entrada", new Date()).then(() => { setDone(true); onDone(); }); }} /></main>;
}

function Fluidez({ view, pack, store, exit, onDone }: { view: ModuleView; pack: ContentPack; store: Store; exit: string; onDone: () => void }) {
  const [done, setDone] = useState(false);
  const reading = (pack.readings ?? []).find((r) => r.id === view.module.entry_reading);
  if (!reading) return <main><p>No encuentro el texto de este módulo.</p></main>;
  if (done) return <Done title="Fluidez completada ✓" text="Releíste y reescuchaste el texto a tres velocidades. Lo siguiente es el cierre del módulo." exit={exit} next={{ href: `#/modulo/${view.module.id}/cierre`, label: "Ir al cierre" }} />;
  return <FluencyRun reading={reading} store={store} onExit={() => { window.location.hash = exit; }} onComplete={() => { void finishModuleStep(store, view.module.id, "fluidez", new Date()).then(() => { setDone(true); onDone(); }); }} />;
}

function Salida({ view, pack, store, exit, onChange }: { view: ModuleView; pack: ContentPack; store: Store; exit: string; onChange: () => void }) {
  const [mode, setMode] = useState<Mode>({ kind: "menu" });
  const { module } = view;
  const sp = pack.speaking;
  useStrandTimer(store, "salida", mode.kind === "write");
  const mark = async (part: "habla" | "escritura") => { await finishSalidaPart(store, module, part, new Date()); onChange(); };
  const back = () => setMode({ kind: "menu" });
  const readingOf = (id: string) => (pack.readings ?? []).find((r) => r.id === id);
  if (mode.kind === "roleplay") { const r = readingOf(mode.rp.reading); return r ? <RolePlayRun rp={mode.rp} reading={r} store={store} onExit={back} exitLabel="Volver a la Salida" onComplete={() => void mark("habla")} /> : <p>Falta el diálogo.</p>; }
  if (mode.kind === "task") return <TaskRun task={mode.task} store={store} onExit={back} onComplete={() => { void mark("habla"); back(); }} />;
  if (mode.kind === "write") {
    return (
      <main>
        <h1>Tu mensaje escrito</h1>
        <OwnText store={store} prompt_es={module.writing_es ?? `Escribe 3 o 4 frases tuyas para practicar esto: «${module.can_do_es[0]}»`} onChecked={() => void mark("escritura")} />
        <p><button type="button" onClick={back}>‹ Volver a la Salida</button></p>
      </main>
    );
  }
  if (mode.kind === "phrases" && sp?.phrases) return <PhrasesPanel phrases={sp.phrases} only={module.phrase_groups} onExit={back} />;
  const missing = salidaMissing(module, view.progress);
  const rps = (sp?.roleplays ?? []).filter((r) => module.roleplays.includes(r.id));
  const tasks = (sp?.tasks ?? []).filter((t) => module.tasks.includes(t.id));
  const doneMark = (k: "habla" | "escritura") => (view.progress.done[salidaKey(k)] ? " ✓" : "");
  return (
    <main>
      <p><a className="tap" href={exit}>‹ {module.title}</a></p>
      <h1>Salida</h1>
      <p>Aquí pasas de reconocer a <strong>producir</strong>. Para completar la Salida hace falta {module.roleplays.length + module.tasks.length > 0 ? "una práctica hablada y " : ""}un mensaje escrito tuyo. {missing.length === 0 ? "Ya cumpliste lo que se pide." : ""}</p>
      {module.gap_es && <p className="note"><small>⚠ {module.gap_es}</small></p>}
      {(rps.length > 0 || tasks.length > 0) && (
        <>
          <h2>Hablar{doneMark("habla")}</h2>
          <ul className="library">
            {rps.map((rp) => <li key={rp.id}><h3>{rp.title}</h3><p>{rp.goal_es}</p><button type="button" onClick={() => setMode({ kind: "roleplay", rp })}>Practicar</button></li>)}
            {tasks.map((t) => <li key={t.id}><h3>{t.title}</h3><p><small>~{t.minutes} min · tarea oral</small></p><button type="button" onClick={() => setMode({ kind: "task", task: t })}>Empezar</button></li>)}
          </ul>
        </>
      )}
      <h2>Escribir{doneMark("escritura")}</h2>
      <p>Un mensaje corto tuyo sobre la situación, con la revisión de calcos.</p>
      <p><button type="button" onClick={() => setMode({ kind: "write" })}>Escribir mi mensaje</button></p>
      {module.phrase_groups.length > 0 && sp?.phrases && (
        <>
          <h2>Frases útiles (opcional)</h2>
          <p><button type="button" onClick={() => setMode({ kind: "phrases" })}>Ver las frases de este tema</button></p>
        </>
      )}
      {missing.length === 0 && view.steps.find((s) => s.id === "salida")?.done && <p><a className="button primary" href={`#/modulo/${module.id}/fluidez`}>Seguir con la Fluidez</a></p>}
    </main>
  );
}

function Cierre({ view, pack, store, exit, onDone }: { view: ModuleView; pack: ContentPack; store: Store; exit: string; onDone: () => void }) {
  const { module } = view;
  const [phase, setPhase] = useState<"checklist" | "test" | "result">("checklist");
  const [checks, setChecks] = useState<boolean[]>(() => module.can_do_es.map((c) => !!view.progress.done[canDoKey(c)]));
  const saving = useRef<Promise<void>>(Promise.resolve());   // las marcas se guardan una tras otra: dos seguidas no se pisan
  const toggle = (i: number, on: boolean) => {
    setChecks((x) => x.map((v, k) => (k === i ? on : v)));
    const id = moduleProgressId(module.id);
    saving.current = saving.current.then(async () => {
      const p = (await store.getUnit(id)) ?? emptyProgress(id);
      await store.putUnit(setCanDo(p, module.can_do_es[i], on, new Date()));
    }).catch(() => undefined);
  };
  const [res, setRes] = useState<{ passed: boolean; correct: number; total: number } | null>(null);
  const items = moduleTestItems(view, pack);
  useStrandTimer(store, "salida", phase === "test");
  const lib = (pack.library ?? []).find((r) => r.id === module.library);
  if (phase === "checklist") {
    return (
      <main>
        <p><a className="tap" href={exit}>‹ {module.title}</a></p>
        <h1>Cierre del módulo</h1>
        <h2>¿Qué sabes hacer ya?</h2>
        <p><small>Marca lo que de verdad puedes hacer sin mirar. Se guarda en este dispositivo y aparece en Progreso como «marcado por ti»; no cuenta para completar el módulo. Lo que quede sin marcar conviene repasarlo antes de la prueba.</small></p>
        <ul className="options">{module.can_do_es.map((c, i) => <li key={c}><label><input type="checkbox" checked={checks[i]} onChange={(e) => toggle(i, e.target.checked)} /> {c}</label></li>)}</ul>
        <p>La prueba son {items.length} frases mezcladas de todas las cápsulas, que escribes en italiano desde el español. Sin opciones ni «mi versión también es correcta». Con 80 % o más completas el módulo.</p>
        <div style={{ marginTop: 16 }}><button type="button" className="primary block" disabled={items.length === 0} onClick={() => setPhase("test")}>Empezar la prueba</button></div>
      </main>
    );
  }
  if (phase === "test") {
    return (
      <main className="focus">
        <ItemRunner items={fromItems(items)} exitHref={exit} overrideBudget={0} onFinish={async (r: RunResult) => {
          const out = await finishModuleTest(store, module.id, r.correct, r.total, new Date());
          setRes({ passed: out.passed, correct: r.correct, total: r.total });
          setPhase("result");
          onDone();
        }} />
      </main>
    );
  }
  const pct = Math.round(((res?.correct ?? 0) / Math.max(1, res?.total ?? 1)) * 100);
  return (
    <main className="center">
      {res?.passed && <Ring />}
      <h1>{res?.passed ? "¡Módulo completado!" : "Casi"}</h1>
      <p>Acertaste {res?.correct} de {res?.total} ({pct} %). {res?.passed ? "Se abrió el módulo siguiente." : "Hacen falta 80 % o más. Repasa las cápsulas que más te costaron y reintenta cuando quieras."}</p>
      {res?.passed && lib && <p><small>Sugerencia de 10 minutos: {module.library_task_es} (<a href={lib.url} target="_blank" rel="noopener noreferrer">{lib.title}</a>)</small></p>}
      <div className="actions-bottom" style={{ gap: 10 }}>
        <a className="button primary" style={{ flex: 1 }} href="#/ruta">Ver la ruta</a>
        <a className="button" style={{ flex: 1 }} href={exit}>Ver el módulo</a>
      </div>
    </main>
  );
}

/** Un texto real opcional del módulo (documento, mensajes): se lee sin traducción y se responde; no es un paso obligatorio. */
export function ModuleTextScreen({ moduleId, textId, pack, store }: { moduleId: string; textId: string; pack: ContentPack; store: Store }) {
  const [done, setDone] = useState(false);
  useStrandTimer(store, "entrada", !done);
  const reading = (pack.readings ?? []).find((r) => r.id === textId);
  const exit = `#/modulo/${moduleId}`;
  if (!reading) return <main><p>No encuentro ese texto.</p><p><a className="button" href={exit}>Ver el módulo</a></p></main>;
  if (done) return <Done title="Texto leído ✓" text="Puedes volver a leerlo cuando quieras. Estos textos no cuentan para completar el módulo: sirven para practicar la lectura real." exit={exit} />;
  return <main className="focus"><ReadingStep reading={reading} words={pack.readingWords} exitHref={exit} hideTranslation listenOnly={!!reading.listen && !reading.exam} onFinish={() => setDone(true)} /></main>;
}

export const moduleStepTitle = (s: ModuleStepId) => MODULE_STEP_LABEL[s];
export type { CourseModule };
