import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import { canDoKey } from "../state/cando";
import { moduleProgressId } from "../state/modules";
import { setPreview } from "../state/preview";
import { memoryStore } from "../state/store";
import { ModuleStepScreen } from "./ModuleStepScreen";

import { readItems } from "../test/realPack";
afterEach(() => { cleanup(); localStorage.clear(); });
beforeEach(() => { localStorage.clear(); setPreview(true); });   // modo de prueba: el Cierre está abierto
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: readItems(), lexemes: read("lexemes.json"), sentences: read("sentences.json"), manifest: read("manifest.json"),
  course: read("course.json"), readings: read("readings.json"), readingWords: read("reading_words.json"), speaking: read("speaking.json"), library: read("library.json") } as ContentPack;
const m = pack.course.modules![0];
const text = m.can_do_es[0];
const progressOf = async (store: ReturnType<typeof memoryStore>) => store.getUnit(moduleProgressId(m.id));
const box = () => screen.findByRole("checkbox", { name: text });

describe("el Cierre guarda lo que marcas que sabes hacer", () => {
  it("marcar guarda la marca en el progreso del módulo", async () => {
    const store = memoryStore();
    render(<ModuleStepScreen moduleId={m.id} step="cierre" pack={pack} store={store} />);
    fireEvent.click(await box());
    await waitFor(async () => expect((await progressOf(store))?.done[canDoKey(text)]).toBeTruthy());
  });
  it("al volver a abrir el Cierre la casilla sigue marcada", async () => {
    const store = memoryStore();
    const first = render(<ModuleStepScreen moduleId={m.id} step="cierre" pack={pack} store={store} />);
    fireEvent.click(await box());
    await waitFor(async () => expect((await progressOf(store))?.done[canDoKey(text)]).toBeTruthy());
    first.unmount();
    render(<ModuleStepScreen moduleId={m.id} step="cierre" pack={pack} store={store} />);
    expect(((await box()) as HTMLInputElement).checked).toBe(true);
  });
  it("desmarcar quita la marca guardada", async () => {
    const store = memoryStore();
    render(<ModuleStepScreen moduleId={m.id} step="cierre" pack={pack} store={store} />);
    fireEvent.click(await box());
    await waitFor(async () => expect((await progressOf(store))?.done[canDoKey(text)]).toBeTruthy());
    fireEvent.click(await box());
    await waitFor(async () => expect((await progressOf(store))?.done[canDoKey(text)]).toBeUndefined());
  });
  it("marcar no completa el módulo ni cuenta como Cierre hecho", async () => {
    const store = memoryStore();
    render(<ModuleStepScreen moduleId={m.id} step="cierre" pack={pack} store={store} />);
    fireEvent.click(await box());
    await waitFor(async () => expect(await progressOf(store)).toBeDefined());
    const p = (await progressOf(store))!;
    expect(p.completed).toBe(false);
    expect(p.done.cierre).toBeUndefined();
  });
  it("marcar varias seguidas no pierde ninguna", async () => {
    const store = memoryStore();
    render(<ModuleStepScreen moduleId={m.id} step="cierre" pack={pack} store={store} />);
    const boxes = await screen.findAllByRole("checkbox");
    for (const b of boxes) fireEvent.click(b);
    await waitFor(async () => {
      const done = (await progressOf(store))?.done ?? {};
      for (const c of m.can_do_es) expect(done[canDoKey(c)]).toBeTruthy();
    });
  });
  it("dice que se guarda en este dispositivo", async () => {
    render(<ModuleStepScreen moduleId={m.id} step="cierre" pack={pack} store={memoryStore()} />);
    expect(await screen.findByText(/marcado por ti/)).toBeTruthy();
  });
});
