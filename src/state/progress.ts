import { useSyncExternalStore } from 'react';
import { load, save } from './storage';
import type { Challenge } from '../share';

/** Estado guardado del tablero de un caso. */
export interface BoardState {
  /** Casilla → id de personaje colocado. */
  placed: Record<number, string>;
  /** Casilla → ids anotados (lápiz). */
  notes: Record<number, string[]>;
  /** Casilla → marca X ('m' manual, 'a' automática por colocación). */
  xs: Record<number, 'm' | 'a'>;
  /** Marcas de símbolos avanzados (triángulo, círculo...) por casilla. */
}

export interface CaseProgress {
  opened: boolean;
  board?: BoardState;
  /** Segundos de juego acumulados. */
  time: number;
  hints: number;
  checks: number;
  mistakes: number;
  solved: boolean;
  solvedAt?: number;
  bestTime?: number;
  stars?: number;
  /** Reto recibido por enlace («X lo resolvió en 3:12»). */
  challenge?: Challenge;
}

type Store = Record<string, CaseProgress>;

let store: Store = load<Store>('progress', {});
const listeners = new Set<() => void>();

function emit() {
  save('progress', store);
  listeners.forEach((l) => l());
}

export const emptyProgress = (): CaseProgress => ({ opened: false, time: 0, hints: 0, checks: 0, mistakes: 0, solved: false });

export function getProgress(id: string): CaseProgress {
  return store[id] ?? emptyProgress();
}

export function updateProgress(id: string, patch: Partial<CaseProgress> | ((p: CaseProgress) => Partial<CaseProgress>)) {
  const cur = getProgress(id);
  const next = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) };
  store = { ...store, [id]: next };
  emit();
}

export function resetCase(id: string) {
  const cur = getProgress(id);
  store = { ...store, [id]: { ...emptyProgress(), opened: true, bestTime: cur.bestTime, stars: cur.stars, challenge: cur.challenge, solved: false } };
  emit();
}

export function resetAll() {
  store = {};
  emit();
}

/** ¿Se resolvió alguna vez? (al volver a jugar, `solved` vuelve a false pero queda la marca). */
export function wasSolved(c: CaseProgress | undefined): boolean {
  return !!c && (c.solved || c.bestTime != null);
}

export function getStore(): Store {
  return store;
}

/** Resumen de un progreso (para confirmar una importación). */
export function summarize(s: Record<string, unknown>) {
  const vals = Object.values(s) as Partial<CaseProgress>[];
  return {
    solved: vals.filter((v) => v?.solved || v?.bestTime != null).length,
    playing: vals.filter((v) => !v?.solved && v?.board && Object.keys(v.board.placed ?? {}).length).length,
  };
}

/** Importa un progreso: 'replace' lo sustituye; 'merge' se queda con lo mejor de cada caso. */
export function importProgress(incoming: Record<string, unknown>, mode: 'merge' | 'replace') {
  const clean: Store = {};
  for (const [id, raw] of Object.entries(incoming)) {
    const v = raw as Partial<CaseProgress>;
    if (!v || typeof v !== 'object') continue;
    clean[id] = { ...emptyProgress(), ...v } as CaseProgress;
  }
  if (mode === 'replace') {
    store = clean;
  } else {
    const next: Store = { ...store };
    for (const [id, inc] of Object.entries(clean)) {
      const cur = next[id];
      if (!cur) { next[id] = inc; continue; }
      if (inc.solved && !cur.solved) { next[id] = { ...inc, challenge: cur.challenge ?? inc.challenge }; continue; }
      if (cur.solved && inc.solved) {
        next[id] = {
          ...cur,
          bestTime: Math.min(cur.bestTime ?? cur.time, inc.bestTime ?? inc.time),
          stars: Math.max(cur.stars ?? 1, inc.stars ?? 1),
        };
        continue;
      }
      if (!cur.solved && !inc.solved) {
        const n = (b?: BoardState) => (b ? Object.keys(b.placed).length : 0);
        if (n(inc.board) > n(cur.board)) next[id] = { ...inc, challenge: cur.challenge ?? inc.challenge };
      }
    }
    store = next;
  }
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProgressStore(): Store {
  return useSyncExternalStore(subscribe, () => store, () => store);
}

export function useCaseProgress(id: string): CaseProgress {
  const s = useProgressStore();
  return s[id] ?? emptyProgress();
}
