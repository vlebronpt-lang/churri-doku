import { darken, gray, lighten, mix } from './color';
import { FALLBACK, ICONS, INK, type Facing } from './icons';
import { geo } from '../engine/puzzle';
import type { FloorPattern, Puzzle } from '../engine/types';

export const CELL = 100;
export const PAD = 16;

export interface BoardOpts {
  /** Escala de grises (versión B/N imprimible). */
  bw?: boolean;
  /** Oscurecer casillas no ocupables. */
  shade?: boolean;
  /** Mostrar etiquetas de habitación. */
  labels?: boolean;
  /** Prefijo para ids (varios tableros en una página). */
  idp?: string;
  /** Mostrar números de fila/columna alrededor. */
  coords?: boolean;
  /** Sombra dura bajo el tablero (en la web; en papel no). */
  shadow?: boolean;
  /**
   * Suelos dibujados casilla a casilla en vez de con <pattern>. Para imprimir: Chrome convierte
   * cada patrón en una imagen y los PDF pesarían muchísimo.
   */
  vectorFloors?: boolean;
}

/** Tamaño total del SVG (con márgenes y, opcionalmente, coordenadas). */
export function boardSize(p: Puzzle, coords = false) {
  const extra = coords ? 40 : 0;
  return { w: p.size * CELL + PAD * 2 + extra, h: p.size * CELL + PAD * 2 + extra, off: PAD + extra };
}

const SEAT_ICONS = new Set(['chair', 'armchair', 'throne', 'wheelchair', 'sofa', 'bench']);
const FACE_TARGETS = new Set(['table', 'desk', 'counter', 'holotable', 'tv', 'fireplace', 'console', 'foosball', 'computer', 'piano', 'campfire', 'brazier', 'typewriter', 'cake', 'stove']);

function hash(n: number) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 13;
  x = (x * 1274126177) >>> 0;
  return (x >>> 0) / 4294967296;
}

type Tile = { w: number; h: number; body: string };

function floorPattern(id: string, kind: FloorPattern, base: string): string {
  const { w, h, body } = floorTile(kind, base);
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}" x="${PAD}" y="${PAD}"><rect width="${w}" height="${h}" fill="${base}"/>${body}</pattern>`;
}

