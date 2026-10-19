import { resolveObject } from './catalog';
import type { CellDef, ObjectDef, Puzzle, PuzzleInput, RoomDef } from './types';

/** Información geométrica precalculada de un puzzle. */
export interface Geo {
  size: number;
  n: number;
  /** Vecinos ortogonales en la misma habitación. */
  nbrSame: number[][];
  /** Muros alrededor de cada casilla: [N, E, S, W]. */
  walls: [boolean, boolean, boolean, boolean][];
  corner: boolean[];
  roomCells: number[][];
}

const geoCache = new WeakMap<Puzzle, Geo>();

export function geo(p: Puzzle): Geo {
  const hit = geoCache.get(p);
  if (hit) return hit;
  const s = p.size;
  const nbrSame: number[][] = [];
  const walls: [boolean, boolean, boolean, boolean][] = [];
  const corner: boolean[] = [];
  const roomCells: number[][] = p.rooms.map(() => []);
  for (const cell of p.cells) {
    const { r, c, room, i } = cell;
    roomCells[room].push(i);
    const N = r === 0 || p.cells[i - s].room !== room;
    const S = r === s - 1 || p.cells[i + s].room !== room;
    const W = c === 0 || p.cells[i - 1].room !== room;
    const E = c === s - 1 || p.cells[i + 1].room !== room;
    walls.push([N, E, S, W]);
    corner.push((N || S) && (E || W));
    const list: number[] = [];
    if (!N) list.push(i - s);
    if (!S) list.push(i + s);
    if (!W) list.push(i - 1);
    if (!E) list.push(i + 1);
    nbrSame.push(list);
  }
  const g: Geo = { size: s, n: s * s, nbrSame, walls, corner, roomCells };
  geoCache.set(p, g);
  return g;
}

function components(grid: string[], size: number, mergeable: (ch: string) => boolean): number[] {
  const ids = new Array<number>(size * size).fill(-1);
  let next = 0;
  for (let i = 0; i < size * size; i++) {
    const ch = grid[Math.floor(i / size)][i % size];
    if (ch === '.' || ids[i] !== -1) continue;
    const id = next++;
    if (!mergeable(ch)) {
      ids[i] = id;
      continue;
    }
    const stack = [i];
    ids[i] = id;
    while (stack.length) {
      const k = stack.pop()!;
      const r = Math.floor(k / size);
      const c = k % size;
      const cand: number[] = [];
      if (r > 0) cand.push(k - size);
      if (r < size - 1) cand.push(k + size);
      if (c > 0) cand.push(k - 1);
      if (c < size - 1) cand.push(k + 1);
      for (const q of cand) {
        if (ids[q] === -1 && grid[Math.floor(q / size)][q % size] === ch) {
          ids[q] = id;
          stack.push(q);
        }
      }
    }
  }
  return ids;
}

