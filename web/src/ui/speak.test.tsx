import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpeakItem } from "./SpeakItem";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const sentence = { id: "s1", it: "Ho fame.", es: "Tengo hambre.", cefr_estimate: "A1", audio: "abc" };

describe("escuchar y repetir: ¿te entiende el teléfono?", () => {
  it("compara lo dictado con la frase: todo entendido, o qué palabras no aparecieron", async () => {
    vi.stubGlobal("navigator", {});
    render(<SpeakItem sentence={{ ...sentence, it: "Forse non è giovane." }} onAnswer={() => undefined} />);
    fireEvent.click(screen.getByText(/Grabarme/));
    await screen.findByText(/no puede grabar/);
    const box = screen.getByLabelText("Lo que dictó el teléfono");
    fireEvent.change(box, { target: { value: "forse non è giovane" } });
    fireEvent.click(screen.getByText("Comparar"));
    expect(screen.getByText("El teléfono te entendió todo.")).toBeTruthy();
    fireEvent.change(box, { target: { value: "forse non è Giovanni" } });
    fireEvent.click(screen.getByText("Comparar"));
    expect(screen.getByText(/Se entendió 3 de 4 palabras/)).toBeTruthy();
    expect(screen.getByText("giovane.").tagName).toBe("MARK");
  });
});

describe("escuchar y repetir", () => {
  it("sin micrófono permite repetir en voz alta y autoevaluarse (bien/casi cuentan, otra vez no)", async () => {
    vi.stubGlobal("navigator", {});
    const answers: boolean[] = [];
    const { unmount } = render(<SpeakItem sentence={sentence} onAnswer={(c) => answers.push(c)} />);
    fireEvent.click(screen.getByText(/Grabarme/));
    expect(await screen.findByText(/no puede grabar/)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("no hay análisis automático de pronunciación");
    fireEvent.click(screen.getByText("Casi"));
    expect(answers).toEqual([true]);
    unmount();
    render(<SpeakItem sentence={sentence} onAnswer={(c) => answers.push(c)} />);
    fireEvent.click(screen.getByText(/Grabarme/));
    fireEvent.click(await screen.findByText("Otra vez"));
    expect(answers).toEqual([true, false]);
  });
  it("permiso denegado: avisa y deja continuar", async () => {
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => Promise.reject(new Error("denied")) } });
    vi.stubGlobal("MediaRecorder", class {});
    render(<SpeakItem sentence={sentence} onAnswer={() => undefined} />);
    fireEvent.click(screen.getByText(/Grabarme/));
    expect(await screen.findByText(/permiso denegado/)).toBeTruthy();
  });
  it("graba, ofrece tu grabación para escucharla y libera el micrófono", async () => {
    const stopTrack = vi.fn();
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: stopTrack }] }) } });
    class FakeRecorder {
      mimeType = "audio/webm"; ondataavailable: ((e: { data: Blob }) => void) | null = null; onstop: (() => void) | null = null;
      start() { /* grabando */ }
      stop() { this.ondataavailable?.({ data: new Blob(["x"]) }); this.onstop?.(); }
    }
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => undefined }));
    render(<SpeakItem sentence={sentence} onAnswer={() => undefined} />);
    fireEvent.click(screen.getByText(/Grabarme/));
    fireEvent.click(await screen.findByText(/Terminar/));
    await waitFor(() => expect(screen.getByLabelText("Tu grabación")).toBeTruthy());
    expect(stopTrack).toHaveBeenCalled();
  });
});
