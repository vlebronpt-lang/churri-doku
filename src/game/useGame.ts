import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Puzzle } from '../engine/types';
import { getProgress, updateProgress, type BoardState } from '../state/progress';

export const emptyBoard = (): BoardState => ({ placed: {}, notes: {}, xs: {} });

const clone = (b: BoardState): BoardState => ({
  placed: { ...b.placed },
  notes: Object.fromEntries(Object.entries(b.notes).map(([k, v]) => [k, [...v]])),
  xs: { ...b.xs },
});

export interface GameApi {
  board: BoardState;
  /** Casilla de cada personaje colocado. */
  posOf: Record<string, number>;
  /** Casillas con X automática (fila/columna de alguien colocado). */
  autoX: Set<number>;
  place: (id: string, cell: number) => void;
  unplace: (id: string) => void;
  toggleNote: (cell: number, id: string, force?: boolean) => void;
  toggleX: (cell: number, force?: boolean) => void;
  clearCell: (cell: number) => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Empieza un gesto (arrastre) que se deshace como una sola acción. */
  beginBatch: () => void;
  endBatch: () => void;
  apply: (fn: (b: BoardState) => void) => void;
  allPlaced: boolean;
  seconds: number;
  setRunning: (run: boolean) => void;
}

export function useGame(p: Puzzle, opts: { autoX: boolean; noXOnBlocked: boolean }): GameApi {
  const [board, setBoard] = useState<BoardState>(() => getProgress(p.id).board ?? emptyBoard());
  const past = useRef<BoardState[]>([]);
  const future = useRef<BoardState[]>([]);
  const batching = useRef(false);
  const [, force] = useState(0);
  const [seconds, setSeconds] = useState(() => getProgress(p.id).time);
  const running = useRef(true);

  // Reiniciar al cambiar de caso.
  useEffect(() => {
    setBoard(getProgress(p.id).board ?? emptyBoard());
    setSeconds(getProgress(p.id).time);
    past.current = [];
    future.current = [];
  }, [p.id]);

  // Guardado
  useEffect(() => {
    updateProgress(p.id, { board, opened: true });
  }, [board, p.id]);

  // Temporizador (se pausa con la pestaña oculta).
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!running.current || document.hidden) return;
      setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (seconds % 5 === 0) updateProgress(p.id, { time: seconds });
  }, [seconds, p.id]);
  useEffect(() => () => updateProgress(p.id, (c) => ({ time: Math.max(c.time, 0) })), [p.id]);

  const commit = useCallback((fn: (b: BoardState) => void) => {
    setBoard((prev) => {
      const next = clone(prev);
      fn(next);
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
      if (!batching.current) {
        past.current.push(prev);
        if (past.current.length > 300) past.current.shift();
        future.current = [];
      }
      return next;
    });
    force((x) => x + 1);
  }, []);

  const posOf = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [cell, id] of Object.entries(board.placed)) out[id] = Number(cell);
    return out;
  }, [board.placed]);

  const autoX = useMemo(() => {
    const out = new Set<number>();
    if (!opts.autoX) return out;
    const s = p.size;
    for (const cellStr of Object.keys(board.placed)) {
      const cell = Number(cellStr);
      const r = Math.floor(cell / s), c = cell % s;
      for (let k = 0; k < s; k++) {
        for (const q of [r * s + k, k * s + c]) {
          if (q === cell || board.placed[q] !== undefined) continue;
          if (opts.noXOnBlocked && !p.cells[q].occupiable) continue;
          out.add(q);
        }
      }
    }
    return out;
  }, [board.placed, opts.autoX, opts.noXOnBlocked, p]);

  const place = useCallback((id: string, cell: number) => {
    if (!p.cells[cell].occupiable) return;
    commit((b) => {
      for (const [k, v] of Object.entries(b.placed)) if (v === id) delete b.placed[Number(k)];
      b.placed[cell] = id;
      delete b.xs[cell];
    });
  }, [commit, p]);

  const unplace = useCallback((id: string) => {
    commit((b) => {
      for (const [k, v] of Object.entries(b.placed)) if (v === id) delete b.placed[Number(k)];
    });
  }, [commit]);

  const toggleNote = useCallback((cell: number, id: string, forceOn?: boolean) => {
    if (!p.cells[cell].occupiable) return;
    commit((b) => {
      const list = b.notes[cell] ?? [];
      const has = list.includes(id);
      const on = forceOn ?? !has;
      if (on && !has) b.notes[cell] = [...list, id];
      if (!on && has) {
        const nl = list.filter((x) => x !== id);
        if (nl.length) b.notes[cell] = nl;
        else delete b.notes[cell];
      }
    });
  }, [commit, p]);

  const toggleX = useCallback((cell: number, forceOn?: boolean) => {
    if (opts.noXOnBlocked && !p.cells[cell].occupiable) return;
    commit((b) => {
      if (b.placed[cell] !== undefined) return;
      const on = forceOn ?? !b.xs[cell];
      if (on) b.xs[cell] = 'm';
      else delete b.xs[cell];
    });
  }, [commit, opts.noXOnBlocked, p]);

  const clearCell = useCallback((cell: number) => {
    commit((b) => {
      delete b.placed[cell];
      delete b.notes[cell];
      delete b.xs[cell];
    });
  }, [commit]);

  const clearAll = useCallback(() => commit((b) => {
    b.placed = {};
    b.notes = {};
    b.xs = {};
  }), [commit]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    setBoard((cur) => {
      future.current.push(cur);
      return prev;
    });
    force((x) => x + 1);
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    setBoard((cur) => {
      past.current.push(cur);
      return next;
    });
    force((x) => x + 1);
  }, []);

  const beginBatch = useCallback(() => {
    setBoard((cur) => {
      past.current.push(cur);
      future.current = [];
      return cur;
    });
    batching.current = true;
  }, []);
  const endBatch = useCallback(() => {
    batching.current = false;
    // Si el gesto no cambió nada, quitamos la instantánea vacía.
    setBoard((cur) => {
      const last = past.current[past.current.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(cur)) past.current.pop();
      return cur;
    });
    force((x) => x + 1);
  }, []);

  const setRunning = useCallback((run: boolean) => {
    running.current = run;
  }, []);

  return {
    board, posOf, autoX, place, unplace, toggleNote, toggleX, clearCell, clearAll, undo, redo,
    canUndo: past.current.length > 0, canRedo: future.current.length > 0,
    beginBatch, endBatch, apply: commit,
    allPlaced: Object.keys(posOf).length === p.cast.length,
    seconds, setRunning,
  };
}

export function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
