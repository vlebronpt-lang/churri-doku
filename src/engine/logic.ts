import { besideGroups, castIndex, cellHas, isUnary, offsetOk, pairOk, unaryDomain, unaryOk } from './clues';
import { geo, type Geo } from './puzzle';
import { clueText, numF, objIndef, roomPhrase, withPrep } from './text';
import type { Clue, Puzzle } from './types';

export type TechId =
  | 'single' | 'rowSingle' | 'colSingle' | 'cellForcedRow' | 'cellForcedCol'
  | 'pointing' | 'relation' | 'room' | 'subset' | 'trial';

export const TECH_LEVEL: Record<TechId, number> = {
  single: 1, rowSingle: 1, colSingle: 1, cellForcedRow: 2, cellForcedCol: 2,
  pointing: 2, relation: 2, room: 3, subset: 4, trial: 6,
};

export interface Focus {
  cells: number[];
  chars: string[];
  rows: number[];
  cols: number[];
  rooms: number[];
}

export interface Deduction {
  tech: TechId;
  level: number;
  /** Colocación resultante (si la hay). */
  place?: { k: number; i: number };
  /** Eliminaciones: pares [personaje, casilla]. */
  elim: [number, number][];
  text: string;
  /** Texto breve para la primera pista ("Fíjate en..."). */
  nudge: string;
  focus: Focus;
}

export interface LState {
  cand: Uint8Array[];
  placed: Int16Array;
}

type Rel = { a: number; b: number; clue: Clue };
type RoomClue = { k: number; clue: Clue };

interface Ctx {
  p: Puzzle;
  g: Geo;
  n: number;
  s: number;
  rels: Rel[];
  roomClues: RoomClue[];
  rowOf: (i: number) => number;
  colOf: (i: number) => number;
  roomOf: (i: number) => number;
  /** Nombre en mitad de frase ("el Profesor", "Ana"). */
  name: (k: number) => string;
  /** Nombre al empezar una frase ("El Profesor"). */
  Name: (k: number) => string;
  /** "del Profesor", "de Ana". */
  de: (k: number) => string;
  /** "seguro" / "segura". */
  sure: (k: number) => string;
  /** Adjetivo concordado: adj(k, 'descartad') → descartado/descartada. */
  adj: (k: number, base: string) => string;
  label: (i: number) => string;
  /** «la casilla F1·C2» / «las casillas F1·C2, F3·C4 y F5·C6». */
  cells: (list: number[]) => string;
  /** «F1·C2, F3·C4 y F5·C6» (o «o» con `or`), sin artículo. */
  enum: (list: number[], or?: boolean) => string;
  /** Habitación de una casilla: «la Capilla». */
  room: (i: number) => string;
}

const capFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** Cita una pista quitando el punto final: «Estaba con Ana». */
const quote = (t: string) => `«${t.replace(/\.$/, '')}»`;
/** «1, 2 y 5» / «1 a 5» con números ya en base 1. */
function seq(nums: number[], or = false): string {
  const ns = [...new Set(nums)].sort((a, b) => a - b);
  if (ns.length >= 3 && ns[ns.length - 1] - ns[0] === ns.length - 1) return `${ns[0]} a ${ns[ns.length - 1]}`;
  if (ns.length === 1) return String(ns[0]);
  return `${ns.slice(0, -1).join(', ')} ${or ? 'o' : 'y'} ${ns[ns.length - 1]}`;
}
/** «la columna 3» / «las columnas 1 a 5». */
const lineList = (word: 'fila' | 'columna', nums: number[], or = false) => (new Set(nums).size === 1 ? `la ${word} ${nums[0]}` : `las ${word}s ${seq(nums, or)}`);
/** Junta frases con comas y una «y» final. */
const joinY = (parts: string[]) => (parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`);
/** Texto de una sola pista de un personaje (sin las demás que tenga). */
const oneClue = (p: Puzzle, k: number, clue: Clue) => clueText(p, { ...p.cast[k], victim: false, clues: [clue] });

const ctxCache = new WeakMap<Puzzle, Ctx>();

function makeCtx(p: Puzzle): Ctx {
  const hit = ctxCache.get(p);
  if (hit) return hit;
  const idx = castIndex(p);
  const rels: Rel[] = [];
  const roomClues: RoomClue[] = [];
  p.cast.forEach((ch, k) => {
    for (const cl of ch.clues) {
      if (isUnary(cl)) continue;
      switch (cl.t) {
        case 'dir': case 'offset': case 'sameRoom': case 'notSameRoom': case 'adjacentTo': case 'diagonal':
          rels.push({ a: k, b: idx[cl.of], clue: cl });
          break;
        case 'aloneWith':
          rels.push({ a: k, b: idx[cl.of], clue: cl });
          roomClues.push({ k, clue: cl });
          break;
        case 'onlyOn': case 'roomEmpty':
          break;
        default:
          roomClues.push({ k, clue: cl });
      }
    }
    if (ch.victim && !ch.clues.some((c) => c.t === 'victim')) roomClues.push({ k, clue: { t: 'victim' } });
  });
  const s = p.size;
  const ctx: Ctx = {
    p, g: geo(p), n: p.cast.length, s, rels, roomClues,
    rowOf: (i) => Math.floor(i / s),
    colOf: (i) => i % s,
    roomOf: (i) => p.cells[i].room,
    name: (k) => withPrep('', p.cast[k]),
    Name: (k) => capFirst(withPrep('', p.cast[k])),
    de: (k) => withPrep('de', p.cast[k]),
    sure: (k) => (p.cast[k].gender === 'f' ? 'segura' : 'seguro'),
    adj: (k, base) => base + (p.cast[k].gender === 'f' ? 'a' : 'o'),
    cells: (lst) => {
      const ls = lst.map((i) => `F${Math.floor(i / s) + 1}·C${(i % s) + 1}`);
      if (ls.length === 1) return `la casilla ${ls[0]}`;
      return `las casillas ${ls.slice(0, -1).join(', ')} y ${ls[ls.length - 1]}`;
    },
    label: (i) => `F${Math.floor(i / s) + 1}·C${(i % s) + 1}`,
    enum: (lst, or = false) => {
      const ls = lst.map((i) => `F${Math.floor(i / s) + 1}·C${(i % s) + 1}`);
      return ls.length === 1 ? ls[0] : `${ls.slice(0, -1).join(', ')} ${or ? 'o' : 'y'} ${ls[ls.length - 1]}`;
    },
    room: (i) => roomPhrase(p.rooms[p.cells[i].room], ''),
  };
  ctxCache.set(p, ctx);
  return ctx;
}

const emptyFocus = (): Focus => ({ cells: [], chars: [], rows: [], cols: [], rooms: [] });

export function initialState(p: Puzzle): LState {
  const n = p.cast.length;
  const cand = Array.from({ length: n }, (_, k) => {
    const a = new Uint8Array(p.size * p.size);
    for (const i of unaryDomain(p, k)) a[i] = 1;
    return a;
  });
  return { cand, placed: new Int16Array(n).fill(-1) };
}

export function cloneState(st: LState): LState {
  return { cand: st.cand.map((a) => a.slice()), placed: st.placed.slice() };
}

const list = (a: Uint8Array) => {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i]) out.push(i);
  return out;
};

/** Aplica una colocación con sus consecuencias inmediatas (fila, columna y casilla). Devuelve las eliminaciones hechas. */
export function applyPlace(c: Ctx | Puzzle, st: LState, k: number, i: number): [number, number][] {
  const ctx = 'rels' in c ? c : makeCtx(c);
  const out: [number, number][] = [];
  const r = ctx.rowOf(i), col = ctx.colOf(i);
  st.placed[k] = i;
  for (let q = 0; q < st.cand[k].length; q++) if (q !== i && st.cand[k][q]) { st.cand[k][q] = 0; out.push([k, q]); }
  st.cand[k][i] = 1;
  for (let j = 0; j < ctx.n; j++) {
    if (j === k) continue;
    const a = st.cand[j];
    for (let x = 0; x < ctx.s; x++) {
      const q1 = r * ctx.s + x;
      if (a[q1]) { a[q1] = 0; out.push([j, q1]); }
      const q2 = x * ctx.s + col;
      if (a[q2]) { a[q2] = 0; out.push([j, q2]); }
    }
  }
  return out;
}

export function applyDeduction(p: Puzzle, st: LState, d: Deduction) {
  for (const [k, i] of d.elim) st.cand[k][i] = 0;
  if (d.place) applyPlace(p, st, d.place.k, d.place.i);
}

// ---------------------------------------------------------------------------
// Utilidades sobre el estado
// ---------------------------------------------------------------------------

function count(a: Uint8Array): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) c += a[i];
  return c;
}

// ---------------------------------------------------------------------------
// Explicaciones: dónde puede estar alguien y por qué, dicho con casillas, filas y habitaciones
// ---------------------------------------------------------------------------

/** «está en F1·C5», «solo puede estar en F2·C3 o F4·C6», «tiene que estar en la Capilla»… */
function whereIs(ctx: Ctx, st: LState, k: number): string {
  if (st.placed[k] >= 0) return `está en ${ctx.label(st.placed[k])}`;
  const C = list(st.cand[k]);
  if (C.length <= 4) return `solo puede estar en ${ctx.enum(C, true)}`;
  if (new Set(C.map(ctx.roomOf)).size === 1) return `tiene que estar en ${ctx.room(C[0])}`;
  return `puede estar en ${C.length} casillas`;
}

/**
 * Casillas descartadas dichas de la forma más corta (va tras «no puede estar»): columnas, filas o habitaciones
 * enteras, o una a una si son pocas. null si no hay una forma corta de decirlo.
 */
function regionOf(ctx: Ctx, gone: number[], kept: number[]): string | null {
  const cols = [...new Set(gone.map(ctx.colOf))];
  const rows = [...new Set(gone.map(ctx.rowOf))];
  const rooms = [...new Set(gone.map(ctx.roomOf))];
  const ni = (ls: string[]) => (ls.length === 1 ? ls[0] : `${ls.slice(0, -1).join(', ')} ni en ${ls[ls.length - 1]}`);
  const opts: string[] = [];
  if (gone.length <= 4) opts.push(`en ${ni(gone.map(ctx.label))}`);
  if (!kept.some((i) => cols.includes(ctx.colOf(i)))) opts.push(`en ${lineList('columna', cols.map((c) => c + 1))}`);
  if (!kept.some((i) => rows.includes(ctx.rowOf(i)))) opts.push(`en ${lineList('fila', rows.map((r) => r + 1))}`);
  if (rooms.length <= 3 && !kept.some((i) => rooms.includes(ctx.roomOf(i)))) opts.push(`en ${ni(rooms.map((R) => roomPhrase(ctx.p.rooms[R], '')))}`);
  return opts.length ? opts.sort((a, b) => a.length - b.length)[0] : null;
}

/** «Solo le queda F2·C3.» / «Le quedan F2·C3, F4·C5 y F6·C7.» / «Le quedan 9 casillas, resaltadas en el plano.» */
function remaining(ctx: Ctx, kept: number[]): string {
  if (!kept.length) return '';
  if (kept.length === 1) return `Solo le queda ${ctx.label(kept[0])} (${ctx.room(kept[0])}).`;
  if (kept.length <= 6) return `Le quedan ${ctx.enum(kept)}.`;
  if (new Set(kept.map(ctx.roomOf)).size === 1) return `Le quedan ${kept.length} casillas, todas en ${ctx.room(kept[0])}.`;
  return `Le quedan ${kept.length} casillas: las tienes resaltadas en el plano.`;
}

/** Cierre de una explicación: qué casillas pierde k y cuáles le quedan. */
function outcome(ctx: Ctx, k: number, gone: number[], kept: number[]): string {
  const where = regionOf(ctx, gone, kept);
  if (where) return `Por eso ${ctx.name(k)} no puede estar ${where}. ${remaining(ctx, kept)}`;
  const rest = remaining(ctx, kept);
  return `Por eso, ${withPrep('a', ctx.p.cast[k])} ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
}

/** «F2·C4 y F5·C4», «la columna 4», «la Capilla»… para un puñado de casillas. */
function describeCells(ctx: Ctx, cells: number[]): string {
  if (cells.length <= 4) return ctx.enum(cells);
  const cols = [...new Set(cells.map(ctx.colOf))].map((c) => c + 1);
  const rows = [...new Set(cells.map(ctx.rowOf))].map((r) => r + 1);
  const rooms = [...new Set(cells.map(ctx.roomOf))];
  if (cols.length <= 2) return lineList('columna', cols);
  if (rows.length <= 2) return lineList('fila', rows);
  if (rooms.length <= 2) return joinY(rooms.map((R) => roomPhrase(ctx.p.rooms[R], '')));
  return `${cells.length} casillas`;
}

/** Por qué una casilla ya no vale para k: la fila o la columna de alguien colocado, que ya no vale para nadie u otra pista. */
function whyNot(ctx: Ctx, st: LState, k: number, q: number): { kind: 'row' | 'col' | 'nobody' | 'other'; j: number } {
  for (let j = 0; j < ctx.n; j++) {
    if (j === k || st.placed[j] < 0) continue;
    if (ctx.rowOf(st.placed[j]) === ctx.rowOf(q)) return { kind: 'row', j };
    if (ctx.colOf(st.placed[j]) === ctx.colOf(q)) return { kind: 'col', j };
  }
  for (let j = 0; j < ctx.n; j++) if (j !== k && st.placed[j] < 0 && st.cand[j][q]) return { kind: 'other', j: -1 };
  return { kind: 'nobody', j: -1 };
}

