import { createContext, useContext } from "react";

/** Lo que los ejercicios necesitan saber del contexto: la explicación de «¿Por qué?» y si lo fallado volverá al final. */
export type Run = { why?: string; /** Enlace a la ficha de la unidad (solo en los pasos de una unidad). */ fichaHref?: string; requeue?: boolean; /** Comodines de «mi versión también es correcta»: sin esto, ilimitados (práctica); en la prueba de unidad hay pocos. */ overrides?: { left: number; use: () => void } };
const Ctx = createContext<Run>({});
export const RunProvider = Ctx.Provider;
export const useRun = () => useContext(Ctx);
