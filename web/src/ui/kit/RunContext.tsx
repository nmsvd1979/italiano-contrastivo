import { createContext, useContext } from "react";

/** Lo que los ejercicios necesitan saber del contexto: la explicación de «¿Por qué?» y si lo fallado volverá al final. */
export type Run = { why?: string; requeue?: boolean };
const Ctx = createContext<Run>({});
export const RunProvider = Ctx.Provider;
export const useRun = () => useContext(Ctx);
