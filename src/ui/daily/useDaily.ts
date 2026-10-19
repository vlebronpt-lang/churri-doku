import { useEffect, useState } from 'react';
import type { Puzzle } from '../../engine/types';
import type { DailyEntry } from '../../engine/variant';
import { dailyPuzzle, loadDailyEntry, loadDailyIndex, todayIso, type DailyIndex } from '../../data/daily';

export type DailyState =
  | { status: 'loading' }
  | { status: 'ready'; entry: DailyEntry; p: Puzzle }
  | { status: 'future' }
  | { status: 'missing' };

/** Carga el caso del día de una fecha (por defecto, hoy). */
export function useDaily(date?: string): DailyState {
  const d = date ?? todayIso();
  const [state, setState] = useState<DailyState>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    if (d > todayIso()) { setState({ status: 'future' }); return; }
    setState({ status: 'loading' });
    loadDailyEntry(d).then((entry) => {
      if (!alive) return;
      const p = entry && dailyPuzzle(entry);
      setState(entry && p ? { status: 'ready', entry, p } : { status: 'missing' });
    });
    return () => { alive = false; };
  }, [d]);
  return state;
}

export function useDailyIndex(): DailyIndex | null | undefined {
  const [idx, setIdx] = useState<DailyIndex | null | undefined>(undefined);
  useEffect(() => { void loadDailyIndex().then(setIdx); }, []);
  return idx;
}
