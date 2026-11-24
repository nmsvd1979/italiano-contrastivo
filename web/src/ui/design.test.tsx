import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item } from "../generated/item";
import { clearRun, loadRun, saveRun, signature } from "../state/runState";
import { fromItems, ItemRunner } from "./ItemRunner";
import { diffWords, fillSegments } from "./kit/diff";
import { isFocusRoute, TabBar } from "./kit/TabBar";
import { say } from "./speech";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
beforeEach(() => localStorage.clear());

const base = { requires_server: false, review_status: "validated" };
const choice = (n: number) => ({ ...base, id: `c${n}`, type: "choice_l1_distractor", prompt_es: "¿Cuál es correcta?", options: [
  { text: "Io ho fame.", correct: true }, { text: "Io tengo fame.", correct: false, error_code: "ERR_TENERE_AVERE", distractor_kind: "l1_calque" }] }) as unknown as Item;

describe("resaltado de lo que cambia", () => {
  it("marca solo las palabras de la respuesta que el usuario no tenía", () => {
    expect(diffWords("Io ho fame.", "Io tengo fame.")).toEqual([
      { text: "Io", changed: false }, { text: "ho", changed: true }, { text: "fame.", changed: false }]);
  });
  it("respeta palabras repetidas", () => {
    const segs = diffWords("a casa a Roma", "a casa Roma"); // falta la segunda «a»
    expect(segs.map((s) => s.changed)).toEqual([false, false, true, false]);
  });
  it("rellena el hueco y marca la respuesta", () => {
    expect(fillSegments("Io ___ fame.", "ho").map((s) => s.text + (s.changed ? "*" : ""))).toEqual(["Io ", "ho*", " fame."]);
  });
});

describe("hoja de retroalimentación", () => {
  it("al fallar muestra la respuesta con lo que cambia resaltado, «Ver la regla» y el aviso de que vuelve", () => {
    render(<ItemRunner items={fromItems([choice(1)])} requeueWrong why="El español usa tener; el italiano avere." onFinish={() => undefined} />);
    fireEvent.click(screen.getByText("Io tengo fame."));
    const sheet = screen.getByRole("status");
    expect(sheet.textContent).toContain("Casi");
    expect(sheet.textContent).toContain("Se dice");
    expect(sheet.querySelector("mark")?.textContent).toBe("ho");
    expect(screen.getByText("Ver la regla")).toBeTruthy();
    expect(sheet.textContent).toContain("El español usa tener; el italiano avere.");
    expect(sheet.textContent).toContain("volverá al final");
  });
  it("al acertar es breve y no ofrece «Ver la regla»", () => {
    render(<ItemRunner items={fromItems([choice(1)])} why="x" onFinish={() => undefined} />);
    fireEvent.click(screen.getByText("Io ho fame."));
    expect(screen.getByRole("status").textContent).toContain("¡Correcto!");
    expect(screen.queryByText("Ver la regla")).toBeNull();
  });
});

describe("escucha y elige", () => {
  const listen = { ...base, id: "l1", type: "choice_l1_distractor", listen: true, prompt_es: "Escucha la frase y elige cómo se escribe.", options: [
    { text: "Questo non è mio figlio.", correct: true }, { text: "Questo non è mio fillio.", correct: false, error_code: "ERR_GLI_PALATAL", distractor_kind: "morphological" }] } as unknown as Item;
  it("ofrece el audio antes de responder y no lo duplica en la hoja de respuesta", () => {
    render(<ItemRunner items={fromItems([listen])} onFinish={() => undefined} />);
    expect(screen.getAllByText(/Escuchar/)).toHaveLength(1);
    fireEvent.click(screen.getByText("Questo non è mio fillio."));
    expect(screen.getAllByText(/Escuchar/)).toHaveLength(1);
    expect(screen.getByRole("status").querySelector("mark")?.textContent).toBe("figlio.");
  });
});

