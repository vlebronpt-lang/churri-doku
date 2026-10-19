import { compilePuzzle } from '../../engine/puzzle';
import type { TechId } from '../../engine/logic';
import type { Puzzle, PuzzleInput } from '../../engine/types';
import { LESSONS } from './lessons';

/** Lección de la academia: una técnica, explicada y practicada en un minicaso. */
export interface Lesson {
  /** 'a1', 'a2'… (orden de la academia). */
  id: string;
  /** Título corto: «Junto a», «Filas reservadas»… */
  title: string;
  /** Qué se aprende, en una línea. */
  skill: string;
  /** Explicación antes de jugar (1–3 párrafos cortos). */
  explain: string[];
  /** Consejo que aparece al terminar o si se atasca. */
  tip: string;
  /** Tipos de pista que el minicaso debe usar (t de Clue: 'beside', 'dir'…). */
  focusClues: string[];
  /** Técnicas del motor lógico que el minicaso debe necesitar. */
  focusTech: TechId[];
  /** Minicaso: id `lesson-<id>`, `art` = caso cuyas ilustraciones usa, meta { kind: 'lesson' }. */
  puzzle: PuzzleInput;
}

export { LESSONS };

const compiled = new Map<string, Puzzle>();
export function lessonPuzzle(l: Lesson): Puzzle {
  if (!compiled.has(l.id)) compiled.set(l.id, compilePuzzle({ ...l.puzzle, meta: { kind: 'lesson', lesson: l.id } }));
  return compiled.get(l.id)!;
}

export const getLesson = (id: string) => LESSONS.find((l) => l.id === id);
export const nextLesson = (id: string) => {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 && i < LESSONS.length - 1 ? LESSONS[i + 1] : null;
};
