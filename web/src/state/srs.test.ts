import { describe, expect, it } from "vitest";
import type { Card } from "../generated/card";
import { dueCards, newCard, review } from "./srs";

const NOW = new Date("2026-11-16T12:00:00.000Z");
const subject = (ref: string, kind: "lexeme" | "error_code" = "lexeme") => ({ kind, ref });

describe("newCard", () => {
  it("aplica la calibración según el tipo léxico", () => {
    expect(newCard(subject("lx_burro"), "false_friend", NOW).calibration).toEqual({ delta_d: 2.5, gamma_s: 0.5 });
    expect(newCard(subject("lx_x"), "cognate", NOW).calibration).toEqual({ delta_d: -1.5, gamma_s: 1.8 });
    expect(newCard(subject("ERR_X", "error_code"), "not_applicable", NOW).calibration).toEqual({ delta_d: 0, gamma_s: 1 });
    expect(newCard(subject("lx_y"), "neutral", NOW).calibration).toEqual({ delta_d: 0, gamma_s: 1 });
  });
  it("crea una tarjeta nueva y vencida, con id estable", () => {
    const c = newCard(subject("lx_burro"), "false_friend", NOW);
    expect(c.id).toBe("lexeme:lx_burro");
    expect(c.fsrs.state).toBe(0);
    expect(c.fsrs.reps).toBe(0);
    expect(c.fsrs.due).toBe(NOW.toISOString());
  });
});

describe("review: calibración de la primera repetición", () => {
  const first = (type: Card["lexical_type"]) => review(newCard(subject(`lx_${type}`), type, NOW), 3, NOW).card.fsrs;
  const neutral = first("neutral");

  it("falso amigo: estabilidad ×0,5 y dificultad +2,5 respecto de una neutral", () => {
    const ff = first("false_friend");
    expect(ff.stability).toBeCloseTo(neutral.stability * 0.5, 5);
    expect(ff.difficulty).toBeCloseTo(Math.min(10, neutral.difficulty + 2.5), 5);
  });
  it("cognado: estabilidad ×1,8 y dificultad −1,5 con mínimo 1", () => {
    const cg = first("cognate");
    expect(cg.stability).toBeCloseTo(neutral.stability * 1.8, 5);
    expect(cg.difficulty).toBeCloseTo(Math.max(1, neutral.difficulty - 1.5), 5);
  });
  it("la tarjeta resultante y el log son datos válidos", () => {
    const r = review(newCard(subject("lx_a"), "false_friend", NOW), 3, NOW, { origin: "capsule", capsuleId: "cap_x" });
    expect(r.log).toEqual({ card_id: "lexeme:lx_a", rating: 3, reviewed_at: NOW.toISOString(), origin: "capsule", capsule_id: "cap_x" });
    expect(r.card.fsrs.reps).toBe(1);
  });
  it("si la tarjeta queda en Review, `due` sale de la estabilidad calibrada", () => {
    const e = review(newCard(subject("lx_f"), "false_friend", NOW), 4, NOW).card.fsrs; // Easy → Review
    expect(e.state).toBe(2);
    expect(e.scheduled_days).toBe(Math.max(1, Math.round(e.stability)));
    expect(new Date(e.due).getTime()).toBe(NOW.getTime() + e.scheduled_days * 86400000);
  });
});

describe("review: lapso", () => {
  const inReview = (type: Card["lexical_type"]): Card => ({
    id: `lexeme:lx_${type}`, subject: subject(`lx_${type}`), lexical_type: type,
    calibration: newCard(subject("x"), type, NOW).calibration,
    fsrs: { due: NOW.toISOString(), stability: 10, difficulty: 5, scheduled_days: 10, reps: 3, lapses: 0, learning_steps: 0, state: 2, last_review: "2026-11-06T12:00:00.000Z" },
  });
  it("un lapso de falso amigo reduce la estabilidad ×0,5 más que el de una neutral", () => {
    const neutral = review(inReview("neutral"), 1, NOW).card.fsrs;
    const ff = review(inReview("false_friend"), 1, NOW).card.fsrs;
    expect(ff.lapses).toBe(1);
    expect(ff.stability).toBeCloseTo(neutral.stability * 0.5, 5);
    expect(new Date(ff.due).getTime()).toBeLessThanOrEqual(new Date(neutral.due).getTime());
  });
  it("una nota Bien en una tarjeta ya repasada no vuelve a aplicar la calibración", () => {
    const a = review(inReview("neutral"), 3, NOW).card.fsrs;
    const b = review(inReview("false_friend"), 3, NOW).card.fsrs;
    expect(b.stability).toBeCloseTo(a.stability, 5);
    expect(b.difficulty).toBeCloseTo(a.difficulty, 5);
  });
});

describe("dueCards", () => {
  const at = (id: string, due: string): Card => ({ ...newCard(subject(id), "neutral", NOW), id, fsrs: { ...newCard(subject(id), "neutral", NOW).fsrs, due } });
  it("ordena por atraso, ignora las de mañana y respeta el límite", () => {
    const cards = [at("a", "2026-11-16T11:00:00.000Z"), at("b", "2026-11-10T00:00:00.000Z"), at("c", "2026-11-17T12:00:01.000Z"), at("d", "2026-11-16T12:00:00.000Z")];
    expect(dueCards(cards, NOW, 10).map((c) => c.id)).toEqual(["b", "a", "d"]);
    expect(dueCards(cards, NOW, 2).map((c) => c.id)).toEqual(["b", "a"]);
    expect(dueCards([at("c", "2026-11-17T12:00:01.000Z")], NOW, 5)).toEqual([]);
  });
});
