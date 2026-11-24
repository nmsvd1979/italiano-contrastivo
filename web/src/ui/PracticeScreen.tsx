import type { TodayPlan } from "../state/session";
import { formatDuration } from "../state/timing";
import { Tag } from "./kit/Tag";

/** «Practicar»: todo lo que se hace fuera del orden de los módulos (repaso, hablar, escribir). */
export function PracticeScreen({ review }: { review: TodayPlan["review"] }) {
  const pending = review.due + review.newAvailable;
  return (
    <main>
      <h1>Practicar</h1>
      <section aria-label="Repaso">
        <div className="top"><h2>Repaso</h2><Tag strand="foco" /></div>
        {pending > 0
          ? <p>{pending} {pending === 1 ? "tarjeta toca" : "tarjetas tocan"} hoy · {formatDuration(review.seconds)}</p>
          : <p>No tienes repasos pendientes ahora.</p>}
        {pending > 0 && <p><a className="button primary block" href="#/repaso">Repasar</a></p>}
      </section>
      <section aria-label="Hablar">
        <div className="top"><h2>Hablar</h2><Tag strand="salida" /></div>
        <p><a href="#/hablar">Juegos de roles, tareas y frases</a></p>
      </section>
      <section aria-label="Escribir">
        <div className="top"><h2>Escribir</h2><Tag strand="salida" /></div>
        <p><a href="#/escribir">Reconstruir un texto y escribir el tuyo</a></p>
      </section>
    </main>
  );
}
