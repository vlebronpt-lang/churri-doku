/** Utilidades de color sencillas (hex → hex). */

function parse(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mezcla `hex` con `other` en proporción t (0 = hex, 1 = other). */
export function mix(hex: string, other: string, t: number): string {
  const a = parse(hex);
  const b = parse(other);
  return toHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

export const darken = (hex: string, t: number) => mix(hex, '#1b1622', t);
export const lighten = (hex: string, t: number) => mix(hex, '#ffffff', t);

/** Luminancia relativa aproximada (0–1). */
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Escala de grises para la versión en blanco y negro. */
export function gray(hex: string): string {
  const [r, g, b] = parse(hex);
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return toHex([y, y, y]);
}
