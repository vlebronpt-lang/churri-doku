import { darken, lighten } from '../color';
import {
  C, CREAM, DARK, DOT, E, FIRE, FLAME, GLASS, GOLD, GOLD_D, HL, INK, L, LEAF, LEAF_D, LN, LR, METAL, METAL_D, METAL_L, P, R, RED, SH, SHC, SHE, SR, WHITE, WOOD, WOOD_D,
  bookRow, flame, type IconFn,
} from './kit';

/** Vetas paralelas al lado largo de un tablero de madera. */
function grain(w: number, h: number, col: string) {
  const horiz = w >= h;
  let d = '';
  const len = horiz ? w : h, cross = horiz ? h : w;
  for (let t = 22; t < cross - 16; t += 17) {
    const a = 16 + ((t * 7) % 23), b = len - 18 - ((t * 5) % 31);
    d += horiz ? `M${a} ${t} H${b} ` : `M${t} ${a} V${b} `;
  }
  return LN(d, 1.6, col, 0.5);
}

/** Plato con comida, vaso o vela para poner en las mesas. */
function setting(cx: number, cy: number, k: number) {
  switch (k % 3) {
    case 0:
      return C(cx, cy, 13, WHITE, 3) + C(cx, cy, 8.5, '#f1e3c4', 1.8) + DOT(cx - 2.5, cy - 1.5, 3.2, '#e05a47') + DOT(cx + 3, cy + 2, 2.6, LEAF) + DOT(cx + 1, cy - 4, 2, '#f3c33b')
        + L(cx - 18, cy - 8, cx - 18, cy + 8, 2.2, METAL_D) + L(cx + 18, cy - 8, cx + 18, cy + 8, 2.2, METAL_D);
    case 1:
      return C(cx, cy, 8, GOLD_D, 2.5) + R(cx - 3.5, cy - 15, 7, 15, CREAM, 2, 2.2) + P(`M${cx} ${cy - 24} Q${cx - 4} ${cy - 18} ${cx} ${cy - 15} Q${cx + 4} ${cy - 18} ${cx} ${cy - 24} Z`, FLAME, 1.6);
    default:
      return C(cx - 6, cy, 6.5, '#a8d8f0', 2.5) + DOT(cx - 6, cy, 3.5, '#8e2a3a', 0.8) + C(cx + 8, cy + 4, 6, '#e8d9b0', 2.5);
  }
}

