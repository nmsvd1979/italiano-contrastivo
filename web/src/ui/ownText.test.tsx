import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Store } from "../state/store";
import { milestoneOralTask } from "../state/milestone";
import type { ContentPack } from "../content/load";
import { OWN_TEXT_MIN_WORDS, OwnText, wordCount } from "./WriteScreen";

afterEach(cleanup);
const store = {} as Store;
const type = (text: string) => { fireEvent.change(screen.getByLabelText("Tu texto en italiano"), { target: { value: text } }); fireEvent.click(screen.getByRole("button", { name: "Revisar" })); };

describe("escritura de la Salida: mínimo de palabras", () => {
  it("un texto corto se revisa pero no cuenta como hecho, y dice cuántas palabras lleva", () => {
    const done = vi.fn();
    render(<OwnText store={store} onChecked={done} />);
    type("Mi chiamo Ana e sono cilena.");
    expect(done).not.toHaveBeenCalled();
    expect(screen.getByText(/al menos 20 palabras \(6 hasta ahora\)/)).toBeTruthy();
  });
  it("con 20 palabras sí cuenta", () => {
    const done = vi.fn();
    render(<OwnText store={store} onChecked={done} />);
    type(Array.from({ length: OWN_TEXT_MIN_WORDS }, () => "casa").join(" "));
    expect(done).toHaveBeenCalledTimes(1);
  });
  it("sin onChecked (Escribir libre) no muestra el aviso", () => {
    render(<OwnText store={store} />);
    type("ciao");
    expect(screen.queryByText(/al menos/)).toBeNull();
    expect(wordCount("  uno   dos ")).toBe(2);
  });
});

describe("tarea oral del hito", () => {
  const pack = { speaking: { tasks: [{ id: "a", level: "A1" }, { id: "b", level: "A1" }, { id: "x", level: "A2" }] } } as unknown as ContentPack;
  it("cambia con cada intento, da la vuelta y respeta el nivel", () => {
    expect([0, 1, 2].map((n) => milestoneOralTask(pack, "A1", n)?.id)).toEqual(["a", "b", "a"]);
    expect(milestoneOralTask(pack, "B1")).toBeUndefined();
  });
});
