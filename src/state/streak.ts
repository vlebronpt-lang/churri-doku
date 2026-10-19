import type { CaseProgress } from './progress';
import { addDays, todayIso } from '../data/daily';

type Store = Record<string, CaseProgress>;

/** ¿Se resolvió el caso del día en su propio día? */
export function solvedOnDay(store: Store, date: string): boolean {
  const c = store[`d-${date}`];
  const t = c?.firstSolvedAt ?? (c?.solved ? c.solvedAt : undefined);
  return !!t && todayIso(new Date(t)) === date;
}

export interface StreakInfo {
  /** Días seguidos resolviendo el caso del día (sigue viva hasta que acabe hoy). */
  current: number;
  best: number;
  /** Casos del día resueltos (en su día o más tarde). */
  solved: number;
  /** Casos del día resueltos en su propio día. */
  onDay: number;
  todayDone: boolean;
}

export function streakInfo(store: Store, today = todayIso()): StreakInfo {
  const dailyDates = Object.keys(store).filter((k) => k.startsWith('d-')).map((k) => k.slice(2)).sort();
  const onDayDates = dailyDates.filter((d) => solvedOnDay(store, d));
  const todayDone = solvedOnDay(store, today);
  let current = 0;
  for (let d = todayDone ? today : addDays(today, -1); solvedOnDay(store, d); d = addDays(d, -1)) current++;
  let best = 0, run = 0, prev = '';
  for (const d of onDayDates) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const solved = dailyDates.filter((d) => store[`d-${d}`]?.solved || store[`d-${d}`]?.bestTime != null).length;
  return { current, best: Math.max(best, current), solved, onDay: onDayDates.length, todayDone };
}
