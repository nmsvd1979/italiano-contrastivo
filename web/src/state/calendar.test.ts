import { describe, expect, it } from "vitest";
import { fourWeeks } from "./calendar";
import type { DayProgress } from "./store";

const day = (date: string, over: Partial<DayProgress> = {}): DayProgress => ({ date, reviewsDone: 0, capsulesDone: [], ...over });
const TODAY = "2026-11-24"; // martes

describe("calendario de cuatro semanas", () => {
  it("son 28 celdas, de lunes a domingo, y la última fila es la semana en curso", () => {
    const { cells } = fourWeeks([], TODAY);
    expect(cells).toHaveLength(28);
    expect(cells[0].date).toBe("2026-11-02");   // lunes
    expect(cells[21].date).toBe("2026-11-23");  // lunes de la semana en curso
    expect(cells[22].date).toBe(TODAY);
    expect(cells[27].date).toBe("2026-11-29");  // domingo
  });
  it("si hoy es lunes o domingo la semana en curso sigue siendo la última fila", () => {
    expect(fourWeeks([], "2026-11-23").cells[21].date).toBe("2026-11-23");
    const sunday = fourWeeks([], "2026-11-29").cells;
    expect(sunday[27].date).toBe("2026-11-29");
    expect(sunday[27].future).toBe(false);
  });
  it("un día antiguo con repasos y sin segundos cuenta como estudiado", () => {
    const c = fourWeeks([day("2026-11-10", { reviewsDone: 3 })], TODAY).cells.find((x) => x.date === "2026-11-10")!;
    expect(c.studied).toBe(true);
    expect(c.level).toBe(1);
  });
  it("un día con segundos y sin pasos también cuenta", () => {
    const c = fourWeeks([day("2026-11-11", { seconds: { foco: 300 } })], TODAY).cells.find((x) => x.date === "2026-11-11")!;
    expect(c.studied).toBe(true);
    expect(c.seconds).toBe(300);
  });
  it("el nivel 2 empieza en 10 minutos sumando todas las hebras", () => {
    const at = (s: number) => fourWeeks([day("2026-11-12", { seconds: { foco: s - 100, salida: 100 } })], TODAY).cells.find((x) => x.date === "2026-11-12")!.level;
    expect(at(599)).toBe(1);
    expect(at(600)).toBe(2);
  });
  it("los días posteriores a hoy no cuentan aunque tengan datos", () => {
    const { cells, studiedDays } = fourWeeks([day("2026-11-26", { reviewsDone: 5, seconds: { foco: 900 } })], TODAY);
    const c = cells.find((x) => x.date === "2026-11-26")!;
    expect(c).toMatchObject({ future: true, studied: false, level: 0 });
    expect(studiedDays).toBe(0);
  });
  it("suma solo los días de estudio no futuros y su tiempo", () => {
    const r = fourWeeks([day("2026-11-03", { reviewsDone: 1, seconds: { foco: 120 } }), day("2026-11-24", { stepsDone: ["u01:descubre"], seconds: { entrada: 60 } }), day("2026-10-20", { reviewsDone: 9 })], TODAY);
    expect(r.studiedDays).toBe(2);   // el de octubre queda fuera de las 4 semanas
    expect(r.seconds).toBe(180);
  });
});
