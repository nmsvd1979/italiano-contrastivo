import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentPack } from "../content/load";
import type { Capsule } from "../generated/capsule";
import type { Item } from "../generated/item";
import { newCard } from "../state/srs";
import { localDate, memoryStore } from "../state/store";
import { planToday } from "../state/session";
import { planSession } from "../state/dayplan";
import { emptyProgress, masterByPlacement } from "../state/course";
import { AboutScreen } from "./AboutScreen";
import { CapsuleScreen } from "./CapsuleScreen";
import { ReviewScreen } from "./ReviewScreen";
import { TodayScreen } from "./TodayScreen";
import { ItemView } from "./items/ItemView";
import { Translate, type TranslateItem } from "./items/Translate";
import { speakItalian } from "./speech";
import { SettingsScreen } from "./SettingsScreen";
import { WriteScreen } from "./WriteScreen";
import { AudioProvider } from "../audio/AudioContext";

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
    expect(screen.getByRole("status").textContent).toContain("error típico de hispanohablantes");
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
const unit01 = { id: "u01", level: "A1", title: "Tener no es tenere", goal_es: "g", why_here: "w", codes: ["ERR_TENERE_AVERE"], status: "active" as const, explanation_es: "e",
  parts: { descubre: [], practica: [], escucha: [], prueba: [] }, divergences: [] };
const pack = (over: Partial<ContentPack> = {}): ContentPack => ({
  course: { version: 1, levels: [{ id: "A1", title: "A1", guided_hours: "x" }], units: [unit01], planned: [] },
  capsules: [cap()], itemsByCode: { ERR_TENERE_AVERE: [choice, cloze] },
  lexemes: [{ id: "lx_burro", form: "burro", gloss_es: "mantequilla", lexical_type: "false_friend", source: "fuente" }], sentences: [],
  manifest: { capsules: ["cap_err_tenere_avere"], codes: {}, levels: {}, reviewers: { me: 10, "llm-audit": 30 }, sentences_used: 40, translation_kind: { direct: 30, llm: 10 } }, ...over,
});

