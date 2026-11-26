import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { makeAjv, schemaId } from "../scripts/schemas.mjs";

const ajv = makeAjv();
const check = (name, data) => {
  const v = ajv.getSchema(schemaId(name));
  expect(v, `schema ${name}`).toBeTruthy();
  return v(data);
};

const choice = (extra = {}) => ({
  id: "i1", type: "choice_l1_distractor", requires_server: false, review_status: "needs_review",
  prompt_es: "¿Cuál es correcta?",
  options: [
    { text: "Sono andato", correct: true },
    { text: "Ho andato", correct: false, error_code: "ERR_AUX_ESSERE", distractor_kind: "l1_calque" },
  ],
  ...extra,
});

describe("item", () => {
  it("acepta un choice válido", () => expect(check("item", choice())).toBe(true));
  it("rechaza distractor sin error_code", () => {
    const bad = choice({ options: [{ text: "Sono andato", correct: true }, { text: "Ho andato", correct: false }] });
    expect(check("item", bad)).toBe(false);
  });
  it("rechaza choice sin opción correcta", () => {
    const bad = choice({ options: [
      { text: "a", correct: false, error_code: "ERR_X", distractor_kind: "omission" }, { text: "b", correct: false, error_code: "ERR_X", distractor_kind: "omission" }] });
    expect(check("item", bad)).toBe(false);
  });
  const cloze = (text) => ({ id: "c1", type: "cloze", requires_server: false, review_status: "needs_review", text, answers: ["sono"] });
  it("cloze: exactamente un ___", () => {
    expect(check("item", cloze("Io ___ andato"))).toBe(true);
    expect(check("item", cloze("Io andato"))).toBe(false);
    expect(check("item", cloze("___ ___ andato"))).toBe(false);
  });
  it("write y speak exigen servidor", () => {
    const w = { id: "w1", type: "write", requires_server: false, review_status: "draft", prompt_es: "Escribe" };
    expect(check("item", w)).toBe(false);
    expect(check("item", { ...w, requires_server: true })).toBe(true);
  });
});

describe("capsule", () => {
  const cap = (n) => ({
    id: "cap1", cefr: "A1", target_error_codes: ["ERR_AUX_ESSERE"], estimated_seconds: 240, review_status: "needs_review",
    trigger: choice({ id: "t" }),
    explanation: { text_es: "Con verbos de movimiento se usa essere." },
    retrieval: Array.from({ length: n }, (_, i) => choice({ id: `r${i}` })),
  });
  it("acepta 4 a 6 ítems de recuperación", () => {
    for (const n of [4, 5, 6]) expect(check("capsule", cap(n))).toBe(true);
  });
  it("rechaza 3 o 7", () => {
    for (const n of [3, 7]) expect(check("capsule", cap(n))).toBe(false);
  });
});

describe("sentence", () => {
  const s = { id: "s1", source: "tatoeba", it: "Sono andato a casa.", es: "Fui a casa.", cefr_estimate: "A1", review_status: "needs_review" };
  it("tatoeba exige source_id y license", () => {
    expect(check("sentence", s)).toBe(false);
    expect(check("sentence", { ...s, source_id: "1", license: "CC BY 2.0 FR" })).toBe(true);
  });
});

describe("sentence: campos de procedencia de la Fase 2", () => {
  const base = { id: "s1", source: "tatoeba", source_id: "1", license: "CC BY 2.0 FR", it: "Sono andato.", es: "Yo he ido.", cefr_estimate: "A2", review_status: "needs_review" };
  it("acepta translation_kind, pivot_via, cefr_confidence, qa_flags y tag_rules", () => {
    const s = { ...base, translation_kind: "pivot", pivot_via: "100", cefr_confidence: 0.6, qa_flags: ["pivot"], tag_rules: { ERR_AUX_ESSERE: "aux_essere_motion" } };
    expect(check("sentence", s), JSON.stringify(ajv.errors)).toBe(true);
  });
  it("acepta es_author (autor de la traducción española, exigido por CC BY)", () => {
    expect(check("sentence", { ...base, es_author: "arh" }), JSON.stringify(ajv.errors)).toBe(true);
  });
  it("acepta translation_kind llm (traducción generada desde el italiano)", () => {
    expect(check("sentence", { ...base, translation_kind: "llm" })).toBe(true);
  });
  it("rechaza translation_kind inválido y cefr_confidence fuera de 0-1", () => {
    const v = ajv.getSchema(schemaId("sentence"));
    expect(v({ ...base, translation_kind: "x" })).toBe(false);
    expect(v.errors.map((e) => e.keyword)).toContain("enum");
    expect(v({ ...base, cefr_confidence: 1.5 })).toBe(false);
    expect(v.errors.map((e) => e.keyword)).toContain("maximum");
  });
});

describe("slm-feedback", () => {
  const err = { error_id: "ERR_01", start_char: 5, end_char: 18, flagged_tokens: "a la mia casa", suggested_correction: "a casa mia",
    error_category: "L1_SINTACTIC_CALQUE", cefr_level: "A2", explanation_l1: "Calco del español." };
  const ok = { text_evaluated: "Vado a la mia casa", is_correct: false, errors: [err] };
  it("acepta una respuesta válida y una sin errores", () => {
    expect(check("slm-feedback", ok)).toBe(true);
    expect(check("slm-feedback", { text_evaluated: "Ciao", is_correct: true, errors: [] })).toBe(true);
  });
  it("rechaza categorías fuera del enum y campos extra", () => {
    expect(check("slm-feedback", { ...ok, errors: [{ ...err, error_category: "OTRA" }] })).toBe(false);
    expect(check("slm-feedback", { ...ok, extra: 1 })).toBe(false);
  });
});

