import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack, Speaking } from "../content/load";
import { cappedSeconds, spell, speakersOf, turnsOf, voicePrompt } from "../state/speaking";
import { localDate, memoryStore } from "../state/store";
import { SpeakingScreen } from "./SpeakingScreen";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const speaking: Speaking = read("speaking.json");
const readings = read("readings.json");
const pack = { capsules: [], itemsByCode: {}, lexemes: [], sentences: [], manifest: read("manifest.json"), course: read("course.json"), readings, speaking } as unknown as ContentPack;

describe("datos de habla guiada", () => {
  it("cada juego de roles usa un tramo del diálogo con dos voces y turnos de las dos", () => {
    const ids = speaking.roleplays.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const rp of speaking.roleplays) {
      const reading = readings.find((r: { id: string }) => r.id === rp.reading)!;
      const turns = turnsOf(rp, reading);
      expect(turns.every((t) => t.speaker), rp.id).toBe(true);
      expect(speakersOf(turns).length, rp.id).toBeGreaterThanOrEqual(2);
      for (const u of rp.after) expect(pack.course.units.some((x) => x.id === u), `${rp.id}:${u}`).toBe(true);
    }
  });
  it("cada tarea trae fuente con licencia, preguntas con audio y rúbrica; la corrección del libro queda declarada", () => {
    for (const t of speaking.tasks) {
      expect(t.source.url, t.id).toMatch(/^https:\/\//);
      expect(t.source.license, t.id).toBeTruthy();
      expect(t.questions.length, t.id).toBeGreaterThanOrEqual(3);
      for (const q of t.questions) expect(q.audio, `${t.id}: ${q.it}`).toMatch(/^[0-9a-f]{12}$/);
      expect(t.checklist_es.length, t.id).toBeGreaterThan(2);
      expect(t.adaptation.length, t.id).toBeGreaterThan(10);
    }
    expect(JSON.stringify(speaking.tasks.flatMap((t) => t.questions.map((q) => q.it)))).not.toContain("Quani"); // errata del libro, corregida
  });
  it("el alfabeto trae los nombres de las 21 letras de la tabla del libro", () => {
    expect(speaking.alphabet.letters.map((l) => l.letter).join("")).toBe("abcdefghilmnopqrstuvz");
    expect(speaking.alphabet.letters.find((l) => l.letter === "h")!.name).toBe("acca");
  });
});

describe("lógica de habla", () => {
  it("deletrea sin tildes y marca las letras que la tabla no trae", () => {
    const s = spell("Nicolás", speaking.alphabet).map((l) => l.name);
    expect(s).toEqual(["enne", "i", "ci", "o", "elle", "a", "esse"]);
    expect(spell("Kay", speaking.alphabet).map((l) => l.name)).toEqual([undefined, "a", undefined]);
  });
  it("una pausa larga no es estudio: cada turno cuenta como mucho 90 s", () => {
    expect(cappedSeconds([10, 500, -3, 20])).toBe(10 + 90 + 0 + 20);
  });
  it("el encargo para la IA trae las preguntas, el nivel y pide errores sin interrumpir", () => {
    const p = voicePrompt(speaking.tasks[0]);
    expect(p).toContain("Come ti chiami?");
    expect(p).toContain("A1");
    expect(p).toContain("no me interrumpas");
  });
});

