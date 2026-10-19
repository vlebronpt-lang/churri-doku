import { DECOR } from './icons/decor';
import { FURNITURE } from './icons/furniture';
import { GEAR } from './icons/gear';
import { NATURE } from './icons/nature';
import { SEATS } from './icons/seats';
import { VEHICLES } from './icons/vehicles';
import { INK, R, type IconFn } from './icons/kit';

export { INK, type Facing, type IconFn, type IconOpts } from './icons/kit';

/**
 * Dibujos de los objetos del plano en SVG. Cada casilla mide 100×100 unidades; los objetos de
 * varias casillas reciben el ancho y alto totales.
 */
export const ICONS: Record<string, IconFn> = {
  // Capas de suelo: se pintan aparte (alfombras y agua).
  carpet: () => '',
  water: () => '',
  ...SEATS,
  ...VEHICLES,
  ...FURNITURE,
  ...GEAR,
  ...DECOR,
  ...NATURE,
};

/** Icono sin coincidencia: interrogante (evita casillas vacías por error). */
export const FALLBACK: IconFn = () => `${R(20, 20, 60, 60, '#ddd', 8)}<text x="50" y="62" font-size="36" text-anchor="middle" fill="${INK}">?</text>`;
