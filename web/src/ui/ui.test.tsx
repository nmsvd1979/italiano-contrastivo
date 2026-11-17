import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentPack } from "../content/load";
import type { Capsule } from "../generated/capsule";
import type { Item } from "../generated/item";
import { newCard } from "../state/srs";
import { localDate, memoryStore } from "../state/store";
import { planToday } from "../state/session";
import { AboutScreen } from "./AboutScreen";
import { CapsuleScreen } from "./CapsuleScreen";
import { ReviewScreen } from "./ReviewScreen";
import { TodayScreen } from "./TodayScreen";
import { ItemView } from "./items/ItemView";
import { Translate, type TranslateItem } from "./items/Translate";
import { speakItalian } from "./speech";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const NOW = new Date("2026-11-16T15:00:00.000Z");
const base = { requires_server: false, review_status: "validated" };
const choice = { ...base, id: "c1", type: "choice_l1_distractor", prompt_es: "¿Cuál es la frase correcta en italiano?", options: [
  { text: "Vedrai che ho ragione.", correct: true },
  { text: "Vedrai che tengo ragione.", correct: false, error_code: "ERR_TENERE_AVERE", distractor_kind: "l1_calque" }] } as unknown as Item;
const cloze = { ...base, id: "z1", type: "cloze", text: "Io ___ fame.", answers: ["ho"], hint_es: "Yo tengo hambre." } as unknown as Item;
const reorder = { ...base, id: "o1", type: "reorder", prompt_es: "Ordena", tokens: ["fame", "Io", "ho"], answer: ["Io", "ho", "fame"] } as unknown as Item;

describe("Choice", () => {
  it("marca solo la correcta como acierto y nunca la incorrecta", () => {
    const onAnswer = vi.fn();
    render(<ItemView item={choice} onAnswer={onAnswer} />);
    expect(screen.getAllByRole("button").every((b) => b.getAttribute("data-state") === "idle")).toBe(true);
    fireEvent.click(screen.getByText("Vedrai che tengo ragione."));
    expect(screen.getByText("Vedrai che tengo ragione.").getAttribute("data-state")).toBe("wrong");
    expect(screen.getByText("Vedrai che ho ragione.").getAttribute("data-state")).toBe("correct");
    expect(screen.getByRole("status").textContent).toContain("calco del español");
    fireEvent.click(screen.getByText("Continuar"));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });
  it("acertar informa true; el botón de voz solo aparece tras responder", () => {
    const onAnswer = vi.fn();
    render(<ItemView item={choice} onAnswer={onAnswer} />);
    expect(screen.queryByText(/Escuchar/)).toBeNull();
    fireEvent.click(screen.getByText("Vedrai che ho ragione."));
    expect(screen.getByText(/Escuchar/)).toBeTruthy();
    expect(screen.getByText(/voz del sistema/)).toBeTruthy();
    fireEvent.click(screen.getByText("Continuar"));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});

describe("Cloze", () => {
  it("acepta la respuesta sin distinguir mayúsculas ni espacios sobrantes", () => {
    const onAnswer = vi.fn();
    render(<ItemView item={cloze} onAnswer={onAnswer} />);
    fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: "  HO " } });
    fireEvent.click(screen.getByText("Comprobar"));
    expect(screen.getByRole("status").textContent).toContain("¡Correcto!");
    fireEvent.click(screen.getByText("Continuar"));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });
  it("una respuesta equivocada muestra la correcta", () => {
    const onAnswer = vi.fn();
    render(<ItemView item={cloze} onAnswer={onAnswer} />);
    fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: "tengo" } });
    fireEvent.click(screen.getByText("Comprobar"));
    expect(screen.getByRole("status").textContent).toContain("«ho»");
    fireEvent.click(screen.getByText("Continuar"));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});

describe("Reorder", () => {
  const play = (order: string[]) => {
    const onAnswer = vi.fn();
    render(<ItemView item={reorder} onAnswer={onAnswer} />);
    for (const t of order) fireEvent.click(screen.getAllByText(t).find((b) => !(b as HTMLButtonElement).disabled)!);
    fireEvent.click(screen.getByText("Comprobar"));
    fireEvent.click(screen.getByText("Continuar"));
    return onAnswer;
  };
  it("valida el orden exacto", () => expect(play(["Io", "ho", "fame"])).toHaveBeenCalledWith(true));
  it("un orden distinto es incorrecto", () => expect(play(["ho", "Io", "fame"])).toHaveBeenCalledWith(false));
});

