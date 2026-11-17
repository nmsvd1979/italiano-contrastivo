import { describe, expect, it } from "vitest";
import type { Capsule } from "../generated/capsule";
import { initialState, next, score, toProgress } from "./capsuleMachine";

const item = (id: string) => ({ id, type: "cloze", text: "Io ___ fame.", answers: ["ho"], requires_server: false, review_status: "validated" });
const capsule = (n = 4): Capsule => ({
  id: "cap_x", cefr: "A1", target_error_codes: ["ERR_TENERE_AVERE"],
  trigger: { id: "t1", type: "translate_es_it", source_es: "Tengo hambre.", accepted_it: ["Ho fame."], requires_server: false, review_status: "validated" },
  explanation: { text_es: "Se dice con avere." },
  retrieval: Array.from({ length: n }, (_, i) => item(`r${i + 1}`)) as Capsule["retrieval"],
  estimated_seconds: 240, review_status: "validated",
}) as Capsule;

describe("capsuleMachine", () => {
  it("recorre trigger → explicación → recuperación → cierre → hecho", () => {
    const c = capsule(4);
    let s = initialState(c);
    expect(s).toEqual({ phase: "trigger", index: 0, answers: {} });
    s = next(s, c, { type: "continue" });
    expect(s.phase).toBe("explanation");
    s = next(s, c, { type: "continue" });
    expect(s).toMatchObject({ phase: "retrieval", index: 0 });
    for (let i = 1; i <= 4; i++) s = next(s, c, { type: "answer", itemId: `r${i}`, correct: i % 2 === 0 });
    expect(s.phase).toBe("closing");
    expect(s.answers).toEqual({ r1: false, r2: true, r3: false, r4: true });
    s = next(s, c, { type: "continue" });
    expect(s.phase).toBe("done");
  });

  it("el trigger no se califica y una respuesta a otro ítem se ignora", () => {
    const c = capsule();
    const s = next(next(initialState(c), c, { type: "continue" }), c, { type: "continue" });
    expect(next(s, c, { type: "answer", itemId: "r3", correct: true })).toEqual(s);
    expect(next(initialState(c), c, { type: "answer", itemId: "r1", correct: true }).phase).toBe("trigger");
  });

  it("retoma desde el progreso guardado: fase retrieval con 2 respuestas continúa en el ítem 3", () => {
    const c = capsule(5);
    const s = initialState(c, { capsuleId: "cap_x", phase: "retrieval", answers: { r1: true, r2: false } });
    expect(s).toEqual({ phase: "retrieval", index: 2, answers: { r1: true, r2: false } });
  });

  it("toProgress guarda en cada fase salvo al terminar", () => {
    const c = capsule();
    expect(toProgress(initialState(c), "cap_x")).toEqual({ capsuleId: "cap_x", phase: "trigger", answers: {} });
    expect(toProgress({ phase: "done", index: 0, answers: {} }, "cap_x")).toBeNull();
  });

  it("score cuenta aciertos sobre los ítems de recuperación", () => {
    expect(score({ phase: "closing", index: 0, answers: { r1: true, r2: false, r3: true } }, capsule(4))).toEqual({ correct: 2, total: 4 });
  });
});
