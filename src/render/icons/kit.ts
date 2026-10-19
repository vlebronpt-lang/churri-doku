/**
 * Piezas comunes para dibujar los objetos del plano (SVG en una casilla de 100×100).
 * Estilo «pegatina»: trazo de tinta grueso, colores planos, sombra a la derecha y abajo, brillo arriba a la izquierda.
 * Sin degradados ni `opacity` de grupo: los PDF se mantienen vectoriales y ligeros.
 */
export const INK = '#2b2631';
export const SW = 4;

export type Facing = 'N' | 'E' | 'S' | 'W';
export interface IconOpts {
  tint?: string;
  facing?: Facing;
}
export type IconFn = (w: number, h: number, o: IconOpts) => string;

export const WOOD = '#c98a52';
export const WOOD_D = '#9b6136';
export const WOOD_L = '#e3ad74';
export const METAL = '#a9b2bc';
export const METAL_D = '#77818c';
export const METAL_L = '#d5dbe1';
export const STONE = '#c9c2b6';
export const MARBLE = '#e6e1d7';
export const LEAF = '#5db55a';
export const LEAF_D = '#3f8c43';
export const LEAF_L = '#93d283';
export const POT = '#d2733f';
export const GOLD = '#f3c33b';
export const GOLD_D = '#c99a1e';
export const CREAM = '#f5eee0';
export const WHITE = '#fbfaf6';
export const DARK = '#3b3644';
export const RED = '#d9483b';
export const BLUE = '#4a78d1';
export const GLASS = '#bfe6f5';
export const FIRE = '#ff7a22';
export const FLAME = '#ffd447';

const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** Rectángulo con trazo. */
export const R = (x: number, y: number, w: number, h: number, fill: string, rx = 6, sw = SW) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
/** Círculo con trazo. */
export const C = (cx: number, cy: number, r: number, fill: string, sw = SW) =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
/** Elipse con trazo. */
export const E = (cx: number, cy: number, rx: number, ry: number, fill: string, sw = SW) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
/** Trazado con relleno y trazo. */
export const P = (d: string, fill: string, sw = SW) =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
/** Línea recta. */
export const L = (x1: number, y1: number, x2: number, y2: number, sw = SW, col = INK) =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`;
/** Trazo sin relleno (detalles, vetas, pliegues). */
export const LN = (d: string, sw = 2.5, col = INK, alpha = 1) =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${alpha < 1 ? ` stroke-opacity="${alpha}"` : ''}/>`;
/** Mancha de sombra (sin trazo) dentro de una pieza. */
export const SHADE = (d: string, a = 0.16) => `<path d="${d}" fill="#000" fill-opacity="${a}"/>`;
/** Mancha de luz (sin trazo) dentro de una pieza. */
export const LIGHT = (d: string, a = 0.4) => `<path d="${d}" fill="#fff" fill-opacity="${a}"/>`;
/** Brillo en forma de trazo blanco. */
export const HL = (d: string, sw = 4, a = 0.5) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-opacity="${a}"/>`;
/** Punto (remaches, botones, ojos) sin trazo. */
export const DOT = (cx: number, cy: number, r: number, fill = INK, a = 1) =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${a < 1 ? ` fill-opacity="${a}"` : ''}/>`;

/** Sombras proyectadas (desplazadas abajo a la derecha). */
export const SH = (x: number, y: number, w: number, h: number, rx = 8) =>
  `<rect x="${n(x + 4)}" y="${n(y + 5)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="#000" fill-opacity=".17"/>`;
export const SHC = (cx: number, cy: number, r: number) => `<circle cx="${n(cx + 4)}" cy="${n(cy + 5)}" r="${n(r)}" fill="#000" fill-opacity=".17"/>`;
export const SHE = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${n(cx + 4)}" cy="${n(cy + 5)}" rx="${n(rx)}" ry="${n(ry)}" fill="#000" fill-opacity=".17"/>`;
export const SHP = (d: string) => `<path d="${d}" transform="translate(4 5)" fill="#000" fill-opacity=".17"/>`;

/** Llama de dos colores con base en (cx, by) y altura h. */
export function flame(cx: number, by: number, w: number, h: number) {
  const x0 = cx - w / 2, x1 = cx + w / 2, top = by - h;
  const outer = `M${n(x0)} ${n(by)} Q${n(x0 - w * 0.1)} ${n(by - h * 0.55)} ${n(cx - w * 0.18)} ${n(by - h * 0.7)} Q${n(cx - w * 0.12)} ${n(by - h * 0.45)} ${n(cx)} ${n(by - h * 0.5)} Q${n(cx - w * 0.05)} ${n(top + h * 0.15)} ${n(cx + w * 0.12)} ${n(top)} Q${n(cx + w * 0.2)} ${n(by - h * 0.62)} ${n(cx + w * 0.34)} ${n(by - h * 0.6)} Q${n(x1 + w * 0.08)} ${n(by - h * 0.3)} ${n(x1)} ${n(by)} Z`;
  const iw = w * 0.5, ih = h * 0.5;
  const inner = `M${n(cx - iw / 2)} ${n(by)} Q${n(cx - iw / 2)} ${n(by - ih * 0.7)} ${n(cx)} ${n(by - ih)} Q${n(cx + iw / 2)} ${n(by - ih * 0.6)} ${n(cx + iw / 2)} ${n(by)} Z`;
  return `${P(outer, FIRE, 3)}${P(inner, FLAME, 2)}`;
}

