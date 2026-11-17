import type { TodayPlan } from "../state/session";
import type { DayProgress } from "../state/store";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function TodayScreen({ plan, day, storeError, firstTime }: { plan: TodayPlan; day: DayProgress; storeError?: string | null; firstTime?: boolean }) {
  const pending = plan.review.due + plan.review.newAvailable;
  return (
    <main>
      <h1>Hoy</h1>
      {firstTime && (
        <section>
          <h2>Cómo empezar</h2>
          <p>Cada cápsula dura unos 4 minutos y trabaja un error típico de quien habla español. Empieza por una; después, los repasos te lo van devolviendo justo antes de que lo olvides. «Escribir» revisa tus textos y en «Ajustes» guardas una copia de tu progreso.</p>
        </section>
      )}
      {storeError && <p role="alert" className="alert">{storeError}</p>}
      <p>Hoy llevas {plural(day.reviewsDone, "repaso", "repasos")} y {plural(day.capsulesDone.length, "cápsula", "cápsulas")}. Cada bloque se puede hacer por separado, cuando quieras.</p>
      <section>
        <h2>Repaso (≈5 min)</h2>
        {pending > 0 ? (
          <p>Tienes {pending} para repasar. <a className="button" href="#/repaso">Hacer un repaso</a></p>
        ) : (
          <p>No tienes repasos pendientes ahora.</p>
        )}
      </section>
      <section>
        <h2>Cápsula del día (≈4 min)</h2>
        {plan.nextCapsule ? (
          <p><a className="button" href={`#/capsula/${plan.nextCapsule.id}`}>Hacer una cápsula</a></p>
        ) : (
          <p>Completaste las cápsulas disponibles; llegan más cuando se validen más oraciones.</p>
        )}
      </section>
    </main>
  );
}
