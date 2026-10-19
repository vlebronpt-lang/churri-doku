import type { Level } from './types';

/**
 * Qué se exige a cada nivel. La «puntuación» es la del motor lógico (suma del nivel de cada
 * deducción; las eliminaciones cuentan 0,6) dividida entre el número de personajes.
 *
 * Calibrada con Murdoku (scripts/murdoku-ref.ts traduce sus casos y los mide con este motor):
 * «Acaparadores» (Fácil) 1,3 · «La lección de equitación» (Fácil) 3,5 · «La residencia» (Medio) 5,7 ·
 * «La habitación del pánico» (Difícil, 10×10) 8,4 por personaje, 83,8 en total y 11 suposiciones.
 *
 * El «Muy fácil» de Churri-doku tiene la dificultad de «La habitación del pánico» (al menos su
 * puntuación por personaje y su número de suposiciones, y casi el mismo total en 9×9) y cada nivel
 * de los siguientes es más difícil que el anterior, sin solaparse.
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
  1: { band: [9.0, 10.2], maxLevel: 6, maxTrial: 20, minTrial: 11, minHard: 28, clueLevel: 5 },
  2: { band: [10.4, 11.6], maxLevel: 6, maxTrial: 24, minTrial: 12, minHard: 32, clueLevel: 5 },
  3: { band: [11.8, 13.0], maxLevel: 6, maxTrial: 28, minTrial: 14, minHard: 36, clueLevel: 5 },
  4: { band: [13.2, 14.6], maxLevel: 6, maxTrial: 32, minTrial: 16, minHard: 42, clueLevel: 5 },
  5: { band: [14.8, 16.8], maxLevel: 6, maxTrial: 40, minTrial: 19, minHard: 48, clueLevel: 5 },
};

/** Referencia: «La habitación del pánico» de Murdoku medida con este motor. */
export const REFERENCE = { title: 'La habitación del pánico', source: 'Murdoku (Difícil, 10×10)', perChar: 8.38, total: 83.8, trials: 11 };

/** Pasos que cuentan como «difíciles». */
export const hardSteps = (t: Record<string, number>) => (t.room ?? 0) + (t.subset ?? 0) + (t.trial ?? 0) + (t.relation ?? 0) + (t.pointing ?? 0);