/** Baldosa del suelo (sin el color de fondo): se usa como patrón o, al imprimir, repetida a mano. */
function floorTile(kind: FloorPattern, base: string): Tile {
  const d1 = darken(base, 0.12);
  const d2 = darken(base, 0.22);
  const l1 = lighten(base, 0.18);
  const pat = (w: number, h: number, body: string): Tile => ({ w, h, body });
  switch (kind) {
    case 'wood':
      return pat(100, 50, `<path d="M0 0.5 H100 M0 25 H100" stroke="${d2}" stroke-width="2"/><path d="M62 0 V25 M18 25 V50" stroke="${d2}" stroke-width="2"/><path d="M8 12 Q30 9 50 13 M70 38 Q85 35 98 39" stroke="${d1}" stroke-width="1.4" fill="none"/>`);
    case 'planks':
      return pat(50, 100, `<path d="M0.5 0 V100 M25 0 V100" stroke="${d2}" stroke-width="2"/><path d="M0 64 H25 M25 22 H50" stroke="${d2}" stroke-width="2"/><path d="M12 8 Q10 30 13 50 M38 60 Q36 80 39 96" stroke="${d1}" stroke-width="1.3" fill="none"/>`);
    case 'tiles':
      return pat(50, 50, `<rect x="2" y="2" width="46" height="46" rx="4" fill="${l1}" fill-opacity=".35" stroke-opacity=".35"/><path d="M0 0.5 H50 M0.5 0 V50" stroke="${d1}" stroke-width="2.5"/>`);
    case 'checker':
      return pat(100, 100, `<rect width="50" height="50" fill="${d1}"/><rect x="50" y="50" width="50" height="50" fill="${d1}"/>`);
    case 'grass': {
      let b = '';
      for (let k = 0; k < 14; k++) {
        const x = hash(k * 3 + 1) * 100, y = hash(k * 7 + 2) * 100;
        b += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l2 -7 M${(x + 4).toFixed(1)} ${(y + 1).toFixed(1)} l-1 -6" stroke="${d2}" stroke-width="2" stroke-linecap="round"/>`;
      }
      return pat(100, 100, b);
    }
    case 'stone': {
      let b = '';
      const rows = [0, 33, 66];
      rows.forEach((y, j) => {
        let x = j % 2 ? -18 : 0;
        let k = 0;
        while (x < 100) {
          const w = 30 + hash(j * 11 + k) * 14;
          b += `<rect x="${(x + 2).toFixed(1)}" y="${y + 2}" width="${(w - 4).toFixed(1)}" height="29" rx="8" fill="${k % 2 ? l1 : base}" stroke="${d2}" stroke-width="2"/>`;
          x += w;
          k++;
        }
      });
      return pat(100, 99, b);
    }
    case 'sand': {
      let b = '';
      for (let k = 0; k < 22; k++) b += `<circle cx="${(hash(k * 5 + 9) * 100).toFixed(1)}" cy="${(hash(k * 13 + 4) * 100).toFixed(1)}" r="${(1 + hash(k) * 1.6).toFixed(1)}" fill="${d2}" fill-opacity=".7" stroke-opacity=".7"/>`;
      return pat(100, 100, b);
    }
    case 'water':
      return pat(100, 50, `<path d="M0 15 Q12.5 8 25 15 T50 15 T75 15 T100 15 M0 40 Q12.5 33 25 40 T50 40 T75 40 T100 40" stroke="${l1}" stroke-width="3" fill="none" fill-opacity=".8" stroke-opacity=".8"/>`);
    case 'metal':
      return pat(40, 40, `<path d="M6 10 l8 -6 M26 30 l8 -6 M26 10 l8 6 M6 30 l8 6" stroke="${d2}" stroke-width="3" stroke-linecap="round"/><path d="M0 0.5 H40" stroke="${d1}" stroke-width="1"/>`);
    case 'marble':
      return pat(100, 100, `<path d="M0 30 Q30 20 45 40 T100 55 M10 100 Q30 75 60 80 T95 60" stroke="${d1}" stroke-width="2" fill="none"/><path d="M0 0.5 H100 M0.5 0 V100" stroke="${d1}" stroke-width="1.5" fill-opacity=".6" stroke-opacity=".6"/>`);
    case 'snow': {
      let b = '';
      for (let k = 0; k < 16; k++) b += `<circle cx="${(hash(k * 3 + 7) * 100).toFixed(1)}" cy="${(hash(k * 17 + 1) * 100).toFixed(1)}" r="${(1.5 + hash(k + 3) * 2).toFixed(1)}" fill="#fff"/>`;
      return pat(100, 100, b);
    }
    case 'dirt': {
      let b = '';
      for (let k = 0; k < 16; k++) b += `<ellipse cx="${(hash(k * 7 + 3) * 100).toFixed(1)}" cy="${(hash(k * 11 + 5) * 100).toFixed(1)}" rx="${(2 + hash(k) * 3).toFixed(1)}" ry="${(1.5 + hash(k + 1) * 2).toFixed(1)}" fill="${d2}" fill-opacity=".6" stroke-opacity=".6"/>`;
      return pat(100, 100, b);
    }
    case 'carpet':
      return pat(50, 50, `<path d="M25 10 L40 25 L25 40 L10 25 Z" fill="none" stroke="${l1}" stroke-width="2" fill-opacity=".6" stroke-opacity=".6"/>`);
    case 'lava':
      return pat(100, 100, `<path d="M0 40 Q20 30 35 45 T70 40 T100 50 M20 100 Q35 80 50 85 T90 70" stroke="#ffb347" stroke-width="4" fill="none" fill-opacity=".8" stroke-opacity=".8"/>`);
    case 'space': {
      let b = '';
      for (let k = 0; k < 12; k++) b += `<circle cx="${(hash(k * 9 + 2) * 100).toFixed(1)}" cy="${(hash(k * 5 + 8) * 100).toFixed(1)}" r="${(0.8 + hash(k + 5) * 1.6).toFixed(1)}" fill="#fff" fill-opacity=".85" stroke-opacity=".85"/>`;
      return pat(100, 100, b);
    }
    default:
      return pat(100, 100, '');
  }
}

