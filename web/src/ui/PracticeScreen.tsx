import type { TodayPlan } from "../state/session";
import { formatDuration } from "../state/timing";
import type { WeakSpot } from "../state/weak";
import { Tag } from "./kit/Tag";

/** «Practicar»: todo lo que se hace fuera del orden de los módulos (repaso, hablar, escribir). */
export function PracticeScreen({ review, weak }: { review: TodayPlan["review"]; weak: WeakSpot[] }) {
  const pending = review.due + review.newAvailable;
  const available = pending + review.filler; // sin tarjetas vencidas aún hay práctica de recuperación en el repaso
  return (
    <main>
      <h1>Practicar</h1>
      <section aria-label="Repaso">
        <div className="top"><h2>Repaso</h2><Tag strand="foco" /></div>
        {pending > 0
          ? <p>{pending} {pending === 1 ? "tarjeta toca" : "tarjetas tocan"} hoy · {formatDuration(review.seconds)}</p>
          : available > 0 ? <p>Práctica de recuperación de unidades anteriores · {formatDuration(review.seconds)}</p>
          : <p>No tienes repasos pendientes ahora.</p>}
        {available > 0 && <p><a className="button primary block" href="#/repaso">Repasar</a></p>}
      </section>
      <section aria-label="Hablar">
        <div className="top"><h2>Hablar</h2><Tag strand="salida" /></div>
        <p><a className="button block" href="#/hablar">Juegos de roles, tareas y frases</a></p>
      </section>
      <section aria-label="Escribir">
        <div className="top"><h2>Escribir</h2><Tag strand="salida" /></div>
        <p><a className="button block" href="#/escribir">Reconstruir un texto y escribir el tuyo</a></p>
      </section>
      <section aria-label="Lo que más te cuesta">
        <div className="top"><h2>Lo que más te cuesta</h2><Tag strand="foco" /></div>
        {weak.length > 0
          ? <><p>{weak.map((w) => w.title).join(" · ")}</p><p><a className="button primary block" href="#/debiles">Practicar 10 frases</a></p></>
          : <p><small>Aparece cuando un tema lleva al menos 5 intentos y menos del 80 % de aciertos a la primera.</small></p>}
      </section>
    </main>
  );
}
