import { useState } from "react";
import type { ContentPack } from "../content/load";
import { detectErrors, type WritingError } from "../writing/detect";
import type { Store } from "../state/store";
import { CorrectionPanel } from "./CorrectionPanel";
import { useStrandTimer } from "./kit/useStrandTimer";
import { ReconstructPanel } from "./ReconstructPanel";

type Mode = "reconstruir" | "texto";

export function WriteScreen({ pack, store }: { pack: ContentPack; store: Store }) {
  const [mode, setMode] = useState<Mode>("reconstruir");
  useStrandTimer(store, "salida");
  return (
    <main>
      <h1>Escribir</h1>
      <div role="group" aria-label="Qué quieres hacer" style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
        <button type="button" aria-pressed={mode === "reconstruir"} className={mode === "reconstruir" ? "primary" : ""} style={{ flex: 1 }} onClick={() => setMode("reconstruir")}>Reconstruir un texto</button>
        <button type="button" aria-pressed={mode === "texto"} className={mode === "texto" ? "primary" : ""} style={{ flex: 1 }} onClick={() => setMode("texto")}>Mi propio texto</button>
      </div>
      {mode === "reconstruir" ? <ReconstructPanel pack={pack} /> : <OwnText store={store} />}
    </main>
  );
}

function OwnText({ store }: { store: Store }) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<{ text: string; errors: WritingError[] } | null>(null);
  return (
    <section>
      <p>Escribe en italiano y revisa los errores típicos de hispanohablantes. El texto no sale de tu teléfono ni se guarda, salvo que tú lo copies para pedir una corrección.</p>
      <label htmlFor="write-text">Tu texto en italiano</label>
      <textarea id="write-text" lang="it" rows={5} value={text} onChange={(e) => { setText(e.target.value); setChecked(null); }} />
      <button type="button" disabled={!text.trim()} onClick={() => setChecked({ text, errors: detectErrors(text) })}>Revisar</button>
      {checked && (
        <section aria-live="polite">
          {checked.errors.length === 0 ? (
            <p>No encontré ninguno de los 8 errores que sé buscar. Eso no quiere decir que el texto esté bien: no reviso ortografía ni gramática en general.</p>
          ) : (
            <ul>
              {checked.errors.map((e) => (
                <li key={`${e.code}-${e.start}`}>
                  <strong lang="it">«{e.found}»</strong>{e.suggestion ? <> → <strong lang="it">{e.suggestion}</strong></> : <> → quitar</>}
                  <p>{e.message}</p>
                </li>
              ))}
            </ul>
          )}
          <p><small>Revisión automática con reglas propias; cubre solo 8 patrones y puede equivocarse.</small></p>
        </section>
      )}
      {text.trim() && <CorrectionPanel text={text} store={store} />}
    </section>
  );
}
