import { useEffect, useState } from "react";
import { audioUrls, cachedCount, cacheSupported, downloadAudio } from "../audio/offline";
import { isPreview, setPreview } from "../state/preview";
import { loadSound, saveSound } from "../state/sound";
import { applyTheme, loadTheme, saveTheme, type Theme } from "../state/theme";
import { buildInfo, checkForUpdate, repairApp } from "../pwa";
import { BackupError, exportBackup, parseBackup, restoreBackup } from "../state/backup";
import { localDate, type Store } from "../state/store";

type Notice = { kind: "ok" | "error"; text: string };

export function SettingsScreen({ store, memoryOnly }: { store: Store; memoryOnly: boolean }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const pick = (t: Theme) => { setTheme(t); saveTheme(t); applyTheme(t); };
  const [sound, setSound] = useState(loadSound);
  const toggleSound = (on: boolean) => { setSound(on); saveSound(on); };
  const [protectedStorage, setProtectedStorage] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setProtectedStorage).catch(() => setProtectedStorage(null));
  }, []);

  const [audio, setAudio] = useState<{ have: number; total: number; busy: boolean; failed: number } | null>(null);
  useEffect(() => {
    if (!cacheSupported()) return;
    audioUrls().then(async (urls) => setAudio({ have: await cachedCount(urls), total: urls.length, busy: false, failed: 0 })).catch(() => undefined);
  }, []);
  const getAudio = async () => {
    try {
      const urls = await audioUrls();
      setAudio({ have: 0, total: urls.length, busy: true, failed: 0 });
      const r = await downloadAudio(urls, (have, total) => setAudio({ have, total, busy: true, failed: 0 }));
      setAudio({ have: r.saved, total: urls.length, busy: false, failed: r.failed });
    } catch {
      setNotice({ kind: "error", text: "No se pudo descargar el audio. Revisa tu conexión e inténtalo de nuevo." });
    }
  };
  const update = async () => {
    try {
      const r = await checkForUpdate();
      setNotice({ kind: "ok", text: r === "downloading" ? "Hay una versión nueva descargándose; la app se reiniciará sola." : r === "unsupported" ? "Este navegador no guarda la app para uso sin conexión." : "Ya tienes la última versión." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo buscar actualización (¿sin conexión?)." });
    }
  };
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
      <p><a className="tap" href="#/progreso" style={{ textDecoration: "none" }}>‹ Progreso</a></p>
      <h1>Ajustes</h1>
      <h2>Apariencia</h2>
      <p><small>«Claro» es el diseño de la app. «Como el teléfono» usa el modo oscuro cuando tu teléfono lo tiene activado.</small></p>
      <p className="seg">
        {([["claro", "Claro"], ["oscuro", "Oscuro"], ["auto", "Como el teléfono"]] as const).map(([t, label]) => (
          <button key={t} type="button" aria-pressed={theme === t} onClick={() => pick(t)}>{label}</button>
        ))}
      </p>
      <h2>Sonido</h2>
      <p><label className="check"><input type="checkbox" checked={sound} onChange={(e) => toggleSound(e.target.checked)} /> Sonido breve al acertar o fallar</label><br /><small>Apagado por defecto. Solo suena si el teléfono no está en silencio.</small></p>
      <ul className="rows">
        <li><a href="#/ubicacion"><span>Prueba de ubicación<small>Dónde empezar en la app</small></span></a></li>
        <li><a href="#/prueba-dictado"><span>Prueba técnica del dictado<small>Para saber si el iPhone puede comprobar tu pronunciación</small></span></a></li>
        <li><a href="#/acerca"><span>Acerca de<small>Licencias y cómo se revisó el contenido</small></span></a></li>
      </ul>
      <h2>Tu progreso</h2>
      <p>Tu progreso vive solo en este teléfono. Si borras los datos del navegador o desinstalas la app, se pierde. Haz una copia de vez en cuando.</p>
      {memoryOnly && <p role="alert" className="alert">Este navegador no permite guardar el progreso: se perderá al cerrar la app.</p>}
      {protectedStorage === false && <p><small>El sistema aún no marcó tu almacenamiento como protegido; instalar la app en la pantalla de inicio ayuda.</small></p>}
      <p><button type="button" className="primary" onClick={save}>Guardar copia</button></p>
      <label htmlFor="restore-file">Restaurar desde una copia</label>
      <input id="restore-file" type="file" accept="application/json,.json" onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ""; }} />
      <h2>Audio sin conexión</h2>
      {audio ? (
        <>
          <p>{audio.have} de {audio.total} clips guardados en este teléfono. {audio.have >= audio.total ? "Todo el audio funciona sin conexión." : "Sin conexión solo suena lo que ya escuchaste; baja el resto con internet."}</p>
          {audio.busy && <progress max={audio.total} value={audio.have} aria-label="Descarga de audio" />}
          {audio.failed > 0 && <p role="alert" className="alert">No se pudieron bajar {audio.failed} clips; inténtalo de nuevo.</p>}
          <p><button type="button" disabled={audio.busy || audio.have >= audio.total} onClick={getAudio}>{audio.busy ? "Descargando…" : "Descargar el audio"}</button></p>
        </>
      ) : <p><small>Este navegador no guarda audio para uso sin conexión.</small></p>}
      <h2>Modo de prueba</h2>
      <p>Para revisar el contenido sin esperar a desbloquearlo: abre todas las unidades y todos los pasos, y guarda el avance en un lugar aparte. Tu progreso real no cambia.</p>
      <p>
        <button type="button" onClick={() => { setPreview(!isPreview()); window.location.reload(); }}>{isPreview() ? "Salir del modo de prueba" : "Activar el modo de prueba"}</button>{" "}
        {isPreview() && <button type="button" onClick={async () => { if (window.confirm("Se borra solo el avance del modo de prueba. ¿Continuar?")) { await store.clearAll(); window.location.reload(); } }}>Reiniciar la prueba</button>}
      </p>
      <h2>Versión de la app</h2>
      <p>Versión <strong>{buildInfo().id}</strong>{buildInfo().date ? ` · ${buildInfo().date}` : ""}.</p>
      <p><button type="button" onClick={update}>Buscar actualización</button></p>
      <p><small>Si algo se ve desactualizado o raro, «Reparar la app» borra la copia guardada y la baja de nuevo. Tu progreso no se toca.</small></p>
      <p><button type="button" onClick={() => { if (window.confirm("Se borrará la copia guardada de la app y se recargará. Tu progreso se conserva. ¿Continuar?")) void repairApp(); }}>Reparar la app</button></p>
      {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={notice.kind === "error" ? "alert" : undefined}>{notice.text}</p>}
    </main>
  );
}