describe("catálogo error-codes.json", () => {
  const codes = JSON.parse(readFileSync(new URL("../schemas/data/error-codes.json", import.meta.url), "utf8"));
  it("cada código valida contra el esquema", () => {
    for (const c of codes) expect(check("error-code", c), c.code).toBe(true);
  });
  it("los códigos son únicos", () => {
    expect(new Set(codes.map((c) => c.code)).size).toBe(codes.length);
  });
  it("los códigos fonéticos se detectan solo con asr/autocheck y los demás nunca con asr", () => {
    for (const c of codes) {
      if (c.category === "PHONETIC") for (const d of c.detectors) expect(["asr", "autocheck"], c.code).toContain(d);
      else expect(c.detectors, c.code).not.toContain("asr");
    }
  });
  it("todo código tiene fuente identificable", () => {
    for (const c of codes) expect(c.source.length, c.code).toBeGreaterThan(10);
  });
  it("ningún ejemplo erróneo coincide con el correcto", () => {
    for (const c of codes) expect(c.example_wrong).not.toBe(c.example_right);
  });
});

describe("fixtures", () => {
  const load = (f) => JSON.parse(readFileSync(new URL(`../fixtures/${f}`, import.meta.url), "utf8"));
  const catalog = JSON.parse(readFileSync(new URL("../schemas/data/error-codes.json", import.meta.url), "utf8"));
  const known = new Set(catalog.map((c) => c.code));
  const lexemes = load("lexemes.json");
  const sentences = load("sentences.json");
  const capsule = load("capsule-a2-aux-essere.json");

  it("lexemas, oraciones y cápsula validan", () => {
    for (const l of lexemes) expect(check("lexeme", l), l.id).toBe(true);
    for (const s of sentences) expect(check("sentence", s), s.id).toBe(true);
    expect(check("capsule", capsule)).toBe(true);
  });
  it("todo error_code referenciado existe en el catálogo", () => {
    const refs = [
      ...lexemes.flatMap((l) => l.error_codes ?? []),
      ...sentences.flatMap((s) => s.error_codes ?? []),
      ...capsule.target_error_codes,
      ...[capsule.trigger, ...capsule.retrieval].flatMap((i) => [
        ...(i.target_error_codes ?? []), ...(i.options ?? []).map((o) => o.error_code).filter(Boolean)]),
    ];
    for (const r of refs) expect(known.has(r), r).toBe(true);
  });
  it("lexeme_ids de las oraciones existen", () => {
    const ids = new Set(lexemes.map((l) => l.id));
    for (const s of sentences) for (const id of s.lexeme_ids ?? []) expect(ids.has(id), id).toBe(true);
  });
  it("las oraciones de Tatoeba traen autor y licencia", () => {
    for (const s of sentences) { expect(s.author).toBeTruthy(); expect(s.license).toBe("CC BY 2.0 FR"); }
  });
  it("el cloze de la cápsula se califica como correcto con su respuesta", () => {
    const c = capsule.retrieval.find((i) => i.type === "cloze");
    expect(c.text.split("___").length - 1).toBe(1);
    expect(c.answers.length).toBeGreaterThan(0);
  });
});

describe("card + ts-fsrs real", async () => {
  const { createEmptyCard, fsrs, Rating } = await import("ts-fsrs");
  const cal = JSON.parse(readFileSync(new URL("../schemas/data/calibration.json", import.meta.url), "utf8"));
  const now = new Date("2026-11-12T12:00:00Z");

  it("una tarjeta nueva y una repasada serializan y validan", () => {
    const f = fsrs();
    const fresh = createEmptyCard(now);
    const reviewed = f.next(fresh, now, Rating.Good).card;
    for (const c of [fresh, reviewed]) {
      const serial = JSON.parse(JSON.stringify(c));
      const card = { id: "c1", subject: { kind: "lexeme", ref: "lx_burro" }, lexical_type: "false_friend", calibration: cal.false_friend, fsrs: serial };
      expect(check("card", card), JSON.stringify(ajv.errors)).toBe(true);
    }
  });
  it("calibración: cognados bajan dificultad, falsos amigos la suben", () => {
    expect(cal.cognate.delta_d).toBeLessThan(0);
    expect(cal.cognate.gamma_s).toBeGreaterThan(1);
    expect(cal.false_friend.delta_d).toBeGreaterThan(0);
    expect(cal.false_friend.gamma_s).toBeLessThan(1);
    expect(cal.neutral).toEqual({ delta_d: 0, gamma_s: 1 });
  });
});

// Esquemas de la ruta y de los programas (schemas/data): los mismos archivos que valida pytest, ahora con el validador que usa la web (Ajv).
import Ajv2020 from "ajv/dist/2020.js";
describe("esquemas de datos (ruta y programas)", () => {
  const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const run = (schema, file) => {
    const validate = ajv.getSchema(`https://italiano-contrastivo/schemas/data/${schema}.schema.json`) ?? ajv.compile(load(`schemas/data/${schema}.schema.json`));
    const ok = validate(load(file));
    expect(ok, JSON.stringify(validate.errors?.slice(0, 3))).toBe(true);
  };
  it("la ruta publicada cumple course.schema.json", () => run("course", "web/public/content/course.json"));
  it("la ruta de autoría cumple course-source.schema.json", () => run("course-source", "schemas/data/course.json"));
  it("los programas de A1 y A2 cumplen syllabus.schema.json", () => {
    run("syllabus", "schemas/data/syllabus-a1.json");
    run("syllabus", "schemas/data/syllabus-a2.json");
  });
});