/** Dirección hacia la que mira un asiento. */
function seatFacing(p: Puzzle, cells: number[], horizontal: boolean | null): Facing {
  const s = p.size;
  const room = p.cells[cells[0]].room;
  const score: Record<Facing, number> = { N: 0, E: 0, S: 0, W: 0 };
  const mine = new Set(cells);
  for (const i of cells) {
    const r = Math.floor(i / s), c = i % s;
    const nb: [Facing, number, number][] = [['N', r - 1, c], ['S', r + 1, c], ['W', r, c - 1], ['E', r, c + 1]];
    for (const [d, rr, cc] of nb) {
      if (rr < 0 || cc < 0 || rr >= s || cc >= s) { score[d] -= 3; continue; }
      const q = rr * s + cc;
      if (mine.has(q)) continue;
      const cell = p.cells[q];
      if (cell.room !== room) { score[d] -= 3; continue; }
      const icon = cell.obj ? p.objects[cell.obj].icon : null;
      if (icon && FACE_TARGETS.has(icon)) score[d] += 10;
      else if (!cell.obj) score[d] += 1;
    }
  }
  // Hacia el centro de la habitación como desempate.
  const roomCells = p.cells.filter((x) => x.room === room);
  const cr = roomCells.reduce((a, x) => a + x.r, 0) / roomCells.length;
  const cc = roomCells.reduce((a, x) => a + x.c, 0) / roomCells.length;
  const mr = cells.reduce((a, i) => a + Math.floor(i / s), 0) / cells.length;
  const mc = cells.reduce((a, i) => a + (i % s), 0) / cells.length;
  score.S += (cr - mr) * 0.8;
  score.N -= (cr - mr) * 0.8;
  score.E += (cc - mc) * 0.8;
  score.W -= (cc - mc) * 0.8;
  let opts: Facing[] = ['S', 'N', 'E', 'W'];
  if (horizontal === true) opts = ['S', 'N'];
  if (horizontal === false) opts = ['E', 'W'];
  return opts.reduce((best, d) => (score[d] > score[best] ? d : best), opts[0]);
}

function bedFacing(p: Puzzle, cells: number[], horizontal: boolean): Facing {
  const s = p.size;
  const room = p.cells[cells[0]].room;
  const blocked = (r: number, c: number) => r < 0 || c < 0 || r >= s || c >= s || p.cells[r * s + c].room !== room || !!p.cells[r * s + c].obj;
  const rs = cells.map((i) => Math.floor(i / s)), cs = cells.map((i) => i % s);
  if (horizontal) {
    const r = rs[0], c0 = Math.min(...cs), c1 = Math.max(...cs);
    return blocked(r, c0 - 1) || !blocked(r, c1 + 1) ? 'S' : 'N';
  }
  const c = cs[0], r0 = Math.min(...rs), r1 = Math.max(...rs);
  return blocked(r0 - 1, c) || !blocked(r1 + 1, c) ? 'W' : 'E';
}

