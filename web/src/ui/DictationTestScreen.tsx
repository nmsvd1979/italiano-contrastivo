import { useMemo, useRef, useState } from "react";
import type { ContentPack } from "../content/load";
import { type Attempt, buildDictationItems, classify, type DictItem, type Method, reportText, summarize, verdict } from "../state/dictationTest";
import { SpeakButton } from "./SpeakButton";
import { stopSay } from "./speech";

type Recognizer = { abort?: () => void; lang: string; interimResults: boolean; maxAlternatives: number; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const recognizerCtor = (): (new () => Recognizer) | null => {
  const w = window as unknown as Record<string, new () => Recognizer>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const standalone = () => { try { return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true; } catch { return false; } };

const OUTCOME: Record<string, string> = {
  exacto: "Exacto: el teléfono escribió justo lo que dijiste.", cerca: "Cerca: casi todo coincide.", lejos: "Lejos: el teléfono entendió otra cosa.",
  fiel: "Fiel: escribió lo que dijiste.", confundido: "Confundido: escribió la OTRA palabra (la consonante simple/doble se perdió o se corrigió).", otro: "Otra cosa distinta.",
};

/**
 * Prueba técnica: ¿sirve el dictado del iPhone para comprobar tu pronunciación? No es parte del curso. Se hace una vez, en el teléfono,
 * y el resumen se copia para decidir cómo se construye (o no) la parte de hablar. Todo ocurre en el dispositivo; no se guarda nada.
 */
export function DictationTestScreen({ pack }: { pack: ContentPack }) {
  const items = useMemo(() => buildDictationItems(pack), [pack]);
  const SR = recognizerCtor();
  const env = `${standalone() ? "app instalada" : "navegador"}; reconocimiento del navegador: ${SR ? "sí" : "no"}; ${navigator.userAgent}`;
  const [stage, setStage] = useState<"intro" | "run" | "summary">("intro");
  const [idx, setIdx] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [typed, setTyped] = useState("");
  const [last, setLast] = useState<Attempt | null>(null);
  const [listening, setListening] = useState(false);
  const [apiNote, setApiNote] = useState<string | null>(null);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const rec = useRef<Recognizer | null>(null);

  const record = (item: DictItem, heard: string, method: Method) => {
    const c = classify(item, heard);
    const a: Attempt = { id: item.id, kind: item.kind, say: item.say, heard, method, ...c };
    setAttempts((xs) => [...xs, a]);
    setLast(a);
  };
  const next = () => { setTyped(""); setLast(null); setApiNote(null); if (idx + 1 >= items.length) setStage("summary"); else setIdx(idx + 1); };

  const listen = (item: DictItem) => {
    if (!SR) return;
    setApiNote(null);
    stopSay();                         // el modelo sonando ocupa el audio del iPhone y el reconocimiento se aborta
    try { rec.current?.abort?.(); } catch { /* ya terminó */ }
    const r = new SR();
    r.lang = "it-IT"; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => { const t = e.results[0]?.[0]?.transcript ?? ""; record(item, t, "navegador"); };
    r.onerror = (e) => setApiNote(`El navegador respondió con un error: «${e.error}». Eso también es un resultado.${e.error === "aborted" ? " «aborted» suele ser que el sistema cortó el micrófono (audio sonando, otra app, o app instalada): prueba también abriendo la página en Safari, sin instalar." : ""}`);
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    try { r.start(); } catch (e) { setListening(false); setApiNote(`No se pudo iniciar: ${(e as Error).message}`); }
  };

  if (stage === "intro") {
    return (
      <main>
        <h1>Prueba del dictado</h1>
        <p>Es una prueba técnica de 10 minutos, <strong>una sola vez y en tu iPhone</strong>, para saber si el dictado del teléfono puede comprobar tu pronunciación del italiano. No es parte del curso y nada se guarda.</p>
        <h2>Antes de empezar</h2>
        <ol>
          <li>En <strong>Ajustes → General → Teclado → Teclados</strong>, agrega el teclado <strong>Italiano</strong>, y activa <strong>Dictado</strong> (misma pantalla, más abajo).</li>
          <li>En cada ejercicio toca la caja de texto, cambia al teclado italiano con la tecla 🌐 y toca el <strong>micrófono</strong> del teclado. Habla, espera a que se escriba y toca «Comprobar».</li>
          <li>Di cada frase <strong>con naturalidad</strong>. En los pares «nono / nonno» di exactamente lo que se pide: si pronuncias bien la consonante doble, es justo lo que se quiere medir.</li>
          <li>Si el dictado pide internet, hazlo con conexión.</li>
        </ol>
        <p><small>{items.length} ejercicios. {SR ? "Este navegador ofrece además reconocimiento de voz propio: se probará aparte, con un botón 🎙." : "Este navegador NO ofrece reconocimiento de voz propio; solo se probará el dictado del teclado."}</small></p>
        <div className="actions-bottom above-tabs"><button type="button" className="primary block" onClick={() => setStage("run")}>Empezar</button></div>
      </main>
    );
  }

  if (stage === "summary") {
    const methods: Method[] = ["teclado", "navegador"];
    const text = reportText(attempts, env);
    return (
      <main>
        <h1>Resultado</h1>
        {methods.map((m) => {
          const s = summarize(attempts, m);
          return (
            <section key={m}>
              <h2>{m === "teclado" ? "Dictado del teclado" : "Reconocimiento del navegador"}</h2>
              <p>Frases: {s.frases.exacto} exactas y {s.frases.cerca} cercanas de {s.frases.n}. Pares simple/doble: {s.pares.fiel} fieles y {s.pares.confundido} confundidos de {s.pares.n}.</p>
              <p><strong>{verdict(s)}</strong></p>
            </section>
          );
        })}
        <p><button type="button" className="primary" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied("ok"); } catch { setCopied("fail"); } }}>Copiar resultados</button>{" "}
          {copied === "ok" && <small role="status">Copiado: pégalo en la conversación.</small>}
          {copied === "fail" && <small role="alert">No pude copiar: selecciona el texto de abajo.</small>}</p>
        <details><summary>Ver el detalle</summary><pre className="prompt" aria-label="Detalle">{text}</pre></details>
        <p><button type="button" onClick={() => { setAttempts([]); setIdx(0); setStage("intro"); }}>Repetir la prueba</button></p>
      </main>
    );
  }

  const item = items[idx];
  return (
    <main>
      <h1>Prueba del dictado</h1>
      <p className="runner-meta">Ejercicio {idx + 1} de {items.length}</p>
      {item.kind === "frase"
        ? <><p>Di esta frase en voz alta:</p><p className="big" lang="it">{item.say}</p><p><SpeakButton text={item.say} /></p></>
        : <><p>Di exactamente esto (con la consonante tal como está escrita):</p><p className="big" lang="it">{item.say}</p></>}
      <label htmlFor="dict-box">Lo que escribió el teléfono</label>
      <textarea id="dict-box" lang="it" rows={2} value={typed} disabled={last !== null} autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setTyped(e.target.value)} />
      {last === null ? (
        <div className="actions-bottom above-tabs" style={{ display: "grid", gap: 8 }}>
          <button type="button" className="primary block" disabled={!typed.trim()} onClick={() => record(item, typed, "teclado")}>Comprobar</button>
          {SR && <button type="button" className="block" disabled={listening} onClick={() => listen(item)}>{listening ? "Escuchando…" : "🎙 Probar con el reconocimiento del navegador"}</button>}
        </div>
      ) : (
        <div role="status">
          <p><strong>{last.method === "teclado" ? "Teclado" : "Navegador"}: {OUTCOME[last.outcome]}</strong></p>
          <p><small>Escribió: <span lang="it">{last.heard || "—"}</span></small></p>
          <div className="actions-bottom above-tabs" style={{ display: "grid", gap: 8 }}>
            <button type="button" className="primary block" onClick={next}>{idx + 1 >= items.length ? "Ver resultado" : "Siguiente"}</button>
            {SR && last.method === "teclado" && <button type="button" className="block" disabled={listening} onClick={() => listen(item)}>🎙 Probar también con el navegador</button>}
          </div>
        </div>
      )}
      {apiNote && <p role="alert">{apiNote}</p>}
    </main>
  );
}
