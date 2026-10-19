import { compilePuzzle } from '../../engine/puzzle';
import type { Level, Puzzle, PuzzleInput } from '../../engine/types';

// Cada caso es un módulo; se cargan todos de forma síncrona (son pequeños).
const modules = import.meta.glob<{ default: PuzzleInput }>('./*.ts', { eager: true });

/** Definiciones originales de los casos (las usan el caso del día y la academia). */
export const INPUTS: Record<string, PuzzleInput> = Object.fromEntries(
  Object.entries(modules)
    .filter(([path]) => !path.endsWith('/index.ts'))
    .map(([, m]) => [m.default.id, m.default]),
);

export const PUZZLES: Puzzle[] = Object.values(INPUTS)
  .filter((input) => !!input.solution)
  .map((input) => compilePuzzle(input))
  .sort((a, b) => a.num - b.num);

const byId = new Map(PUZZLES.map((p) => [p.id, p]));
export const getPuzzle = (id: string) => byId.get(id);

export interface LevelInfo {
  level: Level;
  name: string;
  season: string;
  color: string;
  blurb: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Muy fácil', season: 'Temporada 1', color: '#47c2a2', blurb: 'Para calentar, pero sin regalos: ya hay que encadenar deducciones. Tableros de 5×5 y 6×6.' },
  { level: 2, name: 'Fácil', season: 'Temporada 2', color: '#6fa8f5', blurb: 'Pistas indirectas y relaciones entre sospechosos. Tableros de 7×7.' },
  { level: 3, name: 'Medio', season: 'Temporada 3', color: '#f3b53f', blurb: 'Aquí ya toca suponer y descartar lo que lleva a una contradicción. Tableros de 8×8.' },
  { level: 4, name: 'Difícil', season: 'Temporada 4', color: '#f07b3f', blurb: 'Varias suposiciones encadenadas y pistas mínimas en tableros de 9×9.' },
  { level: 5, name: 'Experto', season: 'Temporada 5', color: '#e23d6b', blurb: 'Diez sospechosos y pistas mínimas: solo para mentes muy frías.' },
];

export const levelInfo = (l: Level) => LEVELS[l - 1];

/** Siguiente caso en orden (o null si es el último). */
export function nextPuzzle(id: string): Puzzle | null {
  const i = PUZZLES.findIndex((p) => p.id === id);
  return i >= 0 && i < PUZZLES.length - 1 ? PUZZLES[i + 1] : null;
}
