import type { Manifest, PackSentence, Reading } from "../content/load";

const REVIEWER: Record<string, string> = { me: "revisadas por ti (sin conocimientos de italiano)", "llm-audit": "auditadas por IA" };

export function AboutScreen({ manifest, sentences, readings = [] }: { manifest: Manifest; sentences: PackSentence[]; readings?: Reading[] }) {
  return (
    <main>
      <p><a className="tap" href="#/progreso" style={{ textDecoration: "none" }}>← Progreso</a></p>
      <h1>Cómo se revisó este contenido</h1>
      <p>El contenido fue revisado con ayuda de IA y por una persona que no sabe italiano: sin validación de nativos. Puede haber errores.</p>
      <ul>
        {Object.entries(manifest.reviewers).map(([who, n]) => (
          <li key={who}>{n} oraciones {REVIEWER[who] ?? `revisadas por ${who}`}</li>
        ))}
      </ul>
      <p>Algunas oraciones tienen la traducción al español generada por IA (se marcan «traducción de IA»).</p>
      <h2>Voces</h2>
      <p>Las oraciones se escuchan con una voz sintética: Piper «it_IT-serena-high» (datos de entrenamiento CC BY 4.0), generada automáticamente; no es una persona. En los diálogos, una segunda voz sintética (Piper «it_IT-paola-medium», CC0) hace de interlocutor; ambas son voces femeninas, así que se distinguen poco.</p>
      <p>Algunas palabras sueltas usan grabaciones de hablantes nativos de Lingua Libre (CC BY-SA 4.0). Si falta el clip, suena la voz del sistema. Licencias y hablantes: <a href={`${import.meta.env.BASE_URL ?? "./"}audio/ATTRIBUZIONI-audio.md`}>Atribuciones de audio</a>.</p>
      <h2>Atribuciones</h2>
      <p>Las oraciones provienen de Tatoeba (tatoeba.org) bajo la licencia CC BY 2.0 FR.</p>
      {readings.length > 0 && (
        <>
          <h2>Lecturas y diálogos</h2>
          <p>Los textos italianos de las lecturas son de libros abiertos (licencias CC BY-NC). La traducción al español es de IA y no fue revisada por un nativo; las preguntas están escritas en español.</p>
          <ul className="attributions">
            {readings.filter((r) => !r.authored).map((r) => (
              <li key={r.id}>«{r.title}» — <a href={r.source.url}>{r.source.book}</a>, {r.source.authors} ({r.source.license})</li>
            ))}
          </ul>
          {readings.some((r) => r.authored) && (
            <>
              <h3>Textos escritos por la IA</h3>
              <p>Cuando no se encontró una fuente abierta (por ejemplo, el bar con caja, la tienda, el tiempo, los mensajes, el menú o el horario), los textos los <strong>escribió la IA (Claude)</strong> a pedido tuyo, con italiano simple y apoyándose en frases de libros abiertos. No son de un libro y <strong>no los revisó un hablante nativo</strong>: pueden tener errores o sonar poco naturales.</p>
              <ul className="attributions">
                {readings.filter((r) => r.authored).map((r) => <li key={r.id}>«{r.title}»</li>)}
              </ul>
            </>
          )}
        </>
      )}
      <ul className="attributions">
        {sentences.map((s) => (
          <li key={s.id}>
            «{s.it}» — autor del italiano: {s.author}
            {s.translation_kind === "llm" ? "; traducción de IA" : `; traducción: ${s.es_author}`}
            {s.source_id && <> · <a href={`https://tatoeba.org/es/sentences/show/${s.source_id}`}>ver en Tatoeba</a></>}
          </li>
        ))}
      </ul>
    </main>
  );
}
