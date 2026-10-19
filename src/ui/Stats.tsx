import { useMemo } from 'react';
import { LEVELS, PUZZLES } from '../data/puzzles';
import { useProgressStore, wasSolved, type CaseProgress } from '../state/progress';
import { streakInfo } from '../state/streak';
import { ACHIEVEMENTS, useUnlocked } from '../state/achievements';
import { addDays, todayIso } from '../data/daily';
import { solvedOnDay } from '../state/streak';
import { formatTime } from '../game/useGame';
import { navigate } from '../router';
import { CaseCover } from './CaseCard';
import { Icon } from './Icon';

const best = (c?: CaseProgress) => c?.bestTime ?? (c?.solved ? c.time : undefined);
const median = (xs: number[]) => {
  if (!xs.length) return undefined;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** Logros y estadísticas: la carpeta del detective. */
export function Stats() {
  const store = useProgressStore();
  const unlocked = useUnlocked();
  const today = todayIso();
  const streak = useMemo(() => streakInfo(store, today), [store, today]);
  const solved = PUZZLES.filter((p) => wasSolved(store[p.id]));
  const stars = PUZZLES.reduce((a, p) => a + (wasSolved(store[p.id]) ? store[p.id]?.stars ?? 1 : 0), 0);
  const totalTime = Object.values(store).reduce((a, c) => a + (c.time ?? 0), 0);
  const last30 = Array.from({ length: 30 }, (_, k) => addDays(today, k - 29));
  const got = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  return (
    <div className="stats-page">
      <section className="stats-page__head">
        <p className="eyebrow">Tu carpeta de detective</p>
        <h1 className="section-title">Logros y estadísticas</h1>
        <div className="tiles">
          <div className="tile"><strong>{solved.length}<small>/{PUZZLES.length}</small></strong><span>casos resueltos</span></div>
          <div className="tile"><strong>{stars}<small>/{PUZZLES.length * 3}</small></strong><span>estrellas</span></div>
          <div className="tile tile--fire"><strong>🔥 {streak.current}</strong><span>racha del caso del día (mejor: {streak.best})</span></div>
          <div className="tile"><strong>{got}<small>/{ACHIEVEMENTS.length}</small></strong><span>logros</span></div>
          <div className="tile"><strong>{formatTime(totalTime)}</strong><span>tiempo investigando</span></div>
        </div>
      </section>

      <section className="stats-block">
        <h2 className="stats-block__title">Por temporada</h2>
        <div className="season-stats">
          {LEVELS.map((l) => {
            const list = PUZZLES.filter((p) => p.level === l.level);
            const done = list.filter((p) => wasSolved(store[p.id]));
            const times = done.map((p) => best(store[p.id])!).filter((t) => t != null);
            const lvStars = done.reduce((a, p) => a + (store[p.id]?.stars ?? 1), 0);
            return (
              <div key={l.level} className="season-stat" style={{ ['--lvl' as string]: l.color }}>
                <span className="season-stat__name"><span className="lvl-dot" /> {l.name}</span>
                <span className="season-stat__bar"><span style={{ width: `${(done.length / list.length) * 100}%` }} /></span>
                <span className="season-stat__nums">
                  {done.length}/{list.length} · {'★'.repeat(Math.round(lvStars / Math.max(1, done.length)))}{done.length ? '' : '—'}
                  {times.length ? ` · mediana ${formatTime(median(times)!)} · mejor ${formatTime(Math.min(...times))}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stats-block">
        <h2 className="stats-block__title">Caso del día · últimos 30 días</h2>
        <div className="heat" role="img" aria-label={`Has resuelto ${last30.filter((d) => solvedOnDay(store, d)).length} de los últimos 30 casos del día en su día`}>
          {last30.map((d) => {
            const c = store[`d-${d}`];
            const st = solvedOnDay(store, d) ? 'onday' : wasSolved(c) ? 'late' : c?.board ? 'playing' : 'none';
            return <span key={d} className={`heat__day heat__day--${st}${d === today ? ' is-today' : ''}`} title={`${d.split('-').reverse().join('/')}`} />;
          })}
        </div>
        <p className="muted small">🔥 en su día · ✓ más tarde · gris: sin jugar. <button className="linkish" onClick={() => navigate('/archivo')}>Ver el archivo</button></p>
      </section>

      <section className="stats-block">
        <h2 className="stats-block__title">Logros <span className="muted">({got} de {ACHIEVEMENTS.length})</span></h2>
        <div className="badges">
          {ACHIEVEMENTS.map((a) => {
            const at = unlocked[a.id];
            const hide = a.secret && !at;
            return (
              <div key={a.id} className={`badge${at ? ' is-on' : ''}`} title={at ? `Conseguido el ${new Date(at).toLocaleDateString('es-ES')}` : undefined}>
                <span className="badge__icon" aria-hidden="true">{hide ? '❔' : a.icon}</span>
                <span className="badge__text">
                  <strong>{hide ? 'Logro secreto' : a.title}</strong>
                  <span>{hide ? 'Sigue jugando para descubrirlo.' : a.desc}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stats-block">
        <h2 className="stats-block__title">Álbum de casos cerrados</h2>
        {solved.length ? (
          <div className="album">
            {solved.map((p, k) => (
              <button key={p.id} className="album__item" style={{ ['--tilt' as string]: `${((k * 37) % 7) - 3}deg` }} onClick={() => navigate(`/caso/${p.id}`)}>
                <CaseCover p={p} />
                <span className="album__name">{p.franchise}</span>
                <span className="album__meta">{'★'.repeat(store[p.id]?.stars ?? 1)} · {formatTime(best(store[p.id]) ?? 0)}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">Aquí irán las polaroids de los casos que cierres. <button className="linkish" onClick={() => navigate('/')}>Elige un caso</button></p>
        )}
      </section>

      <p className="muted small"><Icon name="settings" size={14} /> Todo esto se guarda en este navegador. Para llevarlo a otro dispositivo, usa «Pasar mi progreso» en Ajustes.</p>
    </div>
  );
}
