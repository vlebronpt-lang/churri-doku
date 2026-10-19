import { darken, lighten } from '../color';
import {
  C, DOT, E, GLASS, GOLD, GOLD_D, HL, INK, L, LN, LR, MARBLE, METAL, METAL_D, P, R, RED, SH, SHADE, SHC, SHE, SR, STONE, WHITE, WOOD_D,
  type IconFn,
} from './kit';

/** Peana de mármol de tres piezas (estatuas, pedestales…). */
function plinth(top: number, base = MARBLE) {
  const bd = darken(base, 0.2);
  return R(17, 82, 66, 11, bd, 3)
    + R(23, top + 6, 54, 82 - top - 6, base, 2)
    + SR(64, top + 8, 11, 82 - top - 10, 1.5, 0.15)
    + LR(25, top + 8, 4, 82 - top - 12, 1.5, 0.4)
    + R(19, top, 62, 8, bd, 3, 3)
    + LN(`M22 ${top + 4} H78`, 1.4, '#fff', 0.45);
}

/** Copa con luz interior (orbes, bolas…). */
function glowOrb(cx: number, cy: number, r: number, glow: string, dark = '#24202c') {
  return C(cx, cy, r, dark)
    + `<circle cx="${cx}" cy="${cy + r * 0.08}" r="${r * 0.72}" fill="${glow}" fill-opacity=".55"/>`
    + `<circle cx="${cx}" cy="${cy + r * 0.12}" r="${r * 0.42}" fill="${glow}" fill-opacity=".85"/>`
    + `<circle cx="${cx}" cy="${cy + r * 0.12}" r="${r * 0.16}" fill="#fff8d8" fill-opacity=".9"/>`
    + HL(`M${cx - r * 0.62} ${cy - r * 0.2} Q${cx - r * 0.45} ${cy - r * 0.62} ${cx - r * 0.05} ${cy - r * 0.7}`, 3, 0.55);
}

