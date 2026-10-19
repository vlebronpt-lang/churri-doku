import { besideGroups, cellHas, clueHolds, castIndex } from './clues';
import { geo } from './puzzle';
import type { Clue, Dir, Level, Puzzle, UnaryClue } from './types';

/** Pista candidata con metadatos para el generador. */
export interface Fact {
  clue: Clue[];
  /** Nivel mínimo en el que es apropiada. */
  minLevel: Level;
  /** Preferencia temática/naturalidad (más alto = mejor). */
  flavor: number;
  kind: string;
}

/**
 * Todas las pistas verdaderas razonables para el personaje k dada la solución `pos`.
 */
export function factsFor(p: Puzzle, k: number, pos: number[]): Fact[] {
  const g = geo(p);
  const s = p.size;
  const me = pos[k];
  const cell = p.cells[me];
  const r = cell.r, c = cell.c;
  const room = cell.room;
  const ch = p.cast[k];
  const idx = castIndex(p);
  const victimK = idx[p.victim];
  const out: Fact[] = [];
  const add = (clue: Clue[], minLevel: Level, flavor: number, kind: string) => {
    // Seguridad: la pista debe ser verdadera en la solución.
    for (const cl of clue) if (!clueHolds(p, cl, k, pos)) return;
    out.push({ clue, minLevel, flavor, kind });
  };
  const roomKey = p.rooms[room].key;
  const humans = p.cast.every((x) => !x.nonhuman);

  // --- Unarias ---
  add([{ t: 'inRoom', room: roomKey }], 1, 6, 'inRoom');
  const objsHere = [cell.obj, cell.floor].filter(Boolean) as string[];
  for (const o of objsHere) {
    add([{ t: 'on', obj: o }], 1, 7, 'on');
    const others = pos.filter((q, j) => j !== k && cellHas(p, q, o)).length;
    // «La única persona en X» solo aporta algo si hay más de un X en el plano.
    const instances = new Set(p.cells.filter((c) => c.obj === o || c.floor === o).map((c) => (c.obj === o ? c.objGroup : c.floorGroup)));
    if (others === 0 && instances.size > 1) add([{ t: 'onlyOn', obj: o }], 2, 6, 'onlyOn');
  }
  // Objetos de la misma habitación
  const roomObjs = new Set<string>();
  for (const q of g.roomCells[room]) {
    const x = p.cells[q];
    if (x.obj) roomObjs.add(x.obj);
    if (x.floor) roomObjs.add(x.floor);
  }
  for (const o of roomObjs) {
    const n = besideGroups(p, g, me, o).size;
    if (n > 0) {
      add([{ t: 'beside', obj: o }], 1, p.objects[o].unique ? 9 : 7, 'beside');
      if (n >= 2) add([{ t: 'besideN', obj: o, n }], 4, 3, 'besideN');
    } else if (!objsHere.includes(o)) {
      add([{ t: 'inRoom', room: roomKey }, { t: 'not', c: { t: 'beside', obj: o } }], 1, 5, 'inRoomNotBeside');
      add([{ t: 'not', c: { t: 'beside', obj: o } }], 4, 2, 'notBeside');
    }
  }
  // Objetos de cualquier tipo junto a la persona pero en el mismo cuarto ya cubiertos. "No sentado":
  for (const o of Object.keys(p.objects)) {
    const def = p.objects[o];
    if (def.occupiable && def.pose === 'sit' && !objsHere.includes(o)) {
      if (roomObjs.has(o)) add([{ t: 'inRoom', room: roomKey }, { t: 'not', c: { t: 'on', obj: o } }], 2, 4, 'inRoomNotOn');
    }
  }
  // Filas / columnas
  const ordFlavor = (x: number) => (x === 0 || x === s - 1 ? 4 : 2);
  add([{ t: 'row', rows: [r] }], 1, ordFlavor(r), 'row');
  add([{ t: 'col', cols: [c] }], 1, ordFlavor(c), 'col');
  if (r + 1 < s) add([{ t: 'row', rows: [r, r + 1] }], 3, 2, 'row2');
  if (r - 1 >= 0) add([{ t: 'row', rows: [r - 1, r] }], 3, 2, 'row2');
  if (c + 1 < s) add([{ t: 'col', cols: [c, c + 1] }], 3, 2, 'col2');
  if (c - 1 >= 0) add([{ t: 'col', cols: [c - 1, c] }], 3, 2, 'col2');
  if (g.corner[me]) add([{ t: 'corner' }], 2, 4, 'corner');
  if (g.corner[me]) add([{ t: 'inRoom', room: roomKey }, { t: 'corner' }], 2, 4, 'inRoomCorner');

  // --- Relaciones ---
  pos.forEach((q, j) => {
    if (j === k) return;
    const other = p.cast[j].id;
    const rq = Math.floor(q / s), cq = q % s;
    const sameRoom = p.cells[q].room === room;
    const vict = j === victimK;
    const dirs: Dir[] = [];
    if (r < rq) dirs.push('N');
    if (r > rq) dirs.push('S');
    if (c > cq) dirs.push('E');
    if (c < cq) dirs.push('W');
    const vp = vict ? 2 : 0;
    for (const d of dirs) add([{ t: 'dir', dir: d, of: other }], 1, 5 - vp, 'dir');
    const diag = (r < rq ? 'N' : 'S') + (c > cq ? 'E' : 'W');
    add([{ t: 'dir', dir: diag as Dir, of: other }], 3, 3 - vp / 2, 'dirDiag');
    const dr = Math.abs(r - rq), dc = Math.abs(c - cq);
    if (dr <= 3) add([{ t: 'offset', axis: 'row', n: dr, dir: r < rq ? 'N' : 'S', of: other }], dr === 1 ? 2 : 3, 3 - vp / 2, 'offset');
    if (dc <= 3) add([{ t: 'offset', axis: 'col', n: dc, dir: c > cq ? 'E' : 'W', of: other }], dc === 1 ? 2 : 3, 3 - vp / 2, 'offset');
    if (dr === dc) add([{ t: 'diagonal', of: other }], 3, 3 - vp / 2, 'diagonal');
    if (!vict) {
      if (sameRoom) add([{ t: 'sameRoom', of: other }], 2, 6, 'sameRoom');
      else add([{ t: 'notSameRoom', of: other }], 4, 2, 'notSameRoom');
      add([{ t: 'aloneWith', of: other }], 2, 7, 'aloneWith');
      add([{ t: 'adjacentTo', of: other }], 2, 5, 'adjacentTo');
    }
  });

  // --- Ocupación ---
  if (!ch.victim) {
    add([{ t: 'alone' }], 1, 7, 'alone');
    const companions = pos.filter((q, j) => j !== k && p.cells[q].room === room);
    const withVictim = pos.some((q, j) => j === victimK && j !== k && p.cells[q].room === room);
    if (!withVictim) {
      add([{ t: 'notAlone' }], 3, 4, 'notAlone');
      if (humans) {
        add([{ t: 'withGender', g: 'f' }], 2, 5, 'withGender');
        add([{ t: 'withGender', g: 'm' }], 2, 5, 'withGender');
      }
      if (companions.length >= 1) add([{ t: 'roomCount', n: companions.length + 1 }], 3, 3, 'roomCount');
      for (const o of Object.keys(p.objects)) {
        add([{ t: 'withSomeoneOn', obj: o }], 3, 4, 'withSomeoneOn');
        add([{ t: 'withSomeoneBeside', obj: o }], 4, 3, 'withSomeoneBeside');
      }
    }
    // "n filas al norte de ella, alguien estaba..."
    for (const axis of ['row', 'col'] as const) {
      for (let n = 1; n <= 3; n++) {
        for (const dir of (axis === 'row' ? ['N', 'S'] : ['E', 'W']) as ('N' | 'S' | 'E' | 'W')[]) {
          pos.forEach((q, j) => {
            if (j === k) return;
            const conds: UnaryClue[] = [];
            const cq = p.cells[q];
            if (cq.obj && p.objects[cq.obj].occupiable) conds.push({ t: 'on', obj: cq.obj });
            if (cq.floor) conds.push({ t: 'on', obj: cq.floor });
            for (const o of Object.keys(p.objects)) if (besideGroups(p, g, q, o).size) conds.push({ t: 'beside', obj: o });
            for (const cond of conds) add([{ t: 'someoneAtOffset', axis, n, dir, cond }], 4, 3, 'someoneAtOffset');
          });
        }
      }
    }
  }
  // Habitaciones vacías (testimonio)
  p.rooms.forEach((R) => {
    if (!pos.some((q) => p.cells[q].room === R.id)) add([{ t: 'roomEmpty', room: R.key }], 3, 2, 'roomEmpty');
  });

  // Quitar duplicados
  const seen = new Set<string>();
  return out.filter((f) => {
    const key = JSON.stringify(f.clue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
