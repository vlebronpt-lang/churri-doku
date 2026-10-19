import { compilePuzzle } from '../../engine/puzzle';
import type { Level, Puzzle, PuzzleInput } from '../../engine/types';

// Cada caso es un módulo; se cargan todos de forma síncrona (son pequeños).
const modules = import.meta.glob<{ default: PuzzleInput }>('./*.ts', { eager: true });

export const PUZZLES: Puzzle[] = Object.entries(modules)
  .filter(([path]) => !path.endsWith('/index.ts'))
  .map(([, m]) => m.default)
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
  { level: 1, name: 'Muy fácil', season: 'Temporada 1', color: '#47c2a2', blurb: 'Para aprender las reglas. Pistas directas y tableros de 5×5 y 6×6.' },
  { level: 2, name: 'Fácil', season: 'Temporada 2', color: '#6fa8f5', blurb: 'Empiezan las relaciones entre sospechosos. Tableros de 7×7.' },
  { level: 3, name: 'Medio', season: 'Temporada 3', color: '#f3b53f', blurb: 'Hay que contar filas y columnas y pensar en quién comparte habitación.' },
  { level: 4, name: 'Difícil', season: 'Temporada 4', color: '#f07b3f', blurb: 'Deducciones encadenadas en tableros de 9×9.' },
  { level: 5, name: 'Experto', season: 'Temporada 5', color: '#e23d6b', blurb: 'Diez sospechosos, pistas sutiles y alguna suposición que descartar.' },
];

export const levelInfo = (l: Level) => LEVELS[l - 1];

/** Siguiente caso en orden (o null si es el último). */
export function nextPuzzle(id: string): Puzzle | null {
  const i = PUZZLES.findIndex((p) => p.id === id);
  return i >= 0 && i < PUZZLES.length - 1 ? PUZZLES[i + 1] : null;
}
