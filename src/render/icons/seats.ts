import { darken, lighten } from '../color';
import {
  BLUE, C, CREAM, DARK, DOT, HL, L, LN, LR, METAL, METAL_D, METAL_L, P, R, RED, SH, SHC, SR, WHITE, WOOD, WOOD_D, GOLD,
  orient, rot1, type IconFn,
} from './kit';

/** Asientos, camas y similares (se puede estar en ellos). */
export const SEATS: Record<string, IconFn> = {
  chair: (_w, _h, o) => {
    const f = o.tint ?? WOOD;
    const d = darken(f, 0.25), dd = darken(f, 0.45), l = lighten(f, 0.16);
    return rot1(o.facing,
      SH(21, 13, 58, 64, 9)
      + R(24, 30, 52, 46, f, 9)
      + SR(64, 33, 9, 40, 5, 0.15)
      + R(31, 38, 38, 31, l, 6, 2.5)
      + LN('M36 47 H52 M40 57 H63', 1.8, d, 0.6)
      + R(19, 13, 62, 21, d, 8)
      + [32, 44, 56, 68].map((x) => R(x - 2.5, 18.5, 5, 10, dd, 2, 0)).join('')
      + HL('M24 17.5 H28', 3.2, 0.55)
      + HL('M35 42.5 H47', 3, 0.5));
  },
  armchair: (_w, _h, o) => {
    const f = o.tint ?? '#d36b5b';
    const d = darken(f, 0.22), dd = darken(f, 0.42), arm = darken(f, 0.1), l = lighten(f, 0.18);
    return rot1(o.facing,
      SH(11, 10, 78, 78, 18)
      + R(12, 14, 76, 72, f, 18)
      + R(12, 9, 76, 27, d, 14)
      + LN('M28 21 L39 27 L50 21 L61 27 L72 21', 1.6, dd, 0.55)
      + DOT(28, 21, 2.2, dd) + DOT(50, 21, 2.2, dd) + DOT(72, 21, 2.2, dd)
      + R(8, 25, 19, 59, arm, 9) + R(73, 25, 19, 59, arm, 9)
      + SR(81, 29, 8, 51, 4, 0.16) + LR(11, 30, 5, 36, 2.5, 0.3)
      + R(28, 35, 44, 43, l, 9)
      + SR(31, 66, 38, 9, 4, 0.1)
      + HL('M35 41.5 H52', 3.2, 0.55));
  },
  sofa: (w, h, o) => {
    const f = o.tint ?? '#5b86c9';
    const d = darken(f, 0.22), dd = darken(f, 0.42), arm = darken(f, 0.1), l = lighten(f, 0.18);
    return orient(w, h, o.facing, (Lw) => {
      const nS = Math.max(1, Math.round(Lw / 100));
      const inner = Lw - 44;
      let cush = '';
      let tufts = '';
      for (let k = 0; k < nS; k++) {
        const x = 22 + (k * inner) / nS + 2, cw = inner / nS - 4;
        cush += R(x, 35, cw, 44, l, 10) + SR(x + 3, 67, cw - 6, 9, 4, 0.1) + HL(`M${x + 7} 41.5 H${x + Math.min(cw * 0.45, 26)}`, 3.2, 0.5);
        for (const t of [0.25, 0.5, 0.75]) tufts += DOT(x + cw * t, 21, 2.1, dd);
      }
      return SH(4, 9, Lw - 8, 79, 18)
        + R(6, 14, Lw - 12, 72, f, 18)
        + R(6, 8, Lw - 12, 28, d, 14)
        + tufts
        + R(2, 24, 20, 62, arm, 10) + R(Lw - 22, 24, 20, 62, arm, 10)
        + SR(Lw - 14, 28, 8, 54, 4, 0.16) + LR(5, 29, 5, 40, 2.5, 0.3)
        + cush;
    });
  },
  bench: (w, h, o) => {
    const f = o.tint ?? WOOD;
    const d = darken(f, 0.28);
    return orient(w, h, o.facing, (Lw) => {
      let slats = '';
      for (const [y, col] of [[17, d], [35, f], [50, f], [65, f]] as const) {
        slats += R(12, y, Lw - 24, 12, col, 4, 3) + SR(14, y + 7.5, Lw - 28, 3.5, 1.5, 0.12) + LN(`M${20} ${y + 4.5} H${Math.min(Lw * 0.32, 60)} M${Lw * 0.55} ${y + 4.5} H${Lw * 0.7}`, 1.4, darken(col, 0.3), 0.55);
      }
      const ends = [4, Lw - 14];
      const mids = Lw >= 200 ? [Lw / 2 - 4] : [];
      return SH(4, 14, Lw - 8, 70, 6)
        + mids.map((x) => R(x, 14, 8, 66, DARK, 3, 3)).join('')
        + slats
        + ends.map((x) => R(x, 13, 10, 70, DARK, 4, 3) + LN(`M${x + 3} 20 V56`, 2, '#fff', 0.35)).join('');
    });
  },
  stool: (_w, _h, o) => {
    const f = o.tint ?? RED;
    const legs = [45, 135, 225, 315].map((a) => {
      const r = (a * Math.PI) / 180;
      return C(50 + Math.cos(r) * 30, 50 + Math.sin(r) * 30, 5.5, WOOD_D, 3);
    }).join('');
    return SHC(50, 50, 31)
      + `<circle cx="50" cy="50" r="28" fill="none" stroke="${'#2b2631'}" stroke-width="8"/><circle cx="50" cy="50" r="28" fill="none" stroke="${WOOD}" stroke-width="3.5"/>`
      + legs
      + C(50, 50, 22, darken(f, 0.18))
      + C(50, 48.5, 17, f, 3)
      + `<path d="M36 56 A17 17 0 0 0 64 56 A19 19 0 0 1 36 56 Z" fill="#000" fill-opacity=".14"/>`
      + DOT(50, 48.5, 2, darken(f, 0.45))
      + HL('M39 42 Q44 36.5 52 36', 3.5, 0.6);
  },
  throne: (_w, _h, o) => {
    const f = o.tint ?? '#c0392b';
    const metal = o.tint ? lighten(o.tint, 0.25) : GOLD;
    const md = darken(metal, 0.22);
    return rot1(o.facing,
      SH(10, 3, 80, 87, 12)
      + P('M12 34 V16 Q12 9 19 9 H24 L31 2 L38 9 H43 L50 -1 L57 9 H62 L69 2 L76 9 H81 Q88 9 88 16 V34 Z', metal)
      + SR(74, 13, 10, 18, 3, 0.14)
      + C(50, 17, 5.5, '#e74c3c', 2.5) + DOT(48.4, 15.4, 1.6, '#fff', 0.8)
      + C(31, 19, 3.6, BLUE, 2) + C(69, 19, 3.6, '#5db55a', 2)
      + R(12, 26, 76, 64, metal, 10)
      + R(9, 30, 18, 58, md, 8) + R(73, 30, 18, 58, md, 8)
      + SR(81, 34, 7, 44, 3, 0.16) + LR(12, 34, 5, 38, 2.5, 0.3)
      + C(18, 84, 6.5, metal, 3) + C(82, 84, 6.5, metal, 3)
      + R(28, 34, 44, 48, f, 8)
      + R(33, 39, 34, 38, lighten(f, 0.14), 6, 2.5)
      + DOT(42, 51, 1.8, darken(f, 0.45)) + DOT(58, 51, 1.8, darken(f, 0.45)) + DOT(50, 62, 1.8, darken(f, 0.45))
      + HL('M37 44 H50', 3, 0.5));
  },
  /** Trono de Hierro: un abanico de espadas. */
  ironthrone: (_w, _h, o) => {
    const f = o.tint ?? '#8d96a3';
    const d = darken(f, 0.3), l = lighten(f, 0.35);
    let swords = '';
    for (let k = -4; k <= 4; k++) {
      const a = (k * 17 * Math.PI) / 180;
      const len = 38 + (k % 2 ? 0 : 6);
      const x1 = 50 + Math.sin(a) * len, y1 = 40 - Math.cos(a) * len;
      const gx = 50 + Math.sin(a) * 16, gy = 40 - Math.cos(a) * 16;
      const px = Math.cos(a) * 6, py = Math.sin(a) * 6;
      swords += L(50, 40, x1, y1, 7) + L(50 + Math.sin(a) * 4, 40 - Math.cos(a) * 4, x1, y1, 3, l) + L(gx - px, gy - py, gx + px, gy + py, 4, DARK);
    }
    return rot1(o.facing,
      SH(10, 6, 80, 84, 10)
      + swords
      + R(14, 32, 72, 58, f, 8)
      + R(10, 36, 17, 52, d, 6) + R(73, 36, 17, 52, d, 6)
      + LN('M14 46 L22 42 M14 58 L22 54 M14 70 L22 66 M78 42 L86 46 M78 54 L86 58 M78 66 L86 70', 2.2, l, 0.8)
      + R(30, 40, 40, 44, darken(f, 0.12), 6)
      + LN('M34 52 H66 M34 62 H66 M34 72 H66', 2, d, 0.6)
      + SR(80, 40, 6, 44, 3, 0.16)
      + HL('M35 45 H48', 3, 0.5));
  },
  wheelchair: (_w, _h, o) => {
    const f = o.tint ?? '#4a5568';
    return rot1(o.facing,
      SH(10, 8, 80, 82, 12)
      + R(18, 8, 8, 12, DARK, 3, 2.5) + R(74, 8, 8, 12, DARK, 3, 2.5)
      + R(7, 22, 15, 62, DARK, 7) + R(78, 22, 15, 62, DARK, 7)
      + LN('M14.5 29 V77 M85.5 29 V77', 2.4, METAL_L, 0.9)
      + R(20, 14, 60, 16, darken(f, 0.32), 6)
      + R(24, 27, 52, 46, f, 8)
      + SR(64, 30, 9, 40, 4, 0.16)
      + HL('M31 33 H48', 3, 0.45)
      + R(30, 74, 40, 9, METAL, 3, 3)
      + C(29, 89, 4.5, DARK, 2.5) + C(71, 89, 4.5, DARK, 2.5));
  },
  bed: (w, h, o) => {
    const f = o.tint ?? '#6b8fd6';
    return orient(w, h, o.facing === 'N' ? 'N' : o.facing, (Lw) => {
      const bx = Lw * 0.42;
      let stripes = '';
      for (let x = bx + 24; x < Lw - 18; x += 18) stripes += L(x, 16, x, 84, 2.5, lighten(f, 0.22));
      return SH(4, 5, Lw - 8, 89, 10)
        + R(10, 7, Lw - 16, 86, WOOD, 10)
        + R(2, 3, 16, 94, WOOD_D, 7) + LR(5, 8, 4, 58, 2, 0.25)
        + R(17, 13, Lw - 30, 74, WHITE, 8)
        + R(22, 21, 27, 58, CREAM, 12)
        + LN('M27 33 Q35 29 43 33 M27 67 Q35 71 43 67', 1.6, '#b9ad94')
        + HL('M27.5 30 V50', 3, 0.7)
        + R(bx, 10, Lw - bx - 12, 80, f, 8)
        + stripes
        + SR(bx + 3, 76, Lw - bx - 18, 11, 5, 0.14)
        + R(bx, 10, 14, 80, lighten(f, 0.3), 6, 3)
        + HL(`M${bx + 22} 17 H${bx + 40}`, 3, 0.45);
    });
  },
  bunk: (w, h, o) => {
    const f = o.tint ?? '#8a9bb0';
    return orient(w, h, o.facing, (Lw) => {
      let rungs = '';
      for (let y = 22; y <= 80; y += 14) rungs += L(Lw - 21, y, Lw - 11, y, 3, DARK);
      return SH(4, 5, Lw - 8, 89, 6)
        + R(6, 6, Lw - 12, 88, METAL_D, 6)
        + R(12, 12, Lw - 26, 76, '#e9e4d8', 5)
        + R(16, 20, 24, 60, WHITE, 9) + HL('M21 27 V48', 3, 0.7)
        + R(Lw * 0.45, 12, Lw * 0.55 - 14, 76, f, 5)
        + SR(Lw * 0.45 + 3, 76, Lw * 0.55 - 20, 9, 4, 0.14)
        + R(Lw * 0.45, 12, 11, 76, lighten(f, 0.28), 4, 3)
        + R(12, 4, Lw * 0.62, 7, METAL, 3, 3)
        + L(Lw - 21, 8, Lw - 21, 92, 4, DARK) + L(Lw - 11, 8, Lw - 11, 92, 4, DARK) + rungs
        + C(9, 9, 4.5, DARK, 2.5) + C(9, 91, 4.5, DARK, 2.5);
    });
  },
  stretcher: (w, h, o) => {
    const f = o.tint ?? '#7fc8c0';
    return orient(w, h, o.facing, (Lw) => SH(5, 12, Lw - 10, 76, 10)
      + C(15, 14, 5, DARK, 2.5) + C(Lw - 15, 14, 5, DARK, 2.5) + C(15, 86, 5, DARK, 2.5) + C(Lw - 15, 86, 5, DARK, 2.5)
      + R(8, 18, Lw - 16, 64, METAL, 10)
      + R(15, 24, Lw - 30, 52, f, 8)
      + R(19, 30, 24, 40, WHITE, 8) + HL('M24 36 V54', 3, 0.7)
      + R(Lw * 0.45, 24, Lw * 0.55 - 15, 52, lighten(f, 0.35), 6, 3)
      + SR(Lw * 0.45 + 3, 66, Lw * 0.55 - 21, 8, 4, 0.12)
      + L(14, 21, Lw - 14, 21, 3, METAL_D) + L(14, 79, Lw - 14, 79, 3, METAL_D)
      + R(Lw - 12, 30, 7, 40, DARK, 3, 2.5));
  },
  lounger: (w, h, o) => {
    const f = o.tint ?? '#f3a0a0';
    return orient(w, h, o.facing, (Lw) => {
      let stripes = '';
      for (let x = 42; x < Lw - 16; x += 16) stripes += `<rect x="${x}" y="25.5" width="8" height="49" fill="${WHITE}" fill-opacity=".85"/>`;
      return SH(5, 16, Lw - 10, 68, 10)
        + R(6, 17, Lw - 12, 66, WOOD, 10)
        + R(12, 24, Lw - 24, 52, f, 6, 3)
        + stripes
        + R(12, 24, 26, 52, darken(f, 0.16), 6, 3)
        + R(15, 31, 16, 38, WHITE, 6, 2.5) + HL('M19 36 V52', 2.6, 0.7)
        + SR(14, 66, Lw - 28, 8, 4, 0.12)
        + R(12, 24, Lw - 24, 52, 'none', 6, 3);
    });
  },
  hammock: (w, h, o) => {
    const f = o.tint ?? '#e9b45a';
    return orient(w, h, o.facing, (Lw) => SH(18, 26, Lw - 36, 52, 20)
      + LN(`M12 50 L24 35 M12 50 L24 50 M12 50 L24 65 M${Lw - 12} 50 L${Lw - 24} 35 M${Lw - 12} 50 L${Lw - 24} 50 M${Lw - 12} 50 L${Lw - 24} 65`, 2.4)
      + C(9, 50, 7, WOOD_D, 3) + C(Lw - 9, 50, 7, WOOD_D, 3)
      + P(`M22 33 Q${Lw / 2} 21 ${Lw - 22} 33 L${Lw - 22} 67 Q${Lw / 2} 79 22 67 Z`, f)
      + LN(`M24 43 Q${Lw / 2} 33 ${Lw - 24} 43`, 4.5, lighten(f, 0.4))
      + LN(`M24 57 Q${Lw / 2} 67 ${Lw - 24} 57`, 4.5, darken(f, 0.22))
      + LN(`M24 50 Q${Lw / 2} 50 ${Lw - 24} 50`, 2, darken(f, 0.3), 0.5));
  },
  crib: () => {
    let bars = '';
    for (let x = 22; x <= 78; x += 8) bars += L(x, 10, x, 17, 2.5) + L(x, 83, x, 90, 2.5);
    return SH(9, 9, 82, 82, 6)
      + R(9, 9, 82, 82, '#f3e3c9', 6)
      + bars
      + R(17, 17, 66, 66, '#cfe6f7', 4, 2.5)
      + R(17, 50, 66, 33, '#f6b8c8', 4, 2.5)
      + DOT(30, 62, 2.2, '#fff', 0.9) + DOT(46, 70, 2.2, '#fff', 0.9) + DOT(62, 60, 2.2, '#fff', 0.9) + DOT(72, 74, 2.2, '#fff', 0.9)
      + R(26, 22, 28, 20, WHITE, 8, 2.5)
      + C(68, 33, 7, '#c98a52', 2.5) + C(63, 27, 3, '#c98a52', 2) + C(73, 27, 3, '#c98a52', 2) + DOT(66, 32, 1.1) + DOT(70, 32, 1.1)
      + SR(19, 74, 62, 7, 3, 0.12);
  },
};
