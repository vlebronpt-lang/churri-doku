import { darken, lighten } from '../color';
import {
  C, DOT, E, GOLD, HL, INK, L, LEAF, LEAF_D, LEAF_L, LN, P, POT, R, SHADE, SHC, SHE, SR, WHITE,
  leafy, type IconFn,
} from './kit';

/** Hoja con nervio central desde (x0, y0) hasta (x1, y1). */
function leaf(x0: number, y0: number, x1: number, y1: number, wide: number, fill: string) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * wide, ny = (dx / len) * wide;
  const f = (v: number) => v.toFixed(1);
  return P(`M${f(x0)} ${f(y0)} Q${f(mx + nx)} ${f(my + ny)} ${f(x1)} ${f(y1)} Q${f(mx - nx)} ${f(my - ny)} ${f(x0)} ${f(y0)} Z`, fill, 2.6)
    + LN(`M${f(x0)} ${f(y0)} Q${f(mx + nx * 0.15)} ${f(my + ny * 0.15)} ${f(x1 - dx * 0.1)} ${f(y1 - dy * 0.1)}`, 1.4, darken(fill, 0.35), 0.8);
}

/** Maceta vista desde arriba. */
function pot(cx: number, cy: number, r: number) {
  return SHC(cx, cy, r) + C(cx, cy, r, POT) + C(cx, cy, r * 0.74, '#7a4a2c', 2.5) + `<circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="none" stroke="#fff" stroke-width="1.6" stroke-opacity=".35"/>`;
}

