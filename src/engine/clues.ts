import { geo, type Geo } from './puzzle';
import type { Clue, Dir, Card, Puzzle, UnaryClue } from './types';

/** ¿La casilla i tiene el objeto (o suelo) `obj`? */
export function cellHas(p: Puzzle, i: number, obj: string): boolean {
  return groupAt(p, i, obj) !== -1;
}

/**
 * Instancia (grupo) del objeto `obj` que hay en la casilla i, o -1.
 * Un suelo «de meterse» (el agua) no cuenta si encima hay un objeto: quien va en una barca no está en el agua.
 */
function groupAt(p: Puzzle, i: number, obj: string): number {
  const c = p.cells[i];
  if (c.obj === obj) return c.objGroup;
  if (c.floor === obj && !(c.obj && p.objects[obj]?.pose === 'in')) return c.floorGroup;
  return -1;
}

/**
 * Instancias distintas de `obj` junto a la casilla i (ortogonal y en la misma habitación).
 * El objeto sobre el que está la propia persona no cuenta como "junto a".
 */
export function besideGroups(p: Puzzle, g: Geo, i: number, obj: string): Set<number> {
  const own = groupAt(p, i, obj);
  const out = new Set<number>();
  for (const q of g.nbrSame[i]) {
    const gr = groupAt(p, q, obj);
    if (gr !== -1 && gr !== own) out.add(gr);
  }
  return out;
}

export function unaryOk(p: Puzzle, g: Geo, u: UnaryClue, i: number): boolean {
  const cell = p.cells[i];
  switch (u.t) {
    case 'inRoom':
      return cell.room === p.roomByKey[u.room];
    case 'inRooms':
      return u.rooms.some((k) => cell.room === p.roomByKey[k]);
    case 'on':
      return cellHas(p, i, u.obj);
    case 'onAny':
      return u.objs.some((o) => cellHas(p, i, o));
    case 'beside':
      return besideGroups(p, g, i, u.obj).size > 0;
    case 'besideN':
      return besideGroups(p, g, i, u.obj).size === u.n;
    case 'row':
      return u.rows.includes(cell.r);
    case 'col':
      return u.cols.includes(cell.c);
    case 'corner':
      return g.corner[i];
    case 'not':
      return !unaryOk(p, g, u.c, i);
  }
}

export const UNARY_TYPES = new Set(['inRoom', 'inRooms', 'on', 'onAny', 'beside', 'besideN', 'row', 'col', 'corner', 'not']);
export const isUnary = (c: Clue): c is UnaryClue => UNARY_TYPES.has(c.t);

export const BINARY_TYPES = new Set(['dir', 'offset', 'sameRoom', 'notSameRoom', 'aloneWith', 'adjacentTo', 'diagonal']);

export function dirOk(dir: Dir, ra: number, ca: number, rb: number, cb: number): boolean {
  switch (dir) {
    case 'N': return ra < rb;
    case 'S': return ra > rb;
    case 'E': return ca > cb;
    case 'W': return ca < cb;
    case 'NE': return ra < rb && ca > cb;
    case 'NW': return ra < rb && ca < cb;
    case 'SE': return ra > rb && ca > cb;
    case 'SW': return ra > rb && ca < cb;
  }
}

/** a está exactamente n filas/columnas en dirección `dir` respecto a b. */
export function offsetOk(axis: 'row' | 'col', n: number, dir: Card, ra: number, ca: number, rb: number, cb: number): boolean {
  if (axis === 'row') {
    if (dir === 'N') return ra === rb - n;
    if (dir === 'S') return ra === rb + n;
    return false;
  }
  if (dir === 'E') return ca === cb + n;
  if (dir === 'W') return ca === cb - n;
  return false;
}

/** Predicado binario sobre (casilla de a, casilla de b) para pistas de relación (sin la parte de "a solas"). */
export function pairOk(p: Puzzle, g: Geo, clue: Clue, ia: number, ib: number): boolean {
  const s = p.size;
  const ra = Math.floor(ia / s), ca = ia % s, rb = Math.floor(ib / s), cb = ib % s;
  switch (clue.t) {
    case 'dir': return dirOk(clue.dir, ra, ca, rb, cb);
    case 'offset': return offsetOk(clue.axis, clue.n, clue.dir, ra, ca, rb, cb);
    case 'sameRoom':
    case 'aloneWith':
      return p.cells[ia].room === p.cells[ib].room;
    case 'notSameRoom': return p.cells[ia].room !== p.cells[ib].room;
    case 'adjacentTo': return g.nbrSame[ia].includes(ib);
    case 'diagonal': return Math.abs(ra - rb) === Math.abs(ca - cb);
    default: return true;
  }
}

/**
 * Evalúa todas las pistas de un personaje sobre una asignación completa
 * (pos[k] = casilla del personaje k del reparto).
 */
