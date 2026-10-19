import { load, save } from '../state/storage';
import { getStore } from '../state/progress';
import { getFeedback, type FeedbackItem } from '../state/feedback';
import { packUrl } from '../share';

/** Informe de juego: lo que hace falta para ver dónde se atasca la gente (nada más). */
export interface Report {
  v: 1;
  /** Identificador anónimo y aleatorio de este navegador. */
  player: string;
  /** Nombre, solo si el jugador lo ha puesto para los retos. */
  name?: string;
  device: 'móvil' | 'tableta' | 'ordenador';
  at: number;
  cases: Record<string, CaseReport>;
  feedback: FeedbackItem[];
}

export interface CaseReport {
  /** Resuelto (1) o no (0). */
  s: 0 | 1;
  /** Tiempo jugado y mejor tiempo (s). */
  t: number;
  b?: number;
  h: number;
  c: number;
  m: number;
  /** Segundo de la primera colocación. */
  f?: number;
  /** Veces abierto. */
  v?: number;
  /** Pistas pedidas: [segundo, técnica, colocados]. */
  hl?: [number, string, number][];
}

export function playerId(): string {
  let id = load<string>('player', '');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    save('player', id);
  }
  return id;
}

function device(): Report['device'] {
  const w = Math.min(window.screen.width, window.screen.height);
  if (window.matchMedia('(pointer: coarse)').matches) return w < 600 ? 'móvil' : 'tableta';
  return 'ordenador';
}

export function buildReport(name?: string): Report {
  const cases: Record<string, CaseReport> = {};
  for (const [id, c] of Object.entries(getStore())) {
    if (!c.board && !c.solved && c.bestTime == null) continue;
    cases[id] = {
      s: c.solved || c.bestTime != null ? 1 : 0,
      t: c.time, b: c.bestTime, h: c.hints, c: c.checks, m: c.mistakes,
      f: c.firstMoveAt, v: c.visits,
      hl: c.hintLog?.map((e) => [e.t, e.tech, e.placed] as [number, string, number]),
    };
  }
  return { v: 1, player: playerId(), name: name || undefined, device: device(), at: Date.now(), cases, feedback: getFeedback() };
}

export async function reportUrl(name?: string): Promise<string> {
  return packUrl('/informe', buildReport(name));
}
