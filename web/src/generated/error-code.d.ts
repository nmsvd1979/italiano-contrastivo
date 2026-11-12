/* AUTO-GENERADO por scripts/gen-types.mjs desde schemas/. No editar a mano. */

export interface ErrorCode {
  code: string;
  category:
    | "L1_SINTACTIC_CALQUE"
    | "L1_FALSE_FRIEND"
    | "LEXICAL_CHOICE"
    | "GENDER_NUMBER_AGREEMENT"
    | "PREPOSITIONAL_GOVERNANCE"
    | "PHONETIC";
  sieve?: number | null;
  cefr_min: "A1" | "A2" | "B1" | "B2";
  explanation_es: string;
  example_wrong: string;
  example_right: string;
  /**
   * @minItems 1
   */
  detectors: ["lt" | "slm" | "asr" | "autocheck", ...("lt" | "slm" | "asr" | "autocheck")[]];
  /**
   * Fuente (NotebookLM) de donde sale el código.
   */
  source: string;
  review_status?: "draft" | "needs_review" | "validated" | "rejected";
  notes?: string;
}
