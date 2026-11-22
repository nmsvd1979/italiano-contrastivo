import { useState } from "react";
import { alignWords } from "../state/align";
import { buildCorrectionPrompt, extractCorrected, LEVELS, type Level } from "../state/correctionPrompt";
import { Marked } from "./kit/Feedback";

const AIS = [["Claude", "https://claude.ai/new"], ["ChatGPT", "https://chatgpt.com/"], ["Gemini", "https://gemini.google.com/app"]] as const;

/**
 * «Pedir corrección»: la app prepara el encargo (nivel, reglas, tu texto), tú lo pegas en una IA gratuita y vuelves con la respuesta;
 * entonces te muestra con claridad qué cambió. La IA no es un nativo: puede equivocarse, y el encargo le pide que avise si duda.
 */
export function CorrectionPanel({ text, defaultLevel = "A1" }: { text: string; defaultLevel?: Level }) {
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [task, setTask] = useState("");
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const [reply, setReply] = useState("");
  const prompt = buildCorrectionPrompt({ level, text, task });
  const corrected = reply.trim() ? extractCorrected(reply) : null;
  const diff = corrected ? alignWords(text, corrected) : null;

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
      <textarea id="corr-reply" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} />
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
        </div>
      )}
    </section>
  );
}
