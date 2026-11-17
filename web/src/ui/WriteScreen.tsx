import { useState } from "react";
import { detectErrors, type WritingError } from "../writing/detect";

export function WriteScreen() {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<{ text: string; errors: WritingError[] } | null>(null);
  return (
    <main>
      <h1>Escribir</h1>
      <p>Escribe en italiano y revisa los errores típicos de hispanohablantes. El texto no sale de tu teléfono ni se guarda.</p>
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
    </main>
  );
}