/** «F3·C2 está en la fila de Fiona, F5·C8 en la columna de Jengi y F9·C1 ya no vale para nadie». */
function whyNotText(ctx: Ctx, st: LState, k: number, qs: number[]): string {
  const byRow = new Map<number, number[]>();
  const byCol = new Map<number, number[]>();
  const nobody: number[] = [];
  const other: number[] = [];
  const add = (m: Map<number, number[]>, j: number, q: number) => (m.get(j) ?? m.set(j, []).get(j)!).push(q);
  for (const q of qs) {
    const w = whyNot(ctx, st, k, q);
    if (w.kind === 'row') add(byRow, w.j, q);
    else if (w.kind === 'col') add(byCol, w.j, q);
    else if (w.kind === 'nobody') nobody.push(q);
    else other.push(q);
  }
  const are = (l: number[]) => (l.length === 1 ? 'está' : 'están');
  if (qs.length > 8) {
    const inLine = [...byRow.values(), ...byCol.values()].reduce((a, l) => a + l.length, 0);
    const parts: string[] = [];
    if (inLine) parts.push(`${inLine} ${inLine === 1 ? 'está en una fila o columna que ya tiene' : 'están en filas o columnas que ya tienen'} a alguien`);
    if (nobody.length) parts.push(`${nobody.length} ya no ${nobody.length === 1 ? 'vale' : 'valen'} para nadie`);
    if (other.length) parts.push(`${other.length} ${other.length === 1 ? 'la' : 'las'} descartan otras pistas`);
    return joinY(parts);
  }
  const parts: string[] = [];
  for (const [j, l] of byRow) parts.push(`${ctx.enum(l)} ${are(l)} en la fila ${ctx.de(j)}`);
  for (const [j, l] of byCol) parts.push(`${ctx.enum(l)} ${are(l)} en la columna ${ctx.de(j)}`);
  if (nobody.length) parts.push(`${ctx.enum(nobody)} ya no ${nobody.length === 1 ? 'vale' : 'valen'} para nadie`);
  if (other.length) parts.push(`${ctx.enum(other)} ${other.length === 1 ? 'la' : 'las'} descartan otras pistas`);
  return joinY(parts);
}

function certainRoom(ctx: Ctx, st: LState, j: number): number {
  let room = -1;
  const a = st.cand[j];
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    const R = ctx.roomOf(i);
    if (room === -1) room = R;
    else if (room !== R) return -1;
  }
  return room;
}

/** ¿Puede j estar en la habitación R sin chocar con la casilla `ex` (misma fila/columna)? */
function possibleIn(ctx: Ctx, st: LState, j: number, R: number, ex: number, cond?: (q: number) => boolean): boolean {
  const a = st.cand[j];
  for (const q of ctx.g.roomCells[R]) {
    if (!a[q]) continue;
    if (ex >= 0 && (q === ex || ctx.rowOf(q) === ctx.rowOf(ex) || ctx.colOf(q) === ctx.colOf(ex))) continue;
    if (cond && !cond(q)) continue;
    return true;
  }
  return false;
}

