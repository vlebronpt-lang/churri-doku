import type { Puzzle } from '../engine/types';

/** Etiqueta corta del caso: «Nº 06», «Caso del día · 20/10», «Academia · Lección 3», «Tutorial». */
export function caseTag(p: Puzzle): string {
  const m = p.meta;
  if (m?.kind === 'daily') return `Caso del día · ${m.date.slice(8, 10)}/${m.date.slice(5, 7)}`;
  if (m?.kind === 'lesson') return `Academia · Lección ${m.lesson.replace(/\D/g, '')}`;
  if (m?.kind === 'tutorial') return 'Tutorial';
  return `Nº ${String(p.num).padStart(2, '0')}`;
}

/** Ruta (hash) donde se juega el caso. */
export function caseRoute(p: Puzzle): string {
  const m = p.meta;
  if (m?.kind === 'daily') return `/diario/${m.date}`;
  if (m?.kind === 'lesson') return `/academia/${m.lesson}`;
  if (m?.kind === 'tutorial') return '/tutorial';
  return `/caso/${p.id}`;
}

export const isRegularCase = (p: Puzzle) => !p.meta;
