import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Item } from "../generated/item";
import { RunProvider } from "./kit/RunContext";
import { ItemView } from "./items/ItemView";

afterEach(cleanup);
const base = { requires_server: false, review_status: "validated" };
const choice = { ...base, id: "c1", type: "choice_l1_distractor", prompt_es: "¿Cuál es correcta?", options: [
  { text: "Io ho fame.", correct: true }, { text: "Io tengo fame.", correct: false, error_code: "ERR_TENERE_AVERE", distractor_kind: "l1_calque" }] } as unknown as Item;
const show = (run: Parameters<typeof RunProvider>[0]["value"]) => render(<RunProvider value={run}><ItemView item={choice} onAnswer={() => undefined} /></RunProvider>);
const fail = () => fireEvent.click(screen.getByText("Io tengo fame."));

describe("hoja de corrección", () => {
  it("al fallar muestra «Dijiste» tachado y «Se dice» con lo que cambia resaltado", () => {
    show({});
    fail();
    const sheet = screen.getByRole("status");
    expect(within(sheet).getByText("Dijiste")).toBeTruthy();
    expect(within(sheet).getByText("Io tengo fame.").tagName).toBe("DEL");
    expect(within(sheet).getByText("Se dice")).toBeTruthy();
    expect(sheet.querySelector("mark")?.textContent).toBe("ho");
  });
  it("el porqué del ejercicio está a la vista, sin desplegar nada", () => {
    show({});
    fail();
    const why = screen.getByText(/error típico de hispanohablantes/);
    expect(why.closest("details")).toBeNull();
  });
  it("«Ver ficha» aparece con fichaHref y apunta a ella; sin fichaHref no aparece", () => {
    show({ fichaHref: "#/unidad/u01" });
    fail();
    expect(screen.getByRole("link", { name: "Ver ficha" }).getAttribute("href")).toBe("#/unidad/u01");
    cleanup();
    show({});
    fail();
    expect(screen.queryByRole("link", { name: "Ver ficha" })).toBeNull();
  });
  it("al acertar la hoja es breve: sin «Dijiste» ni «Ver ficha»", () => {
    show({ fichaHref: "#/unidad/u01", why: "regla" });
    fireEvent.click(screen.getByText("Io ho fame."));
    const sheet = screen.getByRole("status");
    expect(sheet.textContent).toContain("¡Correcto!");
    expect(within(sheet).queryByText("Dijiste")).toBeNull();
    expect(screen.queryByRole("link", { name: "Ver ficha" })).toBeNull();
    expect(screen.queryByText("Ver la regla")).toBeNull();
  });
  it("la regla de la unidad queda plegada", () => {
    show({ why: "El español usa tener; el italiano avere." });
    fail();
    const summary = screen.getByText("Ver la regla");
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")?.textContent).toContain("El español usa tener");
  });
});
