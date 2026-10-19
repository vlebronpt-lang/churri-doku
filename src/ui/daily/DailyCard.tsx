import { useMemo } from 'react';
import { useProgressStore, wasSolved } from '../../state/progress';
import { streakInfo } from '../../state/streak';
import { levelInfo, PUZZLES } from '../../data/puzzles';
import { longDate, todayIso } from '../../data/daily';
import { formatTime } from '../../game/useGame';
import { navigate } from '../../router';
import { CaseCover } from '../CaseCard';
import { Icon } from '../Icon';
import { useDaily } from './useDaily';

/** Tarjeta del caso del día en la portada, con la racha. */
export function DailyCard() {
  const today = todayIso();
  const state = useDaily(today);
  const store = useProgressStore();
  const streak = useMemo(() => streakInfo(store, today), [store, today]);
  const p = state.status === 'ready' ? state.p : null;
  const prog = p ? store[p.id] : undefined;
  const solved = wasSolved(prog);
  const playing = !solved && !!prog?.board && Object.keys(prog.board.placed).length > 0;
  const lvl = p ? levelInfo(p.level) : null;
  if (state.status === 'missing' || state.status === 'future') return null;
  return (
    <section className="daily-card" aria-labelledby="daily-title" style={lvl ? { ['--lvl' as string]: lvl.color } : undefined}>
      <button className="daily-card__photo" onClick={() => navigate('/diario')} tabIndex={-1} aria-hidden="true">
        {p ? <CaseCover p={p} /> : <span className="cover cover--empty" />}
        {solved && <span className="stamp stamp--card">Resuelto</span>}
      </button>
      <div className="daily-card__body">
        <p className="eyebrow"><Icon name="timer" size={16} /> Caso del día · {longDate(today)}</p>
        <h2 id="daily-title" className="daily-card__title">{p ? p.title : 'Cargando el caso de hoy…'}</h2>
        {p && lvl && (
          <p className="daily-card__meta">
            <span className="lvl-chip" style={{ background: lvl.color }}>{lvl.name}</span>
            <span>{p.franchise} · {p.size}×{p.size}{p.meta?.kind === 'daily' && p.meta.mirror ? ' · plano en espejo' : ''}</span>
          </p>
        )}
        <p className="daily-card__lede">Un caso nuevo cada día: el lunes, el más asequible; el sábado, solo para expertos. Usa el plano de uno de los {PUZZLES.length} casos, pero con otra colocación y pistas nuevas.</p>
        <div className="row gap wrap">
          <button className="btn btn--primary" onClick={() => navigate('/diario')} disabled={!p}>
            <Icon name="play" size={18} /> {solved ? `Resuelto en ${formatTime(prog?.bestTime ?? prog?.time ?? 0)}` : playing ? 'Seguir con el de hoy' : 'Jugar el caso de hoy'}
          </button>
          <button className="btn" onClick={() => navigate('/archivo')}><Icon name="list" size={18} /> Archivo</button>
        </div>
      </div>
      <div className="daily-card__streak" aria-label={`Racha de ${streak.current} días`}>
        <span className={`streak-flame${streak.current ? ' is-on' : ''}`} aria-hidden="true">🔥</span>
        <strong>{streak.current}</strong>
        <span>{streak.current === 1 ? 'día seguido' : 'días seguidos'}</span>
        <small>Mejor racha: {streak.best}</small>
      </div>
    </section>
  );
}
