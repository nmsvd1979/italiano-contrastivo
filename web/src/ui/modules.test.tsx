import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { emptyProgress } from "../state/course";
import { hablaKey, moduleProgressId, moduleTestItems, moduleViews } from "../state/modules";
import { planToday } from "../state/session";
import { memoryStore, type UnitProgress } from "../state/store";
import { ModuleScreen } from "./ModuleScreen";
import { ModuleStepScreen } from "./ModuleStepScreen";
import { RouteScreen } from "./RouteScreen";
import { nextAction } from "./TodayScreen";

import { readItems } from "../test/realPack";
afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: readItems(), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"),
  course: read("course.json"), readings: read("readings.json"), readingWords: read("reading_words.json"), speaking: read("speaking.json"), library: read("library.json") } as ContentPack;
const mods = pack.course.modules!;
const NOW = new Date("2026-11-24T12:00:00.000Z");
const at = NOW.toISOString();
const doneUnit = (id: string): UnitProgress => ({ ...emptyProgress(id), completed: true, testBest: 1, mastery: "prueba" });
const withUnits = async (store: ReturnType<typeof memoryStore>, m: (typeof mods)[number]) => { for (const u of m.units) await store.putUnit(doneUnit(u)); };
const putMod = (store: ReturnType<typeof memoryStore>, id: string, done: Record<string, string>) => store.putUnit({ ...emptyProgress(moduleProgressId(id)), done });

