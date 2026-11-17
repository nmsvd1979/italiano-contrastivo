import { useEffect, useState } from "react";
import { AudioProvider } from "./audio/AudioContext";
import { type AudioIndex, loadAudioIndex, loadNativeWords } from "./audio/clips";
import { type ContentPack, loadContent } from "./content/load";
import type { Card } from "./generated/card";
import { normalizeDay, planToday } from "./state/session";
import { type DayProgress, localDate, memoryStore, openStore, type Store, StoreUnavailableError } from "./state/store";
import { AboutScreen } from "./ui/AboutScreen";
import { CapsuleScreen } from "./ui/CapsuleScreen";
import { ReviewScreen } from "./ui/ReviewScreen";
import { TodayScreen } from "./ui/TodayScreen";
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
  const [data, setData] = useState<{ cards: Card[]; day: DayProgress } | null>(null);
  useEffect(() => {
    const now = new Date();
    Promise.all([store.allCards(), store.getDay(localDate(now))]).then(([cards, day]) => setData({ cards, day: normalizeDay(day, now) }));
  }, [store]);
  if (!data) return <p>Cargando…</p>;
  return <TodayScreen plan={planToday({ pack, cards: data.cards, day: data.day, now: new Date() })} day={data.day} storeError={storeError} />;
}

export function App() {
  const hash = useHash();
  const [ready, setReady] = useState<Ready | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const [pack, audio, words] = await Promise.all([loadContent(), loadAudioIndex(), loadNativeWords()]);
      try {
        setReady({ pack, audio, words, store: await openStore(), storeError: null });
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
      <nav><a href="#/">Hoy</a> <a href="#/repaso">Repaso</a> <a href="#/acerca">Acerca de</a></nav>
      {hash === "#/repaso" ? <ReviewScreen pack={ready.pack} store={ready.store} />
        : hash === "#/acerca" ? <AboutScreen manifest={ready.pack.manifest} sentences={ready.pack.sentences} />
        : capsule ? <CapsuleScreen key={capsule.id} capsule={capsule} store={ready.store} />
        : <Today {...ready} />}
    </AudioProvider>
  );
}
