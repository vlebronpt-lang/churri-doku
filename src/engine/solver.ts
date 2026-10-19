import { castIndex, cellHas, clueHolds, isUnary, pairOk, unaryOk } from './clues';
import { geo } from './puzzle';
import type { Clue, Puzzle } from './types';

export interface SolveResult {
  count: number;
  solutions: number[][];
  nodes: number;
  /** true si se alcanzó el límite de nodos (el recuento no es fiable). */
  aborted: boolean;
}

/**
 * Solver exhaustivo: cuenta las soluciones (hasta `limit`).
 * `clues` permite probar juegos de pistas alternativos sin recompilar el puzzle.
 */
export function solve(p: Puzzle, limit = 2, clues?: Clue[][], maxNodes = 5_000_000): SolveResult {
  const n = p.cast.length;
  const s = p.size;
  const g = geo(p);
  const idx = castIndex(p);
  const C: Clue[][] = (clues ?? p.cast.map((ch) => ch.clues)).map((list, k) =>
    p.cast[k].victim && !list.some((c) => c.t === 'victim') ? [{ t: 'victim' } as Clue, ...list] : list,
  );

  // Filtros globales que afectan a todos los dominios.
  const emptyRooms = new Set<number>();
  const onlyOnBy: { obj: string; owner: number }[] = [];
  C.forEach((list, k) => {
    for (const cl of list) {
      if (cl.t === 'roomEmpty') emptyRooms.add(p.roomByKey[cl.room]);
      if (cl.t === 'onlyOn') onlyOnBy.push({ obj: cl.obj, owner: k });
    }
  });

  const domains: number[][] = [];
  for (let k = 0; k < n; k++) {
    const d: number[] = [];
    for (const cell of p.cells) {
      if (!cell.occupiable || emptyRooms.has(cell.room)) continue;
      let ok = true;
      for (const o of onlyOnBy) {
        const has = cellHas(p, cell.i, o.obj);
        if (o.owner === k ? !has : has) { ok = false; break; }
      }
      if (!ok) continue;
      for (const cl of C[k]) {
        if (isUnary(cl) && !unaryOk(p, g, cl, cell.i)) { ok = false; break; }
      }
      if (ok) d.push(cell.i);
    }
    domains.push(d);
  }

  // Restricciones binarias (en ambos sentidos para poder filtrar candidatos).
  type Bin = { other: number; test: (mine: number, theirs: number) => boolean };
  const bins: Bin[][] = Array.from({ length: n }, () => []);
  const globals: { self: number; clue: Clue }[] = [];
  C.forEach((list, k) => {
    for (const cl of list) {
      if (isUnary(cl)) continue;
      switch (cl.t) {
        case 'dir': case 'offset': case 'sameRoom': case 'notSameRoom': case 'adjacentTo': case 'diagonal': case 'aloneWith': {
          const o = idx[cl.of];
          if (o === undefined) throw new Error(`[${p.id}] Pista de ${p.cast[k].id} referencia a '${cl.of}' inexistente`);
          bins[k].push({ other: o, test: (mine, theirs) => pairOk(p, g, cl, mine, theirs) });
          bins[o].push({ other: k, test: (mine, theirs) => pairOk(p, g, cl, theirs, mine) });
          if (cl.t === 'aloneWith') globals.push({ self: k, clue: cl });
          break;
        }
        case 'onlyOn':
        case 'roomEmpty':
          break; // ya aplicadas en los dominios
        default:
          globals.push({ self: k, clue: cl });
      }
    }
  });

  const pos = new Int16Array(n).fill(-1);
  const rowUsed = new Uint8Array(s);
  const colUsed = new Uint8Array(s);
  const roomOf = p.cells.map((c) => c.room);
  const solutions: number[][] = [];
  let nodes = 0;
  let count = 0;

  const partialViolated = (self: number, clue: Clue): boolean => {
    const me = pos[self];
    if (me < 0) return false;
    const room = roomOf[me];
    switch (clue.t) {
      case 'alone':
        for (let k = 0; k < n; k++) if (k !== self && pos[k] >= 0 && roomOf[pos[k]] === room) return true;
        return false;
      case 'victim': {
        let cnt = 0;
        for (let k = 0; k < n; k++) if (k !== self && pos[k] >= 0 && roomOf[pos[k]] === room) cnt++;
        return cnt > 1;
      }
      case 'roomCount': {
        let cnt = 1;
        for (let k = 0; k < n; k++) if (k !== self && pos[k] >= 0 && roomOf[pos[k]] === room) cnt++;
        return cnt > clue.n;
      }
      case 'aloneWith': {
        const o = idx[clue.of];
        for (let k = 0; k < n; k++) if (k !== self && k !== o && pos[k] >= 0 && roomOf[pos[k]] === room) return true;
        return false;
      }
      default:
        return false;
    }
  };

  const cands = (k: number): number[] => {
    const out: number[] = [];
    for (const i of domains[k]) {
      if (rowUsed[Math.floor(i / s)] || colUsed[i % s]) continue;
      let ok = true;
      for (const b of bins[k]) {
        const t = pos[b.other];
        if (t >= 0 && !b.test(i, t)) { ok = false; break; }
      }
      if (ok) out.push(i);
    }
    return out;
  };

  const dfs = (depth: number): boolean => {
    if (++nodes > maxNodes) return true;
    if (depth === n) {
      for (const gl of globals) if (!clueHolds(p, gl.clue, gl.self, pos)) return false;
      count++;
      if (solutions.length < limit) solutions.push(Array.from(pos));
      return count >= limit;
    }
    let best = -1;
    let bestC: number[] | null = null;
    for (let k = 0; k < n; k++) {
      if (pos[k] >= 0) continue;
      const c = cands(k);
      if (c.length === 0) return false;
      if (!bestC || c.length < bestC.length) { best = k; bestC = c; if (c.length === 1) break; }
    }
    for (const i of bestC!) {
      pos[best] = i;
      rowUsed[Math.floor(i / s)] = 1;
      colUsed[i % s] = 1;
      let ok = true;
      for (const gl of globals) if (partialViolated(gl.self, gl.clue)) { ok = false; break; }
      if (ok && dfs(depth + 1)) {
        pos[best] = -1; rowUsed[Math.floor(i / s)] = 0; colUsed[i % s] = 0;
        return true;
      }
      pos[best] = -1;
      rowUsed[Math.floor(i / s)] = 0;
      colUsed[i % s] = 0;
    }
    return false;
  };

  dfs(0);
  return { count, solutions, nodes, aborted: nodes > maxNodes };
}
