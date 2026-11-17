import { useEffect, useState } from "react";
import { type ContentPack, loadContent } from "./content/load";

export function App() {
  const [pack, setPack] = useState<ContentPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadContent().then(setPack, (e: Error) => setError(e.message));
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!pack) return <p>Cargando…</p>;
  return <p>{pack.capsules.length} cápsulas disponibles.</p>;
}
