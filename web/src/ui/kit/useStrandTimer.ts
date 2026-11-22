import { useEffect } from "react";
import { addDaySeconds, IDLE_MS, type Strand } from "../../state/strands";
import type { Store } from "../../state/store";

/** Mide el tiempo ACTIVO (pantalla visible y tocada en los últimos 2 min) que pasas en una pantalla y lo suma a la hebra del día. */
export function useStrandTimer(store: Store, strand: Strand, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    let pending = 0, last = Date.now();
    const mark = () => { last = Date.now(); };
    const events = ["pointerdown", "keydown", "input", "scroll", "touchstart"];
    for (const e of events) window.addEventListener(e, mark, { passive: true, capture: true });
    const tick = setInterval(() => { if (document.visibilityState === "visible" && Date.now() - last < IDLE_MS) pending += 1; }, 1000);
    const flush = () => { if (pending > 0) { const s = pending; pending = 0; void addDaySeconds(store, strand, s); } };
    const periodic = setInterval(flush, 30_000);
    document.addEventListener("visibilitychange", flush);
    return () => {
      clearInterval(tick); clearInterval(periodic);
      document.removeEventListener("visibilitychange", flush);
      for (const e of events) window.removeEventListener(e, mark, { capture: true } as EventListenerOptions);
      flush();
    };
  }, [store, strand, enabled]);
}
