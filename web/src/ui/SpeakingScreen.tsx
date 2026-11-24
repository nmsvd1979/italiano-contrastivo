import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../audio/AudioContext";
import type { ContentPack, Reading, RolePlay, Speaking, SpeakingTask } from "../content/load";
import { fluencyReadings, PASSES } from "../state/fluency";
import { cappedSeconds, missingBefore, type Rating, ratingSummary, speakersOf, spell, turnsOf, voicePrompt } from "../state/speaking";
import { addDaySeconds } from "../state/strands";
import type { Store } from "../state/store";
import { useRecorder } from "./recorder";
import { stopSay, waitCurrentEnd } from "./speech";

type View = { kind: "home" } | { kind: "fluency"; reading: Reading } | { kind: "phrases" } | { kind: "roleplay"; rp: RolePlay } | { kind: "task"; task: SpeakingTask } | { kind: "alphabet" };

/**
 * Hablar: tres formas de practicar la voz sin pagar y sin que la app finja corregirte. (1) Juegos de roles con diálogos de libros abiertos: la
 * app dice la otra voz y tú respondes en voz alta desde el español. (2) Tareas orales del libro (hablar 1–3 minutos), con rúbrica y un encargo listo
 * para el modo de voz de una IA gratuita. (3) El alfabeto y deletrear tu nombre. Todo se autoevalúa; el tiempo suma a «Escribir y hablar».
 */
export function SpeakingScreen({ pack, store }: { pack: ContentPack; store: Store }) {
  const sp = pack.speaking;
  const [view, setView] = useState<View>({ kind: "home" });
  const [done, setDone] = useState<Set<string>>(new Set());
  useEffect(() => { store.allUnits().then((u) => setDone(new Set(u.filter((x) => x.completed).map((x) => x.unitId)))).catch(() => undefined); }, [store]);
  if (!sp) return <main><h1>Hablar</h1><p role="status">Todavía no hay prácticas de habla cargadas.</p></main>;
  const back = () => setView({ kind: "home" });
  if (view.kind === "roleplay") return <RolePlayRun rp={view.rp} reading={(pack.readings ?? []).find((r) => r.id === view.rp.reading)!} store={store} onExit={back} />;
  if (view.kind === "task") return <TaskRun task={view.task} store={store} onExit={back} />;
  if (view.kind === "fluency") return <FluencyRun reading={view.reading} store={store} onExit={back} />;
  if (view.kind === "phrases" && sp.phrases) return <PhrasesPanel phrases={sp.phrases} onExit={back} />;
  if (view.kind === "alphabet") return <AlphabetPanel speaking={sp} onExit={back} />;
  const fluent = fluencyReadings(pack, done);
  const titleOf = (id: string) => pack.course.units.find((u) => u.id === id)?.title ?? id;
  const hint = (after: string[]) => { const m = missingBefore(after, done); return m.length ? `Mejor después de: ${m.map(titleOf).join("; ")}.` : "Ya viste lo que necesita."; };
  return (
    <main>
      <h1>Hablar</h1>
      <p>Aquí practicas la voz: oyes, hablas en voz alta y te autoevalúas. <strong>La app no mide tu pronunciación</strong> (no se puede hacer gratis en el teléfono): te escuchas, te comparas con el modelo y marcas cómo te fue. Lo que hables suma a «Escribir y hablar» en «Tu semana».</p>
      <p><small>{sp.note}</small></p>
      <h2>Juegos de roles</h2>
      <p><small>Un diálogo real: la app dice una voz y tú respondes la otra, mirando solo el español.</small></p>
      <ul className="library">
        {sp.roleplays.map((rp) => (
          <li key={rp.id}>
            <h3>{rp.title}</h3>
            <p><small>{rp.function_es} · {hint(rp.after)}</small></p>
            <p>{rp.goal_es}</p>
            <button type="button" onClick={() => setView({ kind: "roleplay", rp })}>Practicar</button>
          </li>
        ))}
      </ul>
      <h2>Tareas orales</h2>
      <p><small>Hablar sin leer, de corrido, respondiendo preguntas del libro. Cuenta tu propio texto, no el de otro.</small></p>
      <ul className="library">
        {sp.tasks.map((t) => (
          <li key={t.id}>
            <h3>{t.title}</h3>
            <p><small>{t.function_es} · ~{t.minutes} min · {hint(t.after)}</small></p>
            <button type="button" onClick={() => setView({ kind: "task", task: t })}>Empezar</button>
          </li>
        ))}
      </ul>
      {sp.phrases && (
        <>
          <h2>{sp.phrases.title}</h2>
          <p>Cómo pedir una aclaración y ser cortés: «Come si dice...?», «Cosa vuol dire...?» y otras.</p>
          <p><button type="button" onClick={() => setView({ kind: "phrases" })}>Ver las frases</button></p>
        </>
      )}
      <h2>Fluidez: releer y reescuchar</h2>
      {fluent.length === 0
        ? <p><small>Aparecen aquí las lecturas de las unidades que completes. La fluidez se entrena con lo que ya entiendes.</small></p>
        : <><p><small>Tres pasadas de una lectura que ya conoces: despacio, normal y rápido, con cada vez menos apoyo.</small></p>
          <ul className="library">{fluent.map((r) => <li key={r.id}><h3 lang="it">{r.title}</h3><button type="button" onClick={() => setView({ kind: "fluency", reading: r })}>Empezar</button></li>)}</ul></>}
      <h2>Alfabeto y deletreo</h2>
      <p>Para decir «Come si scrive?» y que te entiendan al deletrear tu nombre.</p>
      <p><button type="button" onClick={() => setView({ kind: "alphabet" })}>Abrir</button></p>
    </main>
  );
}

