import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { localDate, memoryStore } from "../state/store";
import { useStrandTimer } from "./kit/useStrandTimer";
import { WeekCard } from "./WeekCard";

afterEach(() => { cleanup(); vi.useRealTimers(); });

function Probe({ store }: { store: ReturnType<typeof memoryStore> }) { useStrandTimer(store, "salida"); return <p>probe</p>; }

describe("Tu semana", () => {
  it("sin datos explica qué verás; con datos muestra minutos por hebra y la que menos trabajas", () => {
    const { rerender } = render(<WeekCard week={{}} />);
    expect(screen.getByText(/aquí verás cuánto tiempo real/)).toBeTruthy();
    rerender(<WeekCard week={{ foco: 25 * 60, entrada: 5 * 60, salida: 60 }} />);
    expect(screen.getByText("Estudiar la lengua").closest("li")!.textContent).toContain("25 min");
    expect(screen.getByText(/La que menos trabajas esta semana es «Fluidez»/)).toBeTruthy();
  });
  it("el cronómetro cuenta solo tiempo activo: con toques suma, sin toques en 2 min deja de contar", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T10:00:00"));
    const store = memoryStore();
    const { unmount } = render(<Probe store={store} />);
    for (let i = 0; i < 10; i++) { fireEvent.pointerDown(window); await act(async () => { vi.advanceTimersByTime(1000); }); }
    await act(async () => { vi.advanceTimersByTime(200_000); }); // 200 s sin tocar: solo cuentan los primeros 120 s tras el último toque
    unmount();
    await vi.runAllTimersAsync();
    const s = (await store.getDay(localDate(new Date()))).seconds?.salida ?? 0;
    expect(s).toBeGreaterThanOrEqual(9);
    expect(s).toBeLessThanOrEqual(135);
  });
});
