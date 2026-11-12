/* AUTO-GENERADO por scripts/gen-types.mjs desde schemas/. No editar a mano. */

export interface ErrorEvent {
  id: string;
  error_code: string;
  detector: "lt" | "slm" | "asr" | "autocheck";
  input?: string;
  start_char?: number;
  end_char?: number;
  replacement?: string;
  item_id?: string;
  occurred_at: string;
}
