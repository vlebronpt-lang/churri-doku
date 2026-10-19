import { applyPlace, initialState, nextDeduction, applyDeduction, contradiction, type Deduction, type LState } from '../engine/logic';
import { castIndex } from '../engine/clues';
import type { Puzzle } from '../engine/types';
import type { BoardState } from '../state/progress';

export type HintResult =
  | { kind: 'errors'; wrongPlaced: number[]; wrongX: number[]; wrongOcc: number[] }
  | { kind: 'step'; d: Deduction; /** Celdas que la deducción descarta para todos (aplicables como X). */ xCells: number[]; /** Colocación a la que lleva la cadena. */ leadsTo: { id: string; cell: number } | null }
  | { kind: 'solved' }
  | { kind: 'stuck' };

/** Errores objetivos del tablero respecto a la solución. */
export function findErrors(p: Puzzle, board: BoardState) {
  const solCells = new Set(Object.values(p.solution));
  const wrongPlaced: number[] = [];
  for (const [cellStr, id] of Object.entries(board.placed)) {
    if (p.solution[id] !== Number(cellStr)) wrongPlaced.push(Number(cellStr));
  }
  const wrongX: number[] = [];
  for (const cellStr of Object.keys(board.xs)) if (solCells.has(Number(cellStr))) wrongX.push(Number(cellStr));
  // «Ocupada» donde en realidad no hay nadie.
  const wrongOcc: number[] = [];
  for (const cellStr of Object.keys(board.occ ?? {})) if (!solCells.has(Number(cellStr))) wrongOcc.push(Number(cellStr));
  return { wrongPlaced, wrongX, wrongOcc };
}

/** Estado lógico a partir de lo que el jugador ya sabe (colocaciones, X y casillas «ocupadas» correctas). */
export function stateFromBoard(p: Puzzle, board: BoardState): LState {
  const st = initialState(p);
  const idx = castIndex(p);
  for (const [cellStr, id] of Object.entries(board.placed)) {
    const k = idx[id];
    const cell = Number(cellStr);
    if (k !== undefined && p.solution[id] === cell && st.cand[k][cell]) applyPlace(p, st, k, cell);
  }
  const solCells = new Set(Object.values(p.solution));
  for (const cellStr of Object.keys(board.xs)) {
    const cell = Number(cellStr);
    if (solCells.has(cell)) continue;
    for (let k = 0; k < p.cast.length; k++) if (st.placed[k] < 0) st.cand[k][cell] = 0;
  }
  // Una casilla ocupada deja vacío el resto de su fila y de su columna.
  const s = p.size;
  for (const cellStr of Object.keys(board.occ ?? {})) {
    const cell = Number(cellStr);
    if (!solCells.has(cell)) continue;
    const r = Math.floor(cell / s), c = cell % s;
    for (let q = 0; q < s; q++) {
      for (const other of [r * s + q, q * s + c]) {
        if (other === cell) continue;
        for (let k = 0; k < p.cast.length; k++) if (st.placed[k] < 0) st.cand[k][other] = 0;
      }
    }
  }
  return st;
}

export function computeHint(p: Puzzle, board: BoardState): HintResult {
  const { wrongPlaced, wrongX, wrongOcc } = findErrors(p, board);
  if (wrongPlaced.length || wrongX.length || wrongOcc.length) return { kind: 'errors', wrongPlaced, wrongX, wrongOcc };
  const st = stateFromBoard(p, board);
  if (st.placed.every((x) => x >= 0)) return { kind: 'solved' };
  if (contradiction(p, st)) return { kind: 'stuck' };
  const d = nextDeduction(p, st, true);
  if (!d) return { kind: 'stuck' };
  // Casillas que quedan descartadas para todas las personas sin colocar.
  const free = p.cast.map((_, k) => k).filter((k) => st.placed[k] < 0);
  const byCell = new Map<number, Set<number>>();
  for (const [k, i] of d.elim) {
    if (!byCell.has(i)) byCell.set(i, new Set());
    byCell.get(i)!.add(k);
  }
  const xCells: number[] = [];
  for (const [i, ks] of byCell) {
    const stillPossible = free.some((k) => !ks.has(k) && st.cand[k][i]);
    if (!stillPossible && !board.xs[i] && board.placed[i] === undefined) xCells.push(i);
  }
  // ¿A qué colocación lleva? Avanzamos la cadena hasta la próxima colocación.
  let leadsTo: { id: string; cell: number } | null = d.place ? { id: p.cast[d.place.k].id, cell: d.place.i } : null;
  if (!leadsTo) {
    const sim: LState = { cand: st.cand.map((a) => a.slice()), placed: st.placed.slice() };
    applyDeduction(p, sim, d);
    for (let it = 0; it < 60 && !leadsTo; it++) {
      const nd = nextDeduction(p, sim, true);
      if (!nd) break;
      applyDeduction(p, sim, nd);
      if (nd.place) leadsTo = { id: p.cast[nd.place.k].id, cell: nd.place.i };
    }
  }
  return { kind: 'step', d, xCells, leadsTo };
}