describe("pantallas de módulo", () => {
  it("la ruta lista los módulos de A1 con lo que sabrás hacer, y solo el primero está abierto", () => {
    const v = moduleViews(pack.course, [], false);
    render(<RouteScreen views={v.units} modules={v.modules} pack={pack} />);
    expect(screen.getByText(new RegExp(`0 de ${mods.length} módulos completados`))).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /^\d+\. / }).length).toBe(1);           // un solo módulo con enlace
    expect(screen.getByText(mods[0].can_do_es[0])).toBeTruthy();
  });
  it("el módulo muestra qué sabrás hacer, sus cinco pasos y las cápsulas bloqueadas", () => {
    const view = moduleViews(pack.course, [], false).modules[0];
    render(<ModuleScreen view={view} pack={pack} />);
    for (const c of mods[0].can_do_es) expect(screen.getByText(c)).toBeTruthy();
    for (const label of ["Entrada", "Cápsulas", "Salida", "Fluidez", "Cierre"]) expect(screen.getAllByText(new RegExp(`${label}$`)).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /^Continuar · Entrada/ }).getAttribute("href")).toBe(`#/modulo/${mods[0].id}/entrada`);
  });
  it("«Hoy» propone la Entrada al empezar, la escucha (Textos reales) al terminar las cápsulas y luego la Salida", () => {
    const base = { pack, cards: [], day: { date: "2026-11-24", reviewsDone: 0, capsulesDone: [] }, now: NOW };
    const a = nextAction(planToday({ ...base, units: [] }));
    expect(a.href).toBe(`#/modulo/${mods[0].id}/entrada`);
    const b = nextAction(planToday({ ...base, units: mods[0].units.map(doneUnit) }));
    expect(b.href).toBe(`#/modulo/${mods[0].id}/textos`);
    const c = nextAction(planToday({ ...base, units: [...mods[0].units.map(doneUnit), { ...emptyProgress(moduleProgressId(mods[0].id)), done: { textos: at } }] }));
    expect(c.href).toBe(`#/modulo/${mods[0].id}/salida`);
  });
  it("Entrada: leer el texto y responder marca el paso y abre las cápsulas", async () => {
    const store = memoryStore();
    render(<ModuleStepScreen moduleId={mods[0].id} step="entrada" pack={pack} store={store} />);
    fireEvent.click(await screen.findByText("Ya lo leí: preguntas"));
    const reading = pack.readings!.find((r) => r.id === mods[0].entry_reading)!;
    for (const q of reading.questions) {
      fireEvent.click(await screen.findByText(q.options[q.answer]));
      fireEvent.click(await screen.findByText("Continuar"));
    }
    expect(await screen.findByText("Entrada completada ✓")).toBeTruthy();
    await waitFor(async () => expect((await store.getUnit(moduleProgressId(mods[0].id)))?.done.entrada).toBeTruthy());
    expect(moduleViews(pack.course, await store.allUnits(), false).modules[0].next).toBe("capsulas");
  });
  it("un paso bloqueado no se puede hacer: la Salida espera a las cápsulas", async () => {
    render(<ModuleStepScreen moduleId={mods[0].id} step="salida" pack={pack} store={memoryStore()} />);
    expect(await screen.findByText(/Todavía no puedes hacer este paso/)).toBeTruthy();
  });
  it("Salida de un módulo sin juego de roles: un mensaje escrito de 20 palabras basta (uno corto no), y queda declarado el hueco", async () => {
    const noSpeech = { ...mods[2], roleplays: [], tasks: [], gap_es: "No hay un diálogo abierto de este tema." };
    const pack2 = { ...pack, course: { ...pack.course, modules: mods.map((m) => (m.id === noSpeech.id ? noSpeech : m)) } } as ContentPack;
    const idx = 2;
    const store = memoryStore();
    for (const m of mods.slice(0, idx)) { await withUnits(store, m); await store.putUnit({ ...emptyProgress(moduleProgressId(m.id)), done: { cierre: at }, completed: true }); }
    await withUnits(store, noSpeech);
    await putMod(store, noSpeech.id, { textos: at, [hablaKey("entrevista")]: at });          // escucha y preguntas por voz ya hechas
    render(<ModuleStepScreen moduleId={noSpeech.id} step="salida" pack={pack2} store={store} />);
    expect(await screen.findByText(noSpeech.gap_es!, { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Escribir mi mensaje" }));
    fireEvent.change(await screen.findByLabelText("Tu texto en italiano"), { target: { value: "Questo è il mio zaino." } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));
    expect((await store.getUnit(moduleProgressId(noSpeech.id)))?.done.salida).toBeFalsy();   // 5 palabras: se revisa, pero no se da por hecho
    fireEvent.change(screen.getByLabelText("Tu texto en italiano"), { target: { value: Array.from({ length: 20 }, () => "zaino").join(" ") } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));
    await waitFor(async () => expect((await store.getUnit(moduleProgressId(noSpeech.id)))?.done.salida).toBeTruthy());
  });
  it("Cierre: con todo bien completa el módulo y abre el siguiente; con todo mal, no", async () => {
    for (const right of [true, false]) {
      cleanup();
      const m = mods[0];
      const store = memoryStore();
      await withUnits(store, m);
      await putMod(store, m.id, { entrada: at, textos: at, salida: at, fluidez: at });
      render(<ModuleStepScreen moduleId={m.id} step="cierre" pack={pack} store={store} />);
      fireEvent.click(await screen.findByRole("button", { name: "Empezar la prueba" }));
      const view = moduleViews(pack.course, await store.allUnits(), false).modules[0];
      for (const item of moduleTestItems(view, pack)) {
        const accepted = (item as { accepted_it: string[] }).accepted_it[0];
        fireEvent.change(await screen.findByLabelText("Tu traducción"), { target: { value: right ? accepted : "xyz" } });
        fireEvent.click(screen.getByRole("button", { name: "Comprobar" }));
        fireEvent.click(await screen.findByText("Continuar"));
      }
      expect(await screen.findByText(right ? "¡Módulo completado!" : "Casi")).toBeTruthy();
      expect(!!screen.queryByRole("img", { name: "Sello del módulo 1, ganado" })).toBe(right);
      expect(!!screen.queryByRole("region", { name: "Ya sabes hacer" })).toBe(right);
      const after = moduleViews(pack.course, await store.allUnits(), false).modules;
      expect(after[0].state).toBe(right ? "completed" : "current");
      expect(after[1].state).toBe(right ? "current" : "locked");
    }
  });
});
