import { darken, lighten } from '../color';
import {
  BLUE, C, DARK, DOT, E, FIRE, GLASS, GOLD, GOLD_D, HL, INK, L, LEAF, LN, LR, METAL, METAL_D, METAL_L, P, R, RED, SH, SHC, SHE, SR, WHITE, WOOD, WOOD_D, WOOD_L,
  flame, orient, type IconFn,
} from './kit';

/** Máquinas, cachivaches y objetos de cada serie. */
export const GEAR: Record<string, IconFn> = {
  copier: () => SH(9, 13, 82, 76, 6)
    + R(9, 26, 82, 62, '#d5d9de', 6)
    + R(15, 12, 70, 19, '#eef1f3', 4, 3) + R(20, 16, 34, 6, '#bfc6cc', 2, 0)
    + R(22, 37, 42, 11, '#3a3f47', 2, 2.5) + LN('M26 42.5 H58', 1.6, '#4fd18b')
    + C(73, 42, 4.5, '#5db55a', 2) + C(83, 42, 3, '#e8213f', 1.8)
    + R(18, 57, 64, 18, WHITE, 2, 3) + LN('M24 63 H60 M24 69 H52', 1.4, '#8a8193')
    + SR(78, 30, 9, 54, 3, 0.12),
  vending: () => {
    let snacks = '';
    const cols = ['#f3c33b', '#5db55a', '#8e6cc9', '#4a78d1', '#e8833a'];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) snacks += `<rect x="${26 + i * 12}" y="${17 + j * 14}" width="8" height="10" rx="2" fill="${cols[(i + j * 2) % 5]}" stroke="${INK}" stroke-width="1.4"/>`;
    return SH(15, 5, 70, 89, 6)
      + R(15, 5, 70, 89, '#d9483b', 6)
      + R(21, 11, 42, 64, GLASS, 3, 3) + snacks + LN('M23 27 H61 M23 41 H61 M23 55 H61', 1.6, METAL_D, 0.8)
      + LR(24, 13, 6, 58, 2, 0.4)
      + R(67, 18, 12, 24, '#2f2b33', 2, 2) + [0, 1, 2].map((k) => DOT(73, 23 + k * 7, 2, '#ffd447')).join('')
      + R(23, 79, 38, 10, '#2f2b33', 2, 2)
      + SR(74, 46, 8, 44, 3, 0.15);
  },
  dumpster: () => SH(7, 17, 86, 70, 6)
    + R(9, 30, 82, 56, '#3f7f4f', 4)
    + LN('M20 40 V80 M50 40 V80 M80 40 V80', 2, '#2c5c38', 0.9)
    + P('M5 31 L95 31 L89 15 L11 15 Z', '#2f6a3f') + LR(14, 18, 34, 4, 2, 0.3)
    + R(4, 46, 6, 14, DARK, 2, 2.5) + R(90, 46, 6, 14, DARK, 2, 2.5)
    + P('M58 15 Q64 6 74 10 Q70 14 72 17 Z', '#e9e4d8', 2.5) + C(30, 12, 4, '#f3c33b', 2)
    + SR(12, 70, 76, 12, 3, 0.15),
  mailbox: () => SH(9, 13, 82, 74, 4)
    + R(9, 13, 82, 74, '#b9c2cc', 4)
    + [0, 1, 2].map((i) => [0, 1].map((j) => R(15 + i * 24.5, 19 + j * 33, 21, 28, '#dfe5ea', 2, 2.5) + R(21 + i * 24.5, 25 + j * 33, 9, 3, INK, 1, 0) + C(31 + i * 24.5, 40 + j * 33, 2.2, GOLD, 1.5) + R(19 + i * 24.5, 30 + j * 33, 13, 6, WHITE, 1, 1.4)).join('')).join('')
    + SR(80, 15, 8, 70, 2, 0.12),
  machine: (w, h, o) => {
    const f = o.tint ?? '#7d8794';
    return SH(5, 7, w - 10, h - 14, 8)
      + R(5, 7, w - 10, h - 14, f, 8)
      + R(13, 15, Math.min(42, w - 30), 28, '#1d2a35', 3, 3) + LN(`M17 33 L23 25 L29 30 L35 21 L${Math.min(42, w - 30) + 8} 28`, 2, '#4fd18b')
      + C(w - 25, 26, 9, '#f3c33b', 3) + L(w - 25, 26, w - 20, 21, 2.5)
      + C(w - 25, h - 28, 7, '#e8213f', 3) + DOT(w - 27, h - 30, 2, '#fff', 0.7)
      + L(14, h - 24, w - 44, h - 24, 4, '#3a3f47') + R(14, h - 34, 8, 6, METAL_L, 1.5, 2)
      + SR(w - 18, 11, 9, h - 22, 4, 0.13);
  },
  /** Máquina de pesas. */
  weights: () => SH(9, 9, 82, 82, 6)
    + R(12, 10, 10, 80, DARK, 3, 3) + R(78, 10, 10, 80, DARK, 3, 3) + R(12, 10, 76, 9, DARK, 3, 3)
    + LN('M50 19 V44', 2.4, METAL_L)
    + [0, 1, 2, 3, 4].map((k) => R(38, 44 + k * 7, 24, 6, k === 2 ? RED : '#5b5762', 1.5, 2)).join('')
    + R(47, 42, 6, 40, METAL, 1.5, 2)
    + R(26, 86, 48, 8, '#3a3f47', 3, 2.5)
    + R(28, 22, 44, 12, '#c0392b', 5, 3) + LR(31, 24, 18, 3, 1.5, 0.35),
  console: (w, h, o) => {
    const f = o.tint ?? '#5b6573';
    let btns = '';
    const cols = ['#e0302b', '#f3c33b', '#5db55a', '#5fd0ff'];
    for (let x = 22, k = 0; x < w - 16; x += 16, k++) btns += C(x, h * 0.64, 4.6, cols[k % 4], 2) + DOT(x - 1.2, h * 0.64 - 1.2, 1.3, '#fff', 0.7);
    return SH(6, 13, w - 12, h - 26, 8)
      + R(6, 13, w - 12, h - 26, f, 8)
      + R(13, 21, w - 26, h * 0.3, '#132634', 3, 3)
      + `<path d="M18 ${21 + h * 0.2} L${w * 0.3} ${21 + h * 0.08} L${w * 0.5} ${21 + h * 0.22} L${w - 20} ${21 + h * 0.06}" fill="none" stroke="#5fd0ff" stroke-width="3"/>`
      + LR(16, 24, (w - 32) * 0.4, 3, 1.5, 0.25)
      + btns
      + R(14, h * 0.76, w - 28, 6, darken(f, 0.25), 2, 2)
      + SR(10, h - 22, w - 20, 8, 3, 0.14);
  },
  fryer: () => SH(9, 13, 82, 76, 6)
    + R(9, 13, 82, 76, '#b9c2cc', 6)
    + R(16, 20, 32, 42, '#d9902a', 3, 3) + R(52, 20, 32, 42, '#d9902a', 3, 3)
    + [0, 1, 2, 3, 4].map((k) => R(20 + (k % 3) * 9, 26 + k * 6, 5, 16, '#f3d26b', 1.5, 1.4) + R(56 + ((k + 1) % 3) * 9, 24 + k * 6, 5, 16, '#f3d26b', 1.5, 1.4)).join('')
    + L(32, 20, 32, 7, 4) + L(68, 20, 68, 7, 4)
    + R(19, 68, 62, 13, '#77818c', 3, 3) + [30, 50, 70].map((x) => C(x, 74.5, 3.5, '#e8e4dc', 1.8)).join('')
    + SR(80, 17, 8, 68, 3, 0.12),
  arcade: () => SH(17, 5, 66, 89, 6)
    + P('M17 94 L17 20 Q17 5 32 5 L68 5 Q83 5 83 20 L83 94 Z', '#5a3fa0')
    + R(23, 8, 54, 9, '#f3c33b', 2, 2.5)
    + R(25, 20, 50, 34, '#2b2631', 3, 3) + R(29, 24, 42, 26, '#1d2a6b', 2, 2)
    + C(42, 37, 5, '#f3c33b', 0) + `<path d="M42 37 L48 33 L48 41 Z" fill="#1d2a6b"/>` + [52, 58, 64].map((x) => DOT(x, 37, 1.6, '#fff')).join('')
    + R(21, 58, 58, 14, '#2f2b33', 3, 3) + C(36, 65, 4.5, '#e0302b', 2) + C(48, 65, 4.5, '#f3c33b', 2) + L(64, 68, 64, 58, 3) + C(64, 57, 4, RED, 2)
    + R(38, 78, 24, 8, '#2f2b33', 2, 2)
    + SR(72, 20, 8, 72, 3, 0.18),
  foosball: () => SH(7, 17, 86, 66, 6)
    + R(7, 17, 86, 66, '#3a7a3a', 6)
    + R(13, 23, 74, 54, '#4caf50', 3, 2.5)
    + LN('M50 23 V77 M13 38 H22 V62 H13 M87 38 H78 V62 H87', 2, WHITE) + `<circle cx="50" cy="50" r="8" fill="none" stroke="${WHITE}" stroke-width="2"/>`
    + [24, 40, 60, 76].map((x, k) => L(x, 10, x, 90, 3.5, METAL_D) + C(x, 10, 3, DARK, 1.5) + C(x, 36 + (k % 2) * 14, 4.5, k < 2 ? '#d9483b' : '#4a78d1', 2) + C(x, 64 - (k % 2) * 14, 4.5, k < 2 ? '#d9483b' : '#4a78d1', 2)).join('')
    + C(56, 46, 3, WHITE, 1.6),
  holotable: (w, h, o) => {
    const glow = o.tint ?? '#5fd0ff';
    const cx = w / 2, cy = h / 2, r = Math.min(w, h);
    return SH(7, 7, w - 14, h - 14, 18)
      + R(7, 7, w - 14, h - 14, '#4a5160', 18)
      + R(17, 17, w - 34, h - 34, '#1c2732', 12, 3)
      + `<ellipse cx="${cx}" cy="${cy}" rx="${(w - 44) / 2}" ry="${(h - 44) / 2}" fill="${glow}" fill-opacity=".3"/>`
      + `<circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="none" stroke="${glow}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${r * 0.32}" fill="none" stroke="${glow}" stroke-width="1.4" stroke-dasharray="4 4"/>`
      + C(cx, cy, r * 0.11, glow, 2.5) + DOT(cx - r * 0.03, cy - r * 0.03, r * 0.035, '#fff', 0.8)
      + [0, 1, 2, 3].map((k) => DOT(14 + k * 6, h - 12, 1.8, ['#e0302b', '#f3c33b', '#5db55a', glow][k])).join('');
  },
  telescope: () => SHE(50, 86, 26, 6)
    + L(50, 60, 26, 90, 5) + L(50, 60, 74, 90, 5) + L(50, 60, 50, 92, 5)
    + L(50, 60, 26, 90, 2, WOOD_L) + L(50, 60, 74, 90, 2, WOOD_L) + L(50, 60, 50, 92, 2, WOOD_L)
    + P('M20 58 L72 20 L82 34 L30 72 Z', '#c99a3c')
    + `<path d="M30 52 L38 63 M46 40 L54 52 M60 30 L68 41" stroke="${GOLD_D}" stroke-width="4"/>`
    + P('M70 16 L84 10 L92 26 L80 38 Z', '#7a5520')
    + E(87, 18, 5, 8, GLASS, 2.5)
    + P('M20 58 L12 64 L22 76 L30 72 Z', DARK, 3)
    + C(50, 60, 5, METAL, 2.5)
    + HL('M28 56 L66 28', 2.6, 0.4),
  cauldron: () => SHC(50, 56, 34)
    + R(16, 46, 8, 8, '#2f2b33', 2, 2.5) + R(76, 46, 8, 8, '#2f2b33', 2, 2.5)
    + C(50, 55, 33, '#2f2b33')
    + `<circle cx="50" cy="53" r="27" fill="none" stroke="#56505e" stroke-width="5"/>`
    + C(50, 53, 24, '#6bd36b', 3)
    + C(41, 47, 6, '#a6f0a0', 2) + C(57, 58, 4.5, '#a6f0a0', 2) + C(56, 44, 3, '#d9ffd4', 1.6) + C(40, 60, 3, '#d9ffd4', 1.6)
    + LN('M42 26 Q36 18 42 12 M56 24 Q62 16 56 9', 2.4, '#bfe8bb', 0.85)
    + HL('M30 42 Q34 33 42 30', 3, 0.35),
  campfire: () => {
    const stones = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k / 8) * Math.PI * 2; return E(50 + Math.cos(a) * 33, 54 + Math.sin(a) * 31, 8, 6, k % 2 ? '#a59e94' : '#8c857c', 2.5); }).join('');
    return SHE(50, 56, 36, 33) + stones
      + `<g transform="rotate(-25 50 60)">${R(20, 54, 60, 12, WOOD_D, 6, 3)}</g><g transform="rotate(25 50 60)">${R(20, 54, 60, 12, WOOD, 6, 3)}</g>`
      + flame(50, 66, 38, 48)
      + DOT(30, 30, 2, '#ffb347') + DOT(68, 22, 1.6, '#ffb347') + DOT(60, 12, 1.4, '#ffd447');
  },
  brazier: () => SHC(50, 58, 32)
    + L(26, 76, 20, 94, 5) + L(74, 76, 80, 94, 5) + L(50, 80, 50, 96, 5)
    + P('M14 50 L86 50 Q82 80 50 82 Q18 80 14 50 Z', '#5b5560')
    + E(50, 50, 36, 9, '#2b2027', 3.5)
    + [0, 1, 2, 3, 4].map((k) => C(34 + k * 8, 50 + (k % 2) * 3, 4.5, k % 2 ? '#ff6b2a' : '#c0392b', 1.6)).join('')
    + flame(50, 50, 34, 42)
    + LN('M22 62 Q50 70 78 62', 2, '#7a7380', 0.9),
  anvil: () => SH(10, 28, 80, 62, 6)
    + R(26, 70, 48, 22, WOOD_D, 4) + LN('M30 78 H70 M30 85 H70', 1.6, darken(WOOD_D, 0.4), 0.6)
    + R(38, 52, 24, 20, '#4a4550', 2)
    + P('M8 32 Q30 30 30 40 L84 40 L92 30 L92 54 L22 54 Q10 50 8 32 Z', '#5b5762')
    + LR(32, 42, 50, 4, 1.5, 0.3) + SR(26, 47, 64, 6, 2, 0.2)
    + R(40, 30, 6, 10, METAL_L, 1.5, 2) + L(58, 28, 76, 22, 4, DARK) + R(54, 20, 10, 12, METAL_D, 2, 2.5),
  toybox: () => SH(9, 26, 82, 62, 6)
    + C(30, 34, 10, '#e05a47', 3) + DOT(27, 31, 2.4, '#fff', 0.7)
    + R(46, 20, 16, 20, BLUE, 3, 3)
    + C(72, 32, 8, '#5db55a', 3) + L(72, 24, 76, 16, 2.5) + C(77, 14, 3, '#f3c33b', 2)
    + R(9, 40, 82, 48, '#f3b23b', 6)
    + R(9, 40, 82, 11, '#e09a2b', 4, 3)
    + `<text x="50" y="78" font-family="Arial Black,Arial" font-size="19" font-weight="900" text-anchor="middle" fill="${WHITE}" stroke="${INK}" stroke-width="2.4" paint-order="stroke">ABC</text>`
    + SR(80, 52, 8, 34, 3, 0.15),
  blocks: () => SH(13, 21, 74, 70, 4)
    + R(13, 57, 34, 34, '#e05a47', 3) + R(51, 57, 34, 34, BLUE, 3) + R(31, 21, 34, 34, '#f3c33b', 3)
    + `<text x="30" y="82" font-family="Arial Black,Arial" font-size="21" text-anchor="middle" fill="${WHITE}">A</text><text x="68" y="82" font-family="Arial Black,Arial" font-size="21" text-anchor="middle" fill="${WHITE}">B</text><text x="48" y="46" font-family="Arial Black,Arial" font-size="21" text-anchor="middle" fill="${INK}">C</text>`
    + SR(39, 59, 7, 30, 2, 0.15) + SR(77, 59, 7, 30, 2, 0.15) + SR(57, 23, 7, 30, 2, 0.15),
  cake: (_w, _h, o) => {
    const f = o.tint ?? '#f7d7e8';
    const drip = (x: number, y: number, ww: number) => `<path d="M${x} ${y} H${x + ww} V${y + 5} Q${x + ww - 5} ${y + 11} ${x + ww - 9} ${y + 5} Q${x + ww - 15} ${y + 9} ${x + ww * 0.5} ${y + 5} Q${x + 12} ${y + 12} ${x + 7} ${y + 5} Q${x + 3} ${y + 8} ${x} ${y + 5} Z" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>`;
    return SHE(50, 86, 40, 7)
      + R(12, 62, 76, 25, f, 6) + drip(12, 62, 76)
      + R(22, 42, 56, 22, lighten(f, 0.2), 6) + drip(22, 42, 56)
      + R(32, 23, 36, 21, f, 6) + drip(32, 23, 36)
      + [24, 40, 56, 72].map((x) => C(x, 76, 3, '#e05a8a', 1.6)).join('') + [34, 50, 66].map((x) => DOT(x, 56, 2.4, '#f3c33b')).join('')
      + R(47, 8, 6, 15, '#9fd3f5', 2, 2) + P('M50 0 Q46 5 50 8 Q54 5 50 0 Z', FIRE, 1.4)
      + SR(74, 64, 12, 21, 4, 0.12) + SR(66, 44, 10, 18, 4, 0.12);
  },
  aquarium: () => SH(9, 17, 82, 66, 4)
    + R(9, 17, 82, 66, '#8fd3f0', 4)
    + `<rect x="11" y="70" width="78" height="11" fill="#e8d9a8"/>`
    + R(9, 17, 82, 12, '#c9edf9', 4, 3)
    + P('M24 66 Q20 56 26 52 L32 56 Q36 50 42 54 L40 62 Q44 68 36 72 Z', '#e0503a', 2.5) + L(28, 52, 22, 44, 2) + L(34, 52, 36, 44, 2)
    + C(64, 62, 9, '#ef7a3a', 2.5) + L(58, 56, 52, 48, 2.5) + L(70, 56, 76, 48, 2.5) + DOT(61, 60, 1.4) + DOT(67, 60, 1.4)
    + [[48, 40, 3], [52, 32, 2.2], [80, 46, 2.6], [78, 36, 1.8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#fff" stroke-width="1.6"/>`).join('')
    + LR(13, 32, 4, 34, 1.5, 0.45)
    + R(9, 17, 82, 66, 'none', 4),
  cello: () => SH(30, 7, 42, 86, 20)
    + L(50, 4, 50, 34, 6) + P('M46 2 Q50 -1 54 2 L54 8 L46 8 Z', '#5a2e14', 2.5)
    + P('M38 34 Q30 30 32 44 Q36 52 32 60 Q26 76 38 88 Q50 94 62 88 Q74 76 68 60 Q64 52 68 44 Q70 30 62 34 Q56 38 50 36 Q44 38 38 34 Z', '#a5582c')
    + SR(56, 40, 10, 44, 5, 0.14) + LR(35, 44, 4, 34, 2, 0.25)
    + LN('M42 54 Q39 60 42 66 M58 54 Q61 60 58 66', 2.5, INK)
    + LN('M47 32 V80 M50 32 V80 M53 32 V80', 1, '#f2e6c4', 0.9)
    + R(43, 72, 14, 4, '#2b1a10', 1.5, 1.6) + R(46, 80, 8, 8, '#2b1a10', 2, 2)
    + L(16, 74, 86, 44, 3.2, '#c9a46a') + L(16, 74, 86, 44, 1, '#fff'),
  outhouse: () => SH(17, 9, 66, 83, 4)
    + R(21, 26, 58, 66, WOOD, 3)
    + LN('M34 30 V90 M47 30 V90 M60 30 V90', 1.8, WOOD_D, 0.6)
    + P('M13 28 L50 7 L87 28 Z', '#8a5a35') + LN('M24 22 L50 10 L76 22', 1.6, '#5a3a20', 0.6)
    + R(34, 40, 32, 52, WOOD_D, 3, 3)
    + P('M53 50 Q45 54 53 61 Q47 61 47 55.5 Q47 50 53 50 Z', '#f3c33b', 2)
    + C(60, 70, 2.4, GOLD, 1.5)
    + SR(70, 30, 8, 60, 2, 0.15),
  watchtower: () => SH(13, 13, 74, 79, 4)
    + L(24, 92, 33, 40, 5) + L(76, 92, 67, 40, 5) + LN('M28 66 L72 66 M30 56 L70 80 M70 56 L30 80', 3)
    + R(16, 26, 68, 20, WOOD, 3) + LN('M28 26 V46 M40 26 V46 M52 26 V46 M64 26 V46 M76 26 V46', 1.8, WOOD_D, 0.7)
    + P('M10 27 L50 5 L90 27 Z', '#8a3b2a') + LN('M22 21 L50 9 L78 21', 1.6, '#5e271c', 0.7)
    + R(44, 46, 12, 46, WOOD_D, 2, 3) + LN('M44 56 H56 M44 66 H56 M44 76 H56 M44 86 H56', 2)
    + C(68, 18, 4, '#fff3b0', 2),
  gold: (_w, _h, o) => {
    const g = o.tint ?? GOLD;
    const bar = (x: number, y: number) => P(`M${x} ${y + 14} L${x + 6} ${y} L${x + 30} ${y} L${x + 36} ${y + 14} Z`, g, 3) + LN(`M${x + 8} ${y + 4} H${x + 20}`, 2, '#fff', 0.55);
    return SH(10, 32, 80, 54, 4)
      + bar(10, 70) + bar(32, 70) + bar(54, 70) + bar(21, 53) + bar(43, 53) + bar(32, 36)
      + `<path d="M74 30 L77 36 L83 37 L78 41 L80 47 L74 44 L69 47 L70 41 L66 37 L72 36 Z" fill="#fff8c8" stroke="${GOLD_D}" stroke-width="1.6"/>`;
  },
  /** Montón de monedas, copas y joyas (piratas). */
  treasure: () => {
    let coins = '';
    const pts: [number, number][] = [[22, 74], [34, 78], [48, 80], [62, 78], [76, 74], [28, 64], [42, 66], [56, 66], [70, 64], [36, 54], [50, 54], [64, 54], [44, 44], [56, 44]];
    pts.forEach(([x, y], k) => { coins += E(x, y, 9, 6, k % 3 ? GOLD : '#f7d35c', 2.4) + LN(`M${x - 4} ${y - 1} H${x + 3}`, 1.4, GOLD_D, 0.8); });
    return SHE(50, 78, 38, 12)
      + coins
      + P('M66 22 L80 22 L77 36 Q73 42 73 48 L80 50 L66 50 L73 48 Q73 42 69 36 Z', GOLD, 2.5)
      + C(28, 44, 6, '#e0302b', 2.2) + DOT(26.5, 42.5, 1.6, '#fff', 0.8)
      + C(40, 34, 5, '#3bb3a9', 2.2) + DOT(38.8, 32.8, 1.3, '#fff', 0.8)
      + P('M50 30 L56 24 L62 30 L56 38 Z', '#8e6cc9', 2.2)
      + `<path d="M84 34 L86 39 L91 40 L87 43 L88 48 L84 45 L80 48 L81 43 L77 40 L82 39 Z" fill="#fff8c8" stroke="${GOLD_D}" stroke-width="1.4"/>`;
  },
  cannon: () => SH(10, 28, 80, 46, 10)
    + R(14, 36, 52, 30, WOOD, 6) + LN('M18 44 H62 M18 52 H62', 1.6, WOOD_D, 0.6)
    + C(26, 30, 9, WOOD_D, 3) + C(26, 72, 9, WOOD_D, 3) + C(56, 30, 9, WOOD_D, 3) + C(56, 72, 9, WOOD_D, 3)
    + DOT(26, 30, 2.4, METAL_L) + DOT(26, 72, 2.4, METAL_L) + DOT(56, 30, 2.4, METAL_L) + DOT(56, 72, 2.4, METAL_L)
    + P('M18 40 L80 42 Q91 50 80 58 L18 60 Q11 50 18 40 Z', '#3b3a42')
    + `<path d="M34 41 V59 M60 42 V58" stroke="#5b5762" stroke-width="4"/>`
    + E(85, 50, 5, 8, '#1a1a1f', 3)
    + HL('M22 45 L70 46', 2.6, 0.35)
    + C(11, 50, 4, '#5b5762', 2.5),
  helm: () => {
    let spokes = '';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const x1 = 50 + Math.cos(a) * 16, y1 = 50 + Math.sin(a) * 16, x2 = 50 + Math.cos(a) * 44, y2 = 50 + Math.sin(a) * 44;
      spokes += L(x1, y1, x2, y2, 7) + L(x1, y1, x2, y2, 3.2, WOOD) + C(x2, y2, 4.6, WOOD_D, 2.5);
    }
    return SHC(50, 50, 34) + spokes
      + `<circle cx="50" cy="50" r="30" fill="none" stroke="${INK}" stroke-width="10"/><circle cx="50" cy="50" r="30" fill="none" stroke="${WOOD}" stroke-width="5.5"/>`
      + `<circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-width="1.4" stroke-opacity=".35" stroke-dasharray="20 30"/>`
      + C(50, 50, 11, GOLD) + C(50, 50, 4.5, GOLD_D, 2);
  },
  anchor: () => SHE(52, 56, 30, 34)
    + `<g fill="none" stroke-linecap="round" stroke-linejoin="round">`
    + `<circle cx="50" cy="17" r="8" stroke="${INK}" stroke-width="8"/><circle cx="50" cy="17" r="8" stroke="${METAL}" stroke-width="3.5"/>`
    + `<path d="M50 25 V86 M33 38 H67 M17 60 Q20 86 50 86 Q80 86 83 60" stroke="${INK}" stroke-width="10"/><path d="M50 25 V86 M33 38 H67 M17 60 Q20 86 50 86 Q80 86 83 60" stroke="${METAL}" stroke-width="5"/>`
    + `<path d="M12 66 L17 56 L24 66 M76 66 L83 56 L88 66" stroke="${INK}" stroke-width="6"/></g>`
    + LN('M46 30 V80', 1.6, '#fff', 0.5)
    + LN('M58 21 Q72 26 66 40 Q60 52 72 60', 3, '#c9a46a'),
  hammer: () => SH(17, 9, 66, 82, 8)
    + R(45, 40, 10, 50, '#8a5a35', 4) + LN('M45 52 L55 47 M45 62 L55 57 M45 72 L55 67', 2, '#5a3a20', 0.8)
    + R(43, 86, 14, 8, '#5a3a20', 2, 3) + `<path d="M50 94 Q42 99 36 94" fill="none" stroke="#5a3a20" stroke-width="3"/>`
    + R(17, 12, 66, 34, '#9aa3ad', 6)
    + R(17, 12, 66, 10, '#c9d1da', 5, 3)
    + LN('M30 28 L36 34 L42 28 M58 28 L64 34 L70 28', 2, '#6b737c')
    + SR(70, 15, 11, 29, 4, 0.16) + HL('M24 16 H44', 2.6, 0.5),
  /** Mazo de Harley Quinn. */
  mallet: () => SH(13, 8, 74, 84, 10)
    + R(46, 44, 9, 48, '#c9a46a', 4) + R(44, 84, 13, 8, '#e0302b', 2, 3)
    + P('M14 22 Q14 12 26 12 L74 12 Q86 12 86 22 L86 38 Q86 48 74 48 L26 48 Q14 48 14 38 Z', '#2b2631')
    + P('M50 12 L74 12 Q86 12 86 22 L86 38 Q86 48 74 48 L50 48 Z', '#e0302b', 3)
    + R(10, 16, 6, 28, '#9aa3ad', 2, 2.5) + R(84, 16, 6, 28, '#9aa3ad', 2, 2.5)
    + `<path d="M28 24 L36 30 L28 36 L20 30 Z" fill="#e0302b"/><path d="M68 24 L76 30 L68 36 L60 30 Z" fill="#2b2631"/>`
    + HL('M22 16 H44', 2.6, 0.45),
  dragonball: () => SHC(50, 52, 27)
    + C(50, 50, 27, '#ff9d1e')
    + `<path d="M28 62 A27 27 0 0 0 72 62 A30 30 0 0 1 28 62 Z" fill="#000" fill-opacity=".1"/>`
    + `<path d="M50 38 L53.5 46 L62 46.5 L55.5 52 L57.5 60.5 L50 56 L42.5 60.5 L44.5 52 L38 46.5 L46.5 46 Z" fill="#e0302b" stroke="${INK}" stroke-width="1.6"/>`
    + C(40, 39, 6, '#ffd27a', 0) + DOT(38, 37, 2.6, '#fff', 0.9),
  egg: () => SHE(50, 62, 32, 18)
    + P('M16 72 Q22 56 32 60 Q38 50 50 56 Q62 50 68 60 Q78 56 84 72 Q66 82 50 80 Q34 82 16 72 Z', '#c9a46a', 3)
    + LN('M24 70 L30 66 M70 66 L76 70 M44 74 L50 70', 1.8, '#8a6a3c')
    + E(50, 45, 21, 29, '#efe6cf')
    + [[44, 34, 3.4], [57, 44, 4.2], [46, 56, 3.2], [58, 28, 2.4]].map(([x, y, r]) => DOT(x, y, r, '#8fbf6a')).join('')
    + SR(54, 26, 12, 40, 6, 0.1) + HL('M38 32 Q41 24 47 21', 3, 0.6),
  duck: () => SHE(50, 64, 31, 16)
    + P('M20 60 Q18 43 35 44 Q39 29 54 29 Q67 29 67 42 L81 46 L67 51 Q78 67 61 75 L34 75 Q18 73 20 60 Z', WHITE)
    + P('M67 42 L81 46 L67 51 Z', '#f3a33b', 3)
    + DOT(58, 38, 3) + DOT(57, 37, 1, '#fff')
    + LN('M30 58 Q41 51 52 60', 3, '#cfcac0')
    + SR(40, 64, 26, 9, 4, 0.08)
    + HL('M38 47 Q44 41 52 41', 2.6, 0.7),
  /** Muñeca gigante (El juego del calamar). */
  doll: () => SH(25, 8, 50, 84, 20)
    + P('M30 52 L70 52 L79 92 L21 92 Z', '#f08a24') + LN('M40 60 L36 90 M60 60 L64 90', 1.8, '#c96a14', 0.8)
    + R(33, 45, 34, 13, '#f6e05e', 4, 3)
    + C(50, 31, 18, '#f5d3b5')
    + P('M31 29 Q31 11 50 11 Q69 11 69 29 Q61 21 50 21 Q39 21 31 29 Z', '#2b2027')
    + C(29, 36, 6.5, '#2b2027', 3) + C(71, 36, 6.5, '#2b2027', 3) + `<path d="M28 34 L22 46 M72 34 L78 46" stroke="#2b2027" stroke-width="3"/>`
    + DOT(44, 31, 2.8) + DOT(56, 31, 2.8) + DOT(43, 30, 0.9, '#fff') + DOT(55, 30, 0.9, '#fff')
    + `<path d="M46 39 Q50 41 54 39" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round"/>`
    + DOT(40, 37, 2.6, '#f7a8a0', 0.8) + DOT(60, 37, 2.6, '#f7a8a0', 0.8),
  carbonite: () => SH(16, 5, 68, 89, 6)
    + R(16, 5, 68, 89, '#5a6470', 6)
    + R(22, 11, 56, 77, '#6b7682', 3, 2.5)
    + P('M38 22 Q50 12 62 22 L64 40 Q70 50 66 60 L60 86 L40 86 L34 60 Q30 50 36 40 Z', '#8a96a3', 3)
    + LN('M43 31 Q50 27 57 31 M46 36 Q50 39 54 36 M36 50 Q29 40 33 28 M64 50 Q71 40 67 28', 2.4, '#4a535d')
    + `<path d="M31 30 L27 22 M33 27 L31 19 M69 30 L73 22 M67 27 L69 19" stroke="#4a535d" stroke-width="2.4" stroke-linecap="round"/>`
    + [0, 1, 2].map((k) => DOT(20, 30 + k * 10, 2, ['#e0302b', '#5db55a', '#f3c33b'][k]) + DOT(80, 60 + k * 8, 2, ['#5fd0ff', '#e0302b', '#5db55a'][k])).join('')
    + LR(19, 9, 4, 80, 2, 0.2),
  pit: (w, h) => {
    const bones = [0.28, 0.6].map((t) => `<g transform="translate(${w * t} ${h * 0.62}) rotate(-20)">${R(-12, -2.5, 24, 5, '#e8e0d0', 2.5, 1.8)}${C(-12, -3, 3, '#e8e0d0', 1.6)}${C(-12, 3, 3, '#e8e0d0', 1.6)}${C(12, -3, 3, '#e8e0d0', 1.6)}${C(12, 3, 3, '#e8e0d0', 1.6)}</g>`).join('');
    return R(4, 4, w - 8, h - 8, '#3a3035', 18)
      + R(11, 11, w - 22, h - 22, '#1d1820', 14, 2.5)
      + R(20, 20, w - 40, h - 40, '#0d0a10', 10, 0)
      + bones
      + [0.2, 0.4, 0.6, 0.8].map((t) => `<path d="M${w * t - 6} ${h - 12} L${w * t} ${h - 24} L${w * t + 6} ${h - 12}" fill="#e8e0d0" stroke="${INK}" stroke-width="1.8"/>`).join('')
      + [0.3, 0.7].map((t) => `<path d="M${w * t - 6} 12 L${w * t} 24 L${w * t + 6} 12" fill="#e8e0d0" stroke="${INK}" stroke-width="1.8"/>`).join('');
  },
  /** Cristal roto del puente (El juego del calamar). */
  brokenglass: (w, h) => {
    const cx = w / 2, cy = h / 2;
    let cracks = '';
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + 0.3;
      cracks += `M${cx} ${cy} L${(cx + Math.cos(a) * w * 0.48).toFixed(1)} ${(cy + Math.sin(a) * h * 0.48).toFixed(1)} `;
    }
    return R(5, 5, w - 10, h - 10, '#1b2a33', 6)
      + R(10, 10, w - 20, h - 20, '#06090c', 4, 2)
      + P(`M10 10 L${w * 0.42} 10 L${w * 0.3} ${h * 0.34} Z`, '#bfe6f5', 2.5)
      + P(`M${w - 10} ${h - 10} L${w * 0.6} ${h - 10} L${w * 0.74} ${h * 0.66} Z`, '#bfe6f5', 2.5)
      + P(`M${w - 10} 10 L${w - 10} ${h * 0.3} L${w * 0.78} 10 Z`, '#d6f0fa', 2.5)
      + LN(cracks, 1.4, '#bfe6f5', 0.55)
      + LR(14, 14, w * 0.18, 4, 1.5, 0.4);
  },
  coffin: (w, h, o) => {
    const f = o.tint ?? '#5a3a2a';
    return orient(w, h, 'S', (Lw) => SH(5, 13, Lw - 10, 74, 4)
      + P(`M6 50 L${Lw * 0.22} 13 L${Lw - 10} 21 L${Lw - 10} 79 L${Lw * 0.22} 87 Z`, f)
      + P(`M16 50 L${Lw * 0.24} 22 L${Lw - 20} 28 L${Lw - 20} 72 L${Lw * 0.24} 78 Z`, lighten(f, 0.1), 2.5)
      + LN(`M${Lw * 0.3} 35 H${Lw - 30} M${Lw * 0.3} 65 H${Lw - 30}`, 1.6, darken(f, 0.45), 0.6)
      + L(Lw * 0.45, 50, Lw * 0.75, 50, 5, '#d8c27a') + L(Lw * 0.55, 37, Lw * 0.55, 63, 5, '#d8c27a')
      + R(Lw * 0.3, 8, 14, 7, GOLD, 2, 2) + R(Lw * 0.62, 10, 14, 7, GOLD, 2, 2) + R(Lw * 0.3, 85, 14, 7, GOLD, 2, 2) + R(Lw * 0.62, 83, 14, 7, GOLD, 2, 2)
      + HL(`M${Lw * 0.26} 26 L${Lw * 0.5} 28`, 2.6, 0.35));
  },
  /** Ataúd negro con lazo rosa (El juego del calamar). */
  squidcoffin: (w, h, o) => {
    const f = o.tint ?? '#2f2a33';
    const pink = '#f05a96';
    return SH(8, 10, w - 16, h - 20, 6)
      + R(8, 10, w - 16, h - 20, f, 6)
      + LR(12, 14, w * 0.3, 4, 2, 0.15)
      + R(w / 2 - 6, 10, 12, h - 20, pink, 0, 3) + R(8, h / 2 - 6, w - 16, 12, pink, 0, 3)
      + P(`M${w / 2} ${h / 2} Q${w / 2 - 22} ${h / 2 - 22} ${w / 2 - 20} ${h / 2 - 4} Q${w / 2 - 18} ${h / 2 + 8} ${w / 2} ${h / 2} Z`, pink, 2.5)
      + P(`M${w / 2} ${h / 2} Q${w / 2 + 22} ${h / 2 - 22} ${w / 2 + 20} ${h / 2 - 4} Q${w / 2 + 18} ${h / 2 + 8} ${w / 2} ${h / 2} Z`, pink, 2.5)
      + C(w / 2, h / 2, 5, '#d43a7c', 2.5);
  },
  grave: (_w, _h, o) => {
    const f = o.tint ?? '#a9a49c';
    return SH(21, 13, 58, 78, 22)
      + P('M21 90 L21 40 Q21 13 50 13 Q79 13 79 40 L79 90 Z', f)
      + `<path d="M64 20 Q76 28 77 42 L77 88 L66 88 Z" fill="#000" fill-opacity=".14"/>`
      + LN('M31 30 L36 38 L33 44 M70 58 L64 64', 1.8, darken(f, 0.4))
      + `<text x="50" y="57" font-family="Georgia,serif" font-size="16" font-weight="700" text-anchor="middle" fill="${darken(f, 0.55)}">RIP</text>`
      + LN('M38 66 H62 M40 72 H60', 1.6, darken(f, 0.45), 0.7)
      + R(13, 84, 74, 10, '#7a6f5f', 3, 3)
      + `<path d="M18 84 L21 77 L24 84 M74 84 L77 76 L80 84 M28 84 L30 79 L32 84" fill="${LEAF}" stroke="${INK}" stroke-width="1.6"/>`
      + HL('M28 36 Q33 23 46 20', 3, 0.4);
  },
};
