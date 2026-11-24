import { useEffect, useRef } from "react";

/** Al cambiar de pantalla (cambia el hash) vuelve al inicio; en el primer render no toca el desplazamiento. */
export function useScrollTop(hash: string): void {
  const previous = useRef(hash);
  useEffect(() => {
    if (previous.current === hash) return;
    previous.current = hash;
    window.scrollTo(0, 0);
  }, [hash]);
}
