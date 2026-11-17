import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentPack } from "../content/load";
import type { Item } from "../generated/item";
import { unitViews } from "../state/course";
import { testItems } from "../state/steps";
import { markStep } from "../state/course";
import { emptyProgress } from "../state/course";
import { finishStep, finishTest, placeUnits } from "../state/progress";
import { memoryStore } from "../state/store";
import { judgeDictation } from "./DictationItem";
import { fromItems, ItemRunner } from "./ItemRunner";
import { placementPlan, PLACEMENT_PER_UNIT } from "./PlacementScreen";
import { RouteScreen } from "./RouteScreen";
import { StepScreen } from "./StepScreen";
import { UnitScreen } from "./UnitScreen";

afterEach(cleanup);
const read = (f: string) => JSON.parse(readFileSync(`public/content/${f}`, "utf8"));
const pack = { capsules: read("capsules.json"), itemsByCode: read("items_by_code.json"), lexemes: read("lexemes.json"), sentences: read("sentences.json"),
  manifest: read("manifest.json"), course: read("course.json") } as ContentPack;
const NOW = new Date("2026-11-17T12:00:00.000Z");

describe("dictado", () => {
  it.each([
    ["Ho fame.", "ho fame", "exact"],
    ["Io sono andato a casa.", "Io sono andato a casa", "exact"],
    ["È venuto ieri sera da noi.", "e venuto ieri sera da noi", "accent"],
    ["Mia sorella vive a Roma.", "Mia sorella vive a Romma", "near"],
    ["Mia sorella vive a Roma.", "Mia sorella vive a Madrid", "wrong"],
    ["Ho fame.", "Ho sete", "wrong"], // frases cortas no admiten «casi»
  ])("%s ← «%s» = %s", (target, typed, v) => expect(judgeDictation(typed, target)).toBe(v));
});

describe("ItemRunner", () => {
  const cloze = (n: number): Item => ({ id: `z${n}`, type: "cloze", text: "Io ___ fame.", answers: ["ho"], requires_server: false, review_status: "validated" }) as unknown as Item;
  const answerCloze = (text: string) => {
    fireEvent.change(screen.getByLabelText("Respuesta"), { target: { value: text } });
    fireEvent.click(screen.getByText("Comprobar"));
    fireEvent.click(screen.getByText("Continuar"));
  };
  it("lo fallado vuelve una vez y la nota cuenta solo el primer intento", async () => {
    let result: { correct: number; total: number; answers: boolean[] } | null = null;
    render(<ItemRunner items={fromItems([cloze(1), cloze(2)])} requeueWrong onFinish={(r) => (result = r)} />);
    expect(screen.getByText(/Ejercicio 1 de 2/)).toBeTruthy();
    answerCloze("ho");       // 1.º correcto
    answerCloze("hai");      // 2.º falla → vuelve
    expect(screen.getByText(/Ejercicio 3 de 3/)).toBeTruthy();
    answerCloze("hai");      // falla otra vez: no vuelve de nuevo
    await waitFor(() => expect(result).not.toBeNull());
    expect(result).toEqual({ correct: 1, total: 2, answers: [true, false] });
  });
  it("sin requeue no repite", async () => {
    let result: { total: number } | null = null;
    render(<ItemRunner items={fromItems([cloze(1)])} onFinish={(r) => (result = r)} />);
    answerCloze("hai");
    await waitFor(() => expect(result).not.toBeNull());
    expect(screen.queryByText(/de 2/)).toBeNull();
  });
});

describe("persistencia de la ruta", () => {
  it("un paso hecho queda guardado y cuenta en el día; repetirlo no cambia la fecha", async () => {
    const store = memoryStore();
    const p = await finishStep(store, "u01", "descubre", NOW);
    const again = await finishStep(store, "u01", "descubre", new Date("2026-11-18T12:00:00.000Z"));
    expect(again.done.descubre).toBe(p.done.descubre);
    expect((await store.getDay("2026-11-17")).stepsDone).toEqual(["u01:descubre"]);
  });
  it("aprobar la prueba desbloquea la siguiente unidad; reprobar no", async () => {
    const store = memoryStore();
    expect((await finishTest(store, "u01", 7, 10, NOW)).passed).toBe(false);
    expect(unitViews(pack.course, await store.allUnits())[0].state).toBe("current");
    expect((await finishTest(store, "u01", 9, 10, NOW)).passed).toBe(true);
    const v = unitViews(pack.course, await store.allUnits());
    expect(v[0].state).toBe("completed");
    expect(v[1].state).toBe("current");
  });
  it("la ubicación completa las unidades dominadas y crea su tarjeta de repaso una sola vez", async () => {
    const store = memoryStore();
    await placeUnits(store, [pack.course.units[0]], NOW);
    await placeUnits(store, [pack.course.units[0]], NOW);
    expect((await store.allCards()).map((c) => c.id)).toEqual([`error_code:${pack.course.units[0].codes[0]}`]);
    expect((await store.allLogs()).length).toBe(1);
    expect((await store.allUnits())[0].mastery).toBe("ubicacion");
  });
  it("el plan de ubicación pide 3 preguntas por unidad", () => {
    for (const p of placementPlan(pack.course.units, pack)) expect(p.items.length).toBe(PLACEMENT_PER_UNIT);
  });
});