export function clueHolds(p: Puzzle, clue: Clue, self: number, pos: ArrayLike<number>): boolean {
  const g = geo(p);
  const idx = castIndex(p);
  const me = pos[self];
  const room = p.cells[me].room;
  const n = p.cast.length;
  const inRoom = (k: number) => k !== self && p.cells[pos[k]].room === room;
  if (isUnary(clue)) return unaryOk(p, g, clue, me);
  switch (clue.t) {
    case 'dir':
    case 'offset':
    case 'sameRoom':
    case 'notSameRoom':
    case 'adjacentTo':
    case 'diagonal':
      return pairOk(p, g, clue, me, pos[idx[clue.of]]);
    case 'aloneWith': {
      const o = idx[clue.of];
      if (p.cells[pos[o]].room !== room) return false;
      for (let k = 0; k < n; k++) if (k !== o && inRoom(k)) return false;
      return true;
    }
    case 'alone':
      for (let k = 0; k < n; k++) if (inRoom(k)) return false;
      return true;
    case 'notAlone':
      for (let k = 0; k < n; k++) if (inRoom(k)) return true;
      return false;
    case 'withGender':
      for (let k = 0; k < n; k++) if (inRoom(k) && p.cast[k].gender === clue.g) return true;
      return false;
    case 'roomCount': {
      let cnt = 1;
      for (let k = 0; k < n; k++) if (inRoom(k)) cnt++;
      return cnt === clue.n;
    }
    case 'onlyOn':
      if (!cellHas(p, me, clue.obj)) return false;
      for (let k = 0; k < n; k++) if (k !== self && cellHas(p, pos[k], clue.obj)) return false;
      return true;
    case 'withSomeoneOn':
      for (let k = 0; k < n; k++) if (inRoom(k) && cellHas(p, pos[k], clue.obj)) return true;
      return false;
    case 'withSomeoneBeside':
      for (let k = 0; k < n; k++) if (inRoom(k) && besideGroups(p, g, pos[k], clue.obj).size > 0) return true;
      return false;
    case 'roomEmpty': {
      const R = p.roomByKey[clue.room];
      for (let k = 0; k < n; k++) if (p.cells[pos[k]].room === R) return false;
      return true;
    }
    case 'someoneAtOffset': {
      const s = p.size;
      const r = Math.floor(me / s), c = me % s;
      for (let k = 0; k < n; k++) {
        if (k === self) continue;
        const q = pos[k];
        const rq = Math.floor(q / s), cq = q % s;
        // "n filas al norte de ella, alguien..." → la otra persona está n filas al norte.
        if (offsetOk(clue.axis, clue.n, clue.dir, rq, cq, r, c) && (!clue.cond || unaryOk(p, g, clue.cond, q)) && (!clue.g || p.cast[k].gender === clue.g)) return true;
      }
      return false;
    }
    case 'victim': {
      let cnt = 0;
      for (let k = 0; k < n; k++) if (inRoom(k)) cnt++;
      return cnt === 1;
    }
  }
  return true;
}

const idxCache = new WeakMap<Puzzle, Record<string, number>>();
export function castIndex(p: Puzzle): Record<string, number> {
  let m = idxCache.get(p);
  if (!m) {
    m = {};
    p.cast.forEach((ch, k) => (m![ch.id] = k));
    idxCache.set(p, m);
  }
  return m;
}

/** ¿La asignación completa cumple todas las pistas y la regla de una persona por fila/columna? */
export function assignmentValid(p: Puzzle, pos: ArrayLike<number>): boolean {
  const s = p.size;
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (let k = 0; k < p.cast.length; k++) {
    const i = pos[k];
    if (i < 0 || !p.cells[i].occupiable) return false;
    rows.add(Math.floor(i / s));
    cols.add(i % s);
  }
  if (rows.size !== p.cast.length || cols.size !== p.cast.length) return false;
  for (let k = 0; k < p.cast.length; k++) {
    for (const clue of p.cast[k].clues) if (!clueHolds(p, clue, k, pos)) return false;
  }
  return true;
}

/** Casillas donde el personaje k cumple sus pistas unarias (y que son ocupables). */
export function unaryDomain(p: Puzzle, k: number): number[] {
  const g = geo(p);
  const ch = p.cast[k];
  const out: number[] = [];
  // Restricciones globales que afectan a todos: habitaciones vacías y objetos "solo yo".
  const emptyRooms = new Set<number>();
  const forbiddenObjs: string[] = [];
  p.cast.forEach((other, j) => {
    for (const cl of other.clues) {
      if (cl.t === 'roomEmpty') emptyRooms.add(p.roomByKey[cl.room]);
      if (cl.t === 'onlyOn' && j !== k) forbiddenObjs.push(cl.obj);
    }
  });
  for (const cell of p.cells) {
    if (!cell.occupiable) continue;
    if (emptyRooms.has(cell.room)) continue;
    if (forbiddenObjs.some((o) => cellHas(p, cell.i, o))) continue;
    let ok = true;
    for (const cl of ch.clues) {
      if (isUnary(cl) && !unaryOk(p, g, cl, cell.i)) { ok = false; break; }
      if (cl.t === 'onlyOn' && !cellHas(p, cell.i, cl.obj)) { ok = false; break; }
    }
    if (ok) out.push(cell.i);
  }
  return out;
}