/** Rota un icono de una casilla (dibujado mirando al sur) hacia `facing`. */
export function rot1(facing: Facing | undefined, svg: string) {
  const deg = facing === 'N' ? 180 : facing === 'E' ? -90 : facing === 'W' ? 90 : 0;
  return deg ? `<g transform="rotate(${deg} 50 50)">${svg}</g>` : svg;
}

/**
 * Dibujo canónico horizontal (L×100, «respaldo» arriba / cabecera a la izquierda)
 * colocado en una caja w×h según la orientación.
 */
export function orient(w: number, h: number, facing: Facing | undefined, draw: (L: number) => string) {
  if (w >= h) {
    const svg = draw(w);
    if (facing === 'N') return `<g transform="rotate(180 ${w / 2} ${h / 2})">${svg}</g>`;
    return svg;
  }
  const svg = draw(h);
  if (facing === 'W') return `<g transform="translate(100 0) rotate(90)">${svg}</g>`;
  return `<g transform="translate(0 ${h}) rotate(-90)">${svg}</g>`;
}

/** Copa de árbol o arbusto vista desde arriba: grupos de hojas con luz y sombra. */
export function leafy(cx: number, cy: number, r: number, base: string, dark: string, light: string, lobes = 8) {
  const pts: [number, number][] = [];
  for (let k = 0; k < lobes; k++) {
    const a = (k / lobes) * Math.PI * 2 - Math.PI / 2;
    const rr = r * (k % 2 ? 0.58 : 0.64);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  const lr = r * 0.44;
  const blobs = pts.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(lr)}"/>`).join('');
  // Sombra interior (abajo a la derecha) y racimos de luz (arriba a la izquierda).
  const shadeBlobs = pts.filter((_, k) => k >= 2 && k <= 5).map(([x, y]) => `<circle cx="${n(x + 3)}" cy="${n(y + 3)}" r="${n(lr * 0.7)}"/>`).join('');
  const lights = pts.filter((_, k) => k === 0 || k >= lobes - 2).map(([x, y]) => `<circle cx="${n(x - lr * 0.2)}" cy="${n(y - lr * 0.2)}" r="${n(lr * 0.34)}"/>`).join('');
  return `<g fill="#000" fill-opacity=".17" transform="translate(4 5)">${blobs}<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.62)}"/></g>`
    + `<g fill="${base}" stroke="${INK}" stroke-width="${SW}">${blobs}</g>`
    + `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.66)}" fill="${base}"/>`
    + `<g fill="${dark}" fill-opacity=".6">${shadeBlobs}<circle cx="${n(cx + r * 0.14)}" cy="${n(cy + r * 0.16)}" r="${n(r * 0.36)}"/></g>`
    + LN(`M${n(cx - r * 0.3)} ${n(cy + r * 0.05)} q${n(r * 0.12)} ${n(-r * 0.1)} ${n(r * 0.24)} 0 M${n(cx + r * 0.05)} ${n(cy - r * 0.32)} q${n(r * 0.1)} ${n(-r * 0.08)} ${n(r * 0.2)} 0`, 2.2, dark, 0.8)
    + `<g fill="${light}">${lights}</g>`
    + `<circle cx="${n(cx - r * 0.24)}" cy="${n(cy - r * 0.22)}" r="${n(r * 0.16)}" fill="${light}"/>`;
}

/** Hilera de libros de colores (estanterías). */
export function bookRow(x: number, y: number, w: number, h: number, seed: number) {
  const cols = ['#d9483b', '#4a78d1', '#f3c33b', '#5db55a', '#8e6cc9', '#e8833a', '#3bb3a9'];
  let out = '';
  let cx = x;
  let k = seed;
  while (cx < x + w - 4) {
    const bw = 5 + ((k * 7) % 5);
    const bh = h - ((k * 3) % 5);
    const tilt = k % 9 === 4;
    const ww = Math.min(bw, x + w - cx);
    out += tilt
      ? `<rect x="${n(cx + 1)}" y="${n(y + (h - bh) + 1)}" width="${n(ww)}" height="${n(bh - 1)}" fill="${cols[k % cols.length]}" stroke="${INK}" stroke-width="1.5" transform="rotate(-12 ${n(cx + ww)} ${n(y + h)})"/>`
      : `<rect x="${n(cx)}" y="${n(y + (h - bh))}" width="${n(ww)}" height="${n(bh)}" fill="${cols[k % cols.length]}" stroke="${INK}" stroke-width="1.5"/>`;
    if (!tilt && bw >= 7) out += `<line x1="${n(cx + 1.5)}" y1="${n(y + (h - bh) + 4)}" x2="${n(cx + ww - 1.5)}" y2="${n(y + (h - bh) + 4)}" stroke="#fff" stroke-width="1.4" stroke-opacity=".55"/>`;
    cx += bw;
    k++;
  }
  return out;
}

/** Rectángulo de sombra o de luz (sin trazo), para sombrear piezas rectangulares. */
export const SR = (x: number, y: number, w: number, h: number, rx = 5, a = 0.15) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="#000" fill-opacity="${a}"/>`;
export const LR = (x: number, y: number, w: number, h: number, rx = 5, a = 0.35) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="#fff" fill-opacity="${a}"/>`;
