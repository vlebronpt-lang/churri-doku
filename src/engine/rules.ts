import type { CaseRule, CharacterDef, Puzzle } from './types';

// Reglas del caso: valen para todo el reparto y se comprueban aquí tanto en la solución como en el motor.
// Este módulo no depende de clues.ts (clues.ts sí depende de él): el objeto de una casilla se mira a mano.

export const inGroup = (ch: CharacterDef, group: string) => !!ch.groups?.includes(group);

/** ¿La casilla i tiene el objeto `obj`? (lo que la regla entiende por «estar sobre él») */
export function onObject(p: Puzzle, i: number, obj: string): boolean {
  const c = p.cells[i];
  if (c.obj === obj) return true;
  return c.floor === obj && !(c.obj && p.objects[obj]?.pose === 'in');
}

/** La regla prohíbe a esta persona estar en esta casilla, sin mirar a nadie más. */
export function ruleForbids(p: Puzzle, rule: CaseRule, k: number, i: number): boolean {
  const room = p.cells[i].room;
  switch (rule.t) {
    case 'zoneOnly':
      return rule.rooms.some((rk) => p.roomByKey[rk] === room) && !inGroup(p.cast[k], rule.group);
    case 'zoneCount':
      return rule.n === 0 && p.roomByKey[rule.room] === room;
    case 'objCount':
      return rule.n === 0 && onObject(p, i, rule.obj);
    default:
      return false;
  }
}

export const anyRuleForbids = (p: Puzzle, k: number, i: number) => p.rules.some((r) => ruleForbids(p, r, k, i));

/** Cuántas personas hay en cada zona según las casillas ya colocadas (las negativas no cuentan). */
function roomCounts(p: Puzzle, pos: ArrayLike<number>): number[] {
  const out = new Array<number>(p.rooms.length).fill(0);
  for (let k = 0; k < p.cast.length; k++) if (pos[k] >= 0) out[p.cells[pos[k]].room]++;
  return out;
}

/** ¿La regla se cumple con todas las personas colocadas? */
export function ruleHolds(p: Puzzle, rule: CaseRule, pos: ArrayLike<number>): boolean {
  const n = p.cast.length;
  const counts = roomCounts(p, pos);
  switch (rule.t) {
    case 'zoneOnly':
    case 'zoneCount':
      if (rule.t === 'zoneCount') return counts[p.roomByKey[rule.room]] === rule.n;
      for (let k = 0; k < n; k++) if (ruleForbids(p, rule, k, pos[k])) return false;
      return true;
    case 'emptyZones':
      return counts.filter((c) => c === 0).length === rule.n;
    case 'objCount': {
      let c = 0;
      for (let k = 0; k < n; k++) if (onObject(p, pos[k], rule.obj)) c++;
      return c === rule.n;
    }
    case 'zoneHasGroup':
      return rule.rooms.every((rk) => {
        const R = p.roomByKey[rk];
        for (let k = 0; k < n; k++) if (p.cells[pos[k]].room === R && inGroup(p.cast[k], rule.group)) return true;
        return false;
      });
    case 'groupsApart':
      for (let a = 0; a < n; a++) {
        if (!inGroup(p.cast[a], rule.a)) continue;
        for (let b = 0; b < n; b++) if (inGroup(p.cast[b], rule.b) && p.cells[pos[a]].room === p.cells[pos[b]].room) return false;
      }
      return true;
    case 'noZoneWith':
      return !counts.some((c) => c === rule.n);
  }
}

export const rulesHold = (p: Puzzle, pos: ArrayLike<number>) => p.rules.every((r) => ruleHolds(p, r, pos));

/**
 * ¿Una colocación parcial ya incumple la regla seguro? (pos[k] < 0: sin colocar). Para podar la búsqueda: no tiene
 * por qué detectar todo, y `ruleHolds` lo remata al final.
 */
export function ruleBroken(p: Puzzle, rule: CaseRule, pos: ArrayLike<number>): boolean {
  const n = p.cast.length;
  const free = Array.from(pos).filter((x) => x < 0).length;
  const counts = roomCounts(p, pos);
  switch (rule.t) {
    case 'zoneOnly':
      return false; // ya descartado en los dominios
    case 'zoneCount': {
      const c = counts[p.roomByKey[rule.room]];
      return c > rule.n || c + free < rule.n;
    }
    case 'emptyZones': {
      const occupied = counts.filter((c) => c > 0).length;
      const empty = counts.length - occupied;
      return empty < rule.n || empty - free > rule.n;
    }
    case 'objCount': {
      let c = 0;
      for (let k = 0; k < n; k++) if (pos[k] >= 0 && onObject(p, pos[k], rule.obj)) c++;
      return c > rule.n || c + free < rule.n;
    }
    case 'zoneHasGroup': {
      let need = 0;
      for (const rk of rule.rooms) {
        const R = p.roomByKey[rk];
        let has = false;
        for (let k = 0; k < n; k++) if (pos[k] >= 0 && p.cells[pos[k]].room === R && inGroup(p.cast[k], rule.group)) has = true;
        if (!has) need++;
      }
      let left = 0;
      for (let k = 0; k < n; k++) if (pos[k] < 0 && inGroup(p.cast[k], rule.group)) left++;
      return need > left;
    }
    case 'groupsApart':
      for (let a = 0; a < n; a++) {
        if (pos[a] < 0 || !inGroup(p.cast[a], rule.a)) continue;
        for (let b = 0; b < n; b++) if (pos[b] >= 0 && inGroup(p.cast[b], rule.b) && p.cells[pos[a]].room === p.cells[pos[b]].room) return true;
      }
      return false;
    case 'noZoneWith':
      // Con todo colocado lo decide ruleHolds; a medias, una zona puede llenarse todavía.
      return free === 0 && counts.some((c) => c === rule.n);
  }
}

export const rulesBroken = (p: Puzzle, pos: ArrayLike<number>) => p.rules.some((r) => ruleBroken(p, r, pos));
