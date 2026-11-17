/** Actualizaciones de la app instalada: aviso, recarga automática y reparación. */
export type UpdateState = "idle" | "downloading" | "reloading";

export const buildInfo = () => ({
  id: typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "local",
  date: typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "",
});

const hasSW = () => typeof navigator !== "undefined" && "serviceWorker" in navigator && !!navigator.serviceWorker;

/**
 * Avisa cuando se baja una versión nueva y recarga cuando toma el control (sin esto la app seguía mostrando la versión
 * vieja hasta la siguiente apertura). También busca actualización al volver a la app.
 */
export function watchUpdates(onState: (s: UpdateState) => void, reload: () => void = () => window.location.reload()): () => void {
  if (!hasSW()) return () => undefined;
  const sw = navigator.serviceWorker;
  const hadController = !!sw.controller; // la primera instalación no debe recargar
  let reloading = false;
  const onControllerChange = () => {
    if (!hadController || reloading) return;
    reloading = true;
    onState("reloading");
    reload();
  };
  const track = (reg: ServiceWorkerRegistration) => {
    const watch = (w: ServiceWorker | null) => {
      if (!w || !hadController) return;
      onState("downloading");
      w.addEventListener("statechange", () => { if (w.state === "redundant") onState("idle"); });
    };
    reg.addEventListener("updatefound", () => watch(reg.installing));
    watch(reg.installing);
  };
  sw.addEventListener("controllerchange", onControllerChange);
  void sw.getRegistration().then((reg) => reg && track(reg)).catch(() => undefined);
  const onVisible = () => {
    if (document.visibilityState === "visible") void sw.getRegistration().then((r) => r?.update()).catch(() => undefined);
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    sw.removeEventListener("controllerchange", onControllerChange);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Busca una versión nueva ahora. Devuelve si hay una descargándose. */
export async function checkForUpdate(): Promise<"unsupported" | "none" | "downloading"> {
  if (!hasSW()) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return "none";
  await reg.update();
  return reg.installing || reg.waiting ? "downloading" : "none";
}

/** Borra el service worker y la caché de la app (NO toca tu progreso en IndexedDB) y recarga: baja todo de nuevo. */
export async function repairApp(reload: () => void = () => window.location.reload()): Promise<void> {
  if (hasSW()) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  if (typeof caches !== "undefined") for (const k of await caches.keys()) if (!k.startsWith("audio-")) await caches.delete(k);
  reload();
}
