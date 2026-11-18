/* AUTO-GENERADO por scripts/gen-types.mjs desde schemas/. No editar a mano. */

/**
 * Ítem garden path (0:00-0:30).
 */
export type Item =
  | (Base & {
      type?: "choice_l1_distractor";
      prompt_es: string;
      /**
       * @minItems 2
       * @maxItems 4
       */
      options: [Option, Option] | [Option, Option, Option] | [Option, Option, Option, Option];
      requires_server?: false;
      /**
       * Si es true, el enunciado es el audio de la opción correcta: se escucha y se elige lo que se oyó.
       */
      listen?: boolean;
    })
  | (Base & {
      type?: "reorder";
      prompt_es: string;
      /**
       * @minItems 3
       */
      tokens: [string, string, string, ...string[]];
      /**
       * @minItems 3
       */
      answer: [string, string, string, ...string[]];
      requires_server?: false;
    })
  | (Base & {
      type?: "cloze";
      /**
       * Exactamente un ___.
       */
      text: string;
      /**
       * @minItems 1
       */
      answers: [string, ...string[]];
      hint_es?: string;
      requires_server?: false;
    })
  | (Base & {
      type?: "translate_es_it";
      source_es: string;
      /**
       * @minItems 1
       */
      accepted_it: [string, ...string[]];
      requires_server?: boolean;
    })
  | (Base & {
      type?: "minimal_pair_audio";
      audio_a: string;
      audio_b: string;
      word_a: string;
      word_b: string;
      play: "a" | "b";
      requires_server?: false;
    })
  | (Base & {
      type?: "speak";
      target_it: string;
      metric: "geminate_ratio" | "stress_position" | "phoneme_match";
      requires_server?: true;
    })
  | (Base & {
      type?: "write";
      prompt_es: string;
      min_chars?: number;
      requires_server?: true;
    });
/**
 * Ejercicio. Unión discriminada por `type`.
 */
export type Item1 =
  | (Base & {
      type?: "choice_l1_distractor";
      prompt_es: string;
      /**
       * @minItems 2
       * @maxItems 4
       */
      options: [Option, Option] | [Option, Option, Option] | [Option, Option, Option, Option];
      requires_server?: false;
      /**
       * Si es true, el enunciado es el audio de la opción correcta: se escucha y se elige lo que se oyó.
       */
      listen?: boolean;
    })
  | (Base & {
      type?: "reorder";
      prompt_es: string;
      /**
       * @minItems 3
       */
      tokens: [string, string, string, ...string[]];
      /**
       * @minItems 3
       */
      answer: [string, string, string, ...string[]];
      requires_server?: false;
    })
  | (Base & {
      type?: "cloze";
      /**
       * Exactamente un ___.
       */
      text: string;
      /**
       * @minItems 1
       */
      answers: [string, ...string[]];
      hint_es?: string;
      requires_server?: false;
    })
  | (Base & {
      type?: "translate_es_it";
      source_es: string;
      /**
       * @minItems 1
       */
      accepted_it: [string, ...string[]];
      requires_server?: boolean;
    })
  | (Base & {
      type?: "minimal_pair_audio";
      audio_a: string;
      audio_b: string;
      word_a: string;
      word_b: string;
      play: "a" | "b";
      requires_server?: false;
    })
  | (Base & {
      type?: "speak";
      target_it: string;
      metric: "geminate_ratio" | "stress_position" | "phoneme_match";
      requires_server?: true;
    })
  | (Base & {
      type?: "write";
      prompt_es: string;
      min_chars?: number;
      requires_server?: true;
    });

/**
 * Micro-cápsula de 3-5 min: trigger (garden path) → explicación atómica → recuperación activa → cierre.
 */
export interface Capsule {
  id: string;
  cefr: "A1" | "A2" | "B1" | "B2";
  title_es?: string;
  /**
   * @minItems 1
   */
  target_error_codes: [string, ...string[]];
  trigger: Item;
  explanation: {
    text_es: string;
    audio?: string;
  };
  /**
   * @minItems 4
   * @maxItems 6
   */
  retrieval:
    [Item1, Item1, Item1, Item1] | [Item1, Item1, Item1, Item1, Item1] | [Item1, Item1, Item1, Item1, Item1, Item1];
  estimated_seconds: number;
  review_status: "draft" | "needs_review" | "validated" | "rejected";
}
export interface Base {
  id: string;
  /**
   * true si necesita el Mac (LT/SLM/ASR).
   */
  requires_server: boolean;
  target_error_codes?: string[];
  sentence_id?: string;
  review_status: "draft" | "needs_review" | "validated" | "rejected";
}
export interface Option {
  text: string;
  correct: boolean;
  error_code?: string;
  distractor_kind?:
    | "l1_calque"
    | "hypercorrection"
    | "morphological"
    | "omission"
    | "tense_mismatch"
    | "aspect_mismatch"
    | "different_word";
}