describe("modo concentrado", () => {
  it("la barra sube con el acierto y se estanca con el error", () => {
    render(<ItemRunner items={fromItems([choice(1), choice(2)])} requeueWrong onFinish={() => undefined} />);
    const now = () => Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"));
    expect(now()).toBe(0);
    fireEvent.click(screen.getByText("Io ho fame."));
    fireEvent.click(screen.getByText("Continuar"));
    expect(now()).toBe(50);
    fireEvent.click(screen.getByText("Io tengo fame.")); // falla el 2.º: no avanza
    fireEvent.click(screen.getByText("Continuar"));
    expect(now()).toBe(50);
    expect(screen.getByText(/Ejercicio 3 de 3/)).toBeTruthy(); // vuelve al final
  });
  it("tiene salida (×) a donde se indica y felicita cada 5 aciertos seguidos", () => {
    render(<ItemRunner items={fromItems([1, 2, 3, 4, 5, 6].map(choice))} exitHref="#/unidad/u01" onFinish={() => undefined} />);
    expect(screen.getByLabelText("Salir").getAttribute("href")).toBe("#/unidad/u01");
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText("Io ho fame."));
      fireEvent.click(screen.getByText("Continuar"));
    }
    expect(screen.getByText("¡5 aciertos seguidos!")).toBeTruthy();
  });
  it("las pantallas de trabajo ocultan el menú y las demás lo muestran", () => {
    expect(["#/unidad/u03/practica", "#/repaso", "#/capsula/cap_x", "#/ubicacion"].every(isFocusRoute)).toBe(true);
    expect(["#/", "#/ruta", "#/unidad/u03", "#/escribir", "#/ajustes"].some(isFocusRoute)).toBe(false);
    render(<TabBar hash="#/ruta" />);
    expect(screen.getByText("Ruta").closest("a")?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Hoy").closest("a")?.getAttribute("aria-current")).toBeNull();
  });
});

describe("retomar un bloque a medias", () => {
  const items = fromItems([1, 2, 3].map(choice));
  it("guarda el avance y al volver continúa donde quedó", () => {
    const first = render(<ItemRunner items={items} persistKey="u01:practica" onFinish={() => undefined} />);
    fireEvent.click(screen.getByText("Io ho fame."));
    fireEvent.click(screen.getByText("Continuar"));
    first.unmount();
    render(<ItemRunner items={items} persistKey="u01:practica" onFinish={() => undefined} />);
    expect(screen.getByText(/Ejercicio 2 de 3/)).toBeTruthy();
    expect(screen.getByText(/retomado/)).toBeTruthy();
  });
  it("al terminar se borra lo guardado", () => {
    render(<ItemRunner items={fromItems([choice(1)])} persistKey="k" onFinish={() => undefined} />);
    saveRun("k", { sig: signature(["c1"]), queue: [0], pos: 0, first: [null], requeued: [], done: [], streak: 0 });
    fireEvent.click(screen.getByText("Io ho fame."));
    fireEvent.click(screen.getByText("Continuar"));
    expect(loadRun("k", ["c1"])).toBeNull();
  });
  it("lo guardado de otra lista de ejercicios o dañado se ignora", () => {
    saveRun("k", { sig: signature(["otro"]), queue: [0], pos: 0, first: [null], requeued: [], done: [], streak: 0 });
    expect(loadRun("k", ["c1"])).toBeNull();
    localStorage.setItem("italiano-contrastivo.run.k", "{no es json");
    expect(loadRun("k", ["c1"])).toBeNull();
    clearRun("k");
  });
});

describe("voz lenta", () => {
  it("el clip se reproduce más despacio con rate 0,7", async () => {
    const audios: { playbackRate: number }[] = [];
    vi.stubGlobal("Audio", class { playbackRate = 1; constructor() { audios.push(this); } play() { return Promise.resolve(); } pause() {} });
    await say("Ho fame.", { clipId: "abc", index: new Set(["abc"]), base: "./", rate: 0.7 });
    expect(audios[0].playbackRate).toBe(0.7);
  });
});
