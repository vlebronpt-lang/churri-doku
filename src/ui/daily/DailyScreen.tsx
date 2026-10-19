import { GameScreen } from '../game/GameScreen';
import { useDaily } from './useDaily';
import { longDate, todayIso } from '../../data/daily';
import { navigate } from '../../router';
import { Icon } from '../Icon';

/** Pantalla del caso del día (hoy o una fecha del archivo). */
export function DailyScreen({ date, reto, onHelp, onSettings }: { date?: string; reto?: string | null; onHelp: () => void; onSettings: () => void }) {
  const state = useDaily(date);
  if (state.status === 'ready') {
    return <GameScreen key={state.p.id} p={state.p} reto={reto} onHelp={onHelp} onSettings={onSettings} />;
  }
  const d = date ?? todayIso();
  return (
    <div className="daily-empty">
      <div className="daily-empty__card">
        {state.status === 'loading' ? (
          <p className="daily-empty__text">Abriendo el expediente del {longDate(d)}…</p>
        ) : (
          <>
            <h1 className="section-title">{state.status === 'future' ? 'Aún es pronto' : 'Sin caso ese día'}</h1>
            <p className="daily-empty__text">
              {state.status === 'future'
                ? `El caso del ${longDate(d)} todavía está bajo llave. Vuelve ese día.`
                : `No hay caso del día para el ${longDate(d)}.`}
            </p>
            <div className="row gap wrap">
              <button className="btn btn--primary" onClick={() => navigate('/diario')}><Icon name="play" size={18} /> Caso de hoy</button>
              <button className="btn" onClick={() => navigate('/archivo')}><Icon name="list" size={18} /> Archivo</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
