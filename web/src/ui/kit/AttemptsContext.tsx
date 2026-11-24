import { createContext, type ReactNode, useCallback, useContext } from "react";
import type { Item } from "../../generated/item";
import { trackAttempt } from "../../state/attempts";
import type { Store } from "../../state/store";

const Ctx = createContext<Store | null>(null);

/** Da a los ejercicios el almacén donde anotar sus primeros intentos por tema. */
export const AttemptsProvider = ({ store, children }: { store: Store; children: ReactNode }) => <Ctx.Provider value={store}>{children}</Ctx.Provider>;

/** Función para anotar un primer intento; no hace nada si no hay proveedor (pruebas, pantallas sueltas). */
export function useTrackAttempt(): (item: Item, correct: boolean) => void {
  const store = useContext(Ctx);
  return useCallback((item, correct) => { if (store) void trackAttempt(store, item, correct); }, [store]);
}
