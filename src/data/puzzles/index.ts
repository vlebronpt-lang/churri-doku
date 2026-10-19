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
  { level: 1, name: 'Muy fácil', season: 'Temporada 1', color: '#47c2a2', blurb: 'Ya de entrada, la dificultad de un caso «Difícil» de Murdoku: hay que encadenar deducciones y suponer. Tableros de 9×9.' },
  { level: 2, name: 'Fácil', season: 'Temporada 2', color: '#6fa8f5', blurb: 'Más suposiciones y pistas más indirectas que en Muy fácil. Tableros de 9×9.' },
  { level: 3, name: 'Medio', season: 'Temporada 3', color: '#f3b53f', blurb: 'Cadenas largas de suposiciones y pocas pistas directas. Tableros de 9×9.' },
  { level: 4, name: 'Difícil', season: 'Temporada 4', color: '#f07b3f', blurb: 'Diez sospechosos y pistas mínimas en tableros de 10×10.' },
  { level: 5, name: 'Experto', season: 'Temporada 5', color: '#e23d6b', blurb: 'Lo más difícil: diez sospechosos, 10×10 y suposición tras suposición. Solo para mentes muy frías.' },
];

export const levelInfo = (l: Level) => LEVELS[l - 1];

/** Siguiente caso en orden (o null si es el último). */
export function nextPuzzle(id: string): Puzzle | null {
  const i = PUZZLES.findIndex((p) => p.id === id);
  return i >= 0 && i < PUZZLES.length - 1 ? PUZZLES[i + 1] : null;
}