/** Contradicción evidente en el estado: devuelve la explicación o null. */
export function contradiction(c: Ctx | Puzzle, st: LState): string | null {
  const ctx = 'rels' in c ? c : makeCtx(c);
  const { n, s } = ctx;
  for (let k = 0; k < n; k++) if (count(st.cand[k]) === 0) return `${ctx.name(k)} no tendría ninguna casilla posible`;
  const rowsTaken = new Uint8Array(s), colsTaken = new Uint8Array(s);
  for (let k = 0; k < n; k++) {
    const i = st.placed[k];
    if (i < 0) continue;
    if (rowsTaken[ctx.rowOf(i)] || colsTaken[ctx.colOf(i)]) return 'habría dos personas en la misma fila o columna';
    rowsTaken[ctx.rowOf(i)] = 1;
    colsTaken[ctx.colOf(i)] = 1;
  }
  for (let r = 0; r < s; r++) {
    if (rowsTaken[r]) continue;
    let any = false;
    for (let k = 0; k < n && !any; k++) {
      if (st.placed[k] >= 0) continue;
      for (let c2 = 0; c2 < s; c2++) if (st.cand[k][r * s + c2]) { any = true; break; }
    }
    if (!any) return `nadie podría estar en la fila ${r + 1}`;
  }
  for (let c2 = 0; c2 < s; c2++) {
    if (colsTaken[c2]) continue;
    let any = false;
    for (let k = 0; k < n && !any; k++) {
      if (st.placed[k] >= 0) continue;
      for (let r = 0; r < s; r++) if (st.cand[k][r * s + c2]) { any = true; break; }
    }
    if (!any) return `nadie podría estar en la columna ${c2 + 1}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Técnicas
// ---------------------------------------------------------------------------

function techSingle(ctx: Ctx, st: LState): Deduction | null {
  for (let k = 0; k < ctx.n; k++) {
    if (st.placed[k] >= 0) continue;
    const l = list(st.cand[k]);
    if (l.length !== 1) continue;
    const i = l[0];
    const ch = ctx.p.cast[k];
    // Casillas que cumplen su propia pista y por qué ya no vale ninguna menos una.
    const own = unaryDomain(ctx.p, k);
    const hasClue = ch.clues.some((c) => isUnary(c) || c.t === 'onlyOn');
    const clueQ = quote(clueText(ctx.p, ch));
    const at = `${ctx.label(i)} (${ctx.room(i)})`;
    let text: string;
    let nudge: string;
    if (own.length === 1) {
      text = `${ctx.Name(k)} solo puede estar en ${at}: es la única casilla del plano que cumple su pista, ${clueQ}.`;
      nudge = `Lee la pista ${ctx.de(k)}: ${clueQ}. ¿Cuántas casillas del plano la cumplen?`;
    } else {
      const gone = own.filter((q) => q !== i);
      const start = hasClue
        ? `Por su pista (${clueQ}), ${ctx.name(k)} podía estar en ${own.length <= 6 ? ctx.enum(own, true) : `${own.length} casillas`}`
        : `En principio, ${ctx.name(k)} podía estar en cualquier casilla libre`;
      text = `${start}, pero ${whyNotText(ctx, st, k, gone)}. Solo le queda ${at}, así que está ahí.`;
      nudge = hasClue
        ? `Mira las casillas que cumplen la pista ${ctx.de(k)}. ¿Cuántas no están en una fila o columna ya ocupada?`
        : `Fíjate en ${ctx.name(k)}: ¿cuántas casillas le quedan que no estén en una fila o columna ocupada?`;
    }
    return {
      tech: 'single', level: TECH_LEVEL.single, place: { k, i }, elim: [],
      text, nudge,
      focus: { ...emptyFocus(), cells: [i], chars: [ch.id] },
    };
  }
  return null;
}

function techLineSingle(ctx: Ctx, st: LState, axis: 'row' | 'col'): Deduction | null {
  const { s, n } = ctx;
  const taken = new Uint8Array(s);
  for (let k = 0; k < n; k++) if (st.placed[k] >= 0) taken[axis === 'row' ? ctx.rowOf(st.placed[k]) : ctx.colOf(st.placed[k])] = 1;
  const word = axis === 'row' ? 'fila' : 'columna';
  for (let line = 0; line < s; line++) {
    if (taken[line]) continue;
    const who: number[] = [];
    for (let k = 0; k < n; k++) {
      if (st.placed[k] >= 0) continue;
      for (let x = 0; x < s; x++) {
        const i = axis === 'row' ? line * s + x : x * s + line;
        if (st.cand[k][i]) { who.push(k); break; }
      }
    }
    if (who.length !== 1) continue;
    const k = who[0];
    const elim: [number, number][] = [];
    const keep: number[] = [];
    for (const i of list(st.cand[k])) {
      const inLine = axis === 'row' ? ctx.rowOf(i) === line : ctx.colOf(i) === line;
      if (inLine) keep.push(i);
      else elim.push([k, i]);
    }
    if (!elim.length) continue;
    const ch = ctx.p.cast[k];
    const focus: Focus = { ...emptyFocus(), chars: [ch.id], cells: keep };
    if (axis === 'row') focus.rows = [line]; else focus.cols = [line];
    const why = `En la ${word} ${line + 1} tiene que haber una persona, porque hay una en cada ${word}. De las que faltan por colocar, ${ctx.name(k)} es la única que puede estar en ella: las demás tienen todas sus casillas posibles en otras ${word}s.`;
    const nudge = `¿Quién puede estar en la ${word} ${line + 1}? Mira sus casillas libres y las opciones de cada uno.`;
    if (keep.length === 1) {
      return {
        tech: axis === 'row' ? 'rowSingle' : 'colSingle', level: 1, place: { k, i: keep[0] }, elim,
        text: `${why} Y en esa ${word} solo le queda ${ctx.label(keep[0])} (${ctx.room(keep[0])}).`,
        nudge,
        focus,
      };
    }
    return {
      tech: axis === 'row' ? 'rowSingle' : 'colSingle', level: 1, elim,
      text: `${why} Así que ${ctx.name(k)} está en la ${word} ${line + 1} (${keep.length <= 6 ? `en ${ctx.enum(keep, true)}` : 'en una de sus casillas resaltadas'}) y en ninguna otra.`,
      nudge,
      focus,
    };
  }
  return null;
}

function techCellForced(ctx: Ctx, st: LState, axis: 'row' | 'col'): Deduction | null {
  const { s, n } = ctx;
  const taken = new Uint8Array(s);
  for (let k = 0; k < n; k++) if (st.placed[k] >= 0) taken[axis === 'row' ? ctx.rowOf(st.placed[k]) : ctx.colOf(st.placed[k])] = 1;
  const word = axis === 'row' ? 'fila' : 'columna';
  const other = axis === 'row' ? 'columna' : 'fila';
  for (let line = 0; line < s; line++) {
    if (taken[line]) continue;
    const cells = new Set<number>();
    for (let k = 0; k < n; k++) {
      if (st.placed[k] >= 0) continue;
      for (let x = 0; x < s; x++) {
        const i = axis === 'row' ? line * s + x : x * s + line;
        if (st.cand[k][i]) cells.add(i);
      }
    }
    if (cells.size !== 1) continue;
    const i = [...cells][0];
    const who: number[] = [];
    for (let k = 0; k < n; k++) if (st.placed[k] < 0 && st.cand[k][i]) who.push(k);
    const why = `En la ${word} ${line + 1} tiene que haber una persona, pero solo queda una casilla de esa ${word} donde pueda estar alguien: ${ctx.label(i)}. Las demás tienen objetos en los que no se puede estar, ya no valen para nadie o caen en ${other}s que ya tienen a alguien.`;
    const nudge = `La ${word} ${line + 1} necesita a alguien. ¿En cuántas de sus casillas puede estar una persona?`;
    if (who.length === 1) {
      const k = who[0];
      return {
        tech: axis === 'row' ? 'cellForcedRow' : 'cellForcedCol', level: 2, place: { k, i }, elim: [],
        text: `${why} Y la única persona que puede ocupar ${ctx.label(i)} es ${ctx.name(k)}.`,
        nudge,
        focus: { ...emptyFocus(), cells: [i], chars: [ctx.p.cast[k].id], ...(axis === 'row' ? { rows: [line] } : { cols: [line] }) },
      };
    }
    // Alguien está en i: nadie más en la otra línea que pasa por i.
    const elim: [number, number][] = [];
    const cross = axis === 'row' ? ctx.colOf(i) : ctx.rowOf(i);
    for (let k = 0; k < n; k++) {
      if (st.placed[k] >= 0) continue;
      for (let x = 0; x < s; x++) {
        const q = axis === 'row' ? x * s + cross : cross * s + x;
        if (q !== i && st.cand[k][q]) elim.push([k, q]);
      }
    }
    if (!elim.length) continue;
    return {
      tech: axis === 'row' ? 'cellForcedRow' : 'cellForcedCol', level: 2, elim,
      text: `${why} Así que ahí hay alguien, aunque aún no sepamos quién, y esa persona ocupa también la ${other} ${cross + 1}: nadie más puede estar en esa ${other}.`,
      nudge,
      focus: { ...emptyFocus(), cells: [i], ...(axis === 'row' ? { rows: [line], cols: [cross] } : { cols: [line], rows: [cross] }) },
    };
  }
  return null;
}

function techPointing(ctx: Ctx, st: LState): Deduction | null {
  const { s, n } = ctx;
  let best: Deduction | null = null;
  for (let k = 0; k < n; k++) {
    if (st.placed[k] >= 0) continue;
    const C = list(st.cand[k]);
    if (C.length < 2 || C.length > 2 * s) continue;
    const elim: [number, number][] = [];
    const hit = new Set<number>();
    for (let q = 0; q < s * s; q++) {
      if (st.cand[k][q]) continue;
      const rq = ctx.rowOf(q), cq = ctx.colOf(q);
      let all = true;
      for (const i of C) if (ctx.rowOf(i) !== rq && ctx.colOf(i) !== cq) { all = false; break; }
      if (!all) continue;
      for (let j = 0; j < n; j++) {
        if (j === k || st.placed[j] >= 0) continue;
        if (st.cand[j][q]) { elim.push([j, q]); hit.add(q); }
      }
    }
    if (!elim.length) continue;
    const rows = new Set(C.map(ctx.rowOf));
    const cols = new Set(C.map(ctx.colOf));
    const ch = ctx.p.cast[k];
    let text: string;
    const focus: Focus = { ...emptyFocus(), chars: [ch.id], cells: C };
    const opts = C.length <= 6 ? `${ctx.Name(k)} solo puede estar en ${ctx.enum(C, true)}` : `${ctx.Name(k)} tiene ${C.length} casillas posibles`;
    if (rows.size === 1) {
      const r = [...rows][0];
      text = `${opts}, y todas están en la fila ${r + 1}. Esa fila será suya, así que nadie más puede estar en ella.`;
      focus.rows = [r];
    } else if (cols.size === 1) {
      const c = [...cols][0];
      text = `${opts}, y todas están en la columna ${c + 1}. Esa columna será suya, así que nadie más puede estar en ella.`;
      focus.cols = [c];
    } else {
      text = `${opts}. Esté en la que esté, compartirá fila o columna con ${ctx.cells([...hit])}, así que ahí no puede haber nadie más.`;
    }
    const d: Deduction = { tech: 'pointing', level: 2, elim, text, nudge: `Mira dónde puede estar ${ctx.name(k)}. ¿Qué tienen en común esas casillas?`, focus };
    if (!best || d.elim.length > best.elim.length) best = d;
  }
  return best;
}

function conflicts(ctx: Ctx, i: number, q: number) {
  return i === q || ctx.rowOf(i) === ctx.rowOf(q) || ctx.colOf(i) === ctx.colOf(q);
}

const OPPOSITE: Record<string, string> = { N: 'S', S: 'N', E: 'W', W: 'E', NE: 'SW', SW: 'NE', NW: 'SE', SE: 'NW' };

/**
 * Qué exige una pista de relación a `me` según dónde puede estar `other` (O: sus casillas posibles).
 * `meOwns`: la pista es de `me` («me está al este de other»); si no, es de `other` («other está al este de me»).
 */
function relRule(ctx: Ctx, clue: Clue, me: number, other: number, meOwns: boolean, O: number[]): string {
  const Me = ctx.Name(me), oth = ctx.name(other);
  const lead = meOwns ? 'Para cumplirla' : 'Para que se cumpla';
  const oRows = O.map(ctx.rowOf), oCols = O.map(ctx.colOf);
  const minR = Math.min(...oRows), maxR = Math.max(...oRows), minC = Math.min(...oCols), maxC = Math.max(...oCols);
  switch (clue.t) {
    case 'dir': {
      // Dirección de me respecto a other.
      const d = meOwns ? clue.dir : OPPOSITE[clue.dir];
      const vert = d.includes('N') ? 'más arriba' : d.includes('S') ? 'más abajo' : '';
      const horiz = d.includes('E') ? 'más a la derecha' : d.includes('W') ? 'más a la izquierda' : '';
      const bound: string[] = [];
      if (d.includes('N')) bound.push(maxR > 0 ? `de la fila ${maxR} hacia arriba` : '');
      if (d.includes('S')) bound.push(`de la fila ${minR + 2} hacia abajo`);
      if (d.includes('E')) bound.push(`de la columna ${minC + 2} hacia la derecha`);
      if (d.includes('W')) bound.push(maxC > 0 ? `de la columna ${maxC} hacia la izquierda` : '');
      const how = joinY([vert, horiz].filter(Boolean));
      const where = d.length === 1 ? `en una ${vert ? 'fila' : 'columna'} ${how} que ${oth}` : `${how} que ${oth}`;
      const b = bound.filter(Boolean);
      return `${lead}, ${ctx.name(me)} tiene que estar ${where}${b.length ? `: ${joinY(b)}` : ''}.`;
    }
    case 'offset': {
      const d = meOwns ? clue.dir : OPPOSITE[clue.dir];
      const shift = d === 'E' ? clue.n : d === 'W' ? -clue.n : d === 'S' ? clue.n : -clue.n;
      const word = clue.axis === 'row' ? 'fila' : 'columna';
      const side = d === 'E' ? 'a la derecha' : d === 'W' ? 'a la izquierda' : d === 'S' ? 'por debajo' : 'por encima';
      const base = clue.axis === 'row' ? oRows : oCols;
      const ok = [...new Set(base.map((x) => x + shift))].filter((x) => x >= 0 && x < ctx.s).map((x) => x + 1);
      const at = ok.length ? `: en ${lineList(word, ok, true)}` : '';
      return `${lead}, ${ctx.name(me)} tiene que estar exactamente ${numF(clue.n)} ${word}${clue.n === 1 ? '' : 's'} ${side} ${ctx.de(other)}${at}.`;
    }
    case 'sameRoom':
    case 'aloneWith': {
      const rooms = [...new Set(O.map(ctx.roomOf))].map((R) => roomPhrase(ctx.p.rooms[R], ''));
      const at = rooms.length <= 3 ? `, así que solo puede estar en ${rooms.length === 1 ? rooms[0] : `${rooms.slice(0, -1).join(', ')} o ${rooms[rooms.length - 1]}`}` : '';
      return `${Me} tiene que estar en la misma habitación que ${oth}${at}.`;
    }
    case 'notSameRoom': {
      const rooms = [...new Set(O.map(ctx.roomOf))];
      const at = rooms.length === 1 ? `, así que no puede estar en ${roomPhrase(ctx.p.rooms[rooms[0]], '')}` : '';
      return `${Me} no puede estar en la misma habitación que ${oth}${at}.`;
    }
    case 'adjacentTo':
      return `${Me} tiene que estar en una casilla pegada a la ${ctx.de(other)}: justo encima, debajo o a un lado, y en la misma habitación.`;
    case 'diagonal':
      return `${Me} tiene que estar en una de las diagonales que pasan por la casilla ${ctx.de(other)}.`;
    default:
      return '';
  }
}

function techRelation(ctx: Ctx, st: LState): Deduction | null {
  const { p, g } = ctx;
  for (const rel of ctx.rels) {
    for (const side of [0, 1] as const) {
      const me = side === 0 ? rel.a : rel.b;
      const other = side === 0 ? rel.b : rel.a;
      const C = list(st.cand[me]);
      const O = list(st.cand[other]);
      const elim: [number, number][] = [];
      for (const i of C) {
        let ok = false;
        for (const q of O) {
          if (conflicts(ctx, i, q)) continue;
          const holds = side === 0 ? pairOk(p, g, rel.clue, i, q) : pairOk(p, g, rel.clue, q, i);
          if (holds) { ok = true; break; }
        }
        if (!ok) elim.push([me, i]);
      }
      if (!elim.length) continue;
      const owner = p.cast[rel.a];
      const ct = quote(oneClue(p, rel.a, rel.clue));
      const elimCells = elim.map(([, q]) => q);
      const keep = C.filter((i) => !elimCells.includes(i));
      // ¿Ha pesado que no pueden compartir fila ni columna? (sin esa regla habría menos descartes)
      const loose = C.filter((i) => !O.some((q) => i !== q && (side === 0 ? pairOk(p, g, rel.clue, i, q) : pairOk(p, g, rel.clue, q, i)))).length;
      const lineNote = loose < elimCells.length ? ` Además, no puede compartir fila ni columna con ${ctx.name(other)}.` : '';
      const where = `${ctx.Name(other)} ${whereIs(ctx, st, other)}.`;
      const rule = relRule(ctx, rel.clue, me, other, side === 0, O);
      const text = `Pista ${withPrep('de', owner)}: ${ct}. ${where} ${rule}${lineNote} ${outcome(ctx, me, elimCells, keep)}`;
      const nudge = st.placed[other] >= 0
        ? `${ctx.Name(other)} ya está en ${ctx.label(st.placed[other])} y la pista ${withPrep('de', owner)} dice ${ct}. ¿Dónde puede estar ${ctx.name(me)}?`
        : `La pista ${withPrep('de', owner)} dice ${ct}. Con las casillas que le quedan ${withPrep('a', p.cast[other])}, ¿dónde puede estar ${ctx.name(me)}?`;
      return {
        tech: 'relation', level: 2, elim, text, nudge,
        focus: { ...emptyFocus(), chars: [p.cast[me].id, p.cast[other].id], cells: keep },
      };
    }
  }
  return null;
}

function techRoom(ctx: Ctx, st: LState): Deduction | null {
  const { p, g, n } = ctx;
  const idx = castIndex(p);
  const roomName = (R: number) => roomPhrase(p.rooms[R], '');
  const mk = (k: number, elim: [number, number][], text: string, rooms: number[], extraChars: number[] = []): Deduction => ({
    tech: 'room', level: 3, elim, text,
    nudge: p.cast[k].victim
      ? `${ctx.Name(k)} estaba a solas con el asesino. ¿En qué habitaciones puede pasar eso con lo que ya sabes?`
      : `La pista ${ctx.de(k)} habla de quién está en su habitación. ¿En qué habitaciones puede cumplirse?`,
    focus: { ...emptyFocus(), chars: [k, ...extraChars].map((j) => p.cast[j].id), rooms },
  });
  const certainIn = (j: number, R: number) => certainRoom(ctx, st, j) === R;

  for (const { k, clue } of ctx.roomClues) {
    const ch = p.cast[k];
    const C = list(st.cand[k]);
    const kRoom = certainRoom(ctx, st, k);
    const ctext = ch.victim ? `${ctx.Name(k)} es la víctima y estaba a solas con el asesino` : `Pista ${withPrep('de', ch)}: ${quote(clueText(p, ch))}`;

    // Condición que debe cumplir "otra persona" en la habitación (si aplica).
    let need: ((j: number, q: number) => boolean) | null = null;
    let needDesc = '';
    switch (clue.t) {
      case 'notAlone': need = () => true; needDesc = 'nadie más'; break;
      case 'withGender': need = (j) => p.cast[j].gender === clue.g; needDesc = clue.g === 'f' ? 'ninguna mujer' : 'ningún hombre'; break;
      case 'withSomeoneOn': {
        const o = p.objects[clue.obj];
        const pose = o.pose === 'sit' ? 'sentado en ' : o.pose === 'lie' ? 'tumbado en ' : o.pose === 'ride' ? 'montado en ' : o.pose === 'on' ? 'sobre ' : 'en ';
        need = (_j, q) => cellHas(p, q, clue.obj); needDesc = `nadie ${pose}${objIndef(o)}`; break;
      }
      case 'withSomeoneBeside': {
        const o = p.objects[clue.obj];
        const near = o.unique && !o.fem ? `al ${o.name}` : `a ${objIndef(o)}`;
        need = (_j, q) => besideGroups(p, g, q, clue.obj).size > 0; needDesc = `nadie junto ${near}`; break;
      }
      case 'victim': need = () => true; needDesc = 'nadie más'; break;
      default: break;
    }

    // 1) Casillas de k imposibles por ocupación de la habitación.
    const elim: [number, number][] = [];
    const reasons = new Set<string>();
    for (const i of C) {
      const R = ctx.roomOf(i);
      const certainOthers = [] as number[];
      for (let j = 0; j < n; j++) if (j !== k && certainIn(j, R)) certainOthers.push(j);
      let bad = false;
      switch (clue.t) {
        case 'alone':
          if (certainOthers.length) { bad = true; reasons.add(`${ctx.name(certainOthers[0])} está ${ctx.sure(certainOthers[0])} en ${roomName(R)}`); }
          break;
        case 'aloneWith': {
          const o = idx[clue.of];
          const third = certainOthers.filter((j) => j !== o);
          if (third.length) { bad = true; reasons.add(`${ctx.name(third[0])} está ${ctx.sure(third[0])} en ${roomName(R)}`); }
          break;
        }
        case 'victim': {
          if (certainOthers.length >= 2) { bad = true; reasons.add(`en ${roomName(R)} ya hay dos personas seguro`); break; }
          let any = false;
          for (let j = 0; j < n && !any; j++) if (j !== k && possibleIn(ctx, st, j, R, i)) any = true;
          if (!any) { bad = true; reasons.add(`nadie podría estar con la víctima en ${roomName(R)}`); }
          break;
        }
        case 'roomCount': {
          const want = clue.n - 1;
          let possible = 0;
          for (let j = 0; j < n; j++) if (j !== k && possibleIn(ctx, st, j, R, i)) possible++;
          if (certainOthers.length > want) { bad = true; reasons.add(`en ${roomName(R)} habría demasiada gente`); }
          else if (possible < want) { bad = true; reasons.add(`en ${roomName(R)} no cabría tanta gente`); }
          break;
        }
        case 'notAlone': case 'withGender': case 'withSomeoneOn': case 'withSomeoneBeside': {
          let any = false;
          for (let j = 0; j < n && !any; j++) if (j !== k && possibleIn(ctx, st, j, R, i, (q) => need!(j, q))) any = true;
          if (!any) { bad = true; reasons.add(`en ${roomName(R)} no podría haber ${needDesc}`); }
          break;
        }
        case 'someoneAtOffset': {
          let any = false;
          const ri = ctx.rowOf(i), ci = ctx.colOf(i);
          for (let j = 0; j < n && !any; j++) {
            if (j === k) continue;
            for (const q of list(st.cand[j])) {
              if (conflicts(ctx, i, q)) continue;
              if (offsetOk(clue.axis, clue.n, clue.dir, ctx.rowOf(q), ctx.colOf(q), ri, ci) && (!clue.cond || unaryOk(p, g, clue.cond, q)) && (!clue.g || p.cast[j].gender === clue.g)) { any = true; break; }
            }
          }
          if (!any) {
            bad = true;
            // Dónde puede estar ese «alguien»: casillas que cumplen la condición y en las que aún cabe otra persona.
            const targets = [...new Set(Array.from({ length: n }, (_, j) => j).filter((j) => j !== k && (!clue.g || p.cast[j].gender === clue.g))
              .flatMap((j) => list(st.cand[j])).filter((q) => !clue.cond || unaryOk(p, g, clue.cond, q)))].sort((a, b) => a - b);
            reasons.add(targets.length
              ? `ese «alguien» solo puede estar en ${describeCells(ctx, targets)}, que es donde se cumple y aún cabe una persona`
              : 'nadie podría estar donde indica su pista');
          }
          break;
        }
        default: break;
      }
      if (bad) elim.push([k, i]);
    }
    if (elim.length) {
      const elimCells = elim.map(([, i]) => i);
      const rooms = [...new Set(elimCells.map((i) => ctx.roomOf(i)))];
      const keepCells = C.filter((i) => !elimCells.includes(i));
      const keepRooms = [...new Set(keepCells.map((i) => ctx.roomOf(i)))];
      let text: string;
      if (reasons.size > 2 && keepRooms.length && keepRooms.length <= 3) {
        const where = keepRooms.map((R) => roomName(R)).join(' o ');
        text = `${ctext}. Si miras habitación por habitación, eso solo es posible si ${ctx.name(k)} está en ${where}: en las demás, ${[...reasons].slice(0, 2).join('; ')}${reasons.size > 2 ? '…' : '.'} ${remaining(ctx, keepCells)}`;
      } else {
        const rs = [...reasons];
        text = `${ctext}. Pero ${rs.slice(0, 3).join('; ')}${rs.length > 3 ? '…' : ''}. ${outcome(ctx, k, elimCells, keepCells)}`;
      }
      return mk(k, elim, text, rooms);
    }

    // 2) Efectos sobre los demás cuando k está seguro en una habitación.
    if (kRoom < 0) continue;
    const R = kRoom;
    const others = Array.from({ length: n }, (_, j) => j).filter((j) => j !== k);
    const pk = st.placed[k];
    const exclude = (j: number) => {
      const out: [number, number][] = [];
      for (const q of g.roomCells[R]) if (st.cand[j][q]) out.push([j, q]);
      return out;
    };
    const restrict = (j: number, cond?: (q: number) => boolean) => {
      const out: [number, number][] = [];
      for (const q of list(st.cand[j])) if (ctx.roomOf(q) !== R || (cond && !cond(q))) out.push([j, q]);
      return out;
    };
    switch (clue.t) {
      case 'alone': {
        const e = others.flatMap(exclude);
        if (e.length) return mk(k, e, `${ctext}. ${ctx.Name(k)} está ${ctx.sure(k)} en ${roomName(R)}, así que nadie más puede estar ahí.`, [R]);
        break;
      }
      case 'aloneWith': {
        const o = idx[clue.of];
        const e = others.filter((j) => j !== o).flatMap(exclude);
        if (e.length) return mk(k, e, `${ctext}. Están en ${roomName(R)}, así que nadie más puede estar ahí.`, [R], [o]);
        break;
      }
      case 'victim': {
        const certain = others.filter((j) => certainIn(j, R));
        if (certain.length === 1) {
          const e = others.filter((j) => j !== certain[0]).flatMap(exclude);
          if (e.length) return mk(k, e, `La víctima (${ctx.name(k)}) estaba a solas con el asesino en ${roomName(R)}. ${ctx.Name(certain[0])} está ${ctx.sure(certain[0])} en ${roomName(R)}, así que nadie más pudo estar ahí.`, [R], [certain[0]]);
        }
        const possible = others.filter((j) => possibleIn(ctx, st, j, R, pk));
        if (possible.length === 1) {
          const e = restrict(possible[0]);
          if (e.length) return mk(k, e, `La víctima (${ctx.name(k)}) está en ${roomName(R)} y alguien tuvo que estar a solas con ella. La única persona que puede estar en ${roomName(R)} es ${ctx.name(possible[0])}.`, [R], [possible[0]]);
        }
        break;
      }
      case 'roomCount': {
        const want = clue.n - 1;
        const certain = others.filter((j) => certainIn(j, R));
        if (certain.length === want) {
          const e = others.filter((j) => !certain.includes(j)).flatMap(exclude);
          if (e.length) return mk(k, e, `${ctext}. En ${roomName(R)} ya están las ${numF(clue.n)} personas, así que nadie más puede estar ahí.`, [R]);
        }
        const possible = others.filter((j) => possibleIn(ctx, st, j, R, pk));
        if (possible.length === want) {
          const e = possible.flatMap((j) => restrict(j));
          if (e.length) return mk(k, e, `${ctext}. Solo ${want === 1 ? 'una persona puede' : `${numF(want)} personas pueden`} estar con ${ctx.name(k)} en ${roomName(R)}, así que ${want === 1 ? 'tiene' : 'tienen'} que estar ahí.`, [R], possible);
        }
        break;
      }
      case 'notAlone': case 'withGender': case 'withSomeoneOn': case 'withSomeoneBeside': {
        const possible = others.filter((j) => possibleIn(ctx, st, j, R, pk, (q) => need!(j, q)));
        if (possible.length === 1) {
          const j = possible[0];
          const e = restrict(j, (q) => need!(j, q));
          if (e.length) return mk(k, e, `${ctext}. ${ctx.Name(k)} está en ${roomName(R)} y la única persona que puede cumplir esa condición ahí es ${ctx.name(j)}.`, [R], [j]);
        }
        break;
      }
      case 'someoneAtOffset': {
        if (pk < 0) break;
        const ri = ctx.rowOf(pk), ci = ctx.colOf(pk);
        const match = (q: number) => offsetOk(clue.axis, clue.n, clue.dir, ctx.rowOf(q), ctx.colOf(q), ri, ci) && (!clue.cond || unaryOk(p, g, clue.cond, q));
        const possible = others.filter((j) => (!clue.g || p.cast[j].gender === clue.g) && list(st.cand[j]).some((q) => match(q) && !conflicts(ctx, pk, q)));
        if (possible.length === 1) {
          const j = possible[0];
          const e: [number, number][] = list(st.cand[j]).filter((q) => !match(q)).map((q) => [j, q]);
          if (e.length) return mk(k, e, `${ctext}. Solo ${ctx.name(j)} puede ser esa persona.`, [], [j]);
        }
        break;
      }
      default: break;
    }
  }
  return null;
}

function combos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}

function techSubset(ctx: Ctx, st: LState, maxSize: number): Deduction | null {
  const { n, s } = ctx;
  const free = Array.from({ length: n }, (_, k) => k).filter((k) => st.placed[k] < 0);
  for (const axis of ['row', 'col'] as const) {
    const lineOf = axis === 'row' ? ctx.rowOf : ctx.colOf;
    const word = axis === 'row' ? 'filas' : 'columnas';
    const linesOf = (k: number) => new Set(list(st.cand[k]).map(lineOf));
    for (let size = 2; size <= maxSize; size++) {
      // Subconjunto "desnudo": size personajes confinados en size líneas.
      for (const group of combos(free, size)) {
        const lines = new Set<number>();
        for (const k of group) for (const l of linesOf(k)) lines.add(l);
        if (lines.size !== size) continue;
        const elim: [number, number][] = [];
        for (const j of free) {
          if (group.includes(j)) continue;
          for (const q of list(st.cand[j])) if (lines.has(lineOf(q))) elim.push([j, q]);
        }
        if (!elim.length) continue;
        const ls = [...lines].sort((a, b) => a - b).map((l) => l + 1);
        const names = group.map(ctx.name);
        const fem = group.every((k) => ctx.p.cast[k].gender === 'f');
        const each = group.map((k, j) => `${j === 0 ? ctx.Name(k) : ctx.name(k)} solo puede estar en ${lineList(word.slice(0, -1) as 'fila' | 'columna', [...linesOf(k)].map((l) => l + 1), true)}`);
        return {
          tech: 'subset', level: 4, elim,
          text: `${each.join('; ')}. Entre ${fem ? 'las' : 'los'} ${numF(size)} tienen que ocupar las ${word} ${seq(ls)}, una cada ${fem ? 'una' : 'uno'}, así que nadie más puede estar en ellas.`,
          nudge: `¿En qué ${word} pueden estar ${joinY(names)}? Compáralo con las demás personas.`,
          focus: { ...emptyFocus(), chars: group.map((k) => ctx.p.cast[k].id), ...(axis === 'row' ? { rows: [...lines] } : { cols: [...lines] }) },
        };
      }
      // Subconjunto "oculto": size líneas que solo pueden ocupar size personajes.
      const takenLines = new Set(free.length < n ? Array.from({ length: n }, (_, k) => k).filter((k) => st.placed[k] >= 0).map((k) => lineOf(st.placed[k])) : []);
      const openLines = Array.from({ length: s }, (_, l) => l).filter((l) => !takenLines.has(l));
      for (const lines of combos(openLines, size)) {
        const set = new Set(lines);
        const who = free.filter((k) => list(st.cand[k]).some((q) => set.has(lineOf(q))));
        if (who.length !== size) continue;
        const elim: [number, number][] = [];
        for (const k of who) for (const q of list(st.cand[k])) if (!set.has(lineOf(q))) elim.push([k, q]);
        if (!elim.length) continue;
        const names = who.map(ctx.name);
        const ls = lines.map((l) => l + 1);
        return {
          tech: 'subset', level: 4, elim,
          text: `En las ${word} ${ls.slice(0, -1).join(', ')} y ${ls[ls.length - 1]} tiene que haber ${numF(size)} personas, y solo ${names.slice(0, -1).join(', ')} y ${names[names.length - 1]} pueden estar en ellas. Por tanto, están en esas ${word} y en ninguna otra.`,
          nudge: `Fíjate en quién puede ocupar las ${word} ${ls.join(' y ')}.`,
          focus: { ...emptyFocus(), chars: who.map((k) => ctx.p.cast[k].id), ...(axis === 'row' ? { rows: lines } : { cols: lines }) },
        };
      }
    }
  }
  return null;
}

/** Técnicas sin suposiciones, en orden de dificultad. */
function basicDeduction(ctx: Ctx, st: LState, maxSubset = 4): Deduction | null {
  return (
    techSingle(ctx, st) ??
    techLineSingle(ctx, st, 'row') ??
    techLineSingle(ctx, st, 'col') ??
    techCellForced(ctx, st, 'row') ??
    techCellForced(ctx, st, 'col') ??
    techPointing(ctx, st) ??
    techRelation(ctx, st) ??
    techRoom(ctx, st) ??
    techSubset(ctx, st, maxSubset)
  );
}

/**
 * Propaga técnicas básicas hasta el punto fijo. Devuelve la contradicción encontrada (si la hay).
 * La cadena se limita a lo que una persona puede seguir de cabeza al suponer algo.
 */
export const TRIAL_CHAIN = 24;
function propagate(ctx: Ctx, st: LState, maxSteps = TRIAL_CHAIN): { contra: string | null; steps: Deduction[] } {
  const steps: Deduction[] = [];
  for (let it = 0; it < maxSteps; it++) {
    const c = contradiction(ctx, st);
    if (c) return { contra: c, steps };
    if (st.placed.every((x) => x >= 0)) return { contra: null, steps };
    const d = basicDeduction(ctx, st, 2);
    if (!d) return { contra: null, steps };
    for (const [k, i] of d.elim) st.cand[k][i] = 0;
    if (d.place) applyPlace(ctx, st, d.place.k, d.place.i);
    steps.push(d);
  }
  return { contra: contradiction(ctx, st), steps };
}

function techTrial(ctx: Ctx, st: LState, budget = 140, deadline = Infinity): Deduction | null {
  const free = Array.from({ length: ctx.n }, (_, k) => k)
    .filter((k) => st.placed[k] < 0)
    .sort((a, b) => count(st.cand[a]) - count(st.cand[b]));
  let tried = 0;
  for (const k of free) {
    for (const i of list(st.cand[k])) {
      if (++tried > budget || Date.now() > deadline) return null;
      const sim = cloneState(st);
      applyPlace(ctx, sim, k, i);
      const { contra, steps } = propagate(ctx, sim);
      if (!contra) continue;
      const chain = steps.filter((d) => d.place).slice(0, 4).map((d) => `${ctx.name(d.place!.k)} tendría que estar en ${ctx.label(d.place!.i)}`);
      const via = chain.length ? ` Entonces ${joinY(chain)}${steps.filter((d) => d.place).length > 4 ? '…' : ''}, y al final ${contra}.` : ` Entonces ${contra}.`;
      return {
        tech: 'trial', level: TECH_LEVEL.trial, elim: [[k, i]],
        text: `Supón que ${ctx.name(k)} estuviera en ${ctx.label(i)}: su fila y su columna quedarían ocupadas.${via} Como eso es imposible, ${ctx.name(k)} no está en ${ctx.label(i)}.`,
        nudge: `Prueba a poner ${withPrep('a', ctx.p.cast[k])} en ${ctx.label(i)} y sigue las consecuencias. ¿Qué falla?`,
        focus: { ...emptyFocus(), cells: [i], chars: [ctx.p.cast[k].id] },
      };
    }
  }
  return null;
}

export function nextDeduction(p: Puzzle, st: LState, allowTrial = true, trialBudget = 140): Deduction | null {
  const ctx = makeCtx(p);
  const d = basicDeduction(ctx, st) ?? (allowTrial ? techTrial(ctx, st, trialBudget) : null);
  return d && { ...d, text: tidy(d.text), nudge: d.nudge && tidy(d.nudge) };
}

/** Quita el punto doble que queda tras un nombre abreviado («…con Tommy H..»). */
const tidy = (t: string) => t.replace(/(?<!\.)\.\.(?!\.)/g, '.').replace(/…\./g, '…');

export interface LogicReport {
  solved: boolean;
  steps: Deduction[];
  stuckState?: LState;
  techCount: Record<TechId, number>;
  maxLevel: number;
  score: number;
  /** Comprobación de solidez: ninguna deducción eliminó la solución real. */
  sound: boolean;
}

/** Resuelve el puzzle "como un humano" y devuelve el recorrido completo. */
export function solveLogically(p: Puzzle, opts: { allowTrial?: boolean; maxSteps?: number; deadline?: number } = {}): LogicReport {
  const deadline = opts.deadline ?? Infinity;
  const ctx = makeCtx(p);
  const st = initialState(p);
  const steps: Deduction[] = [];
  const techCount = { single: 0, rowSingle: 0, colSingle: 0, cellForcedRow: 0, cellForcedCol: 0, pointing: 0, relation: 0, room: 0, subset: 0, trial: 0 } as Record<TechId, number>;
  const sol = p.cast.map((ch) => p.solution[ch.id]);
  let sound = sol.every((i, k) => st.cand[k][i] === 1);
  const maxSteps = opts.maxSteps ?? 400;
  for (let it = 0; it < maxSteps; it++) {
    if (st.placed.every((x) => x >= 0)) break;
    if (Date.now() > deadline) break;
    const d = basicDeduction(ctx, st) ?? (opts.allowTrial !== false ? techTrial(ctx, st, 140, deadline) : null);
    if (!d) break;
    for (const [k, i] of d.elim) {
      if (sol[k] === i) sound = false;
      st.cand[k][i] = 0;
    }
    if (d.place) {
      if (sol[d.place.k] !== d.place.i) sound = false;
      applyPlace(ctx, st, d.place.k, d.place.i);
    }
    steps.push(d);
    techCount[d.tech]++;
  }
  const solved = st.placed.every((x) => x >= 0);
  const maxLevel = steps.reduce((m, d) => Math.max(m, d.level), 0);
  const score = steps.reduce((acc, d) => acc + d.level * (d.place ? 1 : 0.6), 0);
  return { solved, steps, stuckState: solved ? undefined : st, techCount, maxLevel, score, sound };
}

export { makeCtx };
