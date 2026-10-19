import { darken, lighten } from './color';

/** Iconos de objetos en SVG. Cada casilla mide 100×100 unidades. */

export const INK = '#2b2631';
const SW = 4;

export type Facing = 'N' | 'E' | 'S' | 'W';
export interface IconOpts {
  tint?: string;
  facing?: Facing;
}
export type IconFn = (w: number, h: number, o: IconOpts) => string;

const WOOD = '#c98a52';
const WOOD_D = '#9b6136';
const WOOD_L = '#e3ad74';
const METAL = '#a9b2bc';
const METAL_D = '#77818c';
const STONE = '#c2bab0';
const LEAF = '#5db55a';
const LEAF_D = '#3f8c43';
const LEAF_L = '#93d283';
const POT = '#d2733f';
const GOLD = '#f3c33b';
const CREAM = '#f5eee0';
const WHITE = '#fbfaf6';
const DARK = '#3b3644';

const R = (x: number, y: number, w: number, h: number, fill: string, rx = 6, sw = SW) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const C = (cx: number, cy: number, r: number, fill: string, sw = SW) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const E = (cx: number, cy: number, rx: number, ry: number, fill: string, sw = SW) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const P = (d: string, fill: string, sw = SW) =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const L = (x1: number, y1: number, x2: number, y2: number, sw = SW, col = INK) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`;
/** Sombra suave desplazada. */
const SH = (x: number, y: number, w: number, h: number, rx = 8) =>
  `<rect x="${x + 4}" y="${y + 5}" width="${w}" height="${h}" rx="${rx}" fill="#000" fill-opacity=".17" stroke-opacity=".17"/>`;
const SHC = (cx: number, cy: number, r: number) => `<circle cx="${cx + 4}" cy="${cy + 5}" r="${r}" fill="#000" fill-opacity=".17" stroke-opacity=".17"/>`;
const SHE = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${cx + 4}" cy="${cy + 5}" rx="${rx}" ry="${ry}" fill="#000" fill-opacity=".17" stroke-opacity=".17"/>`;
const HL = (d: string) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" fill-opacity=".45" stroke-opacity=".45"/>`;

/** Rota un icono de una casilla (dibujado mirando al sur) hacia `facing`. */
function rot1(facing: Facing | undefined, svg: string) {
  const deg = facing === 'N' ? 180 : facing === 'E' ? -90 : facing === 'W' ? 90 : 0;
  return deg ? `<g transform="rotate(${deg} 50 50)">${svg}</g>` : svg;
}

/**
 * Dibujo canónico horizontal (L×100, "respaldo" arriba / cabecera a la izquierda)
 * colocado en una caja w×h según la orientación.
 */
function orient(w: number, h: number, facing: Facing | undefined, draw: (L: number) => string) {
  if (w >= h) {
    const svg = draw(w);
    if (facing === 'N') return `<g transform="rotate(180 ${w / 2} ${h / 2})">${svg}</g>`;
    return svg;
  }
  const svg = draw(h);
  if (facing === 'W') return `<g transform="translate(100 0) rotate(90)">${svg}</g>`;
  return `<g transform="translate(0 ${h}) rotate(-90)">${svg}</g>`;
}

function leafy(cx: number, cy: number, r: number, base: string, dark: string, light: string) {
  const blobs: string[] = [];
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    blobs.push(`<circle cx="${(cx + Math.cos(a) * r * 0.55).toFixed(1)}" cy="${(cy + Math.sin(a) * r * 0.55).toFixed(1)}" r="${(r * 0.5).toFixed(1)}"/>`);
  }
  return `
    <g fill="#000" opacity=".17" transform="translate(4 5)">${blobs.join('')}<circle cx="${cx}" cy="${cy}" r="${r * 0.6}"/></g>
    <g fill="${base}" stroke="${INK}" stroke-width="${SW}">${blobs.join('')}</g>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="${base}"/>
    <circle cx="${cx + r * 0.12}" cy="${cy + r * 0.12}" r="${r * 0.38}" fill="${dark}" fill-opacity=".55" stroke-opacity=".55"/>
    <circle cx="${cx - r * 0.22}" cy="${cy - r * 0.25}" r="${r * 0.2}" fill="${light}" fill-opacity=".9" stroke-opacity=".9"/>`;
}

function bookRow(x: number, y: number, w: number, h: number, seed: number) {
  const cols = ['#d9483b', '#4a78d1', '#f3c33b', '#5db55a', '#8e6cc9', '#e8833a', '#3bb3a9'];
  let out = '';
  let cx = x;
  let k = seed;
  while (cx < x + w - 4) {
    const bw = 5 + ((k * 7) % 5);
    const bh = h - ((k * 3) % 5);
    out += `<rect x="${cx}" y="${y + (h - bh)}" width="${Math.min(bw, x + w - cx)}" height="${bh}" fill="${cols[k % cols.length]}" stroke="${INK}" stroke-width="1.5"/>`;
    cx += bw;
    k++;
  }
  return out;
}