/** Juego de roles. `onComplete` se llama al terminar la última réplica (el módulo lo usa para marcar la Salida). */
export function RolePlayRun({ rp, reading, store, onExit, onComplete, exitLabel = "Volver a Hablar" }: { rp: RolePlay; reading: Reading; store: Store; onExit: () => void; onComplete?: () => void; exitLabel?: string }) {
  const turns = turnsOf(rp, reading);
  const speakers = speakersOf(turns);
  const player = usePlayer();
  const [me, setMe] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const gaps = useRef<number[]>([]);
  const mark = useRef(Date.now());
  const logged = useRef(false);
  const rec = useRecorder();
  const turn = me ? turns[i] : undefined;
  const mine = !!turn && turn.speaker === me;
  useEffect(() => { // la otra voz habla sola al llegar su turno
    if (turn && !mine) void player(turn.sentence.it);
    return () => stopSay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, me]);
  const next = () => { gaps.current.push((Date.now() - mark.current) / 1000); mark.current = Date.now(); setReveal(false); rec.reset(); setI((x) => x + 1); };
  const finished = me !== null && i >= turns.length;
  useEffect(() => { // el tiempo de la vuelta suma una sola vez a «Escribir y hablar»
    if (finished && !logged.current) { logged.current = true; void addDaySeconds(store, "salida", cappedSeconds(gaps.current)); onComplete?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, store]);
  if (!me) {
    return (
      <main>
        <h1>{rp.title}</h1>
        <p>{rp.goal_es}</p>
        <p>¿Qué voz quieres decir tú? La otra la dice la app.</p>
        <ul className="options">{speakers.map((s) => <li key={s}><button type="button" onClick={() => { setMe(s); mark.current = Date.now(); }}>{s}</button></li>)}</ul>
        <p><small>Diálogo de {reading.source.book} ({reading.source.authors}), {reading.source.license}. Traducción al español: IA, sin revisar por un nativo.</small></p>
        <p><button type="button" onClick={onExit}>‹ Volver</button></p>
      </main>
    );
  }
  if (finished) {
    const sum = ratingSummary(ratings);
    return (
      <main className="center">
        <h1>Listo</h1>
        <p>Dijiste {ratings.length} frases: {sum.bien} bien, {sum.casi} casi, {sum.otra} para repetir. Es tu propia nota: la app no escuchó tu pronunciación.</p>
        <p><small>Se sumaron ~{Math.max(1, Math.round(cappedSeconds(gaps.current) / 60))} min a «Escribir y hablar».</small></p>
        {sum.otra + sum.casi > 0 && <p>Repítelo otro día: lo que dijiste «casi» o «otra vez» es lo que más se gana repitiendo.</p>}
        <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={onExit}>{exitLabel}</button></div>
      </main>
    );
  }
  const t = turn!;
  return (
    <main>
      <p className="runner-meta">Turno {i + 1} de {turns.length} · tú eres «{me}»</p>
      {!mine ? (
        <>
          <h2>{t.speaker} dice…</h2>
          <p><button type="button" onClick={() => void player(t.sentence.it)}>🔊 Escuchar otra vez</button></p>
          <details><summary>Ver el texto</summary><p lang="it" className="big">{t.sentence.it}</p><p><small>{t.sentence.es}</small></p></details>
          <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={next}>Continuar</button></div>
        </>
      ) : (
        <>
          <h2>Tu turno: di en italiano</h2>
          <p className="big">{t.sentence.es}</p>
          {!reveal && (
            <>
              <p>
                {rec.phase === "idle" && <button type="button" onClick={() => void rec.start()}>🎙 Grabarme</button>}
                {rec.phase === "recording" && <button type="button" onClick={rec.stop}>⏹ Terminar</button>}
                {rec.phase === "done" && <span>{rec.problem ?? "Grabado."} {rec.url && <audio controls src={rec.url} aria-label="Tu grabación" />}</span>}
              </p>
              <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={() => { setReveal(true); void player(t.sentence.it); }}>Ver cómo se dice</button></div>
            </>
          )}
          {reveal && (
            <div className="feedback" role="status" data-state="correct">
              <div>
                <p className="head">Modelo</p>
                <p lang="it" className="big">{t.sentence.it}</p>
                <p><button type="button" onClick={() => void player(t.sentence.it)}>🔊 Otra vez</button> <button type="button" aria-label="Escuchar más lento" onClick={() => void player(t.sentence.it, 0.7)}>🐢 Lento</button></p>
                <p className="again">Compárate con el modelo. ¿Cómo te fue?</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["bien", "casi", "otra"] as const).map((r) => <button key={r} type="button" className={r === "bien" ? "primary" : ""} style={{ flex: 1 }} onClick={() => { setRatings((x) => [...x, r]); next(); }}>{r === "bien" ? "Bien" : r === "casi" ? "Casi" : "Otra vez"}</button>)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

/** Tarea oral. Con `onComplete` (examen de hito) termina entregando cuántos puntos de la rúbrica cumpliste, en vez de volver a Hablar. */
export function TaskRun({ task, store, onExit, onComplete }: { task: SpeakingTask; store: Store; onExit: () => void; onComplete?: (checked: number, total: number) => void }) {
  const player = usePlayer();
  const rec = useRecorder();
  const [phase, setPhase] = useState<"prep" | "speak" | "check">("prep");
  const [checks, setChecks] = useState<boolean[]>(task.checklist_es.map(() => false));
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const started = useRef(0);
  const [minutes, setMinutes] = useState(0);
  const prompt = voicePrompt(task);
  const finish = async () => {
    const m = Math.max(1, Math.min(task.minutes * 2, Math.round((Date.now() - started.current) / 60000)));
    setMinutes(m);
    await addDaySeconds(store, "salida", m * 60);
    setPhase("check");
  };
  const copy = async () => { try { await navigator.clipboard.writeText(prompt); setCopied("ok"); } catch { setCopied("fail"); } };
  return (
    <main>
      <h1>{task.title}</h1>
      <p>{task.intro_es}</p>
      <ul className="library">
        {task.questions.map((q) => (
          <li key={q.it}>
            <button type="button" className="mini" aria-label={`Escuchar: ${q.it}`} onClick={() => void player(q.it)}>🔊</button> <span lang="it">{q.it}</span><br /><small>{q.es}</small>
          </li>
        ))}
      </ul>
      {phase === "prep" && (
        <>
          <p>Mira las preguntas, <strong>tápalas</strong> y habla sin leer. Puedes grabarte para escucharte después.</p>
          <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={() => { started.current = Date.now(); setPhase("speak"); void rec.start(); }}>🎙 Empezar a hablar</button></div>
        </>
      )}
      {phase === "speak" && (
        <>
          <p role="status">{rec.phase === "recording" ? "Grabando… habla todo lo que puedas." : rec.problem ?? "Habla en voz alta."}</p>
          <div style={{ marginTop: 16 }}><button type="button" className="primary block" onClick={() => { if (rec.phase === "recording") rec.stop(); void finish(); }}>Terminé</button></div>
        </>
      )}
      {phase === "check" && (
        <>
          {rec.url && <p><audio controls src={rec.url} aria-label="Tu grabación" style={{ width: "100%" }} /></p>}
          <h2>Autoevaluación</h2>
          <p><small>Escúchate y marca lo que sí cumpliste. No hay nota automática: sirve para ver qué repetir.</small></p>
          <ul className="options">
            {task.checklist_es.map((c, i) => <li key={c}><label><input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((x) => x.map((v, k) => (k === i ? e.target.checked : v)))} /> {c}</label></li>)}
          </ul>
          <p role="status">Cumpliste {checks.filter(Boolean).length} de {checks.length}. Se sumaron {minutes} min a «Escribir y hablar».</p>
          <details>
            <summary>Practicar con una IA gratuita en modo de voz</summary>
            <p><small>Pega este encargo en la app gratuita de ChatGPT, Gemini o Claude y usa su modo de voz. La IA puede equivocarse al corregir: tómalo como una segunda opinión, no como verdad.</small></p>
            <textarea readOnly rows={8} value={prompt} aria-label="Encargo para la IA" style={{ width: "100%" }} onFocus={(e) => e.currentTarget.select()} />
            <p><button type="button" onClick={() => void copy()}>Copiar encargo</button> {copied === "ok" && <span role="status">Copiado.</span>}{copied === "fail" && <span role="status">No se pudo copiar: selecciona el texto.</span>}</p>
          </details>
          <p><small>Preguntas de {task.source.book} ({task.source.authors}), {task.source.license}: <a href={task.source.url} target="_blank" rel="noopener noreferrer">{task.source.chapter}</a>. {task.adaptation} Traducciones y rúbrica: IA, sin revisar por un nativo.</small></p>
          <div style={{ marginTop: 16 }}>{onComplete
            ? <button type="button" className="primary block" onClick={() => onComplete(checks.filter(Boolean).length, checks.length)}>Ver mi resultado</button>
            : <button type="button" className="primary block" onClick={onExit}>Volver a Hablar</button>}</div>
        </>
      )}
      {phase !== "check" && <p><button type="button" onClick={onExit}>‹ Volver</button></p>}
    </main>
  );
}

function AlphabetPanel({ speaking, onExit }: { speaking: Speaking; onExit: () => void }) {
  const player = usePlayer();
  const [name, setName] = useState("");
  const [playing, setPlaying] = useState(false);
  const cancel = useRef(false);
  const letters = spell(name, speaking.alphabet);
  const playSpelling = async () => {
    cancel.current = false; setPlaying(true);
    for (const l of letters) {
      if (cancel.current || !l.name) continue;
      const r = await player(l.name);
      if (r === "superseded" || r === "no_voice") break;
      await waitCurrentEnd();
    }
    setPlaying(false);
  };
  return (
    <main>
      <h1>Alfabeto y deletreo</h1>
      <p>Toca una letra para oír su nombre en italiano. En una conversación se pregunta «Come si scrive?» y se deletrea letra por letra.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {speaking.alphabet.letters.map((l) => <button key={l.letter} type="button" style={{ minHeight: 40, padding: "4px 10px" }} aria-label={`Letra ${l.letter}: ${l.name}`} onClick={() => void player(l.name)}><strong>{l.letter.toUpperCase()}</strong> <small>{l.name}</small></button>)}
      </div>
      <p><small>{speaking.alphabet.missing_es} Fuente: {speaking.alphabet.source.book} ({speaking.alphabet.source.authors}), {speaking.alphabet.source.license}.</small></p>
      <h2>Deletrea tu nombre</h2>
      <label htmlFor="spell-name">Tu nombre</label>{" "}
      <input id="spell-name" value={name} autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setName(e.target.value)} />
      {letters.length > 0 && (
        <>
          <p lang="it" className="big" aria-label="Nombres de las letras">{letters.map((l) => l.name ?? `(${l.ch}: sin nombre en la tabla)`).join(" – ")}</p>
          <p>{playing ? <button type="button" onClick={() => { cancel.current = true; stopSay(); setPlaying(false); }}>⏹ Detener</button> : <button type="button" onClick={() => void playSpelling()}>🔊 Escuchar el deletreo</button>}</p>
          <p><small>Ahora dilo tú en voz alta sin mirar, y comprueba.</small></p>
        </>
      )}
      <p><button type="button" onClick={onExit}>‹ Volver</button></p>
    </main>
  );
}

export function PhrasesPanel({ phrases, onExit, only }: { phrases: NonNullable<Speaking["phrases"]>; onExit: () => void; only?: string[] }) {
  const player = usePlayer();
  const [shown, setShown] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setShown((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <main>
      <h1>{phrases.title}</h1>
      <p>{phrases.intro_es}</p>
      {phrases.groups.filter((g) => !only || only.includes(g.id)).map((g) => (
        <section key={g.id} aria-label={g.title}>
          <h2>{g.title}</h2>
          <ul className="library">
            {g.items.map((p) => (
              <li key={p.it}>
                <p className="big">{p.es}</p>
                <button type="button" aria-expanded={shown.has(p.it)} onClick={() => { toggle(p.it); if (!shown.has(p.it)) void player(p.it); }}>{shown.has(p.it) ? "Ocultar" : "Ver cómo se dice"}</button>
                {shown.has(p.it) && <p lang="it" className="big">{p.it} <button type="button" className="mini" aria-label={`Escuchar: ${p.it}`} onClick={() => void player(p.it)}>🔊</button></p>}
              </li>
            ))}
          </ul>
          <p><small>{g.missing_es} Fuente: {g.source.book} ({g.source.authors}), {g.source.license}, <a href={g.source.url} target="_blank" rel="noopener noreferrer">{g.source.chapter}</a>. Traducciones: IA, sin revisar por un nativo.</small></p>
        </section>
      ))}
      <p><button type="button" onClick={onExit}>‹ Volver</button></p>
    </main>
  );
}

/** Releer y reescuchar a velocidad creciente. `onComplete` se llama al terminar las tres pasadas. */
export function FluencyRun({ reading, store, onExit, onComplete }: { reading: Reading; store: Store; onExit: () => void; onComplete?: () => void }) {
  const player = usePlayer();
  const [pass, setPass] = useState(0);
  const [playing, setPlaying] = useState<number | null>(null);
  const [finished, setFinished] = useState<boolean[]>(PASSES.map(() => false));
  const [peek, setPeek] = useState(false);
  const cancel = useRef(false);
  const seconds = useRef(0);
  const logged = useRef(false);
  const run = async () => {
    cancel.current = false;
    const t0 = Date.now();
    for (let i = 0; i < reading.sentences.length && !cancel.current; i++) {
      setPlaying(i);
      const r = await player(reading.sentences[i].it, PASSES[pass].rate);
      if (r === "superseded" || r === "no_voice") { cancel.current = true; break; }
      await waitCurrentEnd();
    }
    seconds.current += Math.min((Date.now() - t0) / 1000, 600);
    setPlaying(null);
    if (!cancel.current) {
      const next = finished.map((v, k) => v || k === pass);
      setFinished(next);
      if (next.every(Boolean)) onComplete?.();
    }
  };
  const stop = () => { cancel.current = true; stopSay(); setPlaying(null); };
  useEffect(() => () => { // si la pantalla se cierra sin pulsar «Salir» (p. ej. al terminar las tres pasadas), el tiempo se registra igual
    cancel.current = true; stopSay();
    if (!logged.current && seconds.current > 0) { logged.current = true; void addDaySeconds(store, "fluidez", Math.round(seconds.current)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const leave = () => {
    stop();
    if (!logged.current && seconds.current > 0) { logged.current = true; void addDaySeconds(store, "fluidez", Math.round(seconds.current)); }
    onExit();
  };
  const p = PASSES[pass];
  const show = p.showText || peek;
  return (
    <main>
      <h1 lang="it">{reading.title}</h1>
      <p className="runner-meta">Pasada {pass + 1} de {PASSES.length}: {p.label} (×{p.rate})</p>
      <p>{p.help}</p>
      <p>{playing === null ? <button type="button" className="primary" onClick={() => void run()}>🔊 Escuchar esta pasada</button> : <button type="button" onClick={stop}>⏹ Detener</button>}</p>
      {!p.showText && <p><label><input type="checkbox" checked={peek} onChange={(e) => setPeek(e.target.checked)} /> Ver el texto</label></p>}
      <div className="reading">
        {reading.sentences.map((s, i) => (
          <p key={s.id} data-playing={playing === i ? "true" : undefined}>
            {s.speaker && <strong className="speaker">{s.speaker}: </strong>}
            {show ? <span lang="it">{s.it}</span> : <span aria-hidden="true">· · ·</span>}
          </p>
        ))}
      </div>
      <p>
        {pass > 0 && <button type="button" onClick={() => { stop(); setPeek(false); setPass(pass - 1); }}>‹ Pasada anterior</button>}{" "}
        {pass < PASSES.length - 1 && <button type="button" disabled={!finished[pass]} onClick={() => { stop(); setPeek(false); setPass(pass + 1); }}>Siguiente pasada →</button>}
      </p>
      <p><small>Se suma a «Fluidez» el tiempo que pasas escuchando.</small></p>
      <p><button type="button" className={finished.every(Boolean) ? "primary" : ""} onClick={leave}>{finished.every(Boolean) ? "Terminar" : "← Salir"}</button></p>
    </main>
  );
}