export const FURNITURE: Record<string, IconFn> = {
  table: (w, h, o) => {
    const f = o.tint ?? WOOD;
    const horiz = w >= h;
    const nx = Math.max(1, Math.round(w / 100)), ny = Math.max(1, Math.round(h / 100));
    let items = '';
    let k = 0;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) items += setting((i + 0.5) * (w / nx), (j + 0.5) * (h / ny), k++ + i);
    const runner = nx * ny > 1 ? (horiz ? R(16, h / 2 - 10, w - 32, 20, '#f3e6c8', 3, 2.5) : R(w / 2 - 10, 16, 20, h - 32, '#f3e6c8', 3, 2.5)) : '';
    return SH(7, 7, w - 14, h - 14, 12)
      + R(7, 7, w - 14, h - 14, f, 12)
      + grain(w, h, darken(f, 0.35))
      + SR(11, h - 22, w - 22, 11, 6, 0.13)
      + LR(12, 11, Math.min(w * 0.35, 60), 5, 2.5, 0.3)
      + runner
      + items;
  },
  desk: (w, h, o) => {
    const f = o.tint ?? '#a8693c';
    const big = w >= 200 || h >= 200;
    return SH(6, 9, w - 12, h - 18, 8)
      + R(6, 9, w - 12, h - 18, f, 8)
      + grain(w, h, darken(f, 0.35))
      + SR(10, h - 24, w - 20, 11, 5, 0.14)
      + R(13, 15, 36, 25, '#3a3f47', 3, 3) + R(16.5, 18.5, 29, 18, '#5fb3e6', 2, 0) + LN('M20 24 H34 M20 29 H40', 1.6, '#fff', 0.7)
      + R(11, 40, 40, 12, '#c9ced4', 3, 2.5) + LN('M15 44.5 H47 M15 48 H47', 1.2, METAL_D, 0.8)
      + `<g transform="rotate(-8 ${w - 33} ${h - 35})">${R(w - 46, h - 46, 26, 22, WHITE, 2, 2.5)}${LN(`M${w - 42} ${h - 39} H${w - 25} M${w - 42} ${h - 34} H${w - 28} M${w - 42} ${h - 29} H${w - 30}`, 1.6, '#8a8193')}</g>`
      + C(w - 22, 25, 7.5, '#e05a47', 2.5) + DOT(w - 22, 25, 4.2, '#5a3a2a') + P(`M${w - 15} 22 Q${w - 9} 25 ${w - 15} 28`, 'none', 2.4)
      + (big ? C(w * 0.5, h * 0.3, 9, '#3b3644', 2.5) + C(w * 0.5, h * 0.3, 5, '#fff3b0', 2) + R(w * 0.62, h * 0.55, 18, 6, GOLD, 2, 2) : '');
  },
  counter: (w, h, o) => {
    const f = o.tint ?? '#7a4a2c';
    const horiz = w >= h;
    const n = Math.max(1, Math.round(Math.max(w, h) / 100));
    let items = '';
    for (let k = 0; k < n; k++) {
      const cx = horiz ? (k + 0.5) * (w / n) : w / 2;
      const cy = horiz ? h / 2 : (k + 0.5) * (h / n);
      items += k % 2
        ? C(cx - 11, cy - 2, 6.5, '#a8d8f0', 2.5) + DOT(cx - 11, cy - 2, 3.5, '#f3c33b', 0.9) + C(cx + 10, cy + 3, 6.5, '#a8d8f0', 2.5) + DOT(cx + 10, cy + 3, 3.5, '#8e2a3a', 0.85)
        : C(cx - 12, cy, 6.5, '#3b8d4f', 2.5) + DOT(cx - 13.5, cy - 1.5, 1.8, '#fff', 0.7) + C(cx + 3, cy - 4, 6.5, '#b5452f', 2.5) + DOT(cx + 1.5, cy - 5.5, 1.8, '#fff', 0.7) + C(cx + 14, cy + 5, 5.5, '#e8d9b0', 2.5);
    }
    const rail = horiz ? L(10, h - 20, w - 10, h - 20, 3, GOLD) : L(w - 20, 10, w - 20, h - 10, 3, GOLD);
    return SH(6, 16, w - 12, h - 32, 8)
      + R(6, 16, w - 12, h - 32, f, 8)
      + (horiz ? R(6, 16, w - 12, 10, lighten(f, 0.3), 5, 3) : R(6, 16, 10, h - 32, lighten(f, 0.3), 5, 3))
      + grain(w, h, darken(f, 0.4))
      + SR(10, h - 30, w - 20, 10, 4, 0.14)
      + rail
      + items;
  },
  shelf: (_w, _h, o) => {
    const f = o.tint ?? '#6d4c41';
    return SH(11, 6, 78, 88, 4)
      + R(11, 9, 78, 85, f, 4)
      + R(8, 5, 84, 9, darken(f, 0.15), 3, 3)
      + R(17, 15, 66, 73, darken(f, 0.38), 2, 2)
      + bookRow(18, 16, 64, 20, 1) + bookRow(18, 40, 64, 20, 4) + bookRow(18, 64, 64, 22, 2)
      + L(17, 38, 83, 38, 3) + L(17, 62, 83, 62, 3)
      + SR(73, 15, 9, 72, 2, 0.2)
      + LR(12, 14, 4, 70, 2, 0.25);
  },
  wardrobe: (_w, _h, o) => {
    const f = o.tint ?? '#a0663d';
    const l = lighten(f, 0.12), d = darken(f, 0.3);
    return SH(13, 5, 74, 89, 4)
      + R(16, 88, 8, 6, d, 1.5, 2.5) + R(76, 88, 8, 6, d, 1.5, 2.5)
      + R(14, 7, 72, 83, f, 4)
      + R(10, 3, 80, 9, d, 3, 3)
      + L(50, 12, 50, 90, 3)
      + R(19, 16, 26, 32, l, 2, 2) + R(55, 16, 26, 32, l, 2, 2) + R(19, 54, 26, 30, l, 2, 2) + R(55, 54, 26, 30, l, 2, 2)
      + C(45, 50, 3, GOLD, 2) + C(55, 50, 3, GOLD, 2)
      + SR(74, 12, 10, 76, 2, 0.16)
      + LR(16, 13, 3, 70, 1.5, 0.3);
  },
  fridge: (_w, _h, o) => {
    const f = o.tint ?? '#eef2f5';
    return SH(18, 5, 64, 89, 8)
      + R(18, 5, 64, 89, f, 8)
      + L(18, 37, 82, 37, 3)
      + R(25, 14, 5, 17, METAL_D, 2, 2) + R(25, 44, 5, 26, METAL_D, 2, 2)
      + SR(70, 9, 9, 81, 4, 0.12) + LR(21, 9, 3, 24, 1.5, 0.6)
      + C(62, 52, 4.5, RED, 2) + R(54, 62, 12, 9, '#f3c33b', 1.5, 2) + C(66, 20, 4, '#4a78d1', 2)
      + R(40, 22, 14, 10, WHITE, 1, 1.8);
  },
  stove: () => {
    const burner = (cx: number, cy: number, on: boolean) => C(cx, cy, 11, '#4a4550', 3) + C(cx, cy, 6, on ? '#ff6b2a' : '#5e5966', 2) + LN(`M${cx - 13} ${cy} H${cx + 13} M${cx} ${cy - 13} V${cy + 13}`, 2, '#2b2631', 0.9);
    return SH(9, 9, 82, 82, 6)
      + R(9, 9, 82, 82, '#d8d3ca', 6)
      + R(15, 15, 70, 60, '#2f2b33', 4, 3)
      + burner(33, 32, false) + burner(67, 32, false) + burner(33, 58, false) + burner(67, 58, true)
      + C(33, 32, 9, '#9aa3ad', 2.5) + C(33, 32, 6, '#c9d1da', 2) + R(40, 30, 12, 4, '#9aa3ad', 2, 2)
      + [25, 40, 60, 75].map((x) => C(x, 83, 3.5, '#f5f2ec', 2)).join('')
      + SR(80, 13, 7, 74, 3, 0.12);
  },
  sink: () => SH(13, 16, 74, 68, 10)
    + R(13, 16, 74, 68, WHITE, 10)
    + E(50, 54, 25, 19, GLASS, 3)
    + DOT(50, 58, 3.2, METAL_D)
    + HL('M34 46 Q40 40 50 39', 2.6, 0.7)
    + R(44, 19, 12, 16, METAL, 3, 2.5) + R(48, 33, 4, 8, METAL_D, 1.5, 2)
    + C(30, 25, 4, '#c9d1da', 2) + C(70, 25, 4, '#c9d1da', 2)
    + R(68, 64, 12, 9, '#f3a0c0', 3, 2)
    + SR(76, 20, 8, 60, 4, 0.1),
  toilet: () => SH(25, 7, 50, 85, 18)
    + R(26, 6, 48, 22, WHITE, 6)
    + R(44, 10, 12, 5, METAL, 2, 2)
    + E(50, 60, 22, 28, WHITE)
    + E(50, 62, 14, 19, GLASS, 3)
    + HL('M37 52 Q40 44 47 42', 2.6, 0.7)
    + SR(64, 10, 7, 15, 3, 0.1),
  tv: (_w, _h, o) => SH(8, 14, 84, 66, 6)
    + R(40, 76, 20, 8, DARK, 2, 3) + R(28, 83, 44, 7, DARK, 3, 3)
    + R(8, 13, 84, 64, DARK, 6)
    + R(14, 19, 72, 50, o.tint ?? '#7fc7f0', 3, 2.5)
    + P('M14 58 Q32 44 50 54 Q68 62 86 50 L86 69 L14 69 Z', '#5db55a', 0)
    + C(68, 32, 6, '#ffd447', 0)
    + LR(18, 22, 28, 5, 2, 0.45)
    + DOT(84, 73, 1.6, '#e8213f'),
  computer: (_w, _h, o) => SH(14, 12, 72, 74, 6)
    + R(44, 58, 12, 10, DARK, 2, 3)
    + R(15, 12, 70, 48, DARK, 6)
    + R(21, 18, 58, 36, o.tint ?? '#1f3b2c', 2, 2.5)
    + LN('M26 26 H44 M26 32 H58 M30 38 H52 M26 44 H40', 2, '#4fd18b')
    + R(15, 70, 54, 15, '#d5d1c8', 4, 3) + LN('M20 75 H64 M20 80 H64', 1.4, METAL_D, 0.8)
    + E(78, 78, 6, 8, '#d5d1c8', 2.5) + L(78, 70, 78, 75, 1.6),
  piano: () => SH(9, 9, 82, 82, 30)
    + P('M10 26 Q10 10 26 10 L58 10 Q90 12 90 46 Q90 70 72 82 Q60 90 44 90 L10 90 Z', '#25202c')
    + P('M18 26 Q18 18 28 18 L56 18 Q82 20 82 46 Q82 64 68 74 Q58 80 46 80 L18 80 Z', '#3a3342', 2.5)
    + LN('M24 30 Q50 28 70 46 M24 40 Q46 40 62 56', 1.8, GOLD, 0.8)
    + R(10, 82, 46, 12, WHITE, 2, 3)
    + [14, 20, 26, 32, 38, 44, 50].map((x) => R(x + 2, 82, 3, 7, INK, 0.5, 0)).join('')
    + HL('M22 22 Q40 14 56 16', 3, 0.35),
  fireplace: () => {
    let bricks = '';
    for (let y = 24, r = 0; y < 86; y += 9, r++) for (let x = 10 + (r % 2 ? 7 : 0); x < 88; x += 14) bricks += `<rect x="${x}" y="${y}" width="12" height="7" rx="1" fill="#000" fill-opacity=".12"/>`;
    return SH(8, 10, 84, 82, 6)
      + R(8, 12, 84, 80, '#b5523b', 6) + bricks
      + P('M24 92 L24 54 Q24 32 50 32 Q76 32 76 54 L76 92 Z', '#2b2027')
      + R(32, 80, 36, 7, WOOD_D, 3, 2.5) + R(36, 74, 28, 7, WOOD, 3, 2.5)
      + flame(50, 78, 30, 38)
      + R(3, 6, 94, 12, '#8c3b2a', 4) + LR(6, 8, 40, 3, 1.5, 0.3)
      + C(28, 3, 4, GOLD, 2) + C(72, 3, 4, '#5db55a', 2);
  },
  lamp: (_w, _h, o) => {
    const t = o.tint ?? '#f6d36b';
    let pleats = '';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      pleats += `M${(50 + Math.cos(a) * 10).toFixed(1)} ${(50 + Math.sin(a) * 10).toFixed(1)} L${(50 + Math.cos(a) * 21).toFixed(1)} ${(50 + Math.sin(a) * 21).toFixed(1)} `;
    }
    return `<circle cx="50" cy="50" r="40" fill="#fff3b0" fill-opacity=".38"/><circle cx="50" cy="50" r="31" fill="#fff3b0" fill-opacity=".45"/>`
      + SHC(50, 50, 22)
      + C(50, 50, 22, t)
      + LN(pleats, 1.6, darken(t, 0.35), 0.7)
      + C(50, 50, 9, '#fff8d8', 3)
      + HL('M38 40 Q42 34 50 33', 3, 0.6);
  },
  /** Vela flotante (Hogwarts). */
  candle: () => `<circle cx="50" cy="40" r="36" fill="#fff3b0" fill-opacity=".35"/>`
    + SHE(50, 86, 14, 4)
    + R(41, 38, 18, 46, CREAM, 4)
    + P('M41 44 Q44 50 41 56 M59 42 Q56 48 59 52', 'none', 0)
    + `<path d="M44 38 Q44 46 47 49 Q48 42 52 38 Z" fill="#e9dfc8"/>`
    + SR(52, 41, 6, 41, 2.5, 0.12)
    + L(50, 38, 50, 32, 2.2)
    + P('M50 10 Q41 22 44 30 Q46 35 50 35 Q54 35 56 30 Q59 22 50 10 Z', FIRE, 2.5)
    + P('M50 20 Q46 27 47 30 Q48 33 50 33 Q52 33 53 30 Q54 27 50 20 Z', FLAME, 1.5),
  streetlamp: () => `<circle cx="50" cy="24" r="27" fill="#fff3b0" fill-opacity=".4"/>`
    + SHE(50, 90, 18, 4)
    + R(45, 34, 10, 54, '#3b3a42', 3, 3) + LR(47, 38, 2.5, 46, 1, 0.35)
    + R(36, 86, 28, 8, '#3b3a42', 3, 3) + R(41, 54, 18, 6, '#3b3a42', 2, 2.5)
    + P('M35 14 L65 14 L61 36 L39 36 Z', '#fff2a8') + LN('M50 14 V36 M37 25 H63', 2, INK, 0.7)
    + P('M31 14 L50 4 L69 14 Z', '#3b3a42', 3) + DOT(50, 3, 2.5, INK)
    + R(37, 35, 26, 5, '#3b3a42', 2, 2.5),
  barrel: (_w, _h, o) => {
    const f = o.tint ?? '#b0733f';
    return SHC(50, 50, 35)
      + C(50, 50, 35, darken(f, 0.12))
      + `<circle cx="50" cy="50" r="31" fill="none" stroke="${METAL_D}" stroke-width="5"/>`
      + C(50, 50, 27, f, 3)
      + LN('M28 40 H72 M24 50 H76 M28 60 H72', 1.8, darken(f, 0.4), 0.8)
      + [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return DOT(50 + Math.cos(a) * 31, 50 + Math.sin(a) * 31, 1.6, METAL_L); }).join('')
      + C(62, 40, 3.5, darken(f, 0.45), 2)
      + `<path d="M50 77 A27 27 0 0 0 77 50 A30 30 0 0 1 50 77 Z" fill="#000" fill-opacity=".12"/>`
      + HL('M32 34 Q38 27 46 26', 3, 0.45);
  },
  crate: (_w, _h, o) => {
    const f = o.tint ?? '#cf9a5c';
    const d = darken(f, 0.3);
    return SH(13, 13, 74, 74, 4)
      + R(13, 13, 74, 74, f, 4)
      + LN('M18 31 H82 M18 50 H82 M18 69 H82', 2, d, 0.55)
      + R(13, 13, 74, 10, d, 3, 3) + R(13, 77, 74, 10, d, 3, 3)
      + `<path d="M22 24 L78 76" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M22 24 L78 76" stroke="${lighten(f, 0.15)}" stroke-width="4.5" stroke-linecap="round"/>`
      + [18, 82].map((x) => DOT(x, 18, 1.8) + DOT(x, 82, 1.8)).join('')
      + SR(76, 23, 8, 54, 2, 0.14)
      + LR(16, 25, 4, 50, 1.5, 0.25);
  },
  chest: (_w, _h, o) => {
    const f = o.tint ?? '#9c5b2e';
    const d = darken(f, 0.2);
    return SH(11, 18, 78, 68, 8)
      + P('M11 44 Q11 18 50 18 Q89 18 89 44 Z', d)
      + LN('M14 34 Q50 26 86 34', 1.8, darken(f, 0.5), 0.55)
      + R(11, 44, 78, 41, f, 4)
      + LN('M14 58 H86 M14 71 H86', 1.8, darken(f, 0.45), 0.55)
      + R(24, 18, 10, 67, GOLD, 2, 3) + R(66, 18, 10, 67, GOLD, 2, 3)
      + [30, 50, 70].map((y) => DOT(29, y, 1.6, GOLD_D) + DOT(71, y, 1.6, GOLD_D)).join('')
      + R(42, 38, 16, 18, GOLD, 3, 3) + DOT(50, 46, 2.6) + R(49, 46, 2, 5, INK, 0.5, 0)
      + SR(78, 46, 8, 37, 2, 0.16)
      + HL('M20 32 Q32 24 44 23', 3, 0.45);
  },
  safe: () => {
    let ticks = '';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ticks += `M${(50 + Math.cos(a) * 11).toFixed(1)} ${(50 + Math.sin(a) * 11).toFixed(1)} L${(50 + Math.cos(a) * 14).toFixed(1)} ${(50 + Math.sin(a) * 14).toFixed(1)} `;
    }
    return SH(13, 10, 74, 80, 6)
      + R(18, 86, 9, 7, DARK, 1.5, 2.5) + R(73, 86, 9, 7, DARK, 1.5, 2.5)
      + R(13, 10, 74, 78, '#55606e', 6)
      + R(20, 17, 60, 64, '#6c7887', 4, 3)
      + R(20, 26, 5, 10, METAL_D, 1.5, 2) + R(20, 62, 5, 10, METAL_D, 1.5, 2)
      + C(50, 50, 17, '#c9d1da', 3) + LN(ticks, 1.6, INK) + C(50, 50, 7, '#9aa3ad', 2.5) + L(50, 50, 55, 45, 2.5)
      + R(66, 42, 8, 16, '#c9d1da', 2, 2.5)
      + SR(72, 19, 7, 60, 2, 0.15) + LR(16, 13, 3, 70, 1.5, 0.25);
  },
  /** Imprenta de billetes. */
  press: (w, h, o) => {
    const f = o.tint ?? '#6f7985';
    const horiz = w >= h;
    let bills = '';
    const n = Math.max(1, Math.round(Math.max(w, h) / 100));
    for (let k = 0; k < n; k++) {
      const cx = horiz ? (k + 0.5) * (w / n) : w / 2, cy = horiz ? h / 2 : (k + 0.5) * (h / n);
      bills += R(cx - 22, cy - 13, 44, 26, '#a8dcae', 3, 2.5) + C(cx, cy, 7, '#7cc485', 2) + `<text x="${cx}" y="${cy + 3.5}" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="700" fill="${INK}">€</text>` + LN(`M${cx - 18} ${cy - 8} H${cx - 10} M${cx + 10} ${cy + 8} H${cx + 18}`, 1.6, '#3f8c43');
    }
    const rollers = horiz
      ? C(16, h / 2, 10, METAL_D, 3) + C(w - 16, h / 2, 10, METAL_D, 3) + DOT(16, h / 2, 3, METAL_L) + DOT(w - 16, h / 2, 3, METAL_L)
      : C(w / 2, 16, 10, METAL_D, 3) + C(w / 2, h - 16, 10, METAL_D, 3) + DOT(w / 2, 16, 3, METAL_L) + DOT(w / 2, h - 16, 3, METAL_L);
    return SH(5, 9, w - 10, h - 18, 8)
      + R(5, 9, w - 10, h - 18, f, 8)
      + R(15, 18, w - 30, h - 36, '#e9efe6', 4, 3)
      + bills + rollers
      + SR(9, h - 24, w - 18, 10, 4, 0.14);
  },
  cage: () => SH(12, 12, 76, 76, 6)
    + R(12, 12, 76, 76, '#e9e4d8', 6, 0)
    + `<rect x="12" y="12" width="76" height="76" rx="6" fill="#000" fill-opacity=".08"/>`
    + [24, 37, 50, 63, 76].map((x) => L(x, 14, x, 86, 4.5) + L(x - 1, 16, x - 1, 84, 1.4, METAL_L)).join('')
    + R(12, 12, 76, 76, 'none', 6)
    + R(9, 9, 82, 8, '#4a4550', 3, 3) + R(9, 83, 82, 8, '#4a4550', 3, 3)
    + R(44, 46, 12, 12, GOLD, 2, 2.5) + DOT(50, 51, 1.6),
  fence: (w, h, o) => {
    const f = o.tint ?? WOOD;
    const horiz = w >= h;
    const Lw = horiz ? w : h;
    let posts = '';
    for (let x = 12; x <= Lw - 10; x += 26) {
      posts += horiz
        ? P(`M${x - 6} 74 V30 L${x} 22 L${x + 6} 30 V74 Z`, darken(f, 0.22), 3) + DOT(x, 44, 1.5) + DOT(x, 62, 1.5)
        : P(`M26 ${x - 6} H70 L78 ${x} L70 ${x + 6} H26 Z`, darken(f, 0.22), 3) + DOT(44, x, 1.5) + DOT(62, x, 1.5);
    }
    const rails = horiz
      ? R(4, 40, w - 8, 9, f, 3, 3) + R(4, 58, w - 8, 9, f, 3, 3) + HL(`M8 43 H${w * 0.4}`, 2, 0.4)
      : R(40, 4, 9, h - 8, f, 3, 3) + R(58, 4, 9, h - 8, f, 3, 3);
    return (horiz ? `<rect x="6" y="${78}" width="${w - 12}" height="6" rx="3" fill="#000" fill-opacity=".14"/>` : '') + rails + posts;
  },
  clock: () => SH(27, 3, 46, 91, 6)
    + R(27, 5, 46, 88, '#7a4a2c', 6)
    + P('M24 14 Q24 2 50 2 Q76 2 76 14 Z', '#5a3a2a', 3)
    + C(50, 27, 15, CREAM, 3)
    + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => { const a = (k / 12) * Math.PI * 2; return DOT(50 + Math.cos(a) * 11, 27 + Math.sin(a) * 11, 1.2); }).join('')
    + L(50, 27, 50, 18, 2.5) + L(50, 27, 57, 31, 2.5)
    + R(37, 46, 26, 40, '#3d2618', 4, 3)
    + LN('M50 50 V70', 2, GOLD) + C(50, 73, 6, GOLD, 2.5)
    + LR(39, 48, 4, 34, 1.5, 0.25)
    + SR(64, 8, 6, 82, 2, 0.15),
  vase: (_w, _h, o) => {
    const f = o.tint ?? '#4a78d1';
    return SHE(50, 86, 18, 6)
      + L(50, 46, 50, 26, 3, LEAF_D) + L(50, 46, 38, 30, 3, LEAF_D) + L(50, 46, 62, 30, 3, LEAF_D)
      + P('M50 40 Q40 36 36 42 Q44 46 50 40 Z', LEAF, 2) + P('M50 42 Q60 38 64 44 Q56 48 50 42 Z', LEAF, 2)
      + C(38, 28, 8, '#e05a8a', 2.5) + DOT(38, 28, 2.6, '#f3c33b')
      + C(62, 27, 8, '#f3c33b', 2.5) + DOT(62, 27, 2.6, '#e8833a')
      + C(50, 18, 8, '#e05a47', 2.5) + DOT(50, 18, 2.6, '#f3c33b')
      + P('M38 90 Q28 72 38 58 Q42 52 40 46 L60 46 Q58 52 62 58 Q72 72 62 90 Z', f)
      + LN('M34 70 Q50 76 66 70', 2.5, lighten(f, 0.45), 0.9)
      + SR(54, 58, 9, 28, 4, 0.14)
      + HL('M38 62 Q36 70 39 80', 3, 0.45);
  },
  typewriter: () => SH(9, 24, 82, 64, 8)
    + R(26, 12, 48, 30, WHITE, 2, 3) + LN('M31 20 H66 M31 27 H60 M31 34 H54', 1.8, '#8a8193')
    + R(12, 36, 76, 14, '#2f343b', 4, 3) + C(10, 43, 4.5, METAL, 2.5) + C(90, 43, 4.5, METAL, 2.5)
    + R(9, 48, 82, 40, '#3a3f47', 10)
    + [0, 1, 2].map((r) => [0, 1, 2, 3, 4, 5].map((c) => C(22 + c * 11.2 + (r % 2) * 5, 58 + r * 9, 3.6, '#ece6da', 1.8)).join('')).join('')
    + R(34, 81, 32, 4, '#ece6da', 2, 1.8)
    + LR(13, 51, 30, 3, 1.5, 0.2),
};
