import { useEffect, useMemo, useState } from 'react';
import type { DailyEntry } from '../../engine/variant';
import { addDays, loadDailyMonth, monthName, todayIso } from '../../data/daily';
import { INPUTS, levelInfo } from '../../data/puzzles';
import { useProgressStore, wasSolved } from '../../state/progress';
import { solvedOnDay, streakInfo } from '../../state/streak';
import { navigate } from '../../router';
import { Icon } from '../Icon';
import { useDailyIndex } from './useDaily';

const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Archivo de casos del día: un calendario por mes con lo jugado y la racha. */
export function Archive() {
  const today = todayIso();
  const idx = useDailyIndex();
  const store = useProgressStore();
  const streak = useMemo(() => streakInfo(store, today), [store, today]);
  const [entries, setEntries] = useState<Record<string, DailyEntry>>({});
  const months = useMemo(() => {
    if (!idx) return [];
    const out: string[] = [];
    let ym = idx.from.slice(0, 7);
    const last = (today < idx.to ? today : idx.to).slice(0, 7);
    while (ym <= last) {
      out.push(ym);
      const [y, m] = ym.split('-').map(Number);
      ym = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }
    return out.reverse();
  }, [idx, today]);
  useEffect(() => {
    let alive = true;
    Promise.all(months.map(loadDailyMonth)).then((all) => alive && setEntries(Object.assign({}, ...all)));
    return () => { alive = false; };
  }, [months]);

  if (idx === undefined) return <p className="muted">Cargando el archivo…</p>;
  if (!idx) return <p>No se ha podido cargar el archivo de casos del día.</p>;
  const total = Object.keys(entries).filter((d) => d >= idx.from && d <= today).length;

  return (
    <div className="archive">
      <section className="archive__head">
        <p className="eyebrow">Un caso nuevo cada día</p>
        <h1 className="section-title">Archivo de casos del día</h1>
        <p className="lede">Lunes, Muy fácil · martes, Fácil · miércoles y jueves, Medio · viernes y domingo, Difícil · sábado, Experto. La racha cuenta los días que resuelves el caso en su propio día.</p>
        <div className="archive__stats">
          <div className="archive__stat archive__stat--fire"><span aria-hidden="true">🔥</span><strong>{streak.current}</strong><small>racha actual</small></div>
          <div className="archive__stat"><strong>{streak.best}</strong><small>mejor racha</small></div>
          <div className="archive__stat"><strong>{streak.solved}/{total}</strong><small>resueltos</small></div>
          <div className="archive__stat"><strong>{streak.onDay}</strong><small>en su día</small></div>
        </div>
        <button className="btn btn--primary" onClick={() => navigate('/diario')}><Icon name="play" size={18} /> {streak.todayDone ? 'Ver el caso de hoy' : 'Jugar el caso de hoy'}</button>
      </section>
      {months.map((ym) => {
        const [y, m] = ym.split('-').map(Number);
        const first = `${ym}-01`;
        const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
        const daysIn = new Date(y, m, 0).getDate();
        return (
          <section key={ym} className="month" aria-label={`${monthName(m)} de ${y}`}>
            <h2 className="month__title">{monthName(m)} <span>{y}</span></h2>
            <div className="month__grid">
              {WEEK.map((w) => <span key={w} className="month__wd" aria-hidden="true">{w}</span>)}
              {Array.from({ length: offset }, (_, k) => <span key={`e${k}`} />)}
              {Array.from({ length: daysIn }, (_, k) => {
                const date = addDays(first, k);
                const e = entries[date];
                const playable = !!e && date >= idx.from && date <= today;
                const prog = store[`d-${date}`];
                const status = !playable ? 'off' : solvedOnDay(store, date) ? 'onday' : wasSolved(prog) ? 'late' : prog?.board && Object.keys(prog.board.placed).length ? 'playing' : 'new';
                const lvl = e ? levelInfo(e.level) : null;
                const title = e ? `${date.split('-').reverse().join('/')} · ${INPUTS[e.base]?.franchise ?? ''} · ${lvl?.name}` : undefined;
                return (
                  <button
                    key={date}
                    className={`day day--${status}${date === today ? ' is-today' : ''}`}
                    disabled={!playable}
                    onClick={() => navigate(`/diario/${date}`)}
                    title={title}
                    aria-label={title ? `${title}${status === 'onday' ? ', resuelto en su día' : status === 'late' ? ', resuelto' : status === 'playing' ? ', en curso' : ''}` : `${k + 1}`}
                    style={lvl ? { ['--lvl' as string]: lvl.color } : undefined}
                  >
                    <span className="day__n">{k + 1}</span>
                    {playable && <span className="day__mark" aria-hidden="true">{status === 'onday' ? '🔥' : status === 'late' ? '✓' : status === 'playing' ? '•' : ''}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