describe("TodayScreen", () => {
  const day = { date: localDate(NOW), reviewsDone: 2, capsulesDone: ["cap_x"] };
  it("muestra los bloques de hoy con sus minutos y un solo botón «Continuar» hacia el siguiente paso", () => {
    const twoDone = ["x1", "x2"].map((id) => masterByPlacement(emptyProgress(id), NOW));
    const plan = planToday({ pack: pack(), cards: [], day, now: NOW, units: twoDone });
    render(<TodayScreen plan={plan} day={day} blocks={planSession({ plan, day, pack: pack() })} />);
    expect(screen.getByText("Tener no es tenere")).toBeTruthy();
    expect(screen.getByText("① Repaso")).toBeTruthy();
    expect(screen.getByText("④ Lectura y reconstrucción")).toBeTruthy();
    const go = screen.getByText(/^Continuar · Descubre/) as HTMLAnchorElement;
    expect(go.getAttribute("href")).toBe("#/unidad/u01/descubre");
    expect(screen.getByText(/2 repasos/)).toBeTruthy();
    expect(screen.getByText(/Tienes 1 para repasar/)).toBeTruthy();
  });
  it("con tarjetas vencidas «Continuar» lleva primero al repaso", () => {
    const plan = planToday({ pack: pack(), cards: [newCard({ kind: "error_code", ref: "ERR_TENERE_AVERE" }, "not_applicable", new Date("2026-11-01T00:00:00Z"))], day, now: NOW });
    render(<TodayScreen plan={plan} day={day} />);
    expect((screen.getByText(/^Continuar · Repaso/) as HTMLAnchorElement).getAttribute("href")).toBe("#/repaso");
  });
  it("muestra la racha y avisa si hoy aún no se estudió", () => {
    const plan = planToday({ pack: pack(), cards: [], day, now: NOW });
    render(<TodayScreen plan={plan} day={day} streak={{ streak: 4, studiedToday: false, protectorUsed: false }} />);
    expect(screen.getByText(/4 días · estudia hoy/)).toBeTruthy();
  });
  it("sin repasos pendientes lo dice", () => {
    const plan = planToday({ pack: pack({ lexemes: [] }), cards: [], day, now: NOW });
    render(<TodayScreen plan={plan} day={day} blocks={planSession({ plan, day, pack: pack({ lexemes: [] }) })} />);
    expect(screen.getByText(/No tienes repasos pendientes ahora/)).toBeTruthy();
  });
  it("con todas las unidades completas lo dice", () => {
    const plan = planToday({ pack: pack(), cards: [], day, now: NOW, units: [masterByPlacement(emptyProgress("u01"), NOW)] });
    render(<TodayScreen plan={plan} day={day} />);
    expect(screen.getByText(/Completaste todas las unidades disponibles/)).toBeTruthy();
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

describe("doble toque", () => {
  it("Terminar dos veces seguidas registra una sola vez la cápsula", async () => {
    const store = memoryStore();
    await store.putCapsuleProgress({ capsuleId: "cap_err_tenere_avere", phase: "closing", answers: { r1: true, r2: true, r3: true, r4: true } });
    render(<CapsuleScreen capsule={cap()} store={store} now={NOW} />);
    const b = await screen.findByText("Terminar");
    fireEvent.click(b);
    fireEvent.click(b);
    await screen.findByText(/Cápsula completada/);
    expect(await store.allLogs()).toHaveLength(1);
    expect((await store.getDay(localDate(NOW))).capsulesDone).toEqual(["cap_err_tenere_avere"]);
  });
  it("Continuar dos veces seguidas en un repaso lo cuenta una sola vez", async () => {
    const store = memoryStore();
    await store.putCard(newCard({ kind: "error_code", ref: "ERR_TENERE_AVERE" }, "not_applicable", NOW));
    render(<ReviewScreen pack={pack({ lexemes: [] })} store={store} now={NOW} />);
    fireEvent.click(await screen.findByText("Vedrai che ho ragione."));
    const b = screen.getByText("Continuar");
    fireEvent.click(b);
    fireEvent.click(b);
    await screen.findByText(/Terminaste esta tanda/);
    expect(await store.allLogs()).toHaveLength(1);
    expect((await store.getDay(localDate(NOW))).reviewsDone).toBe(1);
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
    for (const id of ["x1", "x2"]) await store.putUnit(masterByPlacement(emptyProgress(id), NOW)); // los falsos amigos nuevos entran tras 2 unidades completadas
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

describe("etiqueta de la voz", () => {
  const audioPack = { sentences: [{ id: "s1", it: "Vedrai che ho ragione.", es: "x", cefr_estimate: "A1", audio: "111111111111" }], lexemes: [] };
  it("con clip disponible el botón dice «voz sintética»", () => {
    render(<AudioProvider pack={audioPack} index={new Set(["111111111111"])}><ItemView item={choice} onAnswer={() => {}} /></AudioProvider>);
    fireEvent.click(screen.getByText("Vedrai che ho ragione."));
    expect(screen.getByText(/voz sintética/)).toBeTruthy();
    expect(screen.queryByText(/voz del sistema/)).toBeNull();
  });
  it("sin clip dice «voz del sistema»", () => {
    render(<AudioProvider pack={audioPack} index={new Set()}><ItemView item={choice} onAnswer={() => {}} /></AudioProvider>);
    fireEvent.click(screen.getByText("Vedrai che ho ragione."));
    expect(screen.getByText(/voz del sistema/)).toBeTruthy();
  });
  it("al desmontar el botón se detiene el audio que sonaba", async () => {
    const pause = vi.fn();
    vi.stubGlobal("Audio", class { play() { return Promise.resolve(); } pause() { pause(); } });
    const { unmount } = render(<AudioProvider pack={audioPack} index={new Set(["111111111111"])}><ItemView item={choice} onAnswer={() => {}} /></AudioProvider>);
    fireEvent.click(screen.getByText("Vedrai che ho ragione."));
    fireEvent.click(screen.getByText(/Escuchar/));
    await screen.findByText(/voz sintética/);
    pause.mockClear();
    unmount();
    expect(pause).toHaveBeenCalled();
  });
  it("la opción incorrecta nunca tiene botón de voz ni clip", () => {
    render(<AudioProvider pack={audioPack} index={new Set(["111111111111"])}><ItemView item={choice} onAnswer={() => {}} /></AudioProvider>);
    expect(screen.queryByText(/Escuchar/)).toBeNull();
    fireEvent.click(screen.getByText("Vedrai che tengo ragione."));
    expect(screen.getAllByText(/Escuchar/)).toHaveLength(1);
  });
});

describe("etiqueta de grabación nativa", () => {
  it("una palabra con grabación nativa muestra «hablante nativo»", async () => {
    const pk = pack();
    const seeded = memoryStore();
    for (const id of ["x1", "x2"]) await seeded.putUnit(masterByPlacement(emptyProgress(id), NOW));
    render(<AudioProvider pack={{ sentences: [], lexemes: [{ ...pk.lexemes[0], audio: "222222222222" }] }} index={new Set(["222222222222"])} words={new Map([["burro", "burro--ana.mp3"]])}>
      <ReviewScreen pack={pk} store={seeded} now={NOW} /></AudioProvider>);
    expect(await screen.findByText("burro")).toBeTruthy();
    expect(screen.getByText(/grabación de un hablante nativo/)).toBeTruthy();
  });
});

describe("AboutScreen: voces", () => {
  it("declara la voz sintética Piper (CC BY 4.0) y las grabaciones nativas (CC BY-SA 4.0)", () => {
    render(<AboutScreen manifest={pack().manifest} sentences={[]} />);
    const piper = screen.getByText(/Piper/);
    expect(piper.textContent).toMatch(/voz sintética/);
    expect(piper.textContent).toMatch(/CC BY 4\.0/);
    expect(screen.getByText(/Lingua Libre/).textContent).toMatch(/CC BY-SA 4\.0/);
  });
});

describe("etiqueta según lo que suena", () => {
  it("si el clip falla y suena la voz del sistema, la etiqueta lo dice", async () => {
    vi.stubGlobal("Audio", class { play() { return Promise.reject(new Error("x")); } pause() {} });
    vi.stubGlobal("speechSynthesis", { getVoices: () => [{ lang: "it-IT" }], speak: vi.fn(), cancel: vi.fn() });
    vi.stubGlobal("SpeechSynthesisUtterance", class {});
    const audioPack = { sentences: [{ id: "s1", it: "Vedrai che ho ragione.", es: "x", cefr_estimate: "A1", audio: "111111111111" }], lexemes: [] };
    render(<AudioProvider pack={audioPack} index={new Set(["111111111111"])}><ItemView item={choice} onAnswer={() => {}} /></AudioProvider>);
    fireEvent.click(screen.getByText("Vedrai che ho ragione."));
    expect(screen.getByText(/voz sintética/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Escuchar/));
    await waitFor(() => expect(screen.getByText(/voz del sistema/)).toBeTruthy());
    expect(screen.queryByText(/voz sintética/)).toBeNull();
  });
});

describe("AboutScreen: enlace a las atribuciones de audio", () => {
  it("enlaza el archivo de atribuciones de audio", () => {
    render(<AboutScreen manifest={pack().manifest} sentences={[]} />);
    const a = screen.getByText("Atribuciones de audio") as HTMLAnchorElement;
    expect(a.getAttribute("href")).toContain("audio/ATTRIBUZIONI-audio.md");
  });
});

describe("WriteScreen", () => {
  it("marca el calco con su explicación y no marca italiano correcto", () => {
    render(<WriteScreen pack={pack()} store={memoryStore()} />);
    fireEvent.click(screen.getByText("Mi propio texto"));
    const box = screen.getByLabelText("Tu texto en italiano");
    fireEvent.change(box, { target: { value: "Ho andato a casa." } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));
    expect(screen.getByText("«Ho»")).toBeTruthy();
    expect(screen.getByText(/verbos de movimiento/)).toBeTruthy();
    fireEvent.change(box, { target: { value: "Sono andato a casa." } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));
    expect(screen.getByText(/No encontré ninguno/)).toBeTruthy();
  });
  it("no deja revisar un texto vacío", () => {
    render(<WriteScreen pack={pack()} store={memoryStore()} />);
    fireEvent.click(screen.getByText("Mi propio texto"));
    expect((screen.getByRole("button", { name: "Revisar" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("recuperación ante errores de guardado", () => {
  it("el repaso avisa y deja reintentar si falla el guardado", async () => {
    const store = memoryStore();
    const c = newCard({ kind: "error_code", ref: "ERR_TENERE_AVERE" }, "not_applicable", NOW);
    await store.putCard(c);
    const put = store.putCard;
    store.putCard = vi.fn().mockRejectedValueOnce(new Error("disco lleno")).mockImplementation(put);
    render(<ReviewScreen pack={pack({ lexemes: [] })} store={store} now={NOW} />);
    fireEvent.click(await screen.findByText("Vedrai che ho ragione."));
    fireEvent.click(screen.getByText("Continuar"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo guardar/);
    expect(screen.queryByText(/Terminaste esta tanda/)).toBeNull();
    fireEvent.click(screen.getByText("Continuar"));
    await screen.findByText(/Terminaste esta tanda/);
    expect((await store.getCard(c.id))?.fsrs.reps).toBe(1);
  });
  it("la cápsula deja reintentar «Terminar» y no duplica la tarjeta", async () => {
    const store = memoryStore();
    const putDay = store.putDay;
    store.putDay = vi.fn().mockRejectedValueOnce(new Error("fallo")).mockImplementation(putDay);
    render(<CapsuleScreen capsule={cap()} store={store} now={NOW} />);
    await screen.findByText(/Traduce al italiano/);
    fireEvent.click(screen.getByText("Ver la respuesta"));
    fireEvent.click(screen.getByText("Continuar"));
    fireEvent.click(screen.getByText("Entendido"));
    for (let i = 0; i < 4; i++) {
      fireEvent.change(await screen.findByLabelText("Respuesta"), { target: { value: "ho" } });
      fireEvent.click(screen.getByText("Comprobar"));
      fireEvent.click(screen.getByText("Continuar"));
    }
    await screen.findByText(/Acertaste 4 de 4/);
    fireEvent.click(screen.getByText("Terminar"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo guardar/);
    fireEvent.click(screen.getByText("Terminar"));
    await screen.findByText(/Cápsula completada/);
    expect((await store.allLogs()).length).toBe(1);
    expect((await store.getDay(localDate(NOW))).capsulesDone).toEqual(["cap_err_tenere_avere"]);
  });
});

describe("TodayScreen", () => {
  it("muestra cómo empezar solo la primera vez", () => {
    const plan = planToday({ pack: pack(), cards: [], day: { date: localDate(NOW), reviewsDone: 0, capsulesDone: [] }, now: NOW });
    const day = { date: localDate(NOW), reviewsDone: 0, capsulesDone: [] };
    const { rerender } = render(<TodayScreen plan={plan} day={day} firstTime />);
    expect(screen.getByText("Cómo empezar")).toBeTruthy();
    rerender(<TodayScreen plan={plan} day={day} />);
    expect(screen.queryByText("Cómo empezar")).toBeNull();
  });
});

describe("SettingsScreen", () => {
  it("restaura una copia válida y rechaza una dañada sin tocar el progreso", async () => {
    const store = memoryStore();
    vi.stubGlobal("confirm", () => true);
    render(<SettingsScreen store={store} memoryOnly={false} />);
    const input = screen.getByLabelText("Restaurar desde una copia") as HTMLInputElement;
    const bad = new File(["{"], "malo.json", { type: "application/json" });
    Object.defineProperty(bad, "text", { value: async () => "{" });
    fireEvent.change(input, { target: { files: [bad] } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/no es una copia/i);
    const good = new File([""], "bien.json");
    Object.defineProperty(good, "text", { value: async () => JSON.stringify({ app: "italiano-contrastivo", version: 1, exportedAt: "x", cards: [], logs: [], days: [{ date: "2026-11-17", reviewsDone: 3, capsulesDone: [] }] }) });
    fireEvent.change(input, { target: { files: [good] } });
    await screen.findByText(/Progreso restaurado/);
    expect((await store.getDay("2026-11-17")).reviewsDone).toBe(3);
  });
  it("avisa si el progreso solo vive en memoria", () => {
    render(<SettingsScreen store={memoryStore()} memoryOnly />);
    expect(screen.getByRole("alert").textContent).toMatch(/se perderá/);
  });
});