describe("pantallas de la ruta con el contenido real", () => {
  it("la ruta muestra completada, actual, bloqueada y próximamente con su razón", async () => {
    const store = memoryStore();
    await finishTest(store, "u01", 10, 10, NOW);
    render(<RouteScreen views={unitViews(pack.course, await store.allUnits())} pack={pack} />);
    expect(screen.getByText(/1 de 8 unidades completadas/)).toBeTruthy();
    expect(screen.getByText("Completada")).toBeTruthy();
    expect(screen.getByText(/Siguiente: Descubre/)).toBeTruthy();
    expect(screen.getAllByText("Se abre al completar la anterior").length).toBe(6);
    expect(screen.getByText("Consonantes dobles")).toBeTruthy();
    expect(screen.getAllByText(/próximamente/).length).toBe(pack.course.planned.length);
  });
  it("la unidad lista 5 pasos con minutos y solo deja entrar al siguiente", async () => {
    const views = unitViews(pack.course, []);
    render(<UnitScreen view={views[0]} pack={pack} />);
    for (const s of ["Descubre", "Cápsula", "Práctica", "Escucha", "Prueba de la unidad"]) expect(screen.getByText(s)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Empezar|Hacer|Repetir/ }).length).toBe(1);
  });
  it("un paso que no toca todavía no se abre", async () => {
    render(<StepScreen unitId="u01" step="prueba" pack={pack} store={memoryStore()} />);
    expect(await screen.findByText(/Todavía no puedes hacer este paso/)).toBeTruthy();
  });
  it("una unidad bloqueada tampoco", async () => {
    render(<StepScreen unitId="u02" step="descubre" pack={pack} store={memoryStore()} />);
    expect(await screen.findByText(/Todavía no puedes hacer este paso/)).toBeTruthy();
  });
});

describe("flujo completo de una unidad en la interfaz", () => {
  it("Descubre: 4 tarjetas y 2 preguntas llevan a «Paso completado» y guardan el paso", async () => {
    const store = memoryStore();
    render(<StepScreen unitId="u01" step="descubre" pack={pack} store={store} />);
    for (let i = 0; i < 4; i++) fireEvent.click(await screen.findByText("Siguiente"));
    for (let q = 0; q < 2; q++) {
      const question = pack.course.units[0];
      expect(question).toBeTruthy();
      const first = (await screen.findAllByRole("button")).find((b) => b.closest("ul.options"))!;
      fireEvent.click(first);
      fireEvent.click(screen.getByText(/Continuar|Terminar/));
    }
    await screen.findByText("Paso completado ✓");
    expect((await store.getUnit("u01"))?.done.descubre).toBeTruthy();
  });

  it("Prueba contestada bien: completa la unidad y avisa que se abrió la siguiente", async () => {
    const store = memoryStore();
    let p = emptyProgress("u01");
    for (const s of ["descubre", "capsula", "practica", "escucha"] as const) p = markStep(p, s, NOW);
    await store.putUnit(p);
    const unit = pack.course.units[0];
    render(<StepScreen unitId="u01" step="prueba" pack={pack} store={store} />);
    for (const item of testItems(unit, pack)) {
      if (item.type === "choice_l1_distractor") {
        const good = (item as unknown as { options: { text: string; correct: boolean }[] }).options.find((o) => o.correct)!.text;
        fireEvent.click(await screen.findByText(good));
      } else if (item.type === "cloze") {
        fireEvent.change(await screen.findByLabelText("Respuesta"), { target: { value: (item as unknown as { answers: string[] }).answers[0] } });
        fireEvent.click(screen.getByText("Comprobar"));
      } else {
        await screen.findByText("Comprobar");
        for (const t of (item as unknown as { answer: string[] }).answer) {
          const btn = [...document.querySelectorAll(".bank button")].find((b) => b.textContent === t && !(b as HTMLButtonElement).disabled)!;
          fireEvent.click(btn);
        }
        fireEvent.click(screen.getByText("Comprobar"));
      }
      fireEvent.click(await screen.findByText("Continuar"));
    }
    await screen.findByText("¡Unidad completada!");
    const views = unitViews(pack.course, await store.allUnits());
    expect(views[0].state).toBe("completed");
    expect(views[1].state).toBe("current");
  });

  it("Prueba contestada mal: no completa, pide volver a la práctica y conserva lo demás", async () => {
    const store = memoryStore();
    let p = emptyProgress("u01");
    for (const s of ["descubre", "capsula", "practica", "escucha"] as const) p = markStep(p, s, NOW);
    await store.putUnit(p);
    render(<StepScreen unitId="u01" step="prueba" pack={pack} store={store} />);
    for (let i = 0; i < 10; i++) {
      const wrong = (await screen.findAllByRole("button")).find((b) => b.closest("ul.options"));
      if (wrong) {
        // elegir la opción incorrecta: la que no es la correcta (la prueba mezcla tipos; si no hay opciones se responde mal el hueco/orden)
      }
      const cloze = screen.queryByLabelText("Respuesta");
      if (cloze) {
        fireEvent.change(cloze, { target: { value: "zzz" } });
        fireEvent.click(screen.getByText("Comprobar"));
      } else if (wrong) {
        const item = testItems(pack.course.units[0], pack)[i] as unknown as { options?: { text: string; correct: boolean }[] };
        const bad = item.options?.find((o) => !o.correct)?.text;
        fireEvent.click(screen.getByText(bad!));
      } else {
        fireEvent.click(await screen.findByText("Comprobar"));
      }
      fireEvent.click(await screen.findByText("Continuar"));
    }
    await screen.findByText("Casi");
    const saved = await store.getUnit("u01");
    expect(saved?.completed).toBe(false);
    expect(saved?.done.practica).toBeUndefined();
    expect(saved?.done.descubre).toBeTruthy();
  });
});