describe("Translate (trigger)", () => {
  it("muestra el contraste y no califica", () => {
    const onDone = vi.fn();
    const item = { ...base, id: "t1", type: "translate_es_it", source_es: "Tengo razón.", accepted_it: ["Ho ragione."] } as unknown as TranslateItem;
    render(<Translate item={item} onDone={onDone} />);
    fireEvent.change(screen.getByLabelText("Tu traducción"), { target: { value: "Tengo ragione" } });
    fireEvent.click(screen.getByText("Ver la respuesta"));
    expect(screen.getByRole("status").textContent).toContain("Ho ragione.");
    expect(screen.getByText("Ho").tagName).toBe("MARK");
    fireEvent.click(screen.getByText("Continuar"));
    expect(onDone).toHaveBeenCalledOnce();
  });
});

const cap = (code = "ERR_TENERE_AVERE"): Capsule => ({
  id: `cap_${code.toLowerCase()}`, cefr: "A1", target_error_codes: [code],
  trigger: { ...base, id: "t1", type: "translate_es_it", source_es: "Tengo razón.", accepted_it: ["Ho ragione."] },
  explanation: { text_es: "Para la necesidad y la razón, el italiano usa avere." },
  retrieval: [1, 2, 3, 4].map((n) => ({ ...base, id: `r${n}`, type: "cloze", text: "Io ___ fame.", answers: ["ho"] })),
  estimated_seconds: 240, review_status: "validated",
}) as unknown as Capsule;
const pack = (over: Partial<ContentPack> = {}): ContentPack => ({
  capsules: [cap()], itemsByCode: { ERR_TENERE_AVERE: [choice, cloze] },
  lexemes: [{ id: "lx_burro", form: "burro", gloss_es: "mantequilla", lexical_type: "false_friend", source: "fuente" }], sentences: [],
  manifest: { capsules: ["cap_err_tenere_avere"], codes: {}, levels: {}, reviewers: { me: 10, "llm-audit": 30 }, sentences_used: 40, translation_kind: { direct: 30, llm: 10 } }, ...over,
});

describe("TodayScreen", () => {
  const day = { date: localDate(NOW), reviewsDone: 2, capsulesDone: ["cap_x"] };
  it("muestra los dos bloques por separado con su avance", () => {
    const plan = planToday({ pack: pack(), cards: [], day, now: NOW });
    render(<TodayScreen plan={plan} day={day} />);
    expect(screen.getByText(/Repaso/)).toBeTruthy();
    expect(screen.getByText(/Cápsula del día/)).toBeTruthy();
    expect((screen.getByText("Hacer una cápsula") as HTMLAnchorElement).getAttribute("href")).toBe("#/capsula/cap_err_tenere_avere");
    expect(screen.getByText(/2 repasos/)).toBeTruthy();
    expect(screen.getByText(/1 cápsula/)).toBeTruthy();
  });
  it("sin repasos pendientes lo dice", () => {
    const plan = planToday({ pack: pack({ lexemes: [] }), cards: [], day, now: NOW });
    render(<TodayScreen plan={plan} day={day} />);
    expect(screen.getByText("No tienes repasos pendientes ahora.")).toBeTruthy();
  });
  it("con el currículo agotado lo dice", () => {
    const cards = [newCard({ kind: "error_code", ref: "ERR_TENERE_AVERE" }, "not_applicable", NOW)];
    const plan = planToday({ pack: pack(), cards, day, now: NOW });
    render(<TodayScreen plan={plan} day={day} />);
    expect(screen.getByText(/Completaste las cápsulas disponibles/)).toBeTruthy();
  });
  it("avisa si no se puede guardar el progreso", () => {
    const plan = planToday({ pack: pack(), cards: [], day, now: NOW });
    render(<TodayScreen plan={plan} day={day} storeError="No se puede guardar el progreso en este navegador." />);
    expect(screen.getByRole("alert").textContent).toContain("No se puede guardar el progreso");
  });
});

