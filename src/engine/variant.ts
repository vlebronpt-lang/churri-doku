import type { Clue, Level, PuzzleInput } from './types';

/** Mapa en espejo (izquierda ↔ derecha): mismas zonas y objetos, otra distribución. */
export function mirrorInput(input: PuzzleInput): PuzzleInput {
  const s = input.size;
  const flip = (rows: string[] | undefined) => rows?.map((row) => [...row].reverse().join(''));
  const legend = Object.fromEntries(Object.entries(input.legend).map(([k, v]) => {
    if (typeof v === 'string' || !v.facing) return [k, v];
    const facing = v.facing === 'E' ? 'W' : v.facing === 'W' ? 'E' : v.facing;
    return [k, { ...v, facing }];
  }));
  const solution = input.solution
    ? Object.fromEntries(Object.entries(input.solution).map(([id, [r, c]]) => [id, [r, s - 1 - c] as [number, number]]))
    : input.solution;
  const pins = input.pins
    ? Object.fromEntries(Object.entries(input.pins).map(([id, pin]) => [id, pin.cells ? { ...pin, cells: pin.cells.map(([r, c]) => [r, s - 1 - c] as [number, number]) } : pin]))
    : undefined;
  return { ...input, layout: flip(input.layout)!, objects: flip(input.objects)!, floors: flip(input.floors), legend, solution, pins };
}

/** Datos publicados de un caso del día (public/daily/AAAA-MM.json). */
export interface DailyEntry {
  date: string;
  base: string;
  mirror: boolean;
  level: Level;
  solution: Record<string, [number, number]>;
  clues: Record<string, Clue[]>;
  score: number;
  steps: number;
}

/** Definición completa de un caso del día a partir del caso base. */
export function dailyInput(base: PuzzleInput, e: Pick<DailyEntry, 'date' | 'mirror' | 'level' | 'solution' | 'clues'>): PuzzleInput {
  const src = e.mirror ? mirrorInput(base) : base;
  return {
    ...src,
    id: `d-${e.date}`,
    num: 0,
    level: e.level,
    solution: e.solution,
    clues: e.clues,
    cast: src.cast.map((ch) => ({ ...ch, clues: [] })),
    pins: undefined,
    wantMurderer: undefined,
    art: base.id,
    meta: { kind: 'daily', date: e.date, base: base.id, mirror: e.mirror },
  };
}
