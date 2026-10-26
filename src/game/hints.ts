import { applyPlace, initialState, nextDeduction, applyDeduction, contradiction, type Deduction, type LState } from '../engine/logic';
import { castIndex } from '../engine/clues';
import type { Puzzle } from '../engine/types';
import type { BoardState } from '../state/progress';

/**
 * Lo que ya se le ha explicado al jugador con las pistas: casillas descartadas para cada sospechoso
 * (id → casillas). Así la pista siguiente sigue desde ahí y no repite la misma deducción.
 */
export type HintMemory = Record<string, number[]>;

export type HintResult =
  | { kind: 'errors'; wrongPlaced: number[]; wrongX: number[]; wrongOcc: number[]; wrongZones: string[] }
  | {
      kind: 'step';
      d: Deduction;
      /** Celdas que la deducción descarta para todos (aplicables como X). */
      xCells: number[];
      /** Sospechoso que queda confinado en una habitación: se puede marcar su zona. */
      zone: { id: string; room: number } | null;
      /** Pocas casillas posibles para un sospechoso: se pueden apuntar con el lápiz. */
      notes: { id: string; cells: number[] } | null;
      /** Colocación a la que lleva la cadena. */
      leadsTo: { id: string; cell: number } | null;
    }
  | { kind: 'solved' }
  | { kind: 'stuck' }
  /** Sin un paso razonable desde aquí: se revela dónde estaba alguien. */
  | { kind: 'reveal'; id: string; cell: number };

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
  // Zonas marcadas a sospechosos que en realidad están en otra (solo cuentan las de quien aún no está colocado).
  const placedIds = new Set(Object.values(board.placed));
  const wrongZones = Object.entries(board.zones ?? {})
    .filter(([id, room]) => !placedIds.has(id) && p.solution[id] !== undefined && p.cells[p.solution[id]].room !== room)
    .map(([id]) => id);
  return { wrongPlaced, wrongX, wrongOcc, wrongZones };
}

/** Estado lógico a partir de lo que el jugador ya sabe (colocaciones, X, «ocupadas», zonas correctas y lo ya explicado). */
export function stateFromBoard(p: Puzzle, board: BoardState, memo: HintMemory = {}): LState {
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
  // Zona marcada (y correcta): el sospechoso está en una de las casillas de esa habitación.
  for (const [id, room] of Object.entries(board.zones ?? {})) {
    const k = idx[id];
    if (k === undefined || st.placed[k] >= 0 || p.cells[p.solution[id]].room !== room) continue;
    for (let i = 0; i < st.cand[k].length; i++) if (p.cells[i].room !== room) st.cand[k][i] = 0;
  }
  // Lo que ya se explicó en pistas anteriores (siempre es cierto: nunca descarta la casilla de la solución).
  for (const [id, cells] of Object.entries(memo)) {
    const k = idx[id];
    if (k === undefined || st.placed[k] >= 0) continue;
    for (const i of cells) if (i !== p.solution[id]) st.cand[k][i] = 0;
  }
  return st;
}

/** Junta en la memoria lo que descarta una pista ya explicada. */
export function remember(memo: HintMemory, p: Puzzle, d: Deduction): HintMemory {
  const out: HintMemory = { ...memo };
  for (const [k, i] of d.elim) {
    const id = p.cast[k].id;
    if (p.solution[id] === i) continue;
    const prev = out[id] ?? [];
    if (!prev.includes(i)) out[id] = [...prev, i];
  }
  return out;
}

export function computeHint(p: Puzzle, board: BoardState, memo: HintMemory = {}): HintResult {
  const { wrongPlaced, wrongX, wrongOcc, wrongZones } = findErrors(p, board);
  if (wrongPlaced.length || wrongX.length || wrongOcc.length || wrongZones.length) return { kind: 'errors', wrongPlaced, wrongX, wrongOcc, wrongZones };
  const st = stateFromBoard(p, board, memo);
  if (st.placed.every((x) => x >= 0)) return { kind: 'solved' };
  if (contradiction(p, st)) return { kind: 'stuck' };
  const free = p.cast.map((_, k) => k).filter((k) => st.placed[k] < 0);
  // Si el paso no aparece con la búsqueda normal, se prueban todas las suposiciones posibles.
  const d = nextDeduction(p, st, true) ?? nextDeduction(p, st, true, Infinity);
  if (!d) return reveal(p, st, free);
  // Casillas que quedan descartadas para todas las personas sin colocar.
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
  const after: LState = { cand: st.cand.map((a) => a.slice()), placed: st.placed.slice() };
  applyDeduction(p, after, d);
  // De quién habla la explicación: el único sospechoso al que descarta casillas (o el primero en foco).
  const elimChars = [...new Set(d.elim.map(([k]) => k))];
  const main = elimChars.length === 1 ? elimChars[0] : p.cast.findIndex((c) => c.id === d.focus.chars[0]);
  let zone: { id: string; room: number } | null = null;
  let notes: { id: string; cells: number[] } | null = null;
  if (!d.place && main >= 0 && after.placed[main] < 0 && elimChars.includes(main)) {
    const id = p.cast[main].id;
    const cells = after.cand[main].reduce<number[]>((a, v, i) => (v ? [...a, i] : a), []);
    const rooms = new Set(cells.map((i) => p.cells[i].room));
    if (rooms.size === 1 && board.zones?.[id] !== [...rooms][0]) zone = { id, room: [...rooms][0] };
    else if (cells.length >= 2 && cells.length <= 6 && cells.some((i) => !(board.notes[i] ?? []).includes(id))) notes = { id, cells };
  }
  // ¿A qué colocación lleva? Avanzamos la cadena hasta la próxima colocación.
  let leadsTo: { id: string; cell: number } | null = d.place ? { id: p.cast[d.place.k].id, cell: d.place.i } : null;
  if (!leadsTo) {
    const sim: LState = { cand: after.cand.map((a) => a.slice()), placed: after.placed.slice() };
    for (let it = 0; it < 400 && !leadsTo; it++) {
      const nd = nextDeduction(p, sim, true) ?? nextDeduction(p, sim, true, Infinity);
      if (!nd) break;
      applyDeduction(p, sim, nd);
      if (nd.place) leadsTo = { id: p.cast[nd.place.k].id, cell: nd.place.i };
    }
  }
  // Último recurso para que «Hazlo por mí» siempre avance: la persona con menos opciones, en su sitio.
  if (!leadsTo) {
    const r = reveal(p, st, free);
    leadsTo = { id: r.id, cell: r.cell };
  }
  return { kind: 'step', d, xCells, zone, notes, leadsTo };
}

/** La persona sin colocar con menos opciones, en su casilla de la solución. */
function reveal(p: Puzzle, st: LState, free: number[]): { kind: 'reveal'; id: string; cell: number } {
  const count = (k: number) => st.cand[k].reduce((a, v) => a + v, 0);
  const k = free.slice().sort((a, b) => count(a) - count(b))[0];
  const id = p.cast[k].id;
  return { kind: 'reveal', id, cell: p.solution[id] };
}
