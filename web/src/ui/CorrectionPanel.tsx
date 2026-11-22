import { useState } from "react";
import { alignWords } from "../state/align";
import { fixCard, fixesFromCorrection } from "../state/fixes";
import type { Store } from "../state/store";
import { buildCorrectionPrompt, extractCorrected, LEVELS, type Level } from "../state/correctionPrompt";
import { Marked } from "./kit/Feedback";

const AIS = [["Claude", "https://claude.ai/new"], ["ChatGPT", "https://chatgpt.com/"], ["Gemini", "https://gemini.google.com/app"]] as const;

/**
 * «Pedir corrección»: la app prepara el encargo (nivel, reglas, tu texto), tú lo pegas en una IA gratuita y vuelves con la respuesta;
 * entonces te muestra con claridad qué cambió. La IA no es un nativo: puede equivocarse, y el encargo le pide que avise si duda.
 */
export function CorrectionPanel({ text, store, defaultLevel = "A1" }: { text: string; store: Store; defaultLevel?: Level }) {
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [task, setTask] = useState("");
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const [reply, setReply] = useState("");
  const [saved, setSaved] = useState<{ added: number; total: number } | null>(null);
  const prompt = buildCorrectionPrompt({ level, text, task });
  const corrected = reply.trim() ? extractCorrected(reply) : null;
  const diff = corrected ? alignWords(text, corrected) : null;

  const fixes = corrected ? fixesFromCorrection(text, corrected) : [];
  const saveFixes = async () => {
    const have = new Set((await store.allCards()).map((c) => c.id));
    let added = 0;
    for (const f of fixes) {
      const card = fixCard(f, new Date());
      if (have.has(card.id)) continue;
      await store.putCard(card);
      added++;
    }
    setSaved({ added, total: fixes.length });
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); setCopied("ok"); } catch { setCopied("fail"); }
  };
  return (
    <section aria-label="Pedir corrección">
      <h2>Pedir una corrección más completa</h2>
      <p>La revisión de arriba solo busca 8 errores. Para una corrección real, usa una IA gratuita: la app te prepara el encargo y luego te enseña qué cambió.</p>
      <label htmlFor="corr-level">Tu nivel</label>
      <select id="corr-level" value={level} onChange={(e) => setLevel(e.target.value as Level)}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
      <label htmlFor="corr-task">¿Qué querías lograr? (opcional)</label>
      <input id="corr-task" value={task} onChange={(e) => setTask(e.target.value)} placeholder="p. ej. presentarme a un compañero" style={{ width: "100%" }} />
      <p><button type="button" className="primary" onClick={() => void copy()}>Copiar el encargo</button>{" "}
        {copied === "ok" && <small role="status">Copiado. Pégalo en la IA.</small>}
        {copied === "fail" && <small role="alert">No pude copiar solo: selecciona el texto de abajo y cópialo.</small>}</p>
      <details><summary>Ver el encargo</summary><pre className="prompt" aria-label="Encargo">{prompt}</pre></details>
      <p>Abrir: {AIS.map(([name, url], i) => <span key={name}>{i > 0 && " · "}<a href={url} target="_blank" rel="noopener noreferrer">{name}</a></span>)}</p>

      <label htmlFor="corr-reply">Pega aquí la respuesta de la IA</label>
      <textarea id="corr-reply" rows={5} value={reply} onChange={(e) => { setReply(e.target.value); setSaved(null); }} />
      {reply.trim() && !corrected && <p role="alert">No encontré la línea «TEXTO CORREGIDO:» en esa respuesta. Pídele a la IA: «termina con TEXTO CORREGIDO: y el texto completo».</p>}
      {diff && (
        <div role="status">
          <h3>Qué cambió</h3>
          {diff.original.every((s) => !s.changed) && diff.mine.every((s) => !s.changed)
            ? <p>La IA no cambió nada: tu texto ya estaba bien según ella (no es un nativo).</p>
            : <>
                <p><small>Tu texto, con lo que cambió marcado:</small></p>
                <p className="big" lang="it"><Marked segs={diff.original} /></p>
                <p><small>Corregido, con lo nuevo marcado:</small></p>
                <p className="big" lang="it"><Marked segs={diff.mine} /></p>
              </>}
          {fixes.length > 0 && (
            <p>
              <button type="button" className="primary" disabled={saved !== null} onClick={() => void saveFixes()}>Guardar {fixes.length} {fixes.length === 1 ? "corrección" : "correcciones"} para repasarlas</button>{" "}
              {saved && <small role="status">{saved.added === 0 ? "Ya estaban guardadas." : `Guardadas ${saved.added}: saldrán en tu repaso.`}</small>}
              <br /><small>Cada oración corregida se vuelve un ejercicio de repaso espaciado (un hueco con lo que cambió).</small>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
