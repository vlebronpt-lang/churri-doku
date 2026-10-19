import type { Level } from './types';

/**
 * Qué se exige a cada nivel. La «puntuación» es la del motor lógico (suma del nivel de cada
 * deducción; las eliminaciones cuentan 0,6) dividida entre el número de personajes.
 *
 * Escala rehecha tras las pruebas con jugadores: el nuevo «Muy fácil» tiene la dificultad del
 * antiguo «Difícil» y el «Fácil», la del antiguo «Experto». A partir de «Medio» hay que hacer
 * suposiciones (descartar una casilla porque lleva a una contradicción).
 */
export interface Profile {
  band: [number, number];
  /** Técnica más difícil permitida (4 = filas o columnas reservadas, 6 = suposición). */
  maxLevel: number;
  /** Suposiciones permitidas y exigidas. */
  maxTrial: number;
  minTrial: number;
  /** Mínimo de pasos difíciles (alineación, relación, zona, reservas, suposición). */
  minHard: number;
  /** Tipos de pista que se usan (nivel del catálogo de hechos y pesos). */
  clueLevel: Level;
}

export const PROFILE: Record<Level, Profile> = {
  1: { band: [3.2, 4.6], maxLevel: 4, maxTrial: 0, minTrial: 0, minHard: 4, clueLevel: 4 },
  2: { band: [4.4, 6.0], maxLevel: 6, maxTrial: 1, minTrial: 0, minHard: 8, clueLevel: 5 },
  3: { band: [5.2, 7.2], maxLevel: 6, maxTrial: 3, minTrial: 1, minHard: 12, clueLevel: 5 },
  4: { band: [6.0, 9.0], maxLevel: 6, maxTrial: 5, minTrial: 2, minHard: 16, clueLevel: 5 },
  5: { band: [7.0, 11.0], maxLevel: 6, maxTrial: 8, minTrial: 3, minHard: 22, clueLevel: 5 },
};

/** Pasos que cuentan como «difíciles». */
export const hardSteps = (t: Record<string, number>) => (t.room ?? 0) + (t.subset ?? 0) + (t.trial ?? 0) + (t.relation ?? 0) + (t.pointing ?? 0);
