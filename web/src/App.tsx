import { useEffect, useState } from "react";
import { Loading } from "./ui/kit/EmptyState";
import { flushSync } from "react-dom";
import { AudioProvider } from "./audio/AudioContext";
import { type AudioIndex, loadAudioIndex, loadNativeWords } from "./audio/clips";
import { type ContentPack, loadContent } from "./content/load";
import type { Card } from "./generated/card";
import { normalizeDay, planToday } from "./state/session";
import { type DayProgress, localDate, memoryStore, openStore, type StepId, type Store, StoreUnavailableError, type UnitProgress } from "./state/store";
import { loadSamples } from "./state/timing";
import { buildInfo } from "./pwa";
import { MODULE_ID, moduleViews, type ModuleStepId } from "./state/modules";
import { UpdateBanner } from "./ui/UpdateBanner";
import { AttemptsProvider } from "./ui/kit/AttemptsContext";
import { AboutScreen } from "./ui/AboutScreen";
import { CapsuleScreen } from "./ui/CapsuleScreen";
import { SettingsScreen } from "./ui/SettingsScreen";
import { MilestoneScreen } from "./ui/MilestoneScreen";
import { PlacementScreen } from "./ui/PlacementScreen";
import { RouteScreen } from "./ui/RouteScreen";
import { StepScreen } from "./ui/StepScreen";
import { UnitScreen } from "./ui/UnitScreen";
import { ReviewScreen } from "./ui/ReviewScreen";
import { TodayScreen } from "./ui/TodayScreen";
import { contrastCards } from "./ui/kit/ContrastCard";
import { TabBar, isFocusRoute } from "./ui/kit/TabBar";
import { useScrollTop } from "./ui/kit/useScrollTop";
import { computeStreak } from "./state/streak";
import { weekTotals } from "./state/strands";
import { planSession } from "./state/dayplan";
import { isPreview, PREVIEW_DB, REAL_DB, setPreview } from "./state/preview";
import { WriteScreen } from "./ui/WriteScreen";
import { WeakScreen } from "./ui/WeakScreen";
import { weakSpots } from "./state/weak";
import { PracticeScreen } from "./ui/PracticeScreen";
import { ProgressScreen } from "./ui/ProgressScreen";
import { DictationTestScreen } from "./ui/DictationTestScreen";
import { LibraryScreen } from "./ui/LibraryScreen";
import { ModuleScreen } from "./ui/ModuleScreen";
import { ModuleStepScreen, ModuleTextScreen } from "./ui/ModuleStepScreen";
import { SpeakingScreen } from "./ui/SpeakingScreen";
import "./styles.css";

type Ready = { pack: ContentPack; store: Store; storeError: string | null; audio: AudioIndex; words: Map<string, string> };

