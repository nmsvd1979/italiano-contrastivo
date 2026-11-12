/* AUTO-GENERADO por scripts/gen-types.mjs desde schemas/. No editar a mano. */

/**
 * Salida estricta del SLM local (decodificación guiada). Alineado con el esquema de la fuente NotebookLM 5f4ef3d8 §3.2. Solo errores a nivel de token; nunca reescribe. El servidor debe comprobar además que flagged_tokens == text_evaluated[start_char:end_char].
 */
export interface SlmFeedback {
  text_evaluated: string;
  is_correct: boolean;
  errors: {
    error_id: string;
    start_char: number;
    end_char: number;
    flagged_tokens: string;
    suggested_correction: string;
    error_category:
      | "L1_SINTACTIC_CALQUE"
      | "L1_FALSE_FRIEND"
      | "LEXICAL_CHOICE"
      | "GENDER_NUMBER_AGREEMENT"
      | "PREPOSITIONAL_GOVERNANCE";
    cefr_level: "A1" | "A2" | "B1" | "B2";
    explanation_l1: string;
  }[];
}
