import { darken } from '../color';
import {
  C, DARK, DOT, E, GLASS, GOLD, GOLD_D, HL, INK, L, LEAF, LEAF_D, LN, METAL, METAL_D, METAL_L, P, R, RED, SH, SHADE, SHC, SHE,
  STONE, WHITE, WOOD, WOOD_D, WOOD_L, CREAM, orient, type IconFn,
} from './kit';
import { VEHICLES } from './vehicles';

/** Cerebro para el tanque del Departamento de Misterios, con su centro en (x, y). */
function brain(x: number, y: number) {
  const m = (dx: number, dy: number) => `${x + dx} ${y + dy}`;
  return P(`M${m(-14, 2)} Q${m(-16, -12)} ${m(-3, -12)} Q${m(6, -16)} ${m(11, -7)} Q${m(18, -1)} ${m(10, 8)} Q${m(2, 15)} ${m(-8, 10)} Q${m(-14, 8)} ${m(-14, 2)} Z`, '#eea6b5', 3)
    + LN(`M${m(-8, -4)} Q${m(-3, -7)} ${m(-2, -1)} Q${m(3, -3)} ${m(4, 3)} M${m(-7, 4)} Q${m(-3, 2)} ${m(0, 6)}`, 2, '#b9667c');
}

/**
 * Objetos con nombre propio de la ampliación que no podían salir bien con un icono genérico
 * (un jersey que parecía un cofre, una Poké Ball que parecía una bola de cristal…).
 */