describe("CapsuleScreen", () => {
  it("recorre las 4 fases, guarda la tarjeta del código y suma al día", async () => {
    const store = memoryStore();
    render(<CapsuleScreen capsule={cap()} store={store} now={NOW} />);
    await screen.findByText(/Traduce al italiano/);
    fireEvent.click(screen.getByText("Ver la respuesta"));
    fireEvent.click(screen.getByText("Continuar"));
    expect(screen.getByText(/el italiano usa avere/)).toBeTruthy();
    fireEvent.click(screen.getByText("Entendido"));
    for (let i = 0; i < 4; i++) {
      fireEvent.change(await screen.findByLabelText("Respuesta"), { target: { value: "ho" } });
      fireEvent.click(screen.getByText("Comprobar"));
      fireEvent.click(screen.getByText("Continuar"));
    }
    expect(await screen.findByText(/Acertaste 4 de 4/)).toBeTruthy();
    fireEvent.click(screen.getByText("Terminar"));
    await screen.findByText(/Cápsula completada/);
    expect((await store.getCard("error_code:ERR_TENERE_AVERE"))?.fsrs.reps).toBe(1);
    expect((await store.getDay(localDate(NOW))).capsulesDone).toEqual(["cap_err_tenere_avere"]);
    expect(await store.getCapsuleProgress("cap_err_tenere_avere")).toBeUndefined();
    expect((await store.allLogs())[0].origin).toBe("capsule");
  });
  it("retoma donde quedó: con 2 respuestas guardadas pide el ítem 3", async () => {
    const store = memoryStore();
    await store.putCapsuleProgress({ capsuleId: "cap_err_tenere_avere", phase: "retrieval", answers: { r1: true, r2: false } });
    render(<CapsuleScreen capsule={cap()} store={store} now={NOW} />);
    expect(await screen.findByText(/Práctica: 3 de 4/)).toBeTruthy();
  });
});

describe("ReviewScreen", () => {
  it("repasa una tarjeta vencida de error, la reprograma y suma al día", async () => {
    const store = memoryStore();
    const c = newCard({ kind: "error_code", ref: "ERR_TENERE_AVERE" }, "not_applicable", NOW);
    await store.putCard(c);
    render(<ReviewScreen pack={pack({ lexemes: [] })} store={store} now={NOW} />);
    fireEvent.click(await screen.findByText("Vedrai che ho ragione."));
    fireEvent.click(screen.getByText("Continuar"));
    await screen.findByText(/Terminaste esta tanda/);
    expect((await store.getCard(c.id))?.fsrs.reps).toBe(1);
    expect((await store.getDay(localDate(NOW))).reviewsDone).toBe(1);
  });
  it("introduce un falso amigo nuevo con autocalificación", async () => {
    const store = memoryStore();
    render(<ReviewScreen pack={pack()} store={store} now={NOW} />);
    expect(await screen.findByText("burro")).toBeTruthy();
    expect(screen.queryByText("mantequilla")).toBeNull();
    fireEvent.click(screen.getByText("Mostrar significado"));
    expect(screen.getByText("mantequilla")).toBeTruthy();
    fireEvent.click(screen.getByText("Bien"));
    await screen.findByText(/Terminaste esta tanda/);
    const card = await store.getCard("lexeme:lx_burro");
    expect(card?.lexical_type).toBe("false_friend");
    expect(card?.fsrs.reps).toBe(1);
  });
  it("sin nada que repasar lo dice", async () => {
    render(<ReviewScreen pack={pack({ lexemes: [] })} store={memoryStore()} now={NOW} />);
    expect(await screen.findByText("No tienes repasos pendientes ahora.")).toBeTruthy();
  });
});

describe("AboutScreen", () => {
  it("declara cómo se revisó, con conteos por revisor y atribuciones", () => {
    const sentences = [
      { id: "s1", it: "Ho ragione.", es: "Tengo razón.", author: "autorIT", es_author: "autorES", license: "CC BY 2.0 FR", source_id: "111", es_source_id: "222", translation_kind: "direct" as const, cefr_estimate: "A1" },
      { id: "s2", it: "Ho fame.", es: "Tengo hambre.", author: "autorIT2", license: "CC BY 2.0 FR", source_id: "333", translation_kind: "llm" as const, cefr_estimate: "A1" },
    ];
    render(<AboutScreen manifest={pack().manifest} sentences={sentences} />);
    expect(screen.getByText(/sin validación de nativos/i)).toBeTruthy();
    expect(screen.getByText(/10 oraciones/)).toBeTruthy();
    expect(screen.getByText(/30 oraciones/)).toBeTruthy();
    expect(screen.getByText(/autorIT\b/)).toBeTruthy();
    expect(screen.getAllByText(/traducción de IA/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/CC BY 2.0 FR/, { selector: "p" })).toBeTruthy();
  });
});

describe("speakItalian", () => {
  it("devuelve no_voice si el navegador no tiene voz italiana", async () => {
    expect(await speakItalian("Ciao")).toBe("no_voice");
    vi.stubGlobal("speechSynthesis", { getVoices: () => [{ lang: "en-US" }], speak: vi.fn(), cancel: vi.fn() });
    expect(await speakItalian("Ciao")).toBe("no_voice");
  });
  it("habla con la voz it-IT cuando existe", async () => {
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", { getVoices: () => [{ lang: "it-IT" }], speak, cancel: vi.fn() });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
    expect(await speakItalian("Ciao")).toBe("ok");
    expect(speak).toHaveBeenCalledOnce();
  });
});
