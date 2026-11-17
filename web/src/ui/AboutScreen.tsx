import type { Manifest, PackSentence } from "../content/load";

const REVIEWER: Record<string, string> = { me: "revisadas por ti (sin conocimientos de italiano)", "llm-audit": "auditadas por IA" };

export function AboutScreen({ manifest, sentences }: { manifest: Manifest; sentences: PackSentence[] }) {
  return (
    <main>
      <h1>Cómo se revisó este contenido</h1>
      <p>El contenido fue revisado con ayuda de IA y por una persona que no sabe italiano: sin validación de nativos. Puede haber errores.</p>
      <ul>
        {Object.entries(manifest.reviewers).map(([who, n]) => (
          <li key={who}>{n} oraciones {REVIEWER[who] ?? `revisadas por ${who}`}</li>
        ))}
      </ul>
      <p>Algunas oraciones tienen la traducción al español generada por IA (se marcan «traducción de IA»).</p>
      <h2>Voces</h2>
      <p>Las oraciones se escuchan con una voz sintética: Piper «it_IT-serena-high» (datos de entrenamiento CC BY 4.0), generada automáticamente; no es una persona.</p>
      <p>Algunas palabras sueltas usan grabaciones de hablantes nativos de Lingua Libre (CC BY-SA 4.0). Si falta el clip, suena la voz del sistema.</p>
      <h2>Atribuciones</h2>
      <p>Las oraciones provienen de Tatoeba (tatoeba.org) bajo la licencia CC BY 2.0 FR.</p>
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
