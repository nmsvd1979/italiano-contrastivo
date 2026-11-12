/* AUTO-GENERADO por scripts/gen-types.mjs desde schemas/. No editar a mano. */

export interface Lexeme {
  id: string;
  lemma_it: string;
  gloss_es: string;
  pos: "noun" | "verb" | "adj" | "adv" | "prep" | "pron" | "conj" | "det" | "other";
  gender?: "m" | "f" | "mf";
  lexical_type: "cognate" | "neutral" | "false_friend";
  sieves?: number[];
  /**
   * Acento italiano; marcar si difiere del español (heterotónica).
   */
  stress?: "paroxytone" | "oxytone" | "proparoxytone";
  heterotonic?: boolean;
  has_geminate?: boolean;
  freq_rank?: number;
  cefr: "A1" | "A2" | "B1" | "B2";
  error_codes?: string[];
  review_status: "draft" | "needs_review" | "validated" | "rejected";
}