/** Genera el SVG estático del tablero (sin fichas). */
export function renderBoard(p: Puzzle, opts: BoardOpts = {}): string {
  const { bw = false, shade = true, labels = true, idp = 'b', coords = false, shadow = false, vectorFloors = false } = opts;
  const g = geo(p);
  const s = p.size;
  const { w: W, h: H, off } = boardSize(p, coords);
  const col = (hex: string) => (bw ? gray(hex) : hex);
  const X = (c: number) => off + c * CELL;
  const Y = (r: number) => off + r * CELL;
  const parts: string[] = [];
  const defs: string[] = [];

  // Suelos
  const tiles: (Tile & { base: string })[] = [];
  p.rooms.forEach((room) => {
    if (vectorFloors) tiles[room.id] = { ...floorTile(room.floor, col(room.color)), base: col(room.color) };
    else defs.push(floorPattern(`${idp}-fl${room.id}`, room.floor, col(room.color)).replace(`x="${PAD}" y="${PAD}"`, `x="${off}" y="${off}"`));
  });
  if (shadow) parts.push(`<rect x="${off + 1}" y="${off + 2}" width="${s * CELL + 12}" height="${s * CELL + 12}" rx="10" fill="${INK}" fill-opacity=".85" stroke-opacity=".85"/>`);
  parts.push(`<rect x="${off - 6}" y="${off - 6}" width="${s * CELL + 12}" height="${s * CELL + 12}" rx="10" fill="${INK}"/>`);
  if (vectorFloors) {
    // Una vez por zona, recortado a sus casillas y con la misma fase que el patrón global.
    p.rooms.forEach((room) => {
      const cells = g.roomCells[room.id];
      if (!cells.length) return;
      const t = tiles[room.id];
      const rs = cells.map((i) => Math.floor(i / s)), cs = cells.map((i) => i % s);
      const x0 = X(Math.min(...cs)), y0 = Y(Math.min(...rs)), x1 = X(Math.max(...cs)) + CELL, y1 = Y(Math.max(...rs)) + CELL;
      const clip = `${idp}-rc${room.id}`;
      defs.push(`<clipPath id="${clip}">${cells.map((i) => `<rect x="${X(i % s)}" y="${Y(Math.floor(i / s))}" width="${CELL}" height="${CELL}"/>`).join('')}</clipPath>`);
      let inner = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${t.base}"/>`;
      if (t.body) {
        const sx = x0 - ((x0 - off) % t.w), sy = y0 - ((y0 - off) % t.h);
        for (let y = sy; y < y1; y += t.h) for (let x = sx; x < x1; x += t.w) inner += `<g transform="translate(${x} ${y})">${t.body}</g>`;
      }
      parts.push(`<g clip-path="url(#${clip})">${inner}</g>`);
    });
  } else {
    for (const cell of p.cells) {
      parts.push(`<rect x="${X(cell.c)}" y="${Y(cell.r)}" width="${CELL}" height="${CELL}" fill="url(#${idp}-fl${cell.room})"/>`);
    }
  }

  // Capa de suelo: alfombras y agua (por casilla, con bordes solo hacia fuera del grupo).
  const floorGroups = new Map<number, number[]>();
  for (const cell of p.cells) if (cell.floor) {
    const list = floorGroups.get(cell.floorGroup) ?? [];
    list.push(cell.i);
    floorGroups.set(cell.floorGroup, list);
  }
  for (const [, list] of floorGroups) {
    const key = p.cells[list[0]].floor!;
    const def = p.objects[key];
    const set = new Set(list);
    const inG = (r: number, c: number) => r >= 0 && c >= 0 && r < s && c < s && set.has(r * s + c);
    const isWater = def.icon === 'water';
    const base = col(def.tint ?? (isWater ? '#5fb4e3' : '#b9506a'));
    for (const i of list) {
      const r = Math.floor(i / s), c = i % s;
      const inset = isWater ? 0 : 8;
      const t = inG(r - 1, c) ? 0 : inset, b = inG(r + 1, c) ? 0 : inset, l = inG(r, c - 1) ? 0 : inset, rr = inG(r, c + 1) ? 0 : inset;
      const x0 = X(c) + l, y0 = Y(r) + t, w = CELL - l - rr, h = CELL - t - b;
      parts.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${base}"/>`);
      if (isWater) {
        parts.push(`<path d="M${X(c) + 10} ${Y(r) + 35} q10 -7 20 0 t20 0 M${X(c) + 45} ${Y(r) + 70} q10 -7 20 0 t20 0" stroke="${lighten(base, 0.45)}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
      } else {
        parts.push(`<path d="M${X(c) + 50} ${Y(r) + 30} l20 20 l-20 20 l-20 -20 z" fill="none" stroke="${lighten(base, 0.35)}" stroke-width="2.5" fill-opacity=".8" stroke-opacity=".8"/>`);
      }
      const edge = (x1: number, y1: number, x2: number, y2: number) => parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${isWater ? darken(base, 0.35) : darken(base, 0.4)}" stroke-width="${isWater ? 3 : 4}" stroke-linecap="round"/>`);
      if (!inG(r - 1, c)) edge(x0, y0, x0 + w, y0);
      if (!inG(r + 1, c)) edge(x0, y0 + h, x0 + w, y0 + h);
      if (!inG(r, c - 1)) edge(x0, y0, x0, y0 + h);
      if (!inG(r, c + 1)) edge(x0 + w, y0, x0 + w, y0 + h);
      if (!isWater) {
        // Ribete interior
        const pad = 7;
        const tt = inG(r - 1, c) ? -1 : pad, bb = inG(r + 1, c) ? -1 : pad, ll = inG(r, c - 1) ? -1 : pad, rrr = inG(r, c + 1) ? -1 : pad;
        const stroke = lighten(base, 0.3);
        if (tt >= 0) parts.push(`<line x1="${x0 + Math.max(ll, 0)}" y1="${y0 + tt}" x2="${x0 + w - Math.max(rrr, 0)}" y2="${y0 + tt}" stroke="${stroke}" stroke-width="2"/>`);
        if (bb >= 0) parts.push(`<line x1="${x0 + Math.max(ll, 0)}" y1="${y0 + h - bb}" x2="${x0 + w - Math.max(rrr, 0)}" y2="${y0 + h - bb}" stroke="${stroke}" stroke-width="2"/>`);
        if (ll >= 0) parts.push(`<line x1="${x0 + ll}" y1="${y0 + Math.max(tt, 0)}" x2="${x0 + ll}" y2="${y0 + h - Math.max(bb, 0)}" stroke="${stroke}" stroke-width="2"/>`);
        if (rrr >= 0) parts.push(`<line x1="${x0 + w - rrr}" y1="${y0 + Math.max(tt, 0)}" x2="${x0 + w - rrr}" y2="${y0 + h - Math.max(bb, 0)}" stroke="${stroke}" stroke-width="2"/>`);
      }
    }
  }

  // Cuadrícula fina
  const grid: string[] = [];
  for (let k = 1; k < s; k++) {
    grid.push(`M${X(k)} ${Y(0)} V${Y(s)}`);
    grid.push(`M${X(0)} ${Y(k)} H${X(s)}`);
  }
  parts.push(`<path d="${grid.join(' ')}" stroke="${INK}" stroke-width="1.6" fill-opacity=".28" stroke-opacity=".28"/>`);

  // Sombra en casillas no ocupables
  if (shade) {
    for (const cell of p.cells) if (!cell.occupiable) parts.push(`<rect x="${X(cell.c)}" y="${Y(cell.r)}" width="${CELL}" height="${CELL}" fill="${INK}" fill-opacity=".13" stroke-opacity=".13"/>`);
  }

  // Objetos
  const groups = new Map<number, number[]>();
  for (const cell of p.cells) if (cell.obj) {
    const list = groups.get(cell.objGroup) ?? [];
    list.push(cell.i);
    groups.set(cell.objGroup, list);
  }
  for (const [, list] of groups) {
    const key = p.cells[list[0]].obj!;
    const def = p.objects[key];
    const rs = list.map((i) => Math.floor(i / s)), cs = list.map((i) => i % s);
    const r0 = Math.min(...rs), r1 = Math.max(...rs), c0 = Math.min(...cs), c1 = Math.max(...cs);
    const w = (c1 - c0 + 1) * CELL, h = (r1 - r0 + 1) * CELL;
    const horizontal = list.length > 1 ? w >= h : null;
    let facing: Facing | undefined;
    if (SEAT_ICONS.has(def.icon)) facing = def.facing ?? seatFacing(p, list, horizontal);
    if (['bed', 'bunk', 'stretcher', 'lounger'].includes(def.icon)) facing = bedFacing(p, list, w >= h);
    const fn = ICONS[def.icon] ?? FALLBACK;
    let svg = fn(w, h, { tint: def.tint ? col(def.tint) : undefined, facing });
    if (bw) svg = svg.replace(/#[0-9a-fA-F]{6}\b/g, (m) => gray(m));
    parts.push(`<g transform="translate(${X(c0)} ${Y(r0)})">${svg}</g>`);
  }

  // Muros
  const walls: string[] = [];
  for (const cell of p.cells) {
    const [N, E, S, Wl] = g.walls[cell.i];
    const x = X(cell.c), y = Y(cell.r);
    if (E && cell.c < s - 1) walls.push(`M${x + CELL} ${y} V${y + CELL}`);
    if (S && cell.r < s - 1) walls.push(`M${x} ${y + CELL} H${x + CELL}`);
    void N; void Wl;
  }
  parts.push(`<path d="${walls.join(' ')}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`);
  parts.push(`<rect x="${off}" y="${off}" width="${s * CELL}" height="${s * CELL}" fill="none" stroke="${INK}" stroke-width="9" rx="3"/>`);

  // Etiquetas de habitación. Cada zona propone tramos de su fila superior e inferior; se eligen
  // los mejores evitando que dos etiquetas queden pegadas a ambos lados del mismo muro.
  if (labels) {
    type Box = { x0: number; y0: number; x1: number; y1: number };
    type Cand = { score: number; lines: string[]; size: number; cx: number; firstY: number; lh: number; box: Box; rot?: { x: number; y: number } };
    const layout = (room: (typeof p.rooms)[number]): Cand[] => {
      const cells = g.roomCells[room.id];
      if (!cells.length) return [];
      const rowsOf = cells.map((i) => Math.floor(i / s));
      const minR = Math.min(...rowsOf), maxR = Math.max(...rowsOf);
      const text = room.name.toUpperCase();
      const out: Cand[] = [];
      const scan = (r: number, bottom: boolean) => {
        const row = cells.filter((i) => Math.floor(i / s) === r).map((i) => i % s).sort((a, b) => a - b);
        let start = row[0];
        for (let k = 1; k <= row.length; k++) {
          if (k !== row.length && row[k] === row[k - 1] + 1) continue;
          const c0 = start, c1 = row[k - 1];
          start = row[k];
          let objs = 0;
          for (let c = c0; c <= c1; c++) if (p.cells[r * s + c].obj) objs++;
          const len = c1 - c0 + 1;
          const span = len * CELL - 14;
          const fit = (t: string) => Math.min(24, span / (Math.max(3, t.length) * 0.8));
          let lines = [text];
          let size = fit(text);
          const words = text.split(' ');
          if (size < 17 && words.length > 1) {
            // Partir en dos líneas equilibradas.
            let bestSplit = 1, bestW = Infinity;
            for (let q = 1; q < words.length; q++) {
              const w = Math.max(words.slice(0, q).join(' ').length, words.slice(q).join(' ').length);
              if (w < bestW) { bestW = w; bestSplit = q; }
            }
            const two = [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
            const size2 = Math.min(fit(two[0]), fit(two[1]));
            if (size2 > size + 2) { lines = two; size = size2; }
          }
          size = Math.max(11, size);
          const cx = X(c0) + (len * CELL) / 2;
          const lh = size * 1.02;
          const firstY = bottom ? Y(r) + CELL - 9 - lh * (lines.length - 1) : Y(r) + 9 + size * 0.8;
          const tw = Math.max(...lines.map((l) => l.length)) * size * 0.8;
          const box = { x0: cx - tw / 2, x1: cx + tw / 2, y0: firstY - size * 0.8, y1: firstY + lh * (lines.length - 1) + 2 };
          const score = len * 10 - (objs / len) * 14 + (bottom ? 3 : 0);
          out.push({ score, lines, size, cx, firstY, lh, box });
        }
      };
      scan(maxR, true);
      if (minR !== maxR) scan(minR, false);
      // Zonas estrechas y altas (una o dos columnas): rótulo en vertical, pegado al muro derecho.
      const colsOf = cells.map((i) => i % s);
      const maxC = Math.max(...colsOf), minC = Math.min(...colsOf);
      if (maxC - minC <= 1) {
        const colCells = cells.filter((i) => i % s === maxC).map((i) => Math.floor(i / s)).sort((a, b) => a - b);
        let start = colCells[0];
        for (let k = 1; k <= colCells.length; k++) {
          if (k !== colCells.length && colCells[k] === colCells[k - 1] + 1) continue;
          const r0 = start, r1 = colCells[k - 1];
          start = colCells[k];
          const len = r1 - r0 + 1;
          if (len < 3) continue;
          let objs = 0;
          for (let r = r0; r <= r1; r++) if (p.cells[r * s + maxC].obj) objs++;
          const span = len * CELL - 14;
          const size = Math.max(11, Math.min(24, span / (Math.max(3, text.length) * 0.8)));
          const x = X(maxC) + CELL - 9, cy = Y(r0) + (len * CELL) / 2;
          const tw = text.length * size * 0.8;
          // Coordenadas sin rotar: la caja ocupa la franja derecha de la columna.
          const box = { x0: x - size * 0.8, x1: x + 2, y0: cy - tw / 2, y1: cy + tw / 2 };
          const score = len * 10 - (objs / len) * 14 - 6;
          out.push({ score, lines: [text], size, cx: 0, firstY: 0, lh: size, box, rot: { x, y: cy } });
        }
      }
      return out.sort((a, b) => b.score - a.score);
    };
    const near = (a: Box, b: Box) => a.x0 < b.x1 + 8 && b.x0 < a.x1 + 8 && a.y0 < b.y1 + 26 && b.y0 < a.y1 + 26;
    const options = p.rooms.map((room) => ({ room, cands: layout(room) })).filter((o) => o.cands.length);
    // Primero las zonas con menos alternativas.
    options.sort((a, b) => a.cands.length - b.cands.length);
    const placed: Cand[] = [];
    for (const { cands } of options) {
      const pick = cands.find((c) => !placed.some((q) => near(c.box, q.box))) ?? cands[0];
      placed.push(pick);
    }
    for (const c of placed) {
      if (c.rot) {
        const { x, y } = c.rot;
        parts.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(-90 ${x.toFixed(1)} ${y.toFixed(1)})" text-anchor="middle" font-family="'Archivo Black','Arial Black',Arial,sans-serif" font-size="${c.size.toFixed(1)}" letter-spacing="0.4" fill="#fff" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round" paint-order="stroke">${escapeXml(c.lines[0])}</text>`);
        continue;
      }
      const tspans = c.lines.map((ln, k) => `<tspan x="${c.cx}" y="${(c.firstY + k * c.lh).toFixed(1)}">${escapeXml(ln)}</tspan>`).join('');
      parts.push(`<text text-anchor="middle" font-family="'Archivo Black','Arial Black',Arial,sans-serif" font-size="${c.size.toFixed(1)}" letter-spacing="0.4" fill="#fff" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round" paint-order="stroke">${tspans}</text>`);
    }
  }

  // Coordenadas
  if (coords) {
    for (let k = 0; k < s; k++) {
      parts.push(`<text x="${X(k) + CELL / 2}" y="${off - 15}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="19" font-weight="700" fill="${mix(INK, '#888', 0.3)}">C${k + 1}</text>`);
      parts.push(`<text x="${off - 13}" y="${Y(k) + CELL / 2 + 7}" text-anchor="end" font-family="Inter,Arial,sans-serif" font-size="19" font-weight="700" fill="${mix(INK, '#888', 0.3)}">F${k + 1}</text>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs.join('')}</defs>${parts.join('')}</svg>`;
}

export function escapeXml(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
