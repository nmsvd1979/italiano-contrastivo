import { createContext, useContext } from "react";

/** Lo que los ejercicios necesitan saber del contexto: la explicación de «¿Por qué?» y si lo fallado volverá al final. */
export type Run = { why?: string; /** Se llama al mostrar la corrección o la confirmación (al comprobar), antes de «Continuar»: ahí se anota el primer intento. */ onCheck?: (correct: boolean) => void; /** El usuario declara correcta una respuesta que la app dio por mala («mi versión también es correcta»): la nota la cuenta como acierto. */ onOverride?: () => void; /** Enlace a la ficha de la unidad (solo en los pasos de una unidad). */ fichaHref?: string; requeue?: boolean; /** Comodines de «mi versión también es correcta»: sin esto, ilimitados (práctica); en la prueba de unidad hay pocos. */ overrides?: { left: number; use: () => void } };
const Ctx = createContext<Run>({});
export const RunProvider = Ctx.Provider;
export const useRun = () => useContext(Ctx);