function useHash() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const apply = () => setHash(window.location.hash || "#/");
    // Fundido corto entre pantallas donde el navegador lo admite (iOS 18+); en cualquier otro caso, cambio directo.
    const on = () => {
      const vt = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
      if (vt && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) vt.call(document, () => flushSync(apply));
      else apply();
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

type DayData = { cards: Card[]; day: DayProgress; units: UnitProgress[]; days: DayProgress[] };

/** Carga lo guardado del día; al volver a la app (p. ej. otro día) se recalcula. */
function useDayData(store: Store): DayData | null {
  const [data, setData] = useState<DayData | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => document.visibilityState === "visible" && setTick((t) => t + 1);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  useEffect(() => {
    const now = new Date();
    Promise.all([store.allCards(), store.getDay(localDate(now)), store.allUnits(), store.allDays()]).then(([cards, day, units, days]) => setData({ cards, day: normalizeDay(day, now), units, days }));
  }, [store, tick]);
  return data;
}

function Today({ pack, store, storeError }: Ready) {
  const data = useDayData(store);
  if (!data) return <Loading />;
  const samples = loadSamples();
  const plan = planToday({ pack, cards: data.cards, day: data.day, now: new Date(), units: data.units, samples });
  return <TodayScreen plan={plan} blocks={planSession({ plan, day: data.day, pack, samples, weak: weakSpots(data.days, pack.course, localDate(new Date())).spots })} day={data.day} storeError={storeError} firstTime={data.cards.length === 0 && data.units.length === 0 && data.day.reviewsDone === 0} streak={computeStreak(data.days, localDate(new Date()))} week={weekTotals(data.days, localDate(new Date()))} phrase={plan.unit ? contrastCards(plan.unit.view.unit, pack, 1)[0] : undefined} />;
}

function Practice({ pack, store }: Ready) {
  const data = useDayData(store);
  if (!data) return <Loading />;
  const plan = planToday({ pack, cards: data.cards, day: data.day, now: new Date(), units: data.units, samples: loadSamples() });
  return <PracticeScreen review={plan.review} weak={weakSpots(data.days, pack.course, localDate(new Date())).spots} />;
}

function Progress({ pack, store }: Ready) {
  const data = useDayData(store);
  if (!data) return <Loading />;
  const today = localDate(new Date());
  return <ProgressScreen week={weekTotals(data.days, today)} days={data.days} today={today} modules={moduleViews(pack.course, data.units).modules} weak={weakSpots(data.days, pack.course, today)} />;
}

function useViews(ready: Ready, hash: string) {
  const [views, setViews] = useState<ReturnType<typeof moduleViews> | null>(null);
  useEffect(() => {
    let live = true;
    ready.store.allUnits().then((u) => live && setViews(moduleViews(ready.pack.course, u)));
    return () => { live = false; };
  }, [ready, hash]);
  return views;
}

function Routes({ ready, hash }: { ready: Ready; hash: string }) {
  const views = useViews(ready, hash);
  const [hito, setHito] = useState<Record<string, { completed: boolean; best: number | null }>>({});
  useEffect(() => { ready.store.allUnits().then((u) => setHito(Object.fromEntries(u.filter((x) => x.unitId.startsWith("hito:")).map((x) => [x.unitId, { completed: x.completed, best: x.testBest }])))); }, [ready, hash]);
  const m = hash.match(/^#\/unidad\/(u\d+)(?:\/(\w+))?$/);
  const mod = hash.match(new RegExp(`^#/modulo/(${MODULE_ID})(?:/(\\w+))?$`));
  const txt = hash.match(new RegExp(`^#/modulo/(${MODULE_ID})/texto/(\\w+)$`));
  const examen = hash.match(/^#\/hito\/([AB][12])$/);
  if (examen) return <MilestoneScreen pack={ready.pack} store={ready.store} level={examen[1]} />;
  if (hash === "#/ubicacion") return <PlacementScreen pack={ready.pack} store={ready.store} units={ready.pack.course.units} />;
  if (!views) return <Loading />;
  if (hash === "#/ruta") return <RouteScreen views={views.units} modules={views.modules} pack={ready.pack} hito={hito} />;
  if (txt) return <ModuleTextScreen key={hash} moduleId={txt[1]} textId={txt[2]} pack={ready.pack} store={ready.store} />;
  if (mod && mod[2]) return <ModuleStepScreen key={hash} moduleId={mod[1]} step={mod[2] as ModuleStepId} pack={ready.pack} store={ready.store} />;
  const modView = mod && views.modules.find((v) => v.module.id === mod[1]);
  if (modView) return <ModuleScreen view={modView} pack={ready.pack} />;
  if (m && m[2]) return <StepScreen key={hash} unitId={m[1]} step={m[2] as StepId} pack={ready.pack} store={ready.store} />;
  const view = m && views.units.find((v) => v.unit.id === m[1]);
  if (view) return <UnitScreen view={view} pack={ready.pack} />;
  return <main><p>No encontré esa pantalla.</p><p><a className="button" href="#/ruta">Ir a la ruta</a></p></main>;
}

export function App() {
  const hash = useHash();
  useScrollTop(hash);
  const [ready, setReady] = useState<Ready | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      navigator.storage?.persist?.().catch(() => undefined); // pide que el sistema no borre el progreso
      const [pack, audio, words] = await Promise.all([loadContent(), loadAudioIndex(), loadNativeWords()]);
      try {
        setReady({ pack, audio, words, store: await openStore(isPreview() ? PREVIEW_DB : REAL_DB), storeError: null });
      } catch (e) {
        if (!(e instanceof StoreUnavailableError)) throw e;
        setReady({ pack, audio, words, store: memoryStore(), storeError: e.message });
      }
    })().catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <p role="alert" className="alert">{error}</p>;
  if (!ready) return <Loading />;
  const capsule = hash.startsWith("#/capsula/") ? ready.pack.capsules.find((c) => c.id === hash.slice("#/capsula/".length)) : undefined;
  return (
    <AudioProvider pack={ready.pack} index={ready.audio} words={ready.words}>
    <AttemptsProvider store={ready.store}>
      <UpdateBanner />
      {isPreview() && (
        <p role="status" className="banner">
          Modo de prueba: todo abierto y con progreso aparte (tu progreso real no se toca).{" "}
          <button type="button" style={{ minHeight: 32, padding: "2px 10px" }} onClick={() => { setPreview(false); window.location.reload(); }}>Salir</button>
        </p>
      )}
      {hash === "#/repaso" ? <ReviewScreen pack={ready.pack} store={ready.store} />
        : hash === "#/debiles" ? <WeakScreen pack={ready.pack} store={ready.store} />
        : hash === "#/practicar" ? <Practice {...ready} />
        : hash === "#/progreso" ? <Progress {...ready} />
        : hash === "#/hablar" ? <SpeakingScreen pack={ready.pack} store={ready.store} />
        : hash === "#/biblioteca" ? <LibraryScreen pack={ready.pack} store={ready.store} />
        : hash === "#/prueba-dictado" ? <DictationTestScreen pack={ready.pack} />
        : hash === "#/escribir" ? <WriteScreen pack={ready.pack} store={ready.store} />
        : hash === "#/ajustes" ? <SettingsScreen store={ready.store} memoryOnly={ready.storeError !== null} />
        : hash === "#/acerca" ? <AboutScreen manifest={ready.pack.manifest} sentences={ready.pack.sentences} readings={ready.pack.readings} />
        : hash === "#/ruta" || hash === "#/ubicacion" || hash.startsWith("#/hito/") || hash.startsWith("#/unidad/") || hash.startsWith("#/modulo/") ? <Routes ready={ready} hash={hash} />
        : capsule ? <CapsuleScreen key={capsule.id} capsule={capsule} store={ready.store} />
        : <Today {...ready} />}
    {!isFocusRoute(hash) && <footer className="version"><small>Versión {buildInfo().id}</small></footer>}
    {!isFocusRoute(hash) && <TabBar hash={hash} />}
    </AttemptsProvider>
    </AudioProvider>
  );
}
