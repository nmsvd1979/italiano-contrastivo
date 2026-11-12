/* AUTO-GENERADO por scripts/gen-types.mjs desde schemas/. No editar a mano. */

/**
 * Tarjeta de repaso espaciado (estado del usuario, en IndexedDB). El estado FSRS es el de ts-fsrs serializado.
 */
export interface Card {
  id: string;
  subject: {
    kind: "lexeme" | "error_code";
    ref: string;
  };
  lexical_type: "cognate" | "neutral" | "false_friend" | "not_applicable";
  calibration: {
    delta_d: number;
    gamma_s: number;
  };
  /**
   * Card de ts-fsrs 6.0.0 serializada a JSON (fechas ISO 8601). elapsed_days está obsoleto en esa versión y es opcional.
   */
  fsrs: {
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days?: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: number;
    last_review?: string;
    learning_steps: number;
  };
}
