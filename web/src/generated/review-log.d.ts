/* AUTO-GENERADO por scripts/gen-types.mjs desde schemas/. No editar a mano. */

export interface ReviewLog {
  card_id: string;
  rating: number;
  reviewed_at: string;
  origin: "capsule" | "review";
  capsule_id?: string;
}