describe("pantalla Hablar", () => {
  it("lista juegos de roles, tareas y alfabeto, y avisa que no mide la pronunciación", () => {
    render(<SpeakingScreen pack={pack} store={memoryStore()} />);
    expect(screen.getByText(/no mide tu pronunciación/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Practicar" }).length).toBe(speaking.roleplays.length);
    expect(screen.getAllByRole("button", { name: "Empezar" }).length).toBe(speaking.tasks.length);
  });
  it("un juego de roles recorre los turnos, muestra el modelo al pedirlo y suma tiempo a «Escribir y hablar»", async () => {
    const store = memoryStore();
    render(<SpeakingScreen pack={pack} store={store} />);
    const rp = speaking.roleplays.find((r) => r.id === "rp_stasera")!;
    const reading = readings.find((r: { id: string }) => r.id === rp.reading)!;
    const turns = turnsOf(rp, reading);
    fireEvent.click(screen.getAllByRole("button", { name: "Practicar" })[speaking.roleplays.indexOf(rp)]);
    fireEvent.click(screen.getByRole("button", { name: "Vittoria" }));
    for (const t of turns) {
      if (t.speaker === "Vittoria") {
        expect(screen.getByText(t.sentence.es)).toBeTruthy();
        expect(screen.queryByText(t.sentence.it)).toBeNull();            // el italiano no se ve hasta pedir el modelo
        fireEvent.click(screen.getByRole("button", { name: "Ver cómo se dice" }));
        expect(screen.getByText(t.sentence.it)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Bien" }));
      } else {
        fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      }
    }
    expect(await screen.findByText(/Dijiste 2 frases: 2 bien/)).toBeTruthy();
    await waitFor(async () => expect((await store.getDay(localDate(new Date()))).seconds?.salida).toBeGreaterThanOrEqual(0));
  });
  it("la tarea oral deja copiar el encargo para una IA y pide autoevaluarse con la rúbrica", async () => {
    render(<SpeakingScreen pack={pack} store={memoryStore()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Empezar" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Empezar a hablar/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Terminé" }));
    expect(await screen.findByText(/Autoevaluación/)).toBeTruthy();
    expect(screen.getAllByRole("checkbox").length).toBe(speaking.tasks[0].checklist_es.length);
    expect(screen.getByLabelText("Encargo para la IA")).toBeTruthy();
  });
  it("el deletreo muestra el nombre de cada letra", () => {
    render(<SpeakingScreen pack={pack} store={memoryStore()} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Ana" } });
    expect(screen.getByLabelText("Nombres de las letras").textContent).toBe("a – enne – a");
  });
  it("las frases de supervivencia traen audio y no incluyen lo que el libro no trae", () => {
    const items = speaking.phrases!.groups.flatMap((g) => g.items);
    expect(items.map((i) => i.it)).toEqual(expect.arrayContaining(["Come si dice...?", "Desidera?", "Si prega di pagare alla cassa.", "Non capisco.", "Non capisco, puoi ripetere?", "Che tempo fa?", "piove", "Posso avere il conto, per favore?", "Quanto costa?"]));
    for (const g of speaking.phrases!.groups) { expect(g.source.url, g.id).toMatch(/^https:\/\//); expect(g.source.license, g.id).toBeTruthy(); }
    expect(items.every((i) => /^[0-9a-f]{12}$/.test(i.audio ?? ""))).toBe(true);
    expect(JSON.stringify(items)).not.toMatch(/Può ripetere/);   // el trato formal «Può ripetere?» no está en ninguna fuente abierta verificada: no se inventa (sí «puoi ripetere», de Giornate italiane)
  });
  it("las frases se ocultan hasta pedir cómo se dicen", () => {
    render(<SpeakingScreen pack={pack} store={memoryStore()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver las frases" }));
    expect(screen.getByText("¿Cómo se dice...?")).toBeTruthy();
    expect(screen.queryByText(/^Come si dice\.\.\.\?/)).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Ver cómo se dice" })[0]);
    expect(screen.getByText(/Come si dice\.\.\.\?/)).toBeTruthy();
  });
});

describe("fluidez: releer y reescuchar", () => {
  it("solo ofrece lecturas de unidades completadas y con audio en todas sus frases", async () => {
    const { fluencyReadings, PASSES } = await import("../state/fluency");
    expect(fluencyReadings(pack, new Set()).length).toBe(0);
    const unit = pack.course.units.find((u) => (u.readings ?? []).length)!;
    const got = fluencyReadings(pack, new Set([unit.id]));
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((r) => r.sentences.every((s) => s.audio))).toBe(true);
    expect(PASSES.map((p) => p.rate)).toEqual([...PASSES.map((p) => p.rate)].sort((a, b) => a - b));   // cada pasada más rápida
    expect(PASSES.filter((p) => !p.showText).length).toBeGreaterThan(0);                                // y con menos apoyo
  });
  it("la pantalla pide completar unidades y, con una completada, ofrece su lectura y la pasada rápida oculta el texto", async () => {
    const store = memoryStore();
    const unit = pack.course.units.find((u) => (u.readings ?? []).length && readings.find((r: { id: string; sentences: { audio?: string }[] }) => r.id === u.readings![0])?.sentences.every((s) => s.audio))!;
    const { rerender } = render(<SpeakingScreen pack={pack} store={store} />);
    expect(screen.getByText(/lecturas de las unidades que completes/)).toBeTruthy();
    await store.putUnit({ unitId: unit.id, completed: true } as never);
    cleanup();
    render(<SpeakingScreen pack={pack} store={store} />);
    const reading = readings.find((r: { id: string }) => r.id === unit.readings![0]);
    await screen.findByText(/Tres pasadas de una lectura/);   // las unidades completadas se leen de forma asíncrona
    fireEvent.click(screen.getAllByRole("button", { name: "Empezar" }).at(-1)!);   // la lectura se ofrece después de las tareas orales
    expect(await screen.findByText(/Pasada 1 de 3: Despacio/)).toBeTruthy();
    expect(screen.getByText(reading.sentences[0].it)).toBeTruthy();
    void rerender;
  });
});
