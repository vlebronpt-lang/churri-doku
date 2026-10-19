import { useSyncExternalStore } from 'react';
import { load, save } from './storage';

export type FeedbackReason = 'no-entiendo' | 'mal' | 'ambigua' | 'otra';

export const REASONS: { id: FeedbackReason; label: string }[] = [
  { id: 'no-entiendo', label: 'No entiendo lo que dice' },
  { id: 'ambigua', label: 'Se puede entender de dos formas' },
  { id: 'mal', label: 'Creo que está mal' },
  { id: 'otra', label: 'Otra cosa' },
];

/** Aviso de un jugador sobre una pista confusa (se envía en el informe de juego). */
export interface FeedbackItem {
  /** Caso (id) */
  c: string;
  /** Personaje cuya pista confunde (si es de un sospechoso). */
  ch?: string;
  /** Texto de la pista o de la ayuda. */
  text: string;
  reason: FeedbackReason;
  comment?: string;
  at: number;
}

let items: FeedbackItem[] = load('feedback', []);
const listeners = new Set<() => void>();

export function addFeedback(item: FeedbackItem) {
  items = [...items, item].slice(-200);
  save('feedback', items);
  listeners.forEach((l) => l());
}

export const getFeedback = () => items;

export function useFeedback(): FeedbackItem[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => items, () => items);
}
