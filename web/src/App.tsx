import { useEffect, useState } from "react";
import { AudioProvider } from "./audio/AudioContext";
import { type AudioIndex, loadAudioIndex, loadNativeWords } from "./audio/clips";
import { type ContentPack, loadContent } from "./content/load";
import type { Card } from "./generated/card";
import { normalizeDay, planToday } from "./state/session";
import { type DayProgress, localDate, memoryStore, openStore, type StepId, type Store, StoreUnavailableError, type UnitProgress } from "./state/store";
import { loadSamples } from "./state/timing";
import { buildInfo } from "./pwa";
import { unitViews } from "./state/course";
import { UpdateBanner } from "./ui/UpdateBanner";
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
import { TabBar, isFocusRoute } from "./ui/kit/TabBar";
import { computeStreak } from "./state/streak";
import { planSession } from "./state/dayplan";
import { isPreview, PREVIEW_DB, REAL_DB, setPreview } from "./state/preview";
import { WriteScreen } from "./ui/WriteScreen";
import "./styles.css";

type Ready = { pack: ContentPack; store: Store; storeError: string | null; audio: AudioIndex; words: Map<string, string> };

function useHash() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const on = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

function Today({ pack, store, storeError }: Ready) {
  const [data, setData] = useState<{ cards: Card[]; day: DayProgress; units: UnitProgress[]; days: DayProgress[] } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { // al volver a la app (p. ej. otro día) se recalcula la sesión de hoy
    const on = () => document.visibilityState === "visible" && setTick((t) => t + 1);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  useEffect(() => {
    const now = new Date();
    Promise.all([store.allCards(), store.getDay(localDate(now)), store.allUnits(), store.allDays()]).then(([cards, day, units, days]) => setData({ cards, day: normalizeDay(day, now), units, days }));
  }, [store, tick]);
  if (!data) return <p>Cargando…</p>;
  const samples = loadSamples();
  const plan = planToday({ pack, cards: data.cards, day: data.day, now: new Date(), units: data.units, samples });
  return <TodayScreen plan={plan} blocks={planSession({ plan, day: data.day, pack, samples })} day={data.day} storeError={storeError} firstTime={data.cards.length === 0 && data.units.length === 0 && data.day.reviewsDone === 0} streak={computeStreak(data.days, localDate(new Date()))} />;
}

function useViews(ready: Ready, hash: string) {
  const [views, setViews] = useState<ReturnType<typeof unitViews> | null>(null);
  useEffect(() => {
    let live = true;
    ready.store.allUnits().then((u) => live && setViews(unitViews(ready.pack.course, u)));
    return () => { live = false; };
  }, [ready, hash]);
  return views;
}

function Routes({ ready, hash }: { ready: Ready; hash: string }) {
  const views = useViews(ready, hash);
  const [hito, setHito] = useState<Record<string, { completed: boolean; best: number | null }>>({});
  useEffect(() => { ready.store.allUnits().then((u) => setHito(Object.fromEntries(u.filter((x) => x.unitId.startsWith("hito:")).map((x) => [x.unitId, { completed: x.completed, best: x.testBest }])))); }, [ready, hash]);
  const m = hash.match(/^#\/unidad\/(u\d+)(?:\/(\w+))?$/);
  if (hash === "#/hito/A1") return <MilestoneScreen pack={ready.pack} store={ready.store} level="A1" />;
  if (hash === "#/ubicacion") return <PlacementScreen pack={ready.pack} store={ready.store} units={ready.pack.course.units} />;
  if (!views) return <p>Cargando…</p>;
  if (hash === "#/ruta") return <RouteScreen views={views} pack={ready.pack} hito={hito} />;
  if (m && m[2]) return <StepScreen key={hash} unitId={m[1]} step={m[2] as StepId} pack={ready.pack} store={ready.store} />;
  const view = m && views.find((v) => v.unit.id === m[1]);
  if (view) return <UnitScreen view={view} pack={ready.pack} />;
  return <main><p>No encontré esa pantalla.</p><p><a className="button" href="#/ruta">Ir a la ruta</a></p></main>;
}

export function App() {
  const hash = useHash();
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
  if (!ready) return <p>Cargando…</p>;
  const capsule = hash.startsWith("#/capsula/") ? ready.pack.capsules.find((c) => c.id === hash.slice("#/capsula/".length)) : undefined;
  return (
    <AudioProvider pack={ready.pack} index={ready.audio} words={ready.words}>
      <UpdateBanner />
      {isPreview() && (
        <p role="status" className="banner">
          Modo de prueba: todo abierto y con progreso aparte (tu progreso real no se toca).{" "}
          <button type="button" style={{ minHeight: 32, padding: "2px 10px" }} onClick={() => { setPreview(false); window.location.reload(); }}>Salir</button>
        </p>
      )}
      {hash === "#/repaso" ? <ReviewScreen pack={ready.pack} store={ready.store} />
        : hash === "#/escribir" ? <WriteScreen />
        : hash === "#/ajustes" ? <SettingsScreen store={ready.store} memoryOnly={ready.storeError !== null} />
        : hash === "#/acerca" ? <AboutScreen manifest={ready.pack.manifest} sentences={ready.pack.sentences} readings={ready.pack.readings} />
        : hash === "#/ruta" || hash === "#/ubicacion" || hash === "#/hito/A1" || hash.startsWith("#/unidad/") ? <Routes ready={ready} hash={hash} />
        : capsule ? <CapsuleScreen key={capsule.id} capsule={capsule} store={ready.store} />
        : <Today {...ready} />}
    {!isFocusRoute(hash) && <footer className="version"><small>Versión {buildInfo().id}</small></footer>}
    {!isFocusRoute(hash) && <TabBar hash={hash} />}
    </AudioProvider>
  );
}