export const ICONS: Record<string, IconFn> = {
  // ------------------------------------------------------------------ asientos
  chair: (_w, _h, o) => {
    const f = o.tint ?? WOOD;
    return rot1(o.facing, `${SH(23, 18, 54, 60)}${R(25, 30, 50, 44, f, 8)}${R(20, 16, 60, 18, darken(f, 0.28), 7)}${HL('M33 40 L60 40')}`);
  },
  armchair: (_w, _h, o) => {
    const f = o.tint ?? '#d36b5b';
    return rot1(o.facing, `${SH(14, 14, 72, 72, 16)}${R(14, 16, 72, 68, f, 16)}${R(14, 12, 72, 24, darken(f, 0.25), 12)}${R(11, 26, 16, 56, darken(f, 0.12), 8)}${R(73, 26, 16, 56, darken(f, 0.12), 8)}${R(29, 38, 42, 40, lighten(f, 0.2), 8)}`);
  },
  sofa: (w, h, o) => {
    const f = o.tint ?? '#5b86c9';
    return orient(w, h, o.facing, (Lw) => {
      const n = Math.max(1, Math.round(Lw / 100));
      const inner = Lw - 44;
      let cush = '';
      for (let k = 0; k < n; k++) cush += R(22 + (k * inner) / n + 3, 36, inner / n - 6, 42, lighten(f, 0.18), 9);
      return `${SH(6, 12, Lw - 12, 76, 18)}${R(6, 14, Lw - 12, 72, f, 18)}${R(6, 9, Lw - 12, 26, darken(f, 0.25), 14)}${R(3, 24, 19, 62, darken(f, 0.12), 9)}${R(Lw - 22, 24, 19, 62, darken(f, 0.12), 9)}${cush}`;
    });
  },
  bench: (w, h, o) => {
    const f = o.tint ?? WOOD;
    return orient(w, h, o.facing, (Lw) => {
      let slats = '';
      for (let y = 36; y <= 66; y += 15) slats += R(8, y, Lw - 16, 11, f, 4, 3);
      return `${SH(8, 22, Lw - 16, 58)}${R(8, 20, Lw - 16, 12, darken(f, 0.3), 4, 3)}${slats}`;
    });
  },
  stool: (_w, _h, o) => {
    const f = o.tint ?? '#d9483b';
    return `${SHC(50, 50, 24)}${C(50, 50, 24, darken(f, 0.15))}${C(50, 50, 16, f, 3)}${HL('M41 43 Q46 38 53 38')}`;
  },
  throne: (_w, _h, o) => {
    const f = o.tint ?? '#c0392b';
    const metal = o.tint ? lighten(o.tint, 0.25) : GOLD;
    return rot1(o.facing, `${SH(12, 6, 76, 82, 10)}${P('M14 30 L14 14 L26 4 L38 14 L50 2 L62 14 L74 4 L86 14 L86 30 Z', metal)}${R(12, 24, 76, 64, metal, 10)}${R(24, 34, 52, 46, f, 8)}${C(50, 16, 6, '#e74c3c', 3)}`);
  },
  wheelchair: (_w, _h, o) => {
    const f = o.tint ?? '#4a5568';
    return rot1(o.facing, `${SH(16, 16, 68, 70, 12)}${R(10, 22, 14, 60, DARK, 7)}${R(76, 22, 14, 60, DARK, 7)}${R(24, 30, 52, 46, f, 8)}${R(22, 18, 56, 15, darken(f, 0.3), 6)}${C(30, 84, 5, METAL, 3)}${C(70, 84, 5, METAL, 3)}`);
  },
  bed: (w, h, o) => {
    const f = o.tint ?? '#6b8fd6';
    return orient(w, h, o.facing === 'N' ? 'N' : o.facing, (Lw) => {
      // Canónico horizontal: cabecera a la izquierda.
      return `${SH(6, 8, Lw - 12, 84, 10)}${R(6, 8, Lw - 12, 84, WOOD, 10)}${R(14, 14, Lw - 26, 72, WHITE, 8)}${R(18, 22, 30, 56, CREAM, 10)}${R(Lw * 0.42, 12, Lw * 0.58 - 10, 76, f, 8)}${L(Lw * 0.42 + 10, 14, Lw * 0.42 + 10, 86, 3, darken(f, 0.3))}`;
    });
  },
  bunk: (w, h, o) => {
    const f = o.tint ?? '#8a9bb0';
    return orient(w, h, o.facing, (Lw) => `${SH(6, 8, Lw - 12, 84, 6)}${R(6, 8, Lw - 12, 84, METAL_D, 6)}${R(13, 15, Lw - 26, 70, '#e9e4d8', 5)}${R(16, 22, 24, 56, WHITE, 8)}${R(Lw * 0.45, 15, Lw * 0.55 - 13, 70, f, 5)}${L(Lw - 20, 10, Lw - 20, 90, 5, DARK)}`);
  },
  stretcher: (w, h, o) => orient(w, h, o.facing, (Lw) => `${SH(8, 18, Lw - 16, 64)}${R(8, 18, Lw - 16, 64, METAL, 10)}${R(16, 24, Lw - 32, 52, o.tint ?? '#7fc8c0', 8)}${R(20, 30, 24, 40, WHITE, 8)}`),
  lounger: (w, h, o) => {
    const f = o.tint ?? '#f3a0a0';
    return orient(w, h, o.facing, (Lw) => {
      let stripes = '';
      for (let x = 30; x < Lw - 12; x += 16) stripes += `<rect x="${x}" y="22" width="8" height="56" fill="${WHITE}" fill-opacity=".85" stroke-opacity=".85"/>`;
      return `${SH(8, 20, Lw - 16, 60)}${R(8, 20, Lw - 16, 60, f, 10)}${stripes}${R(8, 20, 26, 60, darken(f, 0.2), 10)}${R(8, 20, Lw - 16, 60, 'none', 10)}`;
    });
  },
  hammock: (w, h, o) => orient(w, h, o.facing, (Lw) => `${L(4, 50, 18, 50, 4)}${L(Lw - 4, 50, Lw - 18, 50, 4)}${P(`M18 34 Q${Lw / 2} 22 ${Lw - 18} 34 L${Lw - 18} 66 Q${Lw / 2} 78 18 66 Z`, o.tint ?? '#e9b45a')}`),
  boat: (w, h, o) => {
    const f = o.tint ?? WOOD;
    return orient(w, h, o.facing, (Lw) => `${SHE(Lw / 2, 50, Lw / 2 - 6, 32)}${P(`M8 50 Q${Lw * 0.25} 16 ${Lw * 0.7} 18 L${Lw - 6} 50 L${Lw * 0.7} 82 Q${Lw * 0.25} 84 8 50 Z`, f)}${P(`M20 50 Q${Lw * 0.3} 28 ${Lw * 0.68} 30 L${Lw - 22} 50 L${Lw * 0.68} 70 Q${Lw * 0.3} 72 20 50 Z`, darken(f, 0.22), 3)}${R(Lw * 0.35, 30, 12, 40, WOOD_L, 3, 3)}${R(Lw * 0.6, 32, 12, 36, WOOD_L, 3, 3)}`);
  },
  longship: (w, h, o) => {
    const f = o.tint ?? '#a8693c';
    return orient(w, h, o.facing, (Lw) => {
      let shields = '';
      const cols = ['#d9483b', '#f3c33b', '#4a78d1', WHITE];
      for (let x = 34, k = 0; x < Lw - 34; x += 22, k++) shields += C(x, 22, 8, cols[k % 4], 3) + C(x, 78, 8, cols[(k + 2) % 4], 3);
      return `${SHE(Lw / 2, 50, Lw / 2 - 4, 34)}${P(`M14 50 Q${Lw * 0.2} 14 ${Lw * 0.5} 14 Q${Lw * 0.8} 14 ${Lw - 14} 50 Q${Lw * 0.8} 86 ${Lw * 0.5} 86 Q${Lw * 0.2} 86 14 50 Z`, f)}${shields}${C(Lw / 2, 50, 8, WOOD_D, 3)}${P(`M${Lw - 16} 50 L${Lw - 2} 38 L${Lw - 8} 50 L${Lw - 2} 62 Z`, '#3b6e3b', 3)}${P('M16 50 L4 42 L8 50 L4 58 Z', '#3b6e3b', 3)}`;
    });
  },
  car: (w, h, o) => {
    const f = o.tint ?? '#e05a47';
    return orient(w, h, o.facing, (Lw) => `${SH(8, 14, Lw - 16, 72, 22)}${R(8, 14, Lw - 16, 72, f, 22)}${R(Lw * 0.28, 22, Lw * 0.42, 56, darken(f, 0.18), 12)}${R(Lw * 0.62, 24, Lw * 0.12, 52, '#a8d8f0', 6, 3)}${R(Lw * 0.2, 24, Lw * 0.1, 52, '#a8d8f0', 6, 3)}${R(Lw - 18, 20, 8, 14, '#fff7b0', 3, 2)}${R(Lw - 18, 66, 8, 14, '#fff7b0', 3, 2)}`);
  },
  rv: (w, h, o) => {
    const f = o.tint ?? '#efe6cf';
    return orient(w, h, o.facing, (Lw) => `${SH(6, 10, Lw - 12, 80, 12)}${R(6, 10, Lw - 12, 80, f, 12)}${R(6, 40, Lw - 12, 14, '#c9a46a', 0, 3)}${R(Lw - 40, 18, 26, 64, '#a8d8f0', 8, 3)}${R(20, 18, Lw * 0.3, 18, '#a8d8f0', 4, 3)}${C(Lw * 0.45, 70, 6, METAL, 3)}`);
  },
  ship: (w, h, o) => {
    const f = o.tint ?? '#9aa7b8';
    return orient(w, h, o.facing, (Lw) => `${SHE(Lw / 2, 50, Lw / 2 - 6, 30)}${P(`M8 50 L${Lw * 0.3} 18 L${Lw - 8} 40 L${Lw - 8} 60 L${Lw * 0.3} 82 Z`, f)}${P(`M${Lw * 0.55} 40 L${Lw - 20} 46 L${Lw - 20} 54 L${Lw * 0.55} 60 Z`, '#6fc3ef', 3)}${C(Lw * 0.28, 50, 9, '#ff9a3c', 3)}`);
  },
  horse: (_w, _h, o) => {
    const f = o.tint ?? '#8b5a3c';
    return `${SHE(50, 60, 34, 16)}${P('M18 58 Q20 40 40 40 L62 40 Q70 30 72 18 L84 16 L88 30 L80 34 L78 46 Q78 60 70 62 L70 84 L62 84 L62 64 L36 64 L34 84 L26 84 L26 62 Q18 64 18 58 Z', f)}${P('M72 18 L78 6 L82 16', darken(f, 0.3), 3)}${P('M18 56 Q8 60 10 74', 'none', 5)}${C(81, 24, 2.5, INK, 0)}`;
  },

  rockinghorse: (_w, _h, o) => {
    const f = o.tint ?? '#d9483b';
    return `${SHE(50, 84, 40, 8)}${P('M8 76 Q50 98 92 76', 'none', 9)}<path d="M8 76 Q50 98 92 76" fill="none" stroke="#c98a4b" stroke-width="4" stroke-linecap="round"/>${L(30, 62, 24, 82, 6)}${L(66, 62, 74, 82, 6)}${L(30, 62, 24, 82, 2.5, '#c98a4b')}${L(66, 62, 74, 82, 2.5, '#c98a4b')}${P('M20 54 Q20 42 34 42 L62 42 Q66 30 68 18 L82 16 L88 30 L80 34 L78 48 Q76 62 64 62 L34 62 Q20 62 20 54 Z', f)}${P('M68 18 Q60 22 58 40', '#f3c33b', 3)}${P('M20 50 Q10 52 12 64', 'none', 4)}${C(80, 24, 2.5, INK, 0)}${R(40, 40, 16, 6, '#f3c33b', 3, 2.5)}`;
  },

  // --------------------------------------------------------------- suelo (capa)
  carpet: () => '',
  water: () => '',

  // --------------------------------------------------------------- muebles
  table: (w, h, o) => {
    const f = o.tint ?? WOOD;
    const items: string[] = [];
    const nx = Math.max(1, Math.round(w / 100)), ny = Math.max(1, Math.round(h / 100));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const cx = (i + 0.5) * (w / nx), cy = (j + 0.5) * (h / ny);
      if ((i + j) % 2 === 0) items.push(`${C(cx, cy, 12, WHITE, 3)}${C(cx, cy, 6, '#f1d9a8', 2)}`);
      else items.push(`${R(cx - 4, cy - 12, 8, 24, '#e8c547', 3, 2)}<circle cx="${cx}" cy="${cy - 15}" r="4" fill="#ff8a2a"/>`);
    }
    return `${SH(8, 8, w - 16, h - 16, 12)}${R(8, 8, w - 16, h - 16, f, 12)}${R(15, 15, w - 30, h - 30, lighten(f, 0.12), 8, 2.5)}${items.join('')}`;
  },
  desk: (w, h, o) => {
    const f = o.tint ?? '#a8693c';
    return `${SH(8, 10, w - 16, h - 20, 8)}${R(8, 10, w - 16, h - 20, f, 8)}${R(18, 20, Math.min(34, w - 36), 26, '#2f3640', 4, 3)}${R(w - 46, h - 44, 28, 20, WHITE, 2, 2.5)}${L(w - 42, h - 37, w - 24, h - 37, 2)}${L(w - 42, h - 31, w - 28, h - 31, 2)}`;
  },
  counter: (w, h, o) => {
    const f = o.tint ?? '#7a4a2c';
    let bottles = '';
    const n = Math.max(1, Math.round(Math.max(w, h) / 100));
    for (let k = 0; k < n; k++) {
      const cx = w >= h ? (k + 0.5) * (w / n) : w / 2;
      const cy = w >= h ? h / 2 : (k + 0.5) * (h / n);
      bottles += C(cx - 10, cy, 6, '#3b8d4f', 2.5) + C(cx + 10, cy, 6, '#b5452f', 2.5);
    }
    return `${SH(6, 18, w - 12, h - 36, 8)}${R(6, 18, w - 12, h - 36, f, 8)}${R(6, 18, w - 12, 10, lighten(f, 0.3), 5, 3)}${bottles}`;
  },
  plant: () => `${SHC(50, 56, 20)}${C(50, 58, 19, POT)}${C(50, 58, 13, '#7a4a2c', 3)}${P('M50 52 Q30 30 22 34 Q34 44 50 52 Z', LEAF, 3)}${P('M50 52 Q72 28 80 34 Q66 46 50 52 Z', LEAF_D, 3)}${P('M50 52 Q46 22 54 14 Q58 34 50 52 Z', LEAF_L, 3)}${P('M50 54 Q28 56 20 64 Q38 64 50 54 Z', LEAF_D, 3)}${P('M50 54 Q72 56 80 66 Q62 64 50 54 Z', LEAF, 3)}`,
  tree: (_w, _h, o) => leafy(50, 50, 40, o.tint ?? LEAF, LEAF_D, LEAF_L),
  bush: (_w, _h, o) => leafy(50, 52, 30, o.tint ?? '#4fa34f', darken(o.tint ?? '#4fa34f', 0.3), LEAF_L),
  palm: () => {
    let fr = '';
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      const x = 50 + Math.cos(a) * 42, y = 50 + Math.sin(a) * 42;
      const x1 = 50 + Math.cos(a + 0.35) * 20, y1 = 50 + Math.sin(a + 0.35) * 20;
      const x2 = 50 + Math.cos(a - 0.35) * 20, y2 = 50 + Math.sin(a - 0.35) * 20;
      fr += P(`M50 50 Q${x1.toFixed(1)} ${y1.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)} Q${x2.toFixed(1)} ${y2.toFixed(1)} 50 50 Z`, k % 2 ? LEAF : LEAF_D, 3);
    }
    return `<circle cx="54" cy="55" r="34" fill="#000" fill-opacity=".12" stroke-opacity=".12"/>${fr}${C(46, 47, 6, '#8b5a2b', 3)}${C(55, 46, 6, '#8b5a2b', 3)}${C(50, 55, 6, '#8b5a2b', 3)}`;
  },
  shelf: (_w, _h, o) => {
    const f = o.tint ?? '#6d4c41';
    return `${SH(12, 8, 76, 84, 4)}${R(12, 8, 76, 84, f, 4)}${R(18, 14, 64, 72, darken(f, 0.35), 2, 2)}${bookRow(19, 15, 62, 20, 1)}${bookRow(19, 39, 62, 20, 4)}${bookRow(19, 63, 62, 22, 2)}${L(18, 37, 82, 37, 3)}${L(18, 61, 82, 61, 3)}`;
  },
  statue: (_w, _h, o) => {
    const f = o.tint ?? STONE;
    return `${SH(22, 64, 56, 28, 4)}${R(22, 66, 56, 24, darken(f, 0.15), 4)}${P('M38 66 L36 46 Q34 36 44 32 L56 32 Q66 36 64 46 L62 66 Z', f)}${C(50, 22, 11, f)}${P('M36 44 L26 30', 'none', 5)}${P('M64 44 L72 26', 'none', 5)}`;
  },
  armor: (_w, _h, o) => {
    const f = o.tint ?? METAL;
    return `${SH(26, 10, 48, 82, 10)}${R(30, 70, 16, 20, darken(f, 0.15), 4)}${R(54, 70, 16, 20, darken(f, 0.15), 4)}${P('M28 40 Q28 32 36 32 L64 32 Q72 32 72 40 L68 72 L32 72 Z', f)}${P('M38 10 L62 10 L64 30 L36 30 Z', f)}${L(40, 20, 60, 20, 4)}${P('M50 4 L50 10', 'none', 5)}`;
  },
  tv: (_w, _h, o) => `${SH(10, 16, 80, 62, 6)}${R(10, 16, 80, 58, DARK, 6)}${R(16, 22, 68, 46, o.tint ?? '#5fb3e6', 3, 2.5)}${HL('M22 30 L40 30')}${R(40, 74, 20, 8, DARK, 2, 3)}${R(30, 82, 40, 6, DARK, 3, 3)}`,
  computer: (_w, _h, o) => `${SH(14, 14, 72, 70, 6)}${R(16, 14, 68, 46, DARK, 6)}${R(22, 20, 56, 34, o.tint ?? '#4fd18b', 2, 2.5)}${R(44, 60, 12, 10, DARK, 2, 3)}${R(18, 72, 64, 14, '#d5d1c8', 4, 3)}`,
  barrel: (_w, _h, o) => {
    const f = o.tint ?? '#b0733f';
    return `${SHC(50, 50, 34)}${C(50, 50, 34, f)}${C(50, 50, 25, darken(f, 0.15), 3.5)}${C(50, 50, 34, 'none', 7)}${C(50, 50, 34, 'none', 0)}<circle cx="50" cy="50" r="30" fill="none" stroke="${METAL_D}" stroke-width="4"/>${L(36, 44, 64, 44, 2.5, darken(f, 0.4))}${L(34, 56, 66, 56, 2.5, darken(f, 0.4))}`;
  },
  crate: (_w, _h, o) => {
    const f = o.tint ?? '#cf9a5c';
    return `${SH(14, 14, 72, 72, 4)}${R(14, 14, 72, 72, f, 4)}${R(22, 22, 56, 56, lighten(f, 0.1), 2, 3)}${L(24, 24, 76, 76, 6)}${L(24, 24, 76, 76, 3, lighten(f, 0.25))}`;
  },
  fireplace: () => `${SH(8, 10, 84, 80, 6)}${R(8, 10, 84, 80, '#b5523b', 6)}${P('M24 90 L24 52 Q24 30 50 30 Q76 30 76 52 L76 90 Z', '#2b2027')}${P('M36 84 Q34 66 44 58 Q42 70 50 64 Q50 52 58 48 Q60 64 66 66 Q68 80 62 84 Z', '#ff8a2a', 3)}${P('M44 84 Q44 74 50 70 Q56 76 56 84 Z', '#ffd447', 2)}${R(4, 6, 92, 12, '#8c3b2a', 4)}`,
  campfire: () => `${SHC(50, 54, 28)}${R(18, 44, 64, 14, WOOD_D, 7)}${R(43, 18, 14, 64, WOOD, 7)}${P('M34 66 Q30 44 42 36 Q42 50 50 46 Q50 30 60 24 Q62 42 68 46 Q72 62 64 68 Z', '#ff7a22', 3)}${P('M42 66 Q42 54 50 50 Q58 56 58 66 Z', '#ffd447', 2)}`,
  brazier: () => `${SHC(50, 56, 30)}${C(50, 56, 30, '#5b5560')}${C(50, 56, 22, '#2b2027', 3)}${P('M36 64 Q32 44 44 38 Q44 50 50 46 Q50 30 58 24 Q62 42 66 48 Q70 62 62 66 Z', '#ff7a22', 3)}${P('M44 64 Q44 54 50 50 Q56 54 56 64 Z', '#ffd447', 2)}`,
  piano: () => `${SH(8, 12, 84, 76, 8)}${R(8, 12, 84, 54, '#2a2430', 8)}${R(8, 60, 84, 26, WHITE, 3)}${[18, 30, 42, 58, 70, 82].map((x) => `<rect x="${x - 3}" y="60" width="6" height="14" fill="${INK}"/>`).join('')}${HL('M18 22 L50 22')}`,
  wardrobe: (_w, _h, o) => {
    const f = o.tint ?? '#a0663d';
    return `${SH(14, 6, 72, 88, 4)}${R(14, 6, 72, 88, f, 4)}${L(50, 10, 50, 90, 3)}${C(44, 50, 3, GOLD, 2)}${C(56, 50, 3, GOLD, 2)}${R(20, 12, 24, 30, lighten(f, 0.12), 2, 2)}${R(56, 12, 24, 30, lighten(f, 0.12), 2, 2)}`;
  },
  pillar: (_w, _h, o) => {
    const f = o.tint ?? '#e2dccf';
    return `${SHC(50, 50, 32)}${R(14, 14, 72, 72, darken(f, 0.12), 6)}${C(50, 50, 28, f)}${C(50, 50, 20, lighten(f, 0.3), 2.5)}${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k / 8) * Math.PI * 2; return L(50 + Math.cos(a) * 20, 50 + Math.sin(a) * 20, 50 + Math.cos(a) * 28, 50 + Math.sin(a) * 28, 2); }).join('')}`;
  },
  rock: (_w, _h, o) => {
    const f = o.tint ?? '#a59e94';
    return `${SHE(50, 56, 36, 26)}${P('M16 62 Q12 40 30 30 Q44 18 62 24 Q84 28 86 50 Q88 70 70 78 Q46 86 28 80 Q16 74 16 62 Z', f)}${P('M30 38 Q40 30 52 32', 'none', 3)}${HL('M28 46 Q34 38 44 36')}${P('M58 56 Q66 52 72 58', darken(f, 0.25), 3)}`;
  },
  chest: (_w, _h, o) => {
    const f = o.tint ?? '#9c5b2e';
    return `${SH(12, 20, 76, 64, 8)}${P('M12 44 Q12 20 50 20 Q88 20 88 44 Z', darken(f, 0.1))}${R(12, 44, 76, 40, f, 4)}${R(26, 20, 10, 64, GOLD, 2, 3)}${R(64, 20, 10, 64, GOLD, 2, 3)}${R(43, 40, 14, 16, GOLD, 3, 3)}${C(50, 49, 2.5, INK, 0)}`;
  },
  cannon: () => `${SH(12, 30, 76, 40, 10)}${R(14, 34, 54, 32, WOOD, 6)}${C(26, 30, 9, WOOD_D, 3)}${C(26, 70, 9, WOOD_D, 3)}${C(56, 30, 9, WOOD_D, 3)}${C(56, 70, 9, WOOD_D, 3)}${P('M20 40 L80 42 Q90 50 80 58 L20 60 Q14 50 20 40 Z', '#3b3a42')}${C(84, 50, 6, '#1a1a1f', 3)}`,
  lamp: (_w, _h, o) => `<circle cx="50" cy="50" r="34" fill="${o.tint ?? '#fff3b0'}" fill-opacity=".35" stroke-opacity=".35"/>${SHC(50, 50, 20)}${C(50, 50, 20, o.tint ?? '#f6d36b')}${C(50, 50, 9, '#fff8d8', 3)}`,
  streetlamp: () => `<circle cx="50" cy="26" r="26" fill="#fff3b0" fill-opacity=".4" stroke-opacity=".4"/>${R(46, 34, 8, 56, '#3b3a42', 3, 3)}${R(36, 86, 28, 8, '#3b3a42', 3, 3)}${P('M36 14 L64 14 L60 36 L40 36 Z', '#f6d36b')}${R(34, 8, 32, 8, '#3b3a42', 3, 3)}`,
  fridge: (_w, _h, o) => `${SH(18, 6, 64, 88, 8)}${R(18, 6, 64, 88, o.tint ?? '#eef2f5', 8)}${L(18, 38, 82, 38, 3)}${R(24, 16, 6, 16, METAL_D, 2, 2)}${R(24, 46, 6, 24, METAL_D, 2, 2)}`,
  stove: () => `${SH(10, 10, 80, 80, 6)}${R(10, 10, 80, 80, '#d8d3ca', 6)}${R(16, 16, 68, 68, '#2f2b33', 4, 3)}${C(34, 34, 10, '#4a4550', 3)}${C(66, 34, 10, '#4a4550', 3)}${C(34, 66, 10, '#4a4550', 3)}${C(66, 66, 10, '#ff6b2a', 3)}`,
  cage: () => `${SH(12, 12, 76, 76, 6)}${R(12, 12, 76, 76, 'rgba(255,255,255,.15)', 6)}${[24, 37, 50, 63, 76].map((x) => L(x, 14, x, 86, 3.5, '#4a4550')).join('')}${R(12, 12, 76, 76, 'none', 6)}`,
  fence: (w, h) => {
    const horiz = w >= h;
    const Lw = horiz ? w : h;
    let posts = '';
    for (let x = 12; x <= Lw - 10; x += 30) posts += horiz ? R(x - 6, 30, 12, 40, WOOD_D, 3, 3) : R(30, x - 6, 40, 12, WOOD_D, 3, 3);
    const rails = horiz ? `${R(4, 38, w - 8, 8, WOOD, 3, 3)}${R(4, 56, w - 8, 8, WOOD, 3, 3)}` : `${R(38, 4, 8, h - 8, WOOD, 3, 3)}${R(56, 4, 8, h - 8, WOOD, 3, 3)}`;
    return rails + posts;
  },
  cauldron: () => `${SHC(50, 56, 32)}${C(50, 56, 32, '#2f2b33')}${C(50, 54, 24, '#6bd36b', 3)}${C(42, 50, 5, '#a6f0a0', 2)}${C(56, 58, 4, '#a6f0a0', 2)}${C(54, 46, 3, '#d9ffd4', 2)}`,
  telescope: () => `${SHC(50, 70, 18)}${L(50, 60, 30, 88, 5)}${L(50, 60, 70, 88, 5)}${L(50, 60, 50, 90, 5)}${P('M24 54 L74 20 L82 32 L32 66 Z', '#c99a3c')}${R(74, 16, 14, 20, '#7a5520', 4, 3)}`,
  pedestal: (_w, _h, o) => `${SH(26, 30, 48, 60, 4)}${R(30, 40, 40, 50, '#e6e0d4', 3)}${R(24, 32, 52, 12, '#d0c9bb', 3)}${R(24, 84, 52, 8, '#d0c9bb', 3)}${P('M50 6 L64 22 L50 30 L36 22 Z', o.tint ?? '#7fd3ff')}`,
  holotable: (w, h, o) => {
    const glow = o.tint ?? '#5fd0ff';
    return `${SH(8, 8, w - 16, h - 16, 18)}${R(8, 8, w - 16, h - 16, '#4a5160', 18)}${R(18, 18, w - 36, h - 36, '#22303d', 12, 3)}<ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w - 44) / 2}" ry="${(h - 44) / 2}" fill="${glow}" fill-opacity=".45" stroke-opacity=".45"/>${C(w / 2, h / 2, Math.min(w, h) * 0.14, glow, 2.5)}`;
  },
  anvil: () => `${SH(14, 30, 72, 50, 4)}${R(36, 56, 28, 18, '#4a4550', 2)}${R(26, 72, 48, 14, '#3b3a42', 3)}${P('M10 32 Q30 30 30 40 L84 40 L90 30 L90 52 L22 52 Q12 48 10 32 Z', '#5b5762')}`,
  shield: (_w, _h, o) => {
    const f = o.tint ?? '#d9483b';
    return `${SHC(50, 50, 36)}${C(50, 50, 36, f)}${P('M50 14 L50 86 M14 50 L86 50', 'none', 0)}${P('M50 14 A36 36 0 0 1 86 50 L50 50 Z', lighten(f, 0.35), 3)}${P('M50 86 A36 36 0 0 1 14 50 L50 50 Z', lighten(f, 0.35), 3)}${C(50, 50, 10, METAL, 3)}${C(50, 50, 36, 'none', 5)}`;
  },
  cake: (_w, _h, o) => {
    const f = o.tint ?? '#f7d7e8';
    return `${SHE(50, 80, 38, 10)}${R(14, 62, 72, 24, f, 6)}${R(24, 42, 52, 22, lighten(f, 0.2), 6)}${R(34, 24, 32, 20, f, 6)}${P('M14 70 Q24 76 32 70 Q42 76 50 70 Q58 76 68 70 Q78 76 86 70', 'none', 3)}${R(47, 10, 6, 14, '#f3c33b', 2, 2)}<circle cx="50" cy="8" r="4" fill="#ff8a2a"/>`;
  },
  coffin: (w, h, o) => orient(w, h, 'S', (Lw) => `${SH(6, 14, Lw - 12, 72, 4)}${P(`M6 50 L${Lw * 0.22} 14 L${Lw - 10} 22 L${Lw - 10} 78 L${Lw * 0.22} 86 Z`, o.tint ?? '#5a3a2a')}${L(Lw * 0.45, 50, Lw * 0.75, 50, 5, '#d8c27a')}${L(Lw * 0.55, 36, Lw * 0.55, 64, 5, '#d8c27a')}`),
  grave: (_w, _h, o) => `${SH(22, 14, 56, 76, 20)}${P('M22 90 L22 40 Q22 14 50 14 Q78 14 78 40 L78 90 Z', o.tint ?? '#a9a49c')}<text x="50" y="52" font-family="Georgia,serif" font-size="17" font-weight="700" text-anchor="middle" fill="${INK}">RIP</text>${R(14, 84, 72, 10, '#7a6f5f', 3, 3)}`,
  doll: () => `${SH(26, 10, 48, 80, 20)}${P('M32 52 L68 52 L76 90 L24 90 Z', '#f08a24')}${R(34, 46, 32, 12, '#f6e05e', 4, 3)}${C(50, 32, 18, '#f5d3b5')}${P('M32 30 Q32 12 50 12 Q68 12 68 30 Q60 22 50 22 Q40 22 32 30 Z', '#2b2027')}${C(30, 36, 6, '#2b2027', 3)}${C(70, 36, 6, '#2b2027', 3)}${C(44, 32, 2.5, INK, 0)}${C(56, 32, 2.5, INK, 0)}`,
  press: (w, h, o) => `${SH(6, 10, w - 12, h - 20, 8)}${R(6, 10, w - 12, h - 20, o.tint ?? '#6f7985', 8)}${R(16, 20, w - 32, h - 40, '#9fe2a6', 4, 3)}${[0.3, 0.5, 0.7].map((t) => L(16, 20 + (h - 40) * t, w - 16, 20 + (h - 40) * t, 2.5, '#3f8c43')).join('')}${C(22, h / 2, 9, METAL_D, 3)}${C(w - 22, h / 2, 9, METAL_D, 3)}`,
  safe: () => `${SH(14, 12, 72, 78, 6)}${R(14, 12, 72, 78, '#55606e', 6)}${R(22, 20, 56, 62, '#6c7887', 4, 3)}${C(50, 50, 14, '#c9d1da', 3)}${L(50, 50, 58, 42, 3)}${R(64, 44, 8, 14, '#c9d1da', 2, 2)}`,
  gold: (_w, _h, o) => {
    const bar = (x: number, y: number) => P(`M${x} ${y + 14} L${x + 6} ${y} L${x + 30} ${y} L${x + 36} ${y + 14} Z`, o.tint ?? GOLD, 3);
    return `${SH(12, 30, 76, 54, 4)}${bar(12, 70)}${bar(52, 70)}${bar(32, 52)}${bar(12, 70)}${bar(32, 70)}${bar(52, 70)}${bar(22, 52)}${bar(42, 52)}${bar(32, 34)}`;
  },
  carbonite: () => `${SH(18, 6, 64, 88, 6)}${R(18, 6, 64, 88, '#5a6470', 6)}${P('M38 22 Q50 12 62 22 L64 40 Q70 50 66 60 L60 86 L40 86 L34 60 Q30 50 36 40 Z', '#7b8794', 3)}${P('M42 30 Q50 26 58 30', 'none', 3)}${P('M36 50 Q30 40 32 30', 'none', 3)}${P('M64 50 Q70 40 68 30', 'none', 3)}`,
  pit: (w, h) => `${R(6, 6, w - 12, h - 12, '#1d1820', 20)}${R(14, 14, w - 28, h - 28, '#0d0a10', 16, 0)}${[0.25, 0.5, 0.75].map((t) => `<path d="M${w * t - 8} ${h - 14} L${w * t} ${h - 26} L${w * t + 8} ${h - 14}" fill="#e8e0d0" stroke="${INK}" stroke-width="2"/>`).join('')}`,
  watchtower: () => `${SH(14, 14, 72, 76, 4)}${L(24, 90, 32, 40, 5)}${L(76, 90, 68, 40, 5)}${L(28, 66, 72, 66, 4)}${R(18, 26, 64, 18, WOOD, 3)}${P('M14 26 L50 6 L86 26 Z', '#8a3b2a')}${R(44, 44, 12, 46, WOOD_D, 2, 3)}`,
  walker: () => `${SH(28, 14, 44, 78, 18)}${P('M34 46 Q34 38 42 38 L58 38 Q66 38 66 46 L64 74 L36 74 Z', '#6b7b5a')}${R(36, 74, 11, 18, '#4a4550', 3, 3)}${R(53, 74, 11, 18, '#4a4550', 3, 3)}${P('M34 46 L16 52 L14 46', '#9cb38a', 3)}${P('M66 46 L84 52 L86 46', '#9cb38a', 3)}${C(50, 26, 14, '#9cb38a')}${C(45, 24, 3, '#c0392b', 0)}${C(56, 25, 3, '#c0392b', 0)}${P('M44 32 L56 32', 'none', 3)}`,
  titan: (w, h) => {
    const cx = w / 2, s = Math.min(w, h) / 100;
    return `<g transform="translate(${cx - 50 * s} ${h - 100 * s}) scale(${s})">${SHE(50, 70, 44, 26)}${P('M8 100 Q10 70 30 64 L70 64 Q90 70 92 100 Z', '#d98b74')}${P('M24 64 Q18 30 34 16 Q50 6 66 16 Q82 30 76 64 Z', '#e8a38c')}${P('M34 46 L66 46 L62 58 L38 58 Z', WHITE, 3)}${[40, 46, 52, 58].map((x) => L(x, 46, x, 58, 2)).join('')}${C(40, 34, 5, WHITE, 3)}${C(60, 34, 5, WHITE, 3)}${C(40, 34, 2, INK, 0)}${C(60, 34, 2, INK, 0)}${P('M28 26 Q40 8 60 12 Q74 16 74 30 Q64 18 50 18 Q36 18 28 26 Z', '#5a3a2a', 3)}</g>`;
  },
  mailbox: () => `${SH(10, 14, 80, 72, 4)}${R(10, 14, 80, 72, '#b9c2cc', 4)}${[0, 1, 2].map((i) => [0, 1].map((j) => R(16 + i * 24, 20 + j * 32, 20, 26, '#dfe5ea', 2, 2.5) + R(22 + i * 24, 26 + j * 32, 8, 3, INK, 1, 0)).join('')).join('')}`,
  aquarium: () => `${SH(10, 18, 80, 64, 4)}${R(10, 18, 80, 64, '#8fd3f0', 4)}${R(10, 18, 80, 12, '#c9edf9', 4, 3)}${P('M30 62 Q24 54 30 48 L36 52 Q42 46 48 52 L44 60 Q48 66 40 70 Z', '#e0503a', 3)}${C(66, 62, 9, '#ef7a3a', 3)}${L(60, 56, 54, 48, 3)}${L(72, 56, 78, 48, 3)}`,
  typewriter: () => `${SH(10, 26, 80, 60, 8)}${R(10, 40, 80, 46, '#3a3f47', 10)}${R(24, 14, 52, 30, WHITE, 2, 3)}${L(30, 22, 64, 22, 2)}${L(30, 30, 58, 30, 2)}${[22, 34, 46, 58, 70].map((x) => C(x, 58, 5, '#d8d3ca', 2) + C(x + 6, 72, 5, '#d8d3ca', 2)).join('')}`,
  cello: () => `${SH(30, 8, 40, 86, 20)}${P('M50 8 L50 30', 'none', 6)}${P('M38 34 Q30 30 32 44 Q36 52 32 60 Q26 76 38 88 Q50 94 62 88 Q74 76 68 60 Q64 52 68 44 Q70 30 62 34 Q56 38 50 36 Q44 38 38 34 Z', '#a5582c')}${P('M44 56 Q42 60 44 64 M56 56 Q58 60 56 64', 'none', 3)}${L(50, 30, 50, 82, 2.5, '#e8d9b0')}${L(18, 72, 84, 46, 3, '#c9a46a')}`,
  fryer: () => `${SH(10, 14, 80, 74, 6)}${R(10, 14, 80, 74, '#b9c2cc', 6)}${R(18, 22, 30, 40, '#e8a33a', 3, 3)}${R(52, 22, 30, 40, '#e8a33a', 3, 3)}${L(33, 22, 33, 10, 4)}${L(67, 22, 67, 10, 4)}${R(20, 68, 60, 12, '#77818c', 3, 3)}`,
  egg: () => `${SHE(50, 60, 30, 18)}${P('M18 70 Q24 56 34 60 Q40 50 50 56 Q60 50 66 60 Q76 56 82 70 Q66 80 50 78 Q34 80 18 70 Z', '#c9a46a', 3)}${E(50, 46, 20, 28, '#efe6cf')}${C(44, 36, 3, '#8fbf6a', 0)}${C(56, 46, 4, '#8fbf6a', 0)}${C(46, 56, 3, '#8fbf6a', 0)}`,
  dragonball: () => `${SHC(50, 52, 26)}${C(50, 50, 26, '#ff9d1e')}${C(42, 42, 7, '#ffd27a', 0)}${P('M50 40 L53 47 L60 47 L54 52 L56 59 L50 55 L44 59 L46 52 L40 47 L47 47 Z', '#e0302b', 1.5)}`,
  foosball: () => `${SH(8, 18, 84, 64, 6)}${R(8, 18, 84, 64, '#3a7a3a', 6)}${R(14, 24, 72, 52, '#4caf50', 3, 2.5)}${L(50, 24, 50, 76, 2, WHITE)}${[24, 40, 60, 76].map((x, k) => L(x, 12, x, 88, 3, METAL_D) + C(x, 36 + (k % 2) * 14, 4, k < 2 ? '#d9483b' : '#4a78d1', 2) + C(x, 64 - (k % 2) * 14, 4, k < 2 ? '#d9483b' : '#4a78d1', 2)).join('')}`,
  duck: () => `${SHE(50, 62, 30, 16)}${P('M22 60 Q20 44 36 44 Q40 30 54 30 Q66 30 66 42 L80 46 L66 50 Q76 66 60 74 L34 74 Q20 72 22 60 Z', WHITE)}${C(58, 39, 3, INK, 0)}${P('M66 42 L80 46 L66 50 Z', '#f3a33b', 3)}${P('M30 58 Q40 52 50 60', 'none', 3)}`,
  copier: () => `${SH(10, 14, 80, 74, 6)}${R(10, 26, 80, 62, '#d5d9de', 6)}${R(16, 14, 68, 18, '#eef1f3', 4, 3)}${R(24, 38, 40, 10, '#3a3f47', 2, 2)}${C(74, 43, 4, '#5db55a', 2)}${R(20, 58, 60, 18, WHITE, 2, 3)}`,
  vending: () => `${SH(16, 6, 68, 88, 6)}${R(16, 6, 68, 88, '#d9483b', 6)}${R(22, 12, 40, 62, '#cfe9f5', 3, 3)}${[0, 1, 2, 3].map((j) => [0, 1, 2].map((i) => `<rect x="${26 + i * 12}" y="${16 + j * 14}" width="8" height="9" rx="2" fill="${['#f3c33b', '#5db55a', '#8e6cc9', '#4a78d1'][(i + j) % 4]}"/>`).join('')).join('')}${R(66, 20, 12, 22, '#2f2b33', 2, 2)}${R(24, 78, 36, 10, '#2f2b33', 2, 2)}`,
  dumpster: () => `${SH(8, 18, 84, 68, 6)}${R(10, 30, 80, 56, '#3f7f4f', 4)}${P('M6 30 L94 30 L88 18 L12 18 Z', '#2f6a3f')}${L(30, 30, 30, 86, 3)}${L(70, 30, 70, 86, 3)}`,
  toybox: () => `${SH(10, 26, 80, 62, 6)}${R(10, 40, 80, 48, '#f3b23b', 6)}${C(30, 34, 10, '#e05a47', 3)}${R(48, 22, 16, 18, '#4a78d1', 3, 3)}${C(72, 32, 8, '#5db55a', 3)}${R(10, 40, 80, 10, '#e09a2b', 4, 3)}<text x="50" y="76" font-family="Arial Black,Arial" font-size="18" font-weight="900" text-anchor="middle" fill="${WHITE}" stroke="${INK}" stroke-width="2" paint-order="stroke">ABC</text>`,
  outhouse: () => `${SH(18, 10, 64, 82, 4)}${R(22, 26, 56, 66, WOOD, 3)}${P('M14 28 L50 8 L86 28 Z', '#8a5a35')}${R(34, 40, 32, 52, WOOD_D, 3, 3)}${P('M52 52 Q44 56 52 62 Q46 62 46 57 Q46 52 52 52 Z', '#f3c33b', 2)}`,
  bike: () => `${C(26, 64, 18, 'none', 5)}${C(74, 64, 18, 'none', 5)}${P('M26 64 L42 40 L66 40 L74 64 M42 40 L50 64 L66 40 M50 64 L26 64', 'none', 4)}${L(40, 32, 48, 32, 5)}${L(64, 34, 70, 28, 4)}${C(50, 64, 4, INK, 0)}`,
  arcade: () => `${SH(18, 6, 64, 88, 6)}${P('M18 94 L18 20 Q18 6 32 6 L68 6 Q82 6 82 20 L82 94 Z', '#5a3fa0')}${R(26, 16, 48, 34, '#2b2631', 3, 3)}${R(30, 20, 40, 26, '#5fd0ff', 2, 2)}${R(22, 56, 56, 14, '#2f2b33', 3, 3)}${C(36, 63, 4, '#e0302b', 2)}${C(50, 63, 4, '#f3c33b', 2)}${L(64, 66, 64, 56, 3)}`,
  helm: () => `${SHC(50, 50, 34)}${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k / 8) * Math.PI * 2; return L(50 + Math.cos(a) * 16, 50 + Math.sin(a) * 16, 50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42, 6, '#7a4a2c') + L(50 + Math.cos(a) * 16, 50 + Math.sin(a) * 16, 50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42, 2.5, WOOD); }).join('')}${C(50, 50, 30, 'none', 9)}<circle cx="50" cy="50" r="30" fill="none" stroke="${WOOD}" stroke-width="5"/>${C(50, 50, 10, WOOD_D)}`,
  anchor: () => `${C(50, 18, 8, 'none', 5)}${L(50, 26, 50, 86, 6)}${L(34, 38, 66, 38, 6)}${P('M18 62 Q22 86 50 86 Q78 86 82 62', 'none', 6)}${P('M14 66 L18 58 L24 66', 'none', 5)}${P('M76 66 L82 58 L88 66', 'none', 5)}`,
  orb: (_w, _h, o) => `${SH(30, 64, 40, 24, 6)}${P('M30 88 L36 66 L64 66 L70 88 Z', '#5b5560')}${C(50, 42, 26, '#24202c')}${C(50, 42, 18, o.tint ?? '#ff7a22', 0)}<circle cx="50" cy="42" r="18" fill="${o.tint ?? '#ff7a22'}" fill-opacity=".5" stroke-opacity=".5"/>${HL('M38 30 Q44 24 52 24')}`,
  hammer: () => `${SH(18, 10, 64, 80, 8)}${R(46, 40, 10, 50, '#8a5a35', 4)}${R(18, 14, 64, 34, '#9aa3ad', 8)}${R(18, 14, 64, 10, '#c9d1da', 6, 3)}${R(46, 84, 10, 8, '#5a3a2a', 2, 3)}`,
  banner: (_w, _h, o) => `${L(26, 8, 26, 94, 5)}${P('M28 12 L84 12 L84 62 L56 52 L28 62 Z', o.tint ?? '#c0392b')}${C(56, 32, 9, GOLD, 3)}${C(26, 8, 4, GOLD, 2)}`,
  vase: (_w, _h, o) => `${SHE(50, 80, 18, 8)}${P('M38 88 Q30 70 38 56 Q42 50 40 44 L60 44 Q58 50 62 56 Q70 70 62 88 Z', o.tint ?? '#4a78d1')}${C(40, 32, 9, '#e05a8a', 3)}${C(58, 28, 9, '#f3c33b', 3)}${C(50, 20, 8, '#e05a47', 3)}${L(50, 44, 50, 28, 3, LEAF_D)}`,
  clock: () => `${SH(28, 4, 44, 90, 6)}${R(28, 4, 44, 90, '#7a4a2c', 6)}${C(50, 26, 15, CREAM, 3)}${L(50, 26, 50, 16, 3)}${L(50, 26, 58, 30, 3)}${R(38, 46, 24, 40, '#5a3a2a', 4, 3)}${C(50, 74, 6, GOLD, 2)}${L(50, 50, 50, 68, 2.5, GOLD)}`,
  toilet: () => `${SH(26, 10, 48, 80, 20)}${R(28, 8, 44, 22, WHITE, 6)}${E(50, 60, 22, 28, WHITE)}${E(50, 62, 13, 18, '#bfe6f5', 3)}`,
  sink: () => `${SH(14, 18, 72, 64, 10)}${R(14, 18, 72, 64, WHITE, 10)}${E(50, 54, 24, 18, '#bfe6f5', 3)}${R(44, 22, 12, 14, METAL, 3, 3)}`,
  cactus: () => `${SHC(50, 70, 16)}${R(34, 72, 32, 20, POT, 4)}${R(43, 14, 16, 62, LEAF, 8)}${P('M43 52 L32 52 Q26 52 26 46 L26 32', 'none', 9)}${P('M43 52 L32 52 Q26 52 26 46 L26 32', 'none', 0)}<path d="M43 52 L32 52 Q26 52 26 44 L26 32" fill="none" stroke="${LEAF}" stroke-width="8" stroke-linecap="round"/><path d="M59 44 L68 44 Q74 44 74 38 L74 26" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M59 44 L68 44 Q74 44 74 38 L74 26" fill="none" stroke="${LEAF}" stroke-width="8" stroke-linecap="round"/>`,
  machine: (w, h, o) => `${SH(6, 8, w - 12, h - 16, 8)}${R(6, 8, w - 12, h - 16, o.tint ?? '#7d8794', 8)}${R(14, 16, Math.min(40, w - 28), 26, '#2f2b33', 3, 3)}${C(w - 26, 28, 9, '#f3c33b', 3)}${C(w - 26, h - 30, 7, '#e0302b', 3)}${L(14, h - 26, w - 44, h - 26, 4, '#3a3f47')}`,
  console: (w, h, o) => {
    const f = o.tint ?? '#5b6573';
    let btns = '';
    const cols = ['#e0302b', '#f3c33b', '#5db55a', '#5fd0ff'];
    for (let x = 22, k = 0; x < w - 16; x += 16, k++) btns += C(x, h * 0.62, 4.5, cols[k % 4], 2);
    return `${SH(6, 14, w - 12, h - 28, 8)}${R(6, 14, w - 12, h - 28, f, 8)}${R(14, 22, w - 28, h * 0.28, '#163042', 3, 3)}<path d="M18 ${22 + h * 0.18} L${w * 0.3} ${22 + h * 0.08} L${w * 0.5} ${22 + h * 0.2} L${w - 20} ${22 + h * 0.06}" fill="none" stroke="#5fd0ff" stroke-width="3"/>${btns}`;
  },
  crib: () => `${SH(12, 12, 76, 76, 6)}${R(12, 12, 76, 76, '#f3e3c9', 6)}${R(20, 20, 60, 60, '#cfe6f7', 4, 2.5)}${[24, 36, 48, 60, 72].map((x) => L(x, 12, x, 18, 3) + L(x, 82, x, 88, 3)).join('')}${R(28, 28, 22, 18, WHITE, 6, 2.5)}`,
  blocks: () => `${SH(14, 22, 72, 68, 4)}${R(14, 58, 32, 32, '#e05a47', 3)}${R(50, 58, 32, 32, '#4a78d1', 3)}${R(32, 24, 32, 32, '#f3c33b', 3)}<text x="30" y="82" font-family="Arial Black,Arial" font-size="20" text-anchor="middle" fill="${WHITE}">A</text><text x="66" y="82" font-family="Arial Black,Arial" font-size="20" text-anchor="middle" fill="${WHITE}">B</text><text x="48" y="48" font-family="Arial Black,Arial" font-size="20" text-anchor="middle" fill="${INK}">C</text>`,
  pumpkin: () => `${SHE(50, 60, 32, 24)}${E(50, 58, 34, 26, '#f08a24')}${E(50, 58, 16, 26, '#f5a142', 3)}${E(50, 58, 4, 26, '#e07a14', 2)}${P('M48 32 Q50 22 58 18', 'none', 5)}`,
  beehive: () => `${SHE(50, 60, 28, 30)}${P('M22 84 Q16 60 26 40 Q36 18 50 18 Q64 18 74 40 Q84 60 78 84 Z', '#f3c33b')}${[38, 52, 66].map((y) => P(`M${24 + (y - 38) * 0.1} ${y} Q50 ${y + 6} ${76 - (y - 38) * 0.1} ${y}`, 'none', 3)).join('')}${E(50, 74, 8, 6, '#3b2a14', 3)}${C(80, 26, 4, '#2b2631', 0)}`,
};

/** Icono sin coincidencia: interrogante (evita casillas vacías por error). */
export const FALLBACK: IconFn = () => `${R(20, 20, 60, 60, '#ddd', 8)}<text x="50" y="62" font-size="36" text-anchor="middle" fill="${INK}">?</text>`;