export const DECOR: Record<string, IconFn> = {
  /** Estatua de una persona sobre su peana. Toda la figura es del mismo material (piedra, bronce, oro…). */
  statue: (_w, _h, o) => {
    const f = o.tint ?? STONE;
    const d = darken(f, 0.3), l = lighten(f, 0.38);
    const base = '#d9d3c7', bd = darken(base, 0.22);
    return SHE(50, 92, 34, 5)
      // Peana baja
      + R(20, 84, 60, 9, bd, 3)
      + R(25, 71, 50, 14, base, 2) + SR(63, 72, 10, 12, 1.5, 0.15) + LR(27, 73, 4, 10, 1.5, 0.4)
      + R(38, 74.5, 24, 7, GOLD, 1.5, 2) + LN('M42 78 H58', 1.4, GOLD_D)
      + R(21, 65, 58, 8, bd, 3, 3)
      // Túnica larga hasta la peana
      + P('M37 30 Q50 24 63 30 L70 66 L30 66 Z', f)
      + SHADE('M52 26 Q58 26.5 63 30 L70 66 L55 66 Z', 0.2)
      + LN('M43 36 L38 64 M49 34 L48 64 M56 36 L60 64 M33 58 Q50 54 67 58', 1.8, d, 0.85)
      // Brazo izquierdo con un libro
      + P('M38 32 Q30 38 33 50 L40 48 Q38 40 42 36 Z', f, 3) + R(29, 44, 13, 11, d, 1.5, 2.4) + LN('M31 47 H40', 1.2, l, 0.8)
      // Brazo derecho alzado con una antorcha
      + P('M60 31 Q67 24 69 12 L74.5 13 Q73.5 27 64 37 Z', f, 3)
      + C(71.5, 11.5, 4.3, f, 2.6)
      + R(69, 1, 5.5, 10, d, 1.5, 2.4)
      + P('M71.8 -6 Q66 -1 68 2 Q69.5 4 71.8 4 Q74 4 75.5 2 Q77.5 -1 71.8 -6 Z', l, 2.4)
      // Cabeza
      + C(50, 16, 9.5, f)
      + SHADE('M52 6.7 A9.5 9.5 0 0 1 52 25.3 A11 11 0 0 0 52 6.7 Z', 0.22)
      + LN('M41.5 13.5 Q50 7 58.5 13.5', 2.2, d)
      + DOT(46.5, 13.5, 2, l)
      + HL('M40 34 Q37 46 35 60', 2.6, 0.55);
  },
  /** Ídolo de madera tallada (Odín, con su único ojo). */
  idol: (_w, _h, o) => {
    const f = o.tint ?? '#b8863c';
    const d = darken(f, 0.32), l = lighten(f, 0.3);
    return SHE(50, 91, 26, 5)
      + R(27, 83, 46, 10, darken(f, 0.4), 2)
      + R(31, 13, 38, 72, f, 7)
      + SR(57, 16, 10, 66, 4, 0.16) + LR(33, 18, 4, 60, 2, 0.3)
      + P('M29 25 Q50 3 71 25 Z', darken(f, 0.12))
      + P('M31 21 L15 9 L21 25 Z', l, 3) + P('M69 21 L85 9 L79 25 Z', l, 3)
      + LN('M18 13 L26 21 M82 13 L74 21', 1.6, d, 0.8)
      // Rostro: un ojo y un parche
      + C(42, 33, 4.2, WHITE, 2.4) + DOT(42, 33, 1.9)
      + LN('M54 30 L62 36 M53 36 L63 30', 2.6, INK) + LN('M35 28 L65 26', 2, d, 0.8)
      + P('M47 34 L50 44 L53 34 Z', l, 2.2)
      // Barba larga
      + P('M37 46 Q50 42 63 46 L58 70 Q50 76 42 70 Z', l, 3)
      + LN('M43 50 L45 66 M50 49 V70 M57 50 L55 66', 1.8, d)
      + LN('M35 76 L39 80 L43 76 L47 80 L51 76 L55 80 L59 76 L63 80', 1.8, d, 0.9);
  },
  /** Armadura de caballero en su soporte. */
  armor: (_w, _h, o) => {
    const f = o.tint ?? METAL;
    const d = darken(f, 0.28), l = lighten(f, 0.35);
    return SHE(50, 92, 27, 5)
      + R(30, 87, 40, 7, WOOD_D, 2, 2.5)
      + R(36, 64, 11, 25, f, 4) + R(53, 64, 11, 25, f, 4) + C(41.5, 72, 3.8, l, 2) + C(58.5, 72, 3.8, l, 2)
      + R(19, 37, 10, 27, f, 4) + R(71, 37, 10, 27, f, 4) + C(24, 66, 5.2, d, 2.5) + C(76, 66, 5.2, d, 2.5)
      + P('M28 38 Q28 30 36 29 L64 29 Q72 30 72 38 L68 66 L32 66 Z', f)
      + SHADE('M50 30 L64 29 Q72 30 72 38 L68 66 L50 66 Z', 0.14)
      + LN('M50 31 V60 M36 40 Q50 46 64 40', 2, d, 0.9)
      + R(31, 59, 38, 7, d, 2, 2.5) + R(46, 59, 8, 7, GOLD, 1.5, 2)
      + E(29, 34, 9.5, 7, l) + E(71, 34, 9.5, 7, l)
      + P('M38 9 Q50 2 62 9 L64 28 L36 28 Z', f)
      + SHADE('M51 4.5 Q58 5.5 62 9 L64 28 L52 28 Z', 0.14)
      + L(41, 16, 59, 16, 3.4) + LN('M44 21 V25 M48 21 V25 M52 21 V25 M56 21 V25', 1.6)
      + P('M50 4 Q58 -4 66 3 Q59 2 54 7 Z', o.tint ? lighten(o.tint, 0.2) : RED, 2.5)
      + HL('M33 36 Q32 46 34 56', 2.6, 0.55) + HL('M41 8 Q44 5 48 5', 2.2, 0.6);
  },
  /** Traje de Iron Man. */
  suit: () => {
    const red = '#c0392b', gold = '#f3b53f';
    return SHE(50, 92, 27, 5)
      + R(36, 64, 11, 27, red, 4) + R(53, 64, 11, 27, red, 4) + R(37, 70, 9, 7, gold, 2, 2) + R(54, 70, 9, 7, gold, 2, 2)
      + R(19, 37, 10, 27, red, 4) + R(71, 37, 10, 27, red, 4) + R(20, 50, 8, 10, gold, 2, 2) + R(72, 50, 8, 10, gold, 2, 2)
      + C(24, 66, 4.6, '#bff6ff', 2.2) + C(76, 66, 4.6, '#bff6ff', 2.2)
      + P('M28 38 Q28 30 36 29 L64 29 Q72 30 72 38 L68 66 L32 66 Z', red)
      + P('M40 50 L60 50 L57 64 L43 64 Z', gold, 2.5) + LN('M44 55 H56 M44 59 H56', 1.6, '#c98a00')
      + SHADE('M50 30 L64 29 Q72 30 72 38 L68 66 L57 64 L60 50 L50 50 Z', 0.12)
      + `<circle cx="50" cy="41" r="9" fill="#bff6ff" fill-opacity=".45"/>` + C(50, 41, 5.5, '#e9fdff', 2.5)
      + E(29, 34, 9.5, 7, red) + E(71, 34, 9.5, 7, red)
      + P('M38 10 Q50 1 62 10 L63 27 Q50 31 37 27 Z', red)
      + P('M41 13 Q50 9 59 13 L59 25 Q50 28 41 25 Z', gold, 2.5)
      + LN('M43 17 L48 18 M52 18 L57 17', 2.6, '#e9fdff') + LN('M46 23 H54', 1.6, '#c98a00')
      + HL('M33 36 Q32 46 34 56', 2.6, 0.45);
  },
  pillar: (_w, _h, o) => {
    const f = o.tint ?? '#e2dccf';
    let flutes = '';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      flutes += `M${(50 + Math.cos(a) * 14).toFixed(1)} ${(50 + Math.sin(a) * 14).toFixed(1)} L${(50 + Math.cos(a) * 25).toFixed(1)} ${(50 + Math.sin(a) * 25).toFixed(1)} `;
    }
    return SH(12, 12, 76, 76, 6)
      + R(12, 12, 76, 76, darken(f, 0.14), 6)
      + R(17, 17, 66, 66, darken(f, 0.06), 4, 2)
      + SR(70, 15, 15, 70, 4, 0.12)
      + C(50, 50, 29, f)
      + LN(flutes, 1.6, darken(f, 0.3), 0.75)
      + `<path d="M50 79 A29 29 0 0 0 79 50 A33 33 0 0 1 50 79 Z" fill="#000" fill-opacity=".13"/>`
      + C(50, 50, 13, lighten(f, 0.35), 2.5)
      + HL('M30 40 Q34 30 44 26', 3, 0.5);
  },
  /** Pedestal con una vitrina y una gema. */
  pedestal: (_w, _h, o) => {
    const g = o.tint ?? '#7fd3ff';
    return SHE(50, 91, 33, 6)
      + plinth(46)
      + `<path d="M30 46 L30 24 Q30 8 50 8 Q70 8 70 24 L70 46 Z" fill="${GLASS}" fill-opacity=".35"/>`
      + P('M50 18 L62 30 L50 44 L38 30 Z', g, 3)
      + LN('M38 30 H62 M50 18 L45 30 L50 44 M50 18 L55 30', 1.4, darken(g, 0.35), 0.8)
      + P('M30 46 L30 24 Q30 8 50 8 Q70 8 70 24 L70 46', 'none', 3)
      + HL('M35 40 L35 24 Q35 15 43 12', 2.6, 0.7);
  },
  /** Guantelete del Infinito sobre su pedestal. */
  gauntlet: (_w, _h, o) => {
    const g = o.tint ?? GOLD;
    const d = darken(g, 0.3);
    const stones = [['#5b8cff', 38, 14], ['#e0302b', 46, 10], ['#a64dff', 54, 11], ['#5db55a', 62, 15], ['#ffd447', 50, 32], ['#ff8a2a', 37, 34]] as const;
    return SHE(50, 91, 33, 6)
      + plinth(58)
      + P('M34 58 L34 40 Q34 34 38 32 L38 12 Q38 8 42 8 Q45 8 45 12 L45 30 L46 8 Q46 4 50 4 Q54 4 54 8 L54 30 L55 10 Q55 6 58.5 6 Q62 6 62 10 L62 32 L63 16 Q63 12 66 12 Q69 12 69 16 L69 42 Q69 52 64 58 Z', g)
      + P('M34 44 Q26 40 26 32 Q26 26 31 27 Q34 30 36 38 Z', g, 3)
      + SHADE('M58 10 Q62 6 62 10 L62 32 L63 16 Q66 12 69 16 L69 42 Q69 52 64 58 L56 58 Z', 0.14)
      + LN('M38 46 H66 M42 22 V30 M58 22 V30', 1.6, d, 0.8)
      + stones.map(([c, x, y]) => C(x, y, 3.4, c, 1.8)).join('')
      + HL('M37 40 Q36 48 38 54', 2.4, 0.55);
  },
  /** Pensadero: pila de piedra con recuerdos plateados. */
  pensieve: (_w, _h, o) => {
    const t = o.tint ?? '#b4cbe0';
    return SHE(50, 91, 33, 6)
      + R(26, 82, 48, 10, darken(STONE, 0.25), 3)
      + P('M42 82 L40 58 L60 58 L58 82 Z', STONE)
      + SR(52, 60, 6, 20, 2, 0.15)
      + LN('M44 64 L46 70 M54 72 L56 66', 1.6, darken(STONE, 0.4))
      + E(50, 42, 38, 17, STONE)
      + E(50, 40, 31, 11, '#3c4a5c', 3)
      + `<ellipse cx="50" cy="40" rx="28" ry="9" fill="${t}" fill-opacity=".85"/>`
      + LN('M28 40 Q38 34 48 40 Q58 46 70 38 M34 44 Q46 40 56 44', 2, '#fff', 0.85)
      + LN('M18 48 L22 52 M30 54 L34 56 M66 56 L70 54 M78 52 L82 48', 2, darken(STONE, 0.45))
      + `<path d="M46 30 Q44 18 50 10 Q48 20 54 28" fill="none" stroke="${t}" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".8"/>`;
  },
  /** Orbe sobre un soporte (palantír). */
  orb: (_w, _h, o) => {
    const glow = o.tint ?? '#ff7a22';
    return SHE(50, 89, 26, 5)
      + P('M30 90 L36 72 L64 72 L70 90 Z', '#5b5560')
      + SR(55, 74, 10, 14, 2, 0.15) + LR(36, 76, 4, 10, 1.5, 0.25)
      + R(33, 66, 34, 8, '#47424d', 3, 3)
      + glowOrb(50, 40, 28, glow)
      + P('M34 64 Q30 58 33 52 L38 60 Z', '#5b5560', 2.6) + P('M66 64 Q70 58 67 52 L62 60 Z', '#5b5560', 2.6) + P('M47 67 L50 59 L53 67 Z', '#5b5560', 2.4);
  },
  /** Hucha gigante (El juego del calamar), llena de billetes. */
  piggybank: (_w, _h, o) => {
    const g = o.tint ?? GOLD;
    const d = darken(g, 0.28);
    return LN('M50 2 V14', 3, METAL_D) + C(50, 15, 3.5, METAL, 2)
      + SHE(50, 88, 34, 6)
      + R(28, 70, 10, 16, d, 3) + R(62, 70, 10, 16, d, 3)
      + E(50, 52, 37, 28, g)
      + `<ellipse cx="50" cy="56" rx="27" ry="18" fill="#7cc485" fill-opacity=".55"/>`
      + [[36, 58, -15], [52, 62, 10], [62, 52, -8], [42, 50, 20]].map(([x, y, a]) => `<rect x="${x - 8}" y="${y - 4}" width="16" height="8" rx="1" fill="#a8dcae" stroke="#3f8c43" stroke-width="1.4" transform="rotate(${a} ${x} ${y})"/>`).join('')
      + E(86, 54, 7, 9, lighten(g, 0.15)) + DOT(84, 52, 1.6) + DOT(88, 52, 1.6)
      + P('M30 30 L26 18 L40 26 Z', g, 3) + P('M58 26 L68 16 L70 30 Z', g, 3)
      + DOT(74, 42, 2.4)
      + R(40, 25, 20, 4, d, 2, 2)
      + P('M13 50 Q6 46 8 40 Q12 38 13 44', 'none', 3)
      + HL('M24 40 Q30 30 42 28', 3, 0.55);
  },
  /** Ámbar con un mosquito dentro (Parque Jurásico). */
  amber: (_w, _h, o) => {
    const a = o.tint ?? '#e39b2d';
    return SHE(50, 90, 18, 5)
      + R(45, 58, 10, 32, '#3b2a1c', 3) + R(40, 86, 20, 6, '#2b1d12', 2, 2.5)
      + R(38, 54, 24, 8, GOLD, 3, 2.5)
      + P('M50 8 Q72 12 74 32 Q74 50 50 56 Q26 50 26 32 Q28 12 50 8 Z', a)
      + `<path d="M50 14 Q66 18 67 32 Q66 46 50 50 Q34 46 33 32 Q34 18 50 14 Z" fill="#ffcf73" fill-opacity=".55"/>`
      + E(50, 33, 4, 7, '#3b2a1c', 0) + C(50, 24, 3, '#3b2a1c', 0)
      + LN('M47 30 L38 24 M53 30 L62 24 M47 36 L40 42 M53 36 L60 42 M48 39 L45 47 M52 39 L55 47 M50 21 L50 15', 1.4, '#3b2a1c')
      + `<path d="M46 28 Q38 20 34 28 Q40 32 46 30 Z M54 28 Q62 20 66 28 Q60 32 54 30 Z" fill="#fff" fill-opacity=".5"/>`
      + HL('M34 24 Q38 15 46 13', 3, 0.6);
  },
  banner: (_w, _h, o) => {
    const f = o.tint ?? '#c0392b';
    const d = darken(f, 0.25);
    return SHE(28, 92, 12, 4)
      + L(26, 9, 26, 94, 5) + L(26, 9, 26, 94, 2, '#c9a46a')
      + C(26, 7, 4.5, GOLD, 2.2)
      + L(24, 13, 86, 13, 4)
      + P('M29 15 L84 15 L84 64 L70 56 L56 66 L42 56 L29 64 Z', f)
      + SHADE('M56 15 L70 15 L70 56 L56 66 Z', 0.12)
      + LN('M42 16 L42 56 M70 16 L70 56', 1.6, d, 0.55)
      + C(56, 36, 10, GOLD, 2.6) + `<path d="M56 29 L58.5 34.5 L64 35 L60 39 L61 44.5 L56 41.5 L51 44.5 L52 39 L48 35 L53.5 34.5 Z" fill="${lighten(f, 0.1)}"/>`
      + LN('M84 64 L86 72 M29 64 L27 72', 2.2, GOLD);
  },
  shield: (_w, _h, o) => {
    const f = o.tint ?? '#d9483b';
    let planks = '';
    for (let x = 26; x < 76; x += 12) planks += `M${x} 18 V82 `;
    return SHC(50, 50, 36)
      + C(50, 50, 36, '#c98a52')
      + LN(planks, 1.6, WOOD_D, 0.6)
      + `<path d="M50 14 A36 36 0 0 1 86 50 L50 50 Z M50 86 A36 36 0 0 1 14 50 L50 50 Z" fill="${f}"/>`
      + `<path d="M50 14 A36 36 0 0 1 86 50 L50 50 Z M50 86 A36 36 0 0 1 14 50 L50 50 Z" fill="none" stroke="${INK}" stroke-width="2.5"/>`
      + `<circle cx="50" cy="50" r="33" fill="none" stroke="${METAL_D}" stroke-width="5"/>`
      + [0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k / 8) * Math.PI * 2 + 0.2; return DOT(50 + Math.cos(a) * 33, 50 + Math.sin(a) * 33, 1.7, '#e8edf2'); }).join('')
      + C(50, 50, 36, 'none', 4)
      + C(50, 50, 10, METAL, 3) + DOT(47, 47, 2.6, '#fff', 0.7)
      + HL('M24 34 Q30 22 42 18', 3, 0.4);
  },
  /** Diana de tiro con flechas. */
  target: () => SHC(50, 50, 36)
    + C(50, 50, 36, WHITE)
    + C(50, 50, 28, '#2b2631', 2) + C(50, 50, 21, '#4a78d1', 2) + C(50, 50, 14, '#e0302b', 2) + C(50, 50, 7, '#f3c33b', 2)
    + [[56, 44, -40], [44, 53, 25]].map(([x, y, a]) => `<g transform="rotate(${a} ${x} ${y})">${L(x, y, x + 26, y, 3)}${P(`M${x + 22} ${y - 5} L${x + 30} ${y} L${x + 22} ${y + 5} L${x + 25} ${y} Z`, '#e8833a', 1.6)}</g>`).join('')
    + HL('M24 36 Q30 24 42 19', 3, 0.5),
  /** Caminante (zombi de The Walking Dead). */
  walker: () => SH(28, 12, 44, 80, 18)
    + R(35, 74, 11, 18, '#3e4a3c', 3, 3) + R(54, 74, 11, 18, '#3e4a3c', 3, 3)
    + P('M33 46 Q33 37 42 37 L58 37 Q67 37 67 46 L65 76 L35 76 Z', '#6b7b5a')
    + LN('M40 50 L44 58 M60 48 L56 62 M48 66 L52 72', 1.8, '#4a5a3c')
    + P('M34 46 L14 54 L13 46 Z', '#9cb38a', 3) + P('M66 46 L86 54 L87 46 Z', '#9cb38a', 3)
    + C(50, 25, 14.5, '#9cb38a')
    + SHADE('M52 11 A14.5 14.5 0 0 1 52 39 A17 17 0 0 0 52 11 Z', 0.15)
    + C(44.5, 22, 3.6, '#f2e6a0', 2) + C(56, 23, 3.6, '#f2e6a0', 2) + DOT(44.5, 22.5, 1.4, '#c0392b') + DOT(56, 23.5, 1.4, '#c0392b')
    + LN('M43 32 L46 30 L49 32 L52 30 L55 32 L58 30', 1.8)
    + LN('M38 14 L42 18 M56 12 L58 16', 1.8, '#4a5a3c'),
  /** Titán Colosal: cara sin piel asomando. */
  titan: (w, h) => {
    const s = Math.min(w, h) / 100, cx = w / 2;
    let fibers = '';
    for (let x = 28; x <= 72; x += 7) fibers += `M${x} 20 Q${x + (x < 50 ? -4 : 4)} 40 ${x} 60 `;
    return `<g transform="translate(${cx - 50 * s} ${h - 100 * s}) scale(${s})">`
      + SHE(50, 72, 45, 26)
      + P('M6 100 Q8 70 28 64 L72 64 Q92 70 94 100 Z', '#b8442f')
      + LN('M18 82 Q30 74 40 80 M60 80 Q70 74 82 82', 2, '#7a2618', 0.8)
      + P('M23 64 Q16 30 33 15 Q50 4 67 15 Q84 30 77 64 Z', '#d9634a')
      + LN(fibers, 1.8, '#9c3626', 0.8)
      + SHADE('M52 6 Q67 8 74 22 Q84 36 77 64 L56 64 Z', 0.14)
      + P('M33 47 L67 47 L63 60 L37 60 Z', WHITE, 3)
      + LN('M39 47 V60 M45 47 V60 M51 47 V60 M57 47 V60 M62 47 V59', 2)
      + E(39, 34, 6.5, 5, WHITE, 3) + E(61, 34, 6.5, 5, WHITE, 3) + DOT(39, 34, 2.2) + DOT(61, 34, 2.2)
      + LN('M31 27 Q39 23 46 28 M54 28 Q61 23 69 27', 3, '#7a2618')
      + `<path d="M20 30 Q8 24 4 30 M80 30 Q92 24 96 30" fill="none" stroke="#f2f2f2" stroke-width="3" stroke-opacity=".7" stroke-linecap="round"/>`
      + '</g>';
  },
};
