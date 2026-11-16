/* AUTO-GENERADO por scripts/gen-types.mjs desde schemas/. No editar a mano. */

export type Sentence = {
  id: string;
  source: "tatoeba" | "opus" | "authored";
  /**
   * Id de la oración IT en Tatoeba/OPUS.
   */
  source_id?: string;
  author?: string;
  license?: string;
  it: string;
  es: string;
  cefr_estimate: "A1" | "A2" | "B1" | "B2";
  error_codes?: string[];
  lexeme_ids?: string[];
  /**
   * Hash sha1[0..12] del clip Piper.
   */
  audio?: string;
  review_status: "draft" | "needs_review" | "validated" | "rejected";
  /**
   * Id de la traducción ES directa en Tatoeba/OPUS.
   */
  es_source_id?: string;
  /**
   * direct = enlace Tatoeba ita-spa; pivot = ita→eng→spa.
   */
  translation_kind?: "direct" | "pivot";
  /**
   * Id Tatoeba de la oración inglesa puente.
   */
  pivot_via?: string;
  cefr_confidence?: number;
  qa_flags?: string[];
  /**
   * código de error → id de la regla que lo etiquetó
   */
  tag_rules?: {
    [k: string]: string;
  };
  /**
   * Autor de la oración española (CC BY exige atribuir también la traducción).
   */
  es_author?: string;
};
