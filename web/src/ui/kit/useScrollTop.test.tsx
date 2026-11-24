import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollTop } from "./useScrollTop";

function Probe({ hash }: { hash: string }) {
  useScrollTop(hash);
  return <p>{hash}</p>;
}

let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => { scrollTo = vi.fn(); window.scrollTo = scrollTo as unknown as typeof window.scrollTo; });
afterEach(cleanup);

describe("volver arriba al cambiar de pantalla", () => {
  it("no se desplaza en el primer render", () => {
    render(<Probe hash="#/" />);
    expect(scrollTo).not.toHaveBeenCalled();
  });
  it("vuelve arriba cuando cambia el hash", () => {
    const { rerender } = render(<Probe hash="#/" />);
    rerender(<Probe hash="#/ruta" />);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
  it("no se desplaza si el hash no cambia", () => {
    const { rerender } = render(<Probe hash="#/ruta" />);
    rerender(<Probe hash="#/ruta" />);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