export const PROPS: Record<string, IconFn> = {
  /** Jersey (el cerúleo de Miranda). */
  sweater: (_w, _h, o) => {
    const f = o.tint ?? '#3f8fd0', d = darken(f, 0.25);
    return SH(12, 22, 76, 66, 10)
      + P('M30 19 L14 30 Q10 33 10 40 L7 80 Q7 84 11 84 L21 84 Q25 84 25 80 L30 48 L30 86 L70 86 L70 48 L75 80 Q75 84 79 84 L89 84 Q93 84 93 80 L90 40 Q90 33 86 30 L70 19 Q60 29 50 29 Q40 29 30 19 Z', f)
      + LN('M30 48 L30 34 M70 48 L70 34', 2.6, d)
      + P('M37 19 Q50 35 63 19 Q56 16 50 16 Q44 16 37 19 Z', d, 3)
      + LN('M30 77 L70 77 M8 74 L25 74 M75 74 L92 74', 2.4, d)
      + [36, 43, 50, 57, 64].map((x) => LN(`M${x} 78 L${x} 85`, 1.8, d)).join('')
      + HL('M37 41 Q39 36 44 36', 3, 0.45);
  },
  /** Maleta de viaje con correas. */
  suitcase: (_w, _h, o) => {
    const f = o.tint ?? '#8a5a3c', d = darken(f, 0.32);
    return SH(13, 32, 74, 54, 8)
      + P('M37 32 L37 21 Q37 16 42 16 L58 16 Q63 16 63 21 L63 32', 'none', 4.5)
      + R(13, 32, 74, 54, f, 8)
      + R(24, 32, 9, 54, d, 0, 2.5) + R(67, 32, 9, 54, d, 0, 2.5)
      + R(22, 53, 13, 11, GOLD, 2, 2.5) + R(65, 53, 13, 11, GOLD, 2, 2.5)
      + SHADE('M13 72 H87 V80 Q87 86 81 86 H19 Q13 86 13 80 Z', 0.13)
      + HL('M40 41 L60 41', 3.4, 0.45);
  },
  /** Maletín negro que brilla por dentro (Pulp Fiction). */
  briefcase: (_w, _h, o) => {
    const f = o.tint ?? DARK;
    return `<circle cx="50" cy="56" r="46" fill="#ffd447" fill-opacity=".3"/>`
      + [[50, 6, 50, 15], [20, 14, 26, 22], [80, 14, 74, 22], [5, 40, 13, 43], [95, 40, 87, 43]].map(([a, b, c, d]) => L(a, b, c, d, 3.2, GOLD_D)).join('')
      + SH(12, 40, 76, 46, 7)
      + P('M37 40 L37 31 Q37 26 42 26 L58 26 Q63 26 63 31 L63 40', 'none', 4.5)
      + R(12, 40, 76, 46, f, 7)
      + L(12, 61, 88, 61, 3)
      + R(28, 55, 11, 11, GOLD, 2, 2.5) + R(61, 55, 11, 11, GOLD, 2, 2.5)
      + HL('M21 48 L45 48', 3.4, 0.4);
  },
  /** Nube Kinton. */
  nimbus: (_w, _h, o) => {
    const f = o.tint ?? '#f7d64a', d = darken(f, 0.2);
    return SHE(50, 70, 38, 13)
      + P('M20 74 Q5 72 7 57 Q9 44 24 47 Q26 30 44 33 Q53 20 67 29 Q81 28 81 44 Q95 46 93 60 Q91 74 76 74 Z', f)
      + LN('M28 63 Q37 56 46 63 M55 61 Q63 54 72 61', 2.8, d)
      + HL('M16 56 Q18 50 25 51 M44 41 Q49 34 58 37', 3.4, 0.6);
  },
  /** Vestido sobre un maniquí de costura. */
  dressform: (_w, _h, o) => {
    const f = o.tint ?? '#d9a8b8', d = darken(f, 0.28);
    return SHE(50, 89, 22, 5)
      + L(50, 74, 50, 90, 5, WOOD_D) + L(35, 91, 65, 91, 5.5, WOOD_D)
      + R(45, 5, 10, 11, WOOD_D, 3, 2.8)
      + P('M34 16 Q50 11 66 16 L63 34 Q61 44 68 60 L76 78 L24 78 L32 60 Q39 44 37 34 Z', f)
      + LN('M39 42 Q50 49 61 42', 2.8, d)
      + SHADE('M57 15 L66 16 L63 34 Q61 44 68 60 L76 78 L60 78 Q63 50 57 15 Z', 0.14)
      + HL('M43 22 Q42 28 43 35', 3, 0.5);
  },
  /** Pavo asado en su fuente. */
  roast: () => SHE(50, 68, 40, 17)
    + E(50, 70, 44, 18, WHITE)
    + E(50, 70, 35, 12, '#efe8da', 2)
    + P('M72 52 Q84 44 88 45 Q93 49 87 55 Q80 62 70 62 Z', '#b76b29', 3)
    + C(90, 44, 3.5, WHITE, 2.2)
    + P('M20 60 Q17 38 45 35 Q72 33 79 52 Q82 68 62 73 L36 73 Q22 72 20 60 Z', '#cf8238')
    + P('M28 66 Q17 62 12 64 Q8 70 15 73 Q24 77 34 72 Z', '#b76b29', 3)
    + C(10, 67, 3.5, WHITE, 2.2)
    + SHADE('M60 37 Q74 40 79 52 Q82 68 62 73 L52 73 Q68 58 60 37 Z', 0.14)
    + HL('M30 48 Q36 41 46 41', 3.4, 0.55),
  /** Gallina gigante (la de la tienda de Al). */
  chicken: () => SHE(50, 66, 31, 16)
    + P('M48 31 Q45 21 52 23 Q54 16 60 22 Q66 19 64 31 Z', RED, 3)
    + P('M20 62 Q18 45 35 46 Q39 31 54 31 Q67 31 67 44 L81 48 L67 53 Q78 69 61 77 L34 77 Q18 75 20 62 Z', WHITE)
    + P('M67 44 L81 48 L67 53 Z', '#f3a33b', 3)
    + P('M66 53 Q71 60 65 63 Q60 59 62 53 Z', RED, 2.5)
    + DOT(58, 41, 3) + DOT(57, 40, 1, '#ffffff')
    + LN('M30 60 Q41 53 52 62', 3, '#cfcac0')
    + HL('M38 49 Q44 43 52 43', 2.6, 0.7),
  /** Vaso de leche. */
  milk: () => SH(29, 13, 42, 75, 8)
    + P('M29 13 L71 13 L66 84 Q66 88 61 88 L39 88 Q34 88 34 84 Z', '#dcedf4')
    + P('M31 33 Q41 27 50 33 Q59 39 69 33 L66 84 Q66 88 61 88 L39 88 Q34 88 34 84 Z', WHITE, 3)
    + LN('M40 45 L42 78', 2.6, '#d6d9d6'),
  /** Frasco con líquido y una V (Compuesto V). */
  vial: (_w, _h, o) => {
    const f = o.tint ?? '#4f9fe6';
    return SH(28, 9, 44, 79, 10)
      + R(38, 7, 24, 12, METAL, 3, 3)
      + P('M41 19 L59 19 L59 29 Q72 35 72 50 L72 78 Q72 88 62 88 L38 88 Q28 88 28 78 L28 50 Q28 35 41 29 Z', GLASS)
      + P('M30 50 Q40 44 50 50 Q60 56 70 50 L70 78 Q70 86 62 86 L38 86 Q30 86 30 78 Z', f, 2.5)
      + LN('M41 59 L50 77 L59 59', 4.5, WHITE)
      + HL('M35 37 Q33 40 33 44', 3.4, 0.75);
  },
  /** Poké Ball. */
  pokeball: () => SHC(50, 52, 37)
    + P('M13 50 A37 37 0 0 1 87 50 Z', '#e23b3b')
    + P('M13 50 A37 37 0 0 0 87 50 Z', WHITE)
    + L(13, 50, 87, 50, 6)
    + C(50, 50, 13, WHITE, 5) + C(50, 50, 5.5, WHITE, 2.5)
    + HL('M24 36 Q30 23 43 20', 4, 0.6),
  /** Radio antigua (Radio Patio). */
  radio: (_w, _h, o) => {
    const f = o.tint ?? WOOD;
    return SH(11, 32, 78, 54, 10)
      + L(68, 32, 84, 10, 3) + DOT(84, 10, 3.2)
      + R(11, 32, 78, 54, f, 10)
      + R(19, 40, 38, 38, '#6f4a2b', 6, 3)
      + [48, 55, 62, 69].map((y) => LN(`M24 ${y} L52 ${y}`, 2.4, WOOD_L)).join('')
      + R(62, 40, 20, 13, '#f8e7a8', 2, 2.5)
      + L(72, 42, 72, 51, 2.2, RED)
      + C(66, 66, 6, DARK, 2.5) + C(79, 66, 4.5, DARK, 2.5)
      + HL('M19 37 L44 37', 2.6, 0.4);
  },
  /** Cámara de televisión sobre un trípode. */
  tvcamera: () => SHE(50, 88, 28, 6)
    + L(46, 62, 24, 91, 5) + L(46, 62, 70, 91, 5) + L(46, 62, 46, 91, 5)
    + R(20, 26, 50, 34, DARK, 6)
    + P('M70 33 L88 27 L88 57 L70 51 Z', METAL_D, 3.5)
    + E(88, 42, 4, 15, GLASS, 3)
    + R(30, 14, 26, 12, METAL, 3, 3)
    + DOT(30, 36, 3.6, '#e23b3b')
    + L(20, 50, 8, 57, 4)
    + HL('M28 44 L58 44', 3, 0.3),
  /** Helicóptero (se alarga la cola si ocupa dos casillas). */
  helicopter: (w, h, o) => {
    const f = o.tint ?? '#4a78d1';
    return orient(w, h, o.facing, (Lw) => {
      const end = Lw - 8;
      return SHE(Lw * 0.44, 84, Lw * 0.32, 6)
        + P(`M60 46 L${end - 1} 38 L${end + 1} 45 L62 60 Z`, f, 3.5)
        + L(end, 28, end, 52, 3.5)
        + L(46, 22, 46, 32, 4.5)
        + L(8, 20, Lw * 0.84, 20, 5.5)
        + P('M16 54 Q16 32 42 32 Q66 32 66 54 Q66 72 42 72 L30 72 Q16 72 16 54 Z', f)
        + P('M21 52 Q22 38 40 38 L40 54 Z', GLASS, 3)
        + L(28, 72, 24, 82, 3.5) + L(54, 72, 58, 82, 3.5) + L(12, 82, 70, 82, 4.5)
        + HL('M46 40 Q56 42 60 50', 3, 0.4);
    });
  },
  /** Telar de Penélope. */
  loom: (_w, _h, o) => {
    const f = o.tint ?? WOOD, cl = '#b9506a', d = darken(cl, 0.25);
    return SH(10, 8, 80, 84, 4)
      + R(14, 8, 8, 84, f, 2, 3.5) + R(78, 8, 8, 84, f, 2, 3.5)
      + R(9, 12, 82, 9, f, 2, 3.5)
      + [28, 36, 44, 52, 60, 68].map((x) => L(x, 21, x, 50, 1.8, '#8a7a5f')).join('')
      + R(23, 48, 54, 32, cl, 2, 3)
      + [56, 63, 70].map((y) => LN(`M25 ${y} L75 ${y}`, 2, d)).join('')
      + R(9, 76, 82, 9, f, 2, 3.5)
      + P('M28 42 Q50 34 72 42 Q50 50 28 42 Z', WOOD_L, 2.8)
      + HL('M28 15 L50 15', 2.4, 0.45);
  },
  /** El Velo: arco de piedra con su cortina raída. */
  veil: () => SH(14, 8, 72, 84, 30)
    + P('M30 44 Q30 22 50 22 Q70 22 70 44 L70 85 L64 79 L58 87 L52 77 L46 87 L40 79 L34 87 L30 83 Z', '#555063', 3)
    + LN('M40 32 Q38 54 42 72 M56 30 Q60 52 56 72', 2.4, '#8a8498')
    + P('M14 90 L14 42 Q14 8 50 8 Q86 8 86 42 L86 90 L70 90 L70 44 Q70 22 50 22 Q30 22 30 44 L30 90 Z', STONE)
    + R(9, 87, 82, 7, '#a59e94', 2, 3)
    + HL('M21 46 Q22 26 38 16', 3.4, 0.5),
  /** Plato con un gatito (los de Umbridge). */
  catplate: () => SHC(50, 52, 39)
    + C(50, 50, 39, '#fbe6ee')
    + `<circle cx="50" cy="50" r="31" fill="none" stroke="#e98fb0" stroke-width="3"/>`
    + P('M35 58 Q33 44 37 33 L44 41 Q50 39 56 41 L63 33 Q67 44 65 58 Q61 69 50 69 Q39 69 35 58 Z', '#f2b27a', 3)
    + DOT(44, 52, 2.8) + DOT(56, 52, 2.8) + DOT(50, 58, 2, RED)
    + LN('M31 55 L39 57 M31 62 L39 61 M69 55 L61 57 M69 62 L61 61', 1.8)
    + HL('M20 38 Q25 25 37 19', 3.4, 0.7),
  /** Tarro con polvo o líquido. */
  jar: (_w, _h, o) => {
    const f = o.tint ?? '#6fd07a';
    return SH(20, 10, 60, 78, 10)
      + R(28, 8, 44, 13, WOOD, 3, 3.5)
      + P('M31 21 L69 21 Q80 29 80 42 L80 76 Q80 88 68 88 L32 88 Q20 88 20 76 L20 42 Q20 29 31 21 Z', GLASS)
      + P('M22 52 Q36 44 50 52 Q64 60 78 52 L78 76 Q78 86 68 86 L32 86 Q22 86 22 76 Z', f, 2.5)
      + [[34, 66], [50, 74], [64, 64], [44, 60]].map(([x, y]) => DOT(x, y, 2.2, darken(f, 0.3))).join('')
      + HL('M28 33 Q26 39 26 45', 3.6, 0.75);
  },
  /** Rosa en un jarroncito (la rosa blanca de Snow). */
  rose: (_w, _h, o) => {
    const f = o.tint ?? WHITE;
    return SHE(50, 86, 17, 5)
      + L(50, 34, 50, 68, 3.6, LEAF_D)
      + P('M50 54 Q62 42 72 46 Q66 60 50 60 Z', LEAF, 3) + P('M50 46 Q38 36 28 40 Q34 54 50 52 Z', LEAF, 3)
      + P('M39 64 L61 64 L65 78 Q65 90 50 90 Q35 90 35 78 Z', GLASS, 3.5)
      + P('M31 22 Q30 6 50 5 Q70 6 69 22 Q68 37 50 38 Q32 37 31 22 Z', f)
      + LN('M42 21 Q42 13 50 13 Q58 13 58 21 Q58 28 51 28 Q45 28 45 22 Q45 18 50 18 Q54 18 54 22', 2.4, '#b9b3a5');
  },
  /** Katana sobre su soporte. */
  katana: () => SH(10, 76, 80, 14, 3)
    + R(10, 78, 80, 11, '#2f2b33', 3, 3)
    + R(20, 52, 9, 28, '#2f2b33', 2, 3) + R(71, 34, 9, 46, '#2f2b33', 2, 3)
    + P('M32 49 Q66 41 94 12 Q78 50 34 60 Z', METAL_L, 3)
    + LN('M42 51 Q70 42 88 22', 1.8, METAL_D)
    + E(30, 55, 4, 11, GOLD, 2.8)
    + P('M8 62 L27 50 L31 59 L12 71 Q7 69 8 62 Z', '#3a3f55', 3)
    + LN('M14 60 L18 68 M20 57 L24 65', 1.8, '#c9c2b6'),
  /** Cetro o cayado con una gema en la punta. */
  staff: (_w, _h, o) => {
    const g = o.tint ?? '#6fd0ff';
    return SHE(32, 90, 15, 4)
      + L(24, 92, 66, 26, 8) + L(24, 92, 66, 26, 3.6, GOLD)
      + P('M58 30 Q50 10 68 5 Q63 14 70 20 Q78 13 90 16 Q88 32 72 35 Z', GOLD)
      + C(70, 22, 7, g, 2.6)
      + HL('M67 19 L69 18', 2.2, 0.8);
  },
  /** Copa de campeón. */
  trophy: (_w, _h, o) => {
    const f = o.tint ?? GOLD, d = darken(f, 0.25);
    return SH(26, 76, 48, 14, 3)
      + LN('M30 19 Q11 18 13 34 Q15 47 35 47', 5) + LN('M70 19 Q89 18 87 34 Q85 47 65 47', 5)
      + R(27, 77, 46, 12, '#5a4638', 3, 3)
      + R(43, 59, 14, 18, d, 2, 3)
      + P('M27 9 L73 9 L71 38 Q69 59 50 61 Q31 59 29 38 Z', f)
      + SHADE('M59 9 L73 9 L71 38 Q69 59 50 61 Q62 40 59 9 Z', 0.14)
      + HL('M36 17 Q36 32 40 43', 3.6, 0.6);
  },
  /** Atril con un libro abierto. */
  lectern: (_w, _h, o) => {
    const f = o.tint ?? WOOD, d = darken(f, 0.22);
    return SHE(50, 88, 26, 5)
      + R(40, 48, 20, 36, f, 2, 3.5) + R(29, 82, 42, 9, d, 2, 3.5)
      + P('M17 20 L83 20 L89 48 L11 48 Z', d)
      + P('M22 23 Q37 18 50 25 Q63 18 78 23 L82 43 Q65 38 50 46 Q35 38 18 43 Z', CREAM, 3)
      + L(50, 25, 50, 46, 2.6)
      + LN('M29 29 L44 31 M28 35 L44 37 M56 31 L71 29 M56 37 L72 35', 1.8, '#8a8478');
  },
  /** Tribuna de orador con micrófono. */
  podium: (_w, _h, o) => {
    const f = o.tint ?? '#8f3535', d = darken(f, 0.3);
    return SH(22, 30, 56, 60, 4)
      + L(50, 26, 50, 11, 3.2) + E(50, 9, 5, 6, DARK, 2.8)
      + P('M20 32 L80 32 L72 90 L28 90 Z', f)
      + R(14, 24, 72, 11, d, 2, 3)
      + C(50, 60, 13, GOLD, 3)
      + LN('M43 60 L50 53 L57 60 L50 67 Z', 2.4, GOLD_D)
      + HL('M28 41 L33 80', 3, 0.3);
  },
  /** Ponchera de cristal con su cazo. */
  bowl: (_w, _h, o) => {
    const f = o.tint ?? '#e0566a';
    return SHE(50, 78, 30, 9)
      + R(36, 76, 28, 10, GLASS, 3, 3)
      + P('M12 42 Q14 74 50 77 Q86 74 88 42 Z', GLASS)
      + E(50, 42, 38, 12, GLASS)
      + E(50, 43, 31, 8.5, f, 2.5)
      + LN('M68 42 L88 14', 4.5)
      + E(66, 44, 7, 4, METAL, 2.5)
      + HL('M23 54 Q27 64 38 69', 3.4, 0.75);
  },
  /** Urna de cristal llena de papeletas (la de la cosecha). */
  urn: () => SHE(50, 84, 32, 6)
    + R(26, 80, 48, 9, METAL_D, 3, 3)
    + P('M20 22 L80 22 Q88 50 76 72 Q68 82 50 82 Q32 82 24 72 Q12 50 20 22 Z', GLASS)
    + [[32, 66, -12], [48, 72, 8], [64, 64, 16], [40, 54, 20], [58, 50, -14], [50, 60, 0], [30, 48, 6], [70, 48, 8]]
      .map(([x, y, a]) => `<g transform="rotate(${a} ${x} ${y})">${R(x - 7, y - 4, 14, 8, WHITE, 1, 1.8)}</g>`).join('')
    + E(50, 22, 30, 6, GLASS, 3)
    + HL('M26 34 Q24 48 29 62', 3.4, 0.7),
  /** Dirigible (se alarga si ocupa dos casillas). */
  airship: (w, h, o) => {
    const f = o.tint ?? '#c9c2a8', d = darken(f, 0.28);
    return orient(w, h, o.facing, (Lw) => {
      const cx = (Lw - 10) / 2, rx = cx - 5;
      return SHE(cx, 84, rx * 0.8, 6)
        + P(`M${Lw - 22} 38 L${Lw - 4} 22 L${Lw - 4} 54 Z`, d, 3.5)
        + E(cx, 38, rx, 25, f)
        + LN(`M${cx - rx} 38 L${cx + rx} 38 M${cx - rx * 0.7} 22 Q${cx} 15 ${cx + rx * 0.7} 22 M${cx - rx * 0.7} 54 Q${cx} 61 ${cx + rx * 0.7} 54`, 2.4, d)
        + L(cx - 10, 62, cx - 8, 70, 3) + L(cx + 12, 62, cx + 10, 70, 3)
        + R(cx - 13, 69, 28, 12, WOOD, 3, 3)
        + DOT(cx - 5, 75, 2, GLASS) + DOT(cx + 1, 75, 2, GLASS) + DOT(cx + 7, 75, 2, GLASS)
        + HL(`M${cx - rx * 0.75} 30 Q${cx - rx * 0.5} 21 ${cx - rx * 0.1} 19`, 3.6, 0.5);
    });
  },
  /** Tanque de cerebros del Departamento de Misterios. */
  braintank: () => SH(9, 17, 82, 66, 4)
    + R(9, 17, 82, 66, '#a7dcc8', 4)
    + R(9, 17, 82, 12, '#d6f0e6', 4, 3)
    + brain(33, 56) + brain(66, 62)
    + [[52, 40, 3], [56, 34, 2.2], [80, 44, 2.6], [20, 38, 2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#ffffff" stroke-width="1.6"/>`).join('')
    + R(9, 17, 82, 66, 'none', 4),
  /** Pino. */
  pine: (_w, _h, o) => {
    const f = o.tint ?? LEAF_D, d = darken(f, 0.22);
    return SHE(50, 88, 24, 6)
      + R(44, 74, 12, 15, WOOD_D, 2, 3)
      + P('M50 5 L72 35 L62 35 L79 57 L67 57 L85 78 L15 78 L33 57 L21 57 L38 35 L28 35 Z', f)
      + SHADE('M50 5 L72 35 L62 35 L79 57 L67 57 L85 78 L55 78 Z', 0.13)
      + LN('M38 35 L62 35 M33 57 L67 57', 2.4, d)
      + HL('M47 15 L38 29', 3, 0.4);
  },
  /** Árbol de Navidad. */
  xmastree: (_w, _h, o) => {
    const f = o.tint ?? LEAF_D;
    return SHE(50, 88, 24, 6)
      + R(44, 75, 12, 14, WOOD_D, 2, 3)
      + P('M50 12 L72 38 L62 38 L79 59 L67 59 L85 79 L15 79 L33 59 L21 59 L38 38 L28 38 Z', f)
      + P('M50 2 L54 10 L63 11 L56 17 L58 26 L50 21 L42 26 L44 17 L37 11 L46 10 Z', GOLD, 2.6)
      + [[50, 34, RED], [42, 48, '#4a78d1'], [60, 52, GOLD], [36, 68, RED], [52, 64, '#f6f1e6'], [68, 70, '#4a78d1']]
        .map(([x, y, c]) => C(x as number, y as number, 3.8, c as string, 2)).join('');
  },
  /** Ruleta de casino. */
  roulette: () => {
    const wedge = (k: number) => {
      const a0 = (k / 12) * Math.PI * 2, a1 = ((k + 1) / 12) * Math.PI * 2;
      const r = 33, f = (v: number) => v.toFixed(1);
      return `<path d="M50 50 L${f(50 + Math.cos(a0) * r)} ${f(50 + Math.sin(a0) * r)} A${r} ${r} 0 0 1 ${f(50 + Math.cos(a1) * r)} ${f(50 + Math.sin(a1) * r)} Z" fill="${k % 2 ? '#2f2b33' : '#c8352f'}"/>`;
    };
    return SHC(50, 52, 41)
      + C(50, 50, 41, WOOD_D)
      + Array.from({ length: 12 }, (_, k) => wedge(k)).join('')
      + `<circle cx="50" cy="50" r="33" fill="none" stroke="${INK}" stroke-width="3"/>`
      + C(50, 50, 13, WOOD, 3) + C(50, 50, 4.5, GOLD, 2.4)
      + C(70, 30, 3.8, WHITE, 2);
  },
  /** Reloj de bolsillo de oro. */
  watch: () => SHC(50, 58, 30)
    + LN('M56 17 Q76 5 84 20 Q90 33 78 42', 2.8, GOLD_D)
    + `<circle cx="50" cy="17" r="6" fill="none" stroke="${INK}" stroke-width="3.2"/>`
    + R(45, 22, 10, 9, GOLD_D, 2, 3)
    + C(50, 58, 30, GOLD)
    + C(50, 58, 22, WHITE, 3)
    + [0, 1, 2, 3].map((k) => { const a = (k / 4) * Math.PI * 2; return DOT(50 + Math.cos(a) * 17, 58 + Math.sin(a) * 17, 1.9); }).join('')
    + L(50, 58, 50, 44, 3) + L(50, 58, 60, 63, 3)
    + HL('M30 48 Q33 40 40 36', 3, 0.7),
  /** Porción de tarta de queso. */
  cheesecake: () => SHE(50, 76, 40, 12)
    + E(50, 76, 44, 14, WHITE)
    + P('M15 54 L70 31 L86 47 L86 65 L15 73 Z', '#f6e3b4')
    + P('M15 54 L70 31 L86 47 L22 60 Z', '#fff4d8', 3)
    + P('M15 67 L86 59 L86 65 L15 73 Z', '#b9803f', 3)
    + P('M54 34 Q56 24 66 26 Q73 31 66 41 Q59 43 54 34 Z', RED, 2.6)
    + P('M60 27 L55 21 L63 23 L68 19 L66 27 Z', LEAF, 2),
  /** Tarta de nata para estamparla en la cara. */
  creampie: () => SHE(50, 74, 40, 12)
    + P('M12 56 L88 56 L79 77 Q50 85 21 77 Z', METAL_L)
    + LN('M26 62 L30 76 M42 64 L44 79 M58 64 L56 79 M74 62 L70 76', 2, METAL_D)
    + P('M13 56 Q10 41 27 43 Q29 28 47 32 Q60 23 71 36 Q90 38 87 56 Q50 66 13 56 Z', WHITE)
    + C(50, 26, 6.5, RED, 2.6)
    + LN('M50 20 Q53 13 59 12', 2, LEAF_D)
    + LN('M28 50 Q39 43 50 50 Q61 43 72 50', 2.6, '#d6cfc2'),
  /** Órgano de tubos (el de Davy Jones). */
  organ: (_w, _h, o) => {
    const f = o.tint ?? DARK, d = darken(f, 0.25);
    const pipes: [number, number][] = [[12, 28], [24, 18], [36, 10], [48, 6], [60, 10], [72, 18], [84, 28]];
    return SH(8, 8, 84, 84, 6)
      + pipes.map(([x, top]) => R(x - 5, top, 10, 54 - top, METAL_L, 3, 3) + E(x, top + 10, 3, 1.8, METAL_D, 1.6)).join('')
      + R(7, 50, 86, 22, f, 4)
      + R(14, 56, 72, 12, WHITE, 2, 2.5)
      + [24, 34, 44, 54, 64, 74].map((x) => L(x, 57, x, 67, 1.6)).join('')
      + [29, 49, 69].map((x) => R(x - 2, 56, 4, 7, INK, 0, 0)).join('')
      + R(12, 72, 76, 18, d, 2, 3);
  },
  /** Unicornio de peluche («¡Es tan esponjoso!»). */
  unicorn: (w, h, o) => VEHICLES.horse(w, h, o) + P('M76 15 L88 0 L83 18 Z', GOLD, 2.6),
  /** Bote de gritos de Monstruos S.A. */
  canister: (_w, _h, o) => {
    const f = o.tint ?? GOLD;
    return SH(25, 8, 50, 82, 8)
      + R(34, 5, 32, 11, METAL, 3, 3)
      + R(25, 15, 50, 67, f, 8)
      + R(33, 82, 34, 9, METAL_D, 2, 3)
      + C(50, 44, 14, WHITE, 3)
      + L(50, 44, 58, 37, 3, RED) + DOT(50, 44, 2.4)
      + [29, 41, 53, 65].map((x) => `<path d="M${x} 66 L${x + 7} 66 L${x + 1} 78 L${x - 6 < 26 ? 26 : x - 6} 78 Z" fill="${INK}"/>`).join('')
      + HL('M31 24 Q30 30 31 38', 3.4, 0.5);
  },
  /** Olla de metal con sopa. */
  pot: (_w, _h, o) => {
    const f = o.tint ?? '#e8963c';
    return SHC(50, 56, 36)
      + R(7, 49, 12, 9, METAL_D, 3, 3) + R(81, 49, 12, 9, METAL_D, 3, 3)
      + C(50, 54, 35, METAL)
      + `<circle cx="50" cy="53" r="29" fill="none" stroke="${METAL_L}" stroke-width="4"/>`
      + C(50, 53, 26, f, 3)
      + [[40, 46], [59, 58], [50, 66], [62, 42]].map(([x, y]) => E(x, y, 4.5, 3, '#f7d08a', 1.8)).join('')
      + LN('M42 22 Q37 14 43 8 M58 20 Q63 12 57 5', 2.4, '#d6d3cd');
  },
  /** Flor con tallo (el aullador nocturno). */
  flower: (_w, _h, o) => {
    const f = o.tint ?? '#7a5fd0', d = darken(f, 0.25);
    const petal = (a: number) => `<g transform="rotate(${a} 50 34)">${E(50, 17, 9.5, 15, f, 3)}</g>`;
    return SHE(50, 86, 18, 5)
      + L(50, 40, 50, 88, 4, LEAF_D)
      + P('M50 74 Q66 58 78 64 Q70 80 50 80 Z', LEAF, 3) + P('M50 66 Q34 52 22 58 Q30 74 50 72 Z', LEAF, 3)
      + [0, 72, 144, 216, 288].map(petal).join('')
      + C(50, 34, 8, '#f3e27a', 2.8)
      + LN('M50 12 L50 20', 1.8, d);
  },
};