export const NATURE: Record<string, IconFn> = {
  plant: () => pot(50, 57, 21)
    + leaf(50, 54, 20, 34, 9, LEAF) + leaf(50, 54, 80, 32, 9, LEAF_D) + leaf(50, 54, 54, 12, 8, LEAF_L)
    + leaf(50, 56, 18, 66, 8, LEAF_D) + leaf(50, 56, 82, 68, 8, LEAF) + leaf(50, 56, 36, 20, 7, LEAF_D) + leaf(50, 56, 68, 18, 7, LEAF),
  /** Mandrágora: raíz con cara asomando de la maceta. */
  mandrake: () => pot(50, 60, 24)
    + E(50, 58, 13, 11, '#d9b38c', 3)
    + DOT(45, 56, 1.8) + DOT(55, 56, 1.8) + E(50, 62.5, 3.5, 2.6, '#7a3a2a', 0)
    + LN('M41 52 Q44 50 47 52 M53 52 Q56 50 59 52', 1.4)
    + leaf(50, 48, 30, 26, 8, LEAF) + leaf(50, 48, 70, 26, 8, LEAF_D) + leaf(50, 48, 50, 16, 7, LEAF_L) + leaf(50, 48, 26, 40, 6, LEAF_D) + leaf(50, 48, 74, 40, 6, LEAF),
  tree: (_w, _h, o) => leafy(50, 50, 41, o.tint ?? LEAF, darken(o.tint ?? LEAF, 0.32), lighten(o.tint ?? LEAF, 0.35), 9),
  /** Arciano: árbol blanco de hojas rojas y cara tallada. */
  weirwood: (_w, _h, o) => {
    const red = o.tint ?? '#c94a4a';
    return leafy(50, 46, 40, red, darken(red, 0.35), lighten(red, 0.35), 9)
      + E(50, 62, 15, 18, '#f1ece2')
      + LN('M42 54 Q45 52 47 55 M53 55 Q55 52 58 54', 2)
      + `<path d="M43 57 Q44 62 42 66 M57 57 Q56 62 58 66" fill="none" stroke="${red}" stroke-width="2.4" stroke-linecap="round"/>`
      + P('M44 70 Q50 66 56 70 Q50 74 44 70 Z', '#5a2a2a', 2)
      + LN('M38 76 Q34 84 36 92 M62 76 Q66 84 64 92', 3, '#d8d1c3');
  },
  bush: (_w, _h, o) => {
    const f = o.tint ?? '#4fa34f';
    return leafy(50, 52, 31, f, darken(f, 0.32), LEAF_L, 7)
      + DOT(38, 46, 2.4, '#e05a8a') + DOT(60, 40, 2.4, '#f3c33b') + DOT(58, 62, 2.4, '#e05a8a') + DOT(44, 64, 2, WHITE);
  },
  /** Planta carnívora (Hiedra Venenosa). */
  flytrap: (_w, _h, o) => {
    const f = o.tint ?? '#9a5fc0';
    const trap = (cx: number, cy: number, a: number, s: number) => `<g transform="translate(${cx} ${cy}) rotate(${a}) scale(${s})">`
      + P('M0 0 Q-14 -18 0 -30 Q14 -18 0 0 Z', f, 3)
      + P('M0 -4 Q-8 -16 0 -24 Q8 -16 0 -4 Z', '#e0302b', 0)
      + LN('M-9 -8 L-13 -10 M-11 -15 L-15 -16 M-10 -22 L-14 -24 M9 -8 L13 -10 M11 -15 L15 -16 M10 -22 L14 -24', 1.8, WHITE)
      + '</g>';
    return pot(50, 62, 22)
      + LN('M50 58 Q40 46 30 38 M50 58 Q58 44 68 36 M50 58 Q50 44 50 30', 3, LEAF_D)
      + trap(30, 40, -40, 0.9) + trap(68, 38, 40, 0.9) + trap(50, 34, 0, 1)
      + leaf(50, 60, 24, 70, 6, LEAF) + leaf(50, 60, 76, 70, 6, LEAF_D);
  },
  palm: () => {
    let fr = '';
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      const x = 50 + Math.cos(a) * 44, y = 50 + Math.sin(a) * 44;
      fr += leaf(50, 50, x, y, 9, k % 2 ? LEAF : LEAF_D);
      for (let t = 0.35; t < 0.95; t += 0.15) {
        const px = 50 + Math.cos(a) * 44 * t, py = 50 + Math.sin(a) * 44 * t;
        const ox = Math.cos(a + 1.2) * 7, oy = Math.sin(a + 1.2) * 7;
        fr += `<path d="M${px.toFixed(1)} ${py.toFixed(1)} l${ox.toFixed(1)} ${oy.toFixed(1)}" stroke="${INK}" stroke-width="1.2" stroke-opacity=".5"/>`;
      }
    }
    return `<circle cx="54" cy="55" r="36" fill="#000" fill-opacity=".12"/>` + fr
      + C(45, 46, 6.5, '#8b5a2b', 2.6) + C(55, 45, 6.5, '#8b5a2b', 2.6) + C(50, 55, 6.5, '#8b5a2b', 2.6)
      + DOT(43, 44, 1.8, '#fff', 0.45) + DOT(53, 43, 1.8, '#fff', 0.45);
  },
  cactus: () => SHE(50, 86, 20, 5)
    + R(33, 72, 34, 20, POT, 4) + R(30, 68, 40, 8, darken(POT, 0.15), 3, 3)
    + `<path d="M43 52 L32 52 Q26 52 26 44 L26 32" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M43 52 L32 52 Q26 52 26 44 L26 32" fill="none" stroke="${LEAF}" stroke-width="7.5" stroke-linecap="round"/>`
    + `<path d="M59 44 L68 44 Q74 44 74 38 L74 26" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M59 44 L68 44 Q74 44 74 38 L74 26" fill="none" stroke="${LEAF}" stroke-width="7.5" stroke-linecap="round"/>`
    + R(42, 13, 17, 61, LEAF, 8.5)
    + LN('M50.5 18 V70 M46 22 V68 M55 22 V68', 1.4, LEAF_D, 0.8)
    + SR(52, 16, 6, 54, 3, 0.15)
    + C(50.5, 12, 4.5, '#e05a8a', 2) + DOT(50.5, 12, 1.6, GOLD)
    + LN('M40 30 L37 29 M61 38 L64 37 M40 50 L37 50 M61 58 L64 58 M24 38 L21 37 M76 32 L79 31', 1.4, INK, 0.7),
  rock: (_w, _h, o) => {
    const f = o.tint ?? '#a59e94';
    return SHE(50, 57, 37, 27)
      + P('M15 62 Q11 40 29 29 Q44 16 63 23 Q85 27 87 50 Q89 71 70 79 Q46 87 27 81 Q15 75 15 62 Z', f)
      + P('M29 29 Q44 16 63 23 Q70 25 74 30 Q60 32 52 42 Q40 38 29 29 Z', lighten(f, 0.18), 0)
      + SHADE('M87 50 Q89 71 70 79 Q46 87 27 81 Q40 74 58 70 Q76 62 87 50 Z', 0.16)
      + LN('M52 42 Q60 32 74 30 M52 42 L46 58 M46 58 L58 66', 1.8, darken(f, 0.35))
      + DOT(36, 64, 3, '#7fae6a', 0.85) + DOT(42, 70, 2.2, '#7fae6a', 0.85) + DOT(70, 40, 2, '#7fae6a', 0.85)
      + HL('M26 44 Q32 36 42 33', 3, 0.45);
  },
  pumpkin: () => SHE(50, 61, 33, 24)
    + E(50, 58, 35, 27, '#f08a24')
    + E(50, 58, 21, 27, '#f5a142', 3) + E(50, 58, 7, 27, '#e57a14', 2.5)
    + SHADE('M62 33 Q85 38 85 58 Q85 80 62 84 Q72 70 72 58 Q72 44 62 33 Z', 0.14)
    + `<path d="M48 33 Q49 22 58 17" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M48 33 Q49 22 58 17" fill="none" stroke="#5a8a3a" stroke-width="4" stroke-linecap="round"/>`
    + leaf(56, 24, 72, 18, 5, LEAF)
    + HL('M24 48 Q28 38 36 35', 3, 0.5),
  beehive: () => SHE(50, 62, 29, 31)
    + L(50, 2, 50, 18, 3)
    + P('M21 85 Q14 60 25 40 Q36 18 50 18 Q64 18 75 40 Q86 60 79 85 Z', '#f3c33b')
    + [36, 50, 64, 76].map((y) => { const ww = 23 + (y - 36) * 0.18; return LN(`M${50 - ww} ${y} Q50 ${y + 5} ${50 + ww} ${y}`, 2.4); }).join('')
    + SHADE('M60 20 Q70 24 75 40 Q86 60 79 85 L64 85 Q70 60 60 20 Z', 0.13)
    + E(50, 74, 8, 6, '#3b2a14', 3)
    + [[80, 26], [86, 40], [18, 30]].map(([x, y]) => E(x, y, 4, 3, '#f3c33b', 1.6) + L(x - 2, y, x + 2, y, 1.4) + `<ellipse cx="${x}" cy="${y - 3.5}" rx="3" ry="2" fill="#fff" fill-opacity=".8" stroke="${INK}" stroke-width="1"/>`).join('')
    + HL('M30 48 Q34 36 42 30', 3, 0.45),
};
