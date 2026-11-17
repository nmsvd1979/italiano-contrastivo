import { useEffect, useState } from "react";
import { BackupError, exportBackup, parseBackup, restoreBackup } from "../state/backup";
import { localDate, type Store } from "../state/store";

type Notice = { kind: "ok" | "error"; text: string };

export function SettingsScreen({ store, memoryOnly }: { store: Store; memoryOnly: boolean }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [protectedStorage, setProtectedStorage] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setProtectedStorage).catch(() => setProtectedStorage(null));
  }, []);

  const save = async () => {
    try {
      const now = new Date();
      const file = new File([JSON.stringify(await exportBackup(store, now), null, 1)], `italiano-progreso-${localDate(now)}.json`, { type: "application/json" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Progreso de Italiano contrastivo" });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
      setNotice({ kind: "ok", text: "Copia lista. Guárdala en un lugar seguro (iCloud Drive, correo a ti mismo…)." });
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // el usuario cerró la hoja de compartir
      setNotice({ kind: "error", text: "No se pudo crear la copia." });
    }
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      if (!window.confirm(`Esto reemplaza tu progreso actual por el de la copia (${backup.cards.length} tarjetas, ${backup.logs.length} repasos). ¿Continuar?`)) return;
      await restoreBackup(store, backup);
      setNotice({ kind: "ok", text: "Progreso restaurado. Vuelve a Hoy para verlo." });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof BackupError ? e.message : "No se pudo restaurar la copia." });
    }
  };

  return (
    <main>
      <h1>Ajustes</h1>
      <h2>Tu progreso</h2>
      <p>Tu progreso vive solo en este teléfono. Si borras los datos del navegador o desinstalas la app, se pierde. Haz una copia de vez en cuando.</p>
      {memoryOnly && <p role="alert" className="alert">Este navegador no permite guardar el progreso: se perderá al cerrar la app.</p>}
      {protectedStorage === false && <p><small>El sistema aún no marcó tu almacenamiento como protegido; instalar la app en la pantalla de inicio ayuda.</small></p>}
      <p><button type="button" onClick={save}>Guardar copia</button></p>
      <label htmlFor="restore-file">Restaurar desde una copia</label>
      <input id="restore-file" type="file" accept="application/json,.json" onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ""; }} />
      {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={notice.kind === "error" ? "alert" : undefined}>{notice.text}</p>}
    </main>
  );
}
