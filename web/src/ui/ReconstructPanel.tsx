import { useMemo, useState } from "react";
import type { ContentPack } from "../content/load";
import { alignWords } from "../state/align";
import { SpeakButton } from "./SpeakButton";
import { Marked } from "./kit/Feedback";

const CHUNK = 3; // frases por fragmento: lo bastante corto para recordarlo, lo bastante largo para que cueste

/**
 * Reconstruir de memoria (el «andamiaje inverso» de las fuentes): lees y escuchas un fragmento real, lo tapas y lo escribes como
 * lo recuerdes. La app te muestra, en orden, qué palabras recuperaste, cuáles faltaron y cuáles sobraron. Sin IA ni servidor.
 */
export function ReconstructPanel({ pack }: { pack: ContentPack }) {
  const readings = useMemo(() => (pack.readings ?? []).filter((r) => r.sentences.length >= CHUNK).sort((a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title)), [pack]);
  const [rid, setRid] = useState(readings[0]?.id ?? "");
  const [chunk, setChunk] = useState(0);
  const [phase, setPhase] = useState<"read" | "write" | "result">("read");
  const [mine, setMine] = useState("");
  const reading = readings.find((r) => r.id === rid);
  if (!reading) return <p>Todavía no hay textos para reconstruir.</p>;
  const chunks = Math.ceil(reading.sentences.length / CHUNK);
  const sentences = reading.sentences.slice(chunk * CHUNK, chunk * CHUNK + CHUNK);
  const original = sentences.map((s) => s.it).join(" ");
  const result = phase === "result" ? alignWords(original, mine) : null;
  const go = (r: string, c: number) => { setRid(r); setChunk(c); setMine(""); setPhase("read"); };

  return (
    <section>
      <label htmlFor="rec-text">Texto</label>
      <select id="rec-text" value={rid} onChange={(e) => go(e.target.value, 0)}>
        {readings.map((r) => <option key={r.id} value={r.id}>{r.level} · {r.title}</option>)}
      </select>
      <p><small>Fragmento {chunk + 1} de {chunks} · «{reading.title}», {reading.source.book} ({reading.source.license})</small></p>

      {phase === "read" && (
        <>
          <p>Lee el fragmento y escúchalo dos o tres veces. Fíjate en los artículos, las terminaciones y las preposiciones: eso es lo que luego vas a tener que recordar.</p>
          {sentences.map((s) => (
            <div key={s.id}><p className="big" lang="it">{s.it}</p><p><small>{s.es}</small></p><SpeakButton text={s.it} /></div>
          ))}
          <div className="actions-bottom above-tabs"><button type="button" className="primary block" onClick={() => setPhase("write")}>Taparlo y escribir</button></div>
        </>
      )}

      {phase === "write" && (
        <>
          <p>Escribe en italiano lo que recuerdes del fragmento, con tus palabras si no recuerdas las exactas. No importa que esté incompleto.</p>
          <textarea lang="it" aria-label="Lo que recuerdo" rows={6} value={mine} autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setMine(e.target.value)} />
          <div className="actions-bottom above-tabs"><button type="button" className="primary block" disabled={!mine.trim()} onClick={() => setPhase("result")}>Comprobar</button></div>
        </>
      )}

      {result && (
        <>
          <h2>Recuperaste {result.matched} de {result.total} palabras</h2>
          <p><small>En orden y con acentos. Lo marcado en el texto original es lo que te faltó; lo marcado en lo tuyo, lo que sobró o estaba en otro lugar.</small></p>
          <p className="big" lang="it"><Marked segs={result.original} /></p>
          <p><strong>Lo que escribiste:</strong></p>
          <p lang="it">{result.mine.length ? <Marked segs={result.mine} /> : "—"}</p>
          <div className="actions-bottom above-tabs" style={{ display: "grid", gap: 8 }}>
            <button type="button" className="primary block" onClick={() => go(rid, chunk)}>Volver a leerlo</button>
            {chunk + 1 < chunks
              ? <button type="button" className="block" onClick={() => go(rid, chunk + 1)}>Siguiente fragmento</button>
              : <button type="button" className="block" onClick={() => go(readings[(readings.findIndex((r) => r.id === rid) + 1) % readings.length].id, 0)}>Otro texto</button>}
          </div>
        </>
      )}
    </section>
  );
}
