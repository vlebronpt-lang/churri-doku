import type { ObjectDef, Puzzle } from '../engine/types';
import { FALLBACK, ICONS } from './icons';
import { gray, lighten, darken } from './color';

export interface LegendItem {
  key: string;
  /** Nombre con mayúscula inicial («Sillón reclinable», «Trono de Farquaad»). */
  name: string;
  def: ObjectDef;
  occupiable: boolean;
  /** Cómo se está encima, si se puede: «sentado», «tumbado», «montado», «encima». */
  pose: string;
  floor: boolean;
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function poseWord(def: ObjectDef): string {
  switch (def.pose) {
    case 'sit': return 'sentado';
    case 'lie': return 'tumbado';
    case 'ride': return 'montado';
    case 'on': return 'encima';
    default: return '';
  }
}

/** Frase corta sobre si se puede estar en ese objeto. */
export function occupancyText(def: ObjectDef): string {
  if (!def.occupiable) return 'aquí no puede haber nadie';
  const pw = poseWord(def);
  return pw ? `se puede estar (${pw})` : 'se puede estar';
}

/** Objetos (y suelos especiales) que aparecen en el plano del caso, primero los que se pueden ocupar. */
export function objectLegend(p: Puzzle): LegendItem[] {
  const seen = new Map<string, LegendItem>();
  for (const c of p.cells) {
    for (const k of [c.obj, c.floor]) {
      if (!k || seen.has(k)) continue;
      const def = p.objects[k];
      seen.set(k, { key: k, name: cap(def.name), def, occupiable: def.occupiable, pose: poseWord(def), floor: def.layer === 'floor' });
    }
  }
  return [...seen.values()].sort((a, b) => Number(b.occupiable) - Number(a.occupiable) || a.name.localeCompare(b.name, 'es'));
}

/** Dibujo del objeto en una casilla de 100×100, como SVG independiente (para leyendas). */
export function legendIconSvg(def: ObjectDef, bw = false): string {
  let inner: string;
  if (def.icon === 'water' || def.icon === 'carpet') {
    const base = def.tint ?? (def.icon === 'water' ? '#5fb4e3' : '#b9506a');
    inner = def.icon === 'water'
      ? `<rect x="4" y="4" width="92" height="92" rx="12" fill="${base}" stroke="${darken(base, 0.35)}" stroke-width="4"/><path d="M14 38 q10 -8 20 0 t20 0 t20 0 M26 68 q10 -8 20 0 t20 0" stroke="${lighten(base, 0.45)}" stroke-width="5" fill="none" stroke-linecap="round"/>`
      : `<rect x="8" y="8" width="84" height="84" rx="6" fill="${base}" stroke="${darken(base, 0.4)}" stroke-width="4"/><rect x="18" y="18" width="64" height="64" rx="3" fill="none" stroke="${lighten(base, 0.3)}" stroke-width="3"/><path d="M50 30 l20 20 l-20 20 l-20 -20 z" fill="none" stroke="${lighten(base, 0.35)}" stroke-width="3"/>`;
  } else {
    inner = (ICONS[def.icon] ?? FALLBACK)(100, 100, { tint: def.tint, facing: 'S' });
  }
  if (bw) inner = inner.replace(/#[0-9a-fA-F]{6}\b/g, (m) => gray(m));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112" aria-hidden="true">${inner}</svg>`;
}
