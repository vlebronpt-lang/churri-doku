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
  /** Casillas marcadas como «ocupadas»: ahí hay alguien, aunque aún no se sepa quién. */
  occ?: Record<number, true>;
  /** Filas o columnas marcadas como «ocupadas» ('r3', 'c0'…): su persona está en una de sus casillas libres. */
  lines?: Record<string, true>;
  /** Zona de cada sospechoso que aún no tiene casilla: id → número de habitación («A está en la Cocina»). */
  zones?: Record<string, number>;
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
  /** Primera vez que se resolvió (no cambia al volver a jugar): cuenta para las rachas. */
  firstSolvedAt?: number;
  bestTime?: number;
  stars?: number;
  /** Reto recibido por enlace («X lo resolvió en 3:12»). */
  challenge?: Challenge;
  /** Registro para mejorar los casos: cuándo se pidió cada pista y qué técnica explicaba. */
  hintLog?: { t: number; tech: string; placed: number }[];
  /** Segundo de juego de la primera colocación. */
  firstMoveAt?: number;
  /** Veces que se ha abierto el caso. */
  visits?: number;
  /** Último cambio (ms): al juntar el progreso de varios dispositivos manda la partida más reciente. */
  at?: number;
}

type Store = Record<string, CaseProgress>;

let store: Store = load<Store>('progress', {});
const listeners = new Set<() => void>();
/** Avisos de progreso que llega de fuera (la nube u otra pestaña): la partida abierta se recarga. */
const externalListeners = new Set<(ids: string[]) => void>();

function emit() {
  save('progress', store);
  listeners.forEach((l) => l());
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Lo que no es jugar (abrir el caso, el reloj corriendo, recibir un reto) no hace «reciente» una partida. */
const PASSIVE = new Set<keyof CaseProgress>(['opened', 'visits', 'time', 'challenge', 'at']);
const blank = (b?: BoardState) =>
  !b || ![b.placed, b.notes, b.xs, b.occ ?? {}, b.lines ?? {}, b.zones ?? {}].some((m) => Object.keys(m).length);

export const emptyProgress = (): CaseProgress => ({ opened: false, time: 0, hints: 0, checks: 0, mistakes: 0, solved: false });

export function getProgress(id: string): CaseProgress {
  return store[id] ?? emptyProgress();
}

export function updateProgress(id: string, patch: Partial<CaseProgress> | ((p: CaseProgress) => Partial<CaseProgress>)) {
  const cur = getProgress(id);
  const p = typeof patch === 'function' ? patch(cur) : patch;
  const changed = (Object.keys(p) as (keyof CaseProgress)[]).filter((k) => !same(cur[k], p[k]));
  if (store[id] && !changed.length) return;
  // Solo jugar de verdad marca la partida como la más reciente (la que gana al juntar dispositivos).
  const played = changed.some((k) => !PASSIVE.has(k) && !(k === 'board' && blank(cur.board) && blank(p.board)));
  store = { ...store, [id]: { ...cur, ...p, ...(played ? { at: Date.now() } : {}) } };
  emit();
}

export function resetCase(id: string) {
  const cur = getProgress(id);
  store = { ...store, [id]: { ...emptyProgress(), opened: true, bestTime: cur.bestTime, stars: cur.stars, challenge: cur.challenge, firstSolvedAt: cur.firstSolvedAt, solved: false, at: Date.now() } };
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
  const now = Date.now();
  for (const c of Object.values(clean)) c.at = now;
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

/**
 * Junta dos versiones de un caso: la partida en curso es la de la versión más reciente,
 * pero lo conseguido (resuelto, mejor tiempo, estrellas) no se pierde nunca.
 */
export function mergeCase(a: CaseProgress | undefined, b: CaseProgress | undefined): CaseProgress | undefined {
  if (!a || !b) return a ?? b;
  // La más reciente; si no se sabe (progreso de antes de las cuentas), la resuelta o la más avanzada.
  const rank = (c: CaseProgress) => [c.at ?? 0, c.solved ? 1 : 0, Object.keys(c.board?.placed ?? {}).length];
  const ra = rank(a), rb = rank(b);
  const bWins = rb[0] !== ra[0] ? rb[0] > ra[0] : rb[1] !== ra[1] ? rb[1] > ra[1] : rb[2] > ra[2];
  const [newer, older] = bWins ? [b, a] : [a, b];
  const pick = (x: number | undefined, y: number | undefined, f: (...v: number[]) => number) => (x == null ? y : y == null ? x : f(x, y));
  const out: CaseProgress = {
    ...newer,
    opened: a.opened || b.opened,
    bestTime: pick(a.bestTime, b.bestTime, Math.min),
    stars: pick(a.stars, b.stars, Math.max),
    firstSolvedAt: pick(a.firstSolvedAt, b.firstSolvedAt, Math.min),
    visits: pick(a.visits, b.visits, Math.max),
    challenge: newer.challenge ?? older.challenge,
  };
  for (const k of Object.keys(out) as (keyof CaseProgress)[]) if (out[k] === undefined) delete out[k];
  return out;
}

/** Sustituye el progreso por el que llega de fuera (la nube u otra pestaña) y avisa a la partida abierta. */
export function replaceProgress(next: Store) {
  const ids = [...new Set([...Object.keys(store), ...Object.keys(next)])].filter((id) => !same(store[id], next[id]));
  if (!ids.length) return;
  store = next;
  emit();
  externalListeners.forEach((l) => l(ids));
}

export function onExternalChange(l: (ids: string[]) => void) {
  externalListeners.add(l);
  return () => { externalListeners.delete(l); };
}

// Otra pestaña del mismo navegador ha guardado: se junta con lo de esta para que ninguna pise a la otra.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== 'churri-doku:progress' || !e.newValue) return;
    try {
      const incoming = JSON.parse(e.newValue) as Store;
      const next: Store = { ...store };
      for (const [id, c] of Object.entries(incoming)) next[id] = mergeCase(store[id], c)!;
      replaceProgress(next);
    } catch {
      /* ignorar */
    }
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const subscribeProgress = subscribe;

export function useProgressStore(): Store {
  return useSyncExternalStore(subscribe, () => store, () => store);
}

export function useCaseProgress(id: string): CaseProgress {
  const s = useProgressStore();
  return s[id] ?? emptyProgress();
}
