import { useEffect, useState } from "react";
import { type UpdateState, watchUpdates } from "../pwa";

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>("idle");
  useEffect(() => watchUpdates(setState), []);
  if (state === "idle") return null;
  return (
    <p role="status" className="banner">
      {state === "downloading" ? "Descargando una versión nueva de la app… no la cierres hasta que se reinicie." : "Actualizando…"}
    </p>
  );
}