export function compilePuzzle(input: PuzzleInput, opts: { draft?: boolean } = {}): Puzzle {
  const s = input.size;
  const fail = (msg: string): never => {
    throw new Error(`[${input.id}] ${msg}`);
  };
  const checkGrid = (name: string, grid: string[] | undefined) => {
    if (!grid) return;
    if (grid.length !== s) fail(`${name}: se esperaban ${s} filas y hay ${grid.length}`);
    grid.forEach((row, r) => {
      if ([...row].length !== s) fail(`${name}: la fila ${r} tiene ${[...row].length} columnas (se esperaban ${s})`);
    });
  };
  checkGrid('layout', input.layout);
  checkGrid('objects', input.objects);
  checkGrid('floors', input.floors);

  // Habitaciones
  const roomKeys = Object.keys(input.rooms);
  const roomByKey: Record<string, number> = {};
  const rooms: RoomDef[] = roomKeys.map((key, id) => {
    roomByKey[key] = id;
    const r = input.rooms[key];
    return { id, key, name: r.name, article: r.article, color: r.color, floor: r.floor };
  });

  // Objetos
  const objects: Record<string, ObjectDef> = {};
  const letterToKey: Record<string, string> = {};
  for (const [letter, def] of Object.entries(input.legend)) {
    const obj = resolveObject(typeof def === 'string' ? def : def.key ?? def.base, def);
    const prev = objects[obj.key];
    if (prev && JSON.stringify(prev) !== JSON.stringify(obj)) fail(`La clave de objeto '${obj.key}' tiene dos definiciones distintas`);
    objects[obj.key] = obj;
    letterToKey[letter] = obj.key;
  }
  const objGrid = input.objects;
  const floorGrid = input.floors ?? Array.from({ length: s }, () => '.'.repeat(s));
  const isMergeable = (ch: string) => {
    const key = letterToKey[ch];
    if (!key) fail(`Letra '${ch}' sin definir en la leyenda`);
    return !!objects[key].mergeable;
  };
  const objGroups = components(objGrid, s, isMergeable);
  const floorGroups = components(floorGrid, s, isMergeable);

  const cells: CellDef[] = [];
  for (let r = 0; r < s; r++) {
    for (let c = 0; c < s; c++) {
      const i = r * s + c;
      const rk = input.layout[r][c];
      if (!(rk in roomByKey)) fail(`Habitación '${rk}' sin definir (fila ${r}, col ${c})`);
      const oc = objGrid[r][c];
      const fc = floorGrid[r][c];
      const obj = oc === '.' ? null : letterToKey[oc];
      const floor = fc === '.' ? null : letterToKey[fc];
      if (obj && objects[obj].layer !== 'object') fail(`'${obj}' es de suelo y está en la capa de objetos`);
      if (floor && objects[floor].layer !== 'floor') fail(`'${floor}' no es de suelo y está en la capa de suelo`);
      const occupiable = obj === null || objects[obj].occupiable;
      cells.push({
        i, r, c, room: roomByKey[rk], obj, objGroup: obj ? objGroups[i] : -1,
        floor, floorGroup: floor ? floorGroups[i] : -1, occupiable,
      });
    }
  }

  // Habitaciones conexas
  rooms.forEach((room) => {
    const list = cells.filter((x) => x.room === room.id).map((x) => x.i);
    if (!list.length) fail(`La habitación '${room.key}' no tiene casillas`);
    const seen = new Set([list[0]]);
    const stack = [list[0]];
    while (stack.length) {
      const k = stack.pop()!;
      const r = Math.floor(k / s);
      const c = k % s;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= s || cc >= s) continue;
        const q = rr * s + cc;
        if (!seen.has(q) && cells[q].room === room.id) {
          seen.add(q);
          stack.push(q);
        }
      }
    }
    if (seen.size !== list.length) fail(`La habitación '${room.key}' no es conexa`);
  });

  // Reparto (las pistas generadas sustituyen a las del reparto)
  if (input.clues) {
    input = { ...input, cast: input.cast.map((ch) => (input.clues![ch.id] ? { ...ch, clues: input.clues![ch.id] } : ch)) };
  }
  const ids = new Set<string>();
  const tags = new Set<string>();
  for (const ch of input.cast) {
    if (ids.has(ch.id)) fail(`Personaje repetido: ${ch.id}`);
    if (tags.has(ch.tag)) fail(`Etiqueta repetida: ${ch.tag}`);
    ids.add(ch.id);
    tags.add(ch.tag);
  }
  if (input.cast.length !== s) fail(`Hay ${input.cast.length} personajes y la cuadrícula es ${s}x${s}`);
  const victims = input.cast.filter((ch) => ch.victim);
  if (victims.length !== 1) fail('Debe haber exactamente una víctima');
  const victim = victims[0].id;

  // Solución
  const solution: Record<string, number> = {};
  if (opts.draft && !input.solution) {
    return {
      id: input.id, num: input.num, level: input.level, franchise: input.franchise, title: input.title, size: s,
      rooms, roomByKey, cells, objects, cast: input.cast, victim, murderer: '', solution, story: input.story,
      cover: input.cover, accent: input.accent, art: input.art, meta: input.meta,
    };
  }
  const rowsUsed = new Set<number>();
  const colsUsed = new Set<number>();
  for (const ch of input.cast) {
    const pos = input.solution[ch.id];
    if (!pos) fail(`Falta la solución de ${ch.id}`);
    const [r, c] = pos;
    if (rowsUsed.has(r) || colsUsed.has(c)) fail(`Solución con dos personajes en la fila ${r} o columna ${c}`);
    rowsUsed.add(r);
    colsUsed.add(c);
    const i = r * s + c;
    if (!cells[i].occupiable) fail(`${ch.id} está en una casilla no ocupable (${r},${c})`);
    solution[ch.id] = i;
  }
  const vRoom = cells[solution[victim]].room;
  const withVictim = input.cast.filter((ch) => ch.id !== victim && cells[solution[ch.id]].room === vRoom);
  if (withVictim.length !== 1) fail(`La víctima debe estar a solas con exactamente una persona (hay ${withVictim.length})`);

  // La víctima siempre lleva su pista implícita.
  const cast = input.cast.map((ch) =>
    ch.victim && !ch.clues.some((c) => c.t === 'victim') ? { ...ch, clues: [{ t: 'victim' as const }, ...ch.clues] } : ch,
  );

  const p: Puzzle = {
    id: input.id,
    num: input.num,
    level: input.level,
    franchise: input.franchise,
    title: input.title,
    size: s,
    rooms,
    roomByKey,
    cells,
    objects,
    cast,
    victim,
    murderer: withVictim[0].id,
    solution,
    story: input.story,
    art: input.art,
    meta: input.meta,
    cover: input.cover,
    accent: input.accent,
  };
  return p;
}

export const rowOf = (p: Puzzle, i: number) => Math.floor(i / p.size);
export const colOf = (p: Puzzle, i: number) => i % p.size;
export const cellLabel = (p: Puzzle, i: number) => `F${rowOf(p, i) + 1}·C${colOf(p, i) + 1}`;
