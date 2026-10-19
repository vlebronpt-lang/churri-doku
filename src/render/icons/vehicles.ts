import { darken } from '../color';
import {
  C, DARK, DOT, E, FIRE, FLAME, GLASS, GOLD, HL, INK, L, LN, LR, METAL, METAL_D, P, R, RED, SH, SHE, SR, WHITE, WOOD, WOOD_D, WOOD_L,
  orient, type IconFn,
} from './kit';

/** Barcas, coches, naves y monturas (casi todos ocupables). */
export const VEHICLES: Record<string, IconFn> = {
  boat: (w, h, o) => {
    const f = o.tint ?? WOOD;
    return orient(w, h, o.facing, (Lw) => SHE(Lw / 2, 50, Lw / 2 - 6, 33)
      + P(`M7 50 Q${Lw * 0.2} 13 ${Lw * 0.6} 15 Q${Lw * 0.86} 17 ${Lw - 5} 50 Q${Lw * 0.86} 83 ${Lw * 0.6} 85 Q${Lw * 0.2} 87 7 50 Z`, f)
      + P(`M18 50 Q${Lw * 0.23} 26 ${Lw * 0.6} 27 Q${Lw * 0.8} 29 ${Lw - 19} 50 Q${Lw * 0.8} 71 ${Lw * 0.6} 73 Q${Lw * 0.23} 74 18 50 Z`, darken(f, 0.2), 3)
      + LN(`M24 43 Q${Lw / 2} 34 ${Lw - 26} 45 M24 57 Q${Lw / 2} 66 ${Lw - 26} 55`, 1.8, darken(f, 0.5), 0.55)
      + R(Lw * 0.3, 27, 11, 46, WOOD_L, 2, 3) + R(Lw * 0.58, 28, 11, 44, WOOD_L, 2, 3)
      + L(26, 46, Lw - 32, 40, 3.5, WOOD_D) + E(Lw - 30, 40, 7, 4, WOOD_L, 2.5)
      + HL(`M${Lw * 0.18} 23 Q${Lw * 0.42} 15 ${Lw * 0.66} 18`, 3, 0.45));
  },
  longship: (w, h, o) => {
    const f = o.tint ?? '#a8693c';
    return orient(w, h, o.facing, (Lw) => {
      let shields = '';
      const cols = [RED, GOLD, '#4a78d1', WHITE];
      for (let x = 34, k = 0; x < Lw - 34; x += 22, k++) {
        shields += C(x, 21, 8, cols[k % 4], 3) + DOT(x, 21, 2.2) + C(x, 79, 8, cols[(k + 2) % 4], 3) + DOT(x, 79, 2.2);
      }
      let benches = '';
      for (let x = 30; x < Lw - 30; x += 22) benches += L(x + 11, 31, x + 11, 69, 3, darken(f, 0.42));
      let stripes = '';
      for (let y = 22; y < 78; y += 11) stripes += `<rect x="${Lw / 2 - 7}" y="${y}" width="14" height="5.5" fill="${RED}"/>`;
      return SHE(Lw / 2, 50, Lw / 2 - 4, 35)
        + P(`M16 50 Q${Lw * 0.16} 13 ${Lw * 0.5} 12 Q${Lw * 0.84} 13 ${Lw - 16} 50 Q${Lw * 0.84} 87 ${Lw * 0.5} 88 Q${Lw * 0.16} 87 16 50 Z`, f)
        + P(`M26 50 Q${Lw * 0.2} 25 ${Lw * 0.5} 24 Q${Lw * 0.8} 25 ${Lw - 26} 50 Q${Lw * 0.8} 75 ${Lw * 0.5} 76 Q${Lw * 0.2} 75 26 50 Z`, darken(f, 0.18), 3)
        + benches
        + R(Lw / 2 - 7, 18, 14, 64, WHITE, 3, 3) + stripes + R(Lw / 2 - 7, 18, 14, 64, 'none', 3, 3)
        + C(Lw / 2, 50, 6, WOOD_D, 3)
        + shields
        + P(`M${Lw - 18} 50 Q${Lw - 10} 40 ${Lw - 2} 38 Q${Lw + 1} 46 ${Lw - 5} 52 Q${Lw - 10} 56 ${Lw - 18} 54 Z`, '#3b6e3b', 3) + DOT(Lw - 6, 43, 1.8, '#fff')
        + P('M18 50 Q10 40 4 42 Q2 50 4 58 Q10 60 18 54 Z', '#3b6e3b', 3)
        + HL(`M${Lw * 0.25} 19 Q${Lw * 0.45} 15 ${Lw * 0.6} 16`, 3, 0.4);
    });
  },
  car: (w, h, o) => {
    const f = o.tint ?? '#e05a47';
    return orient(w, h, o.facing, (Lw) => {
      const wheels = [Lw * 0.18, Lw * 0.7].map((x) => R(x, 7, 20, 10, DARK, 3, 3) + R(x, 83, 20, 10, DARK, 3, 3)).join('');
      return SH(6, 11, Lw - 12, 78, 24)
        + wheels
        + R(6, 12, Lw - 12, 76, f, 24)
        + SR(12, 70, Lw - 24, 14, 7, 0.14)
        + LN(`M${Lw * 0.8} 30 Q${Lw * 0.88} 50 ${Lw * 0.8} 70`, 2, darken(f, 0.35), 0.6)
        + P(`M${Lw * 0.62} 20 L${Lw * 0.75} 27 L${Lw * 0.75} 73 L${Lw * 0.62} 80 Z`, GLASS, 3)
        + R(Lw * 0.31, 20, Lw * 0.31, 60, darken(f, 0.14), 10)
        + LR(Lw * 0.34, 25, Lw * 0.12, 6, 3, 0.3)
        + P(`M${Lw * 0.31} 22 L${Lw * 0.22} 29 L${Lw * 0.22} 71 L${Lw * 0.31} 78 Z`, GLASS, 3)
        + R(Lw - 15, 18, 8, 14, '#fff7b0', 3, 2) + R(Lw - 15, 68, 8, 14, '#fff7b0', 3, 2)
        + R(7, 20, 7, 12, '#e8213f', 2, 2) + R(7, 68, 7, 12, '#e8213f', 2, 2)
        + R(Lw * 0.6, 6, 7, 7, f, 2, 2.5) + R(Lw * 0.6, 87, 7, 7, f, 2, 2.5)
        + HL(`M${Lw * 0.79} 22 H${Lw * 0.9}`, 3, 0.5)
        + HL(`M${Lw * 0.64} 26 L${Lw * 0.7} 30`, 2.6, 0.7);
    });
  },
  rv: (w, h, o) => {
    const f = o.tint ?? '#efe6cf';
    return orient(w, h, o.facing, (Lw) => SH(5, 9, Lw - 10, 82, 12)
      + R(Lw * 0.2, 5, 18, 8, DARK, 3, 3) + R(Lw * 0.2, 87, 18, 8, DARK, 3, 3) + R(Lw * 0.72, 5, 18, 8, DARK, 3, 3) + R(Lw * 0.72, 87, 18, 8, DARK, 3, 3)
      + R(5, 10, Lw - 10, 80, f, 12)
      + R(5, 40, Lw - 10, 8, '#c9a46a', 0, 0) + R(5, 50, Lw - 10, 4, '#7fb069', 0, 0)
      + R(5, 10, Lw - 10, 80, 'none', 12)
      + R(Lw - 42, 17, 28, 66, GLASS, 8, 3) + HL(`M${Lw - 36} 24 L${Lw - 26} 24`, 3, 0.6)
      + R(Lw * 0.36, 26, 26, 22, '#d5d1c8', 4, 3) + LN(`M${Lw * 0.36 + 5} 33 H${Lw * 0.36 + 21} M${Lw * 0.36 + 5} 40 H${Lw * 0.36 + 21}`, 2, METAL_D)
      + R(18, 22, 22, 18, GLASS, 4, 3)
      + SR(9, 70, Lw - 18, 16, 8, 0.12));
  },
  /** Nave genérica, vista desde arriba (la cabina va delante, a la derecha). */
  ship: (w, h, o) => {
    const f = o.tint ?? '#9aa7b8';
    return orient(w, h, o.facing, (Lw) => SHE(Lw / 2, 50, Lw / 2 - 6, 32)
      + P(`M${Lw * 0.18} 50 L${Lw * 0.32} 10 L${Lw * 0.5} 22 Z`, darken(f, 0.12), 3)
      + P(`M${Lw * 0.18} 50 L${Lw * 0.32} 90 L${Lw * 0.5} 78 Z`, darken(f, 0.12), 3)
      + P(`M8 42 L${Lw * 0.3} 26 L${Lw * 0.74} 30 L${Lw - 8} 46 L${Lw - 8} 54 L${Lw * 0.74} 70 L${Lw * 0.3} 74 L8 58 Z`, f)
      + SR(Lw * 0.3, 54, Lw * 0.44, 14, 4, 0.13)
      + LN(`M${Lw * 0.3} 40 H${Lw * 0.7} M${Lw * 0.3} 60 H${Lw * 0.7}`, 2, darken(f, 0.4), 0.6)
      + E(Lw * 0.74, 50, Lw * 0.09, 9, GLASS, 3) + HL(`M${Lw * 0.7} 46 L${Lw * 0.76} 45`, 2.5, 0.8)
      + C(14, 44, 5, FIRE, 2.5) + C(14, 56, 5, FIRE, 2.5) + DOT(14, 44, 2.2, FLAME) + DOT(14, 56, 2.2, FLAME)
      + R(Lw * 0.42, 45, Lw * 0.12, 10, RED, 3, 2.5));
  },
  /** Nave redonda (la de Freezer). */
  saucer: (w, h, o) => {
    const f = o.tint ?? '#c9c3d9';
    return orient(w, h, o.facing, (Lw) => {
      const cx = Lw / 2, rx = Lw / 2 - 8, ry = 40;
      let win = '';
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        win += C(cx + Math.cos(a) * rx * 0.74, 50 + Math.sin(a) * ry * 0.74, 3.6, '#ffd84d', 2);
      }
      return SHE(cx, 50, rx, ry)
        + [0.25, 0.75].map((t) => C(Lw * t, 89, 4.5, DARK, 2.5) + C(Lw * t, 11, 4.5, DARK, 2.5)).join('')
        + E(cx, 50, rx, ry, f)
        + E(cx, 52, rx * 0.86, ry * 0.86, darken(f, 0.1), 3)
        + win
        + E(cx, 50, rx * 0.45, ry * 0.5, '#8e6cc9', 3)
        + E(cx, 48, rx * 0.3, ry * 0.32, '#b9a5e6', 2.5)
        + HL(`M${cx - rx * 0.6} 26 Q${cx - rx * 0.2} 16 ${cx + rx * 0.2} 17`, 3.2, 0.5);
    });
  },
  /** Avión de combate (Quinjet). */
  jet: (w, h, o) => {
    const f = o.tint ?? '#6f7a88';
    return orient(w, h, o.facing, (Lw) => SHE(Lw / 2, 50, Lw / 2 - 6, 34)
      + P(`M${Lw * 0.36} 46 L${Lw * 0.5} 8 L${Lw * 0.62} 8 L${Lw * 0.6} 44 Z`, darken(f, 0.1), 3)
      + P(`M${Lw * 0.36} 54 L${Lw * 0.5} 92 L${Lw * 0.62} 92 L${Lw * 0.6} 56 Z`, darken(f, 0.1), 3)
      + P(`M10 40 L${Lw * 0.2} 30 L${Lw * 0.78} 34 Q${Lw - 4} 42 ${Lw - 4} 50 Q${Lw - 4} 58 ${Lw * 0.78} 66 L${Lw * 0.2} 70 L10 60 Z`, f)
      + P(`M12 34 L22 20 L30 22 L26 40 Z`, darken(f, 0.2), 3) + P(`M12 66 L22 80 L30 78 L26 60 Z`, darken(f, 0.2), 3)
      + SR(Lw * 0.2, 54, Lw * 0.56, 12, 4, 0.14)
      + LN(`M${Lw * 0.22} 50 H${Lw * 0.7}`, 2, darken(f, 0.45), 0.55)
      + P(`M${Lw * 0.7} 42 Q${Lw * 0.84} 44 ${Lw * 0.88} 50 Q${Lw * 0.84} 56 ${Lw * 0.7} 58 Z`, GLASS, 3)
      + HL(`M${Lw * 0.73} 45 L${Lw * 0.8} 46`, 2.5, 0.8)
      + R(5, 44, 9, 12, FIRE, 3, 2.5));
  },
  horse: (_w, _h, o) => {
    const f = o.tint ?? '#8b5a3c';
    const d = darken(f, 0.3), mane = darken(f, 0.45);
    return SHE(50, 86, 34, 7)
      + R(28, 58, 7, 28, d, 3, 3) + R(62, 58, 7, 28, d, 3, 3)
      + P('M16 56 Q18 38 38 38 L60 38 Q66 28 68 16 L82 14 L88 28 Q86 32 80 33 L76 44 Q76 58 68 62 L70 86 L62 86 L60 64 L38 64 L36 86 L28 86 L26 62 Q16 62 16 56 Z', f)
      + R(24, 82, 9, 6, DARK, 2, 2.5) + R(34, 82, 9, 6, DARK, 2, 2.5) + R(58, 82, 9, 6, DARK, 2, 2.5) + R(67, 82, 9, 6, DARK, 2, 2.5)
      + SR(30, 54, 40, 8, 4, 0.13)
      + P('M68 16 Q62 22 60 38 L66 38 Q68 28 72 20 Z', mane, 3)
      + P('M70 15 L74 5 L78 14 Z', d, 3)
      + P('M17 52 Q7 56 9 72 Q14 66 18 58 Z', mane, 3)
      + R(40, 37, 18, 10, '#7a2f2f', 3, 3) + R(44, 44, 10, 10, '#c9a46a', 2, 2.5)
      + DOT(80, 22, 2.4) + DOT(86, 30, 1.4)
      + HL('M24 46 Q32 41 42 41', 3, 0.4);
  },
  rockinghorse: (_w, _h, o) => {
    const f = o.tint ?? '#d9483b';
    return SHE(50, 84, 40, 8)
      + `<path d="M8 76 Q50 98 92 76" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M8 76 Q50 98 92 76" fill="none" stroke="#c98a4b" stroke-width="4" stroke-linecap="round"/>`
      + L(30, 62, 24, 82, 6) + L(66, 62, 74, 82, 6) + L(30, 62, 24, 82, 2.5, '#c98a4b') + L(66, 62, 74, 82, 2.5, '#c98a4b')
      + P('M20 54 Q20 42 34 42 L62 42 Q66 30 68 18 L82 16 L88 30 L80 34 L78 48 Q76 62 64 62 L34 62 Q20 62 20 54 Z', f)
      + SR(26, 54, 44, 7, 3, 0.13)
      + P('M68 18 Q60 22 58 40', 'none', 3) + `<path d="M68 18 Q60 22 58 40 L62 40 Q64 28 71 21 Z" fill="${GOLD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
      + P('M20 50 Q10 52 12 64 Q16 58 21 56 Z', GOLD, 3)
      + DOT(80, 24, 2.4) + R(40, 40, 16, 7, GOLD, 3, 2.5)
      + HL('M28 47 Q36 44 46 44', 3, 0.45);
  },
  bike: () => {
    const wheel = (cx: number) => `<circle cx="${cx}" cy="64" r="17" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="${cx}" cy="64" r="17" fill="none" stroke="${METAL_D}" stroke-width="1.6"/>`
      + LN(`M${cx - 12} 52 L${cx + 12} 76 M${cx + 12} 52 L${cx - 12} 76 M${cx} 47 V81 M${cx - 17} 64 H${cx + 17}`, 1.2, METAL_D, 0.9) + C(cx, 64, 3, METAL, 2);
    return SHE(50, 82, 38, 5)
      + wheel(25) + wheel(75)
      + LN('M25 64 L41 40 L65 40 L75 64 M41 40 L50 64 L65 40 M50 64 L25 64', 6, INK)
      + LN('M25 64 L41 40 L65 40 L75 64 M41 40 L50 64 L65 40 M50 64 L25 64', 3, '#2f8fd6')
      + R(34, 31, 15, 6, DARK, 3, 2.5) + L(41, 37, 41, 40, 3)
      + LN('M65 40 L68 30 L76 28', 4, INK) + R(72, 25, 9, 5, DARK, 2, 2)
      + C(50, 64, 4.5, METAL, 2.5) + L(50, 64, 56, 70, 3);
  },
};
