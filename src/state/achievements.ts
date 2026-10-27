import { useSyncExternalStore } from 'react';
import { load, save } from './storage';
import type { CaseProgress } from './progress';
import { streakInfo } from './streak';
import { PUZZLES } from '../data/puzzles';
import { LESSONS } from '../data/academy';
import { todayIso } from '../data/daily';

type Store = Record<string, CaseProgress>;

/** Cosas que no se deducen del progreso y se apuntan aparte. */
export interface Events {
  challengesSent?: number;
  tutorialDone?: boolean;
  installed?: boolean;
  /** Escribió en #/secreto el código del caso final del libro. */
  bookFinal?: boolean;
  /** Último cambio (ms), para juntar los de varios dispositivos. */
  at?: number;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  /** Oculto hasta conseguirlo (se muestra como «???»). */
  secret?: boolean;
  test: (c: Ctx) => boolean;
}

interface Ctx {
  store: Store;
  events: Events;
  solved: CaseProgress[];
  regular: { level: number; p: CaseProgress | undefined }[];
}

const isSolved = (c?: CaseProgress) => !!c && (c.solved || c.bestTime != null);
const hour = (t?: number) => (t ? new Date(t).getHours() : -1);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primer-caso', icon: '🔎', title: 'Primer caso cerrado', desc: 'Resuelve tu primer caso.', test: (c) => c.regular.some((r) => isSolved(r.p)) },
  { id: 'tutorial', icon: '🎓', title: 'Primeros pasos', desc: 'Termina el tutorial interactivo.', test: (c) => !!c.events.tutorialDone },
  { id: 'academia', icon: '📜', title: 'Diploma de la academia', desc: 'Supera todas las lecciones de la academia.', test: (c) => LESSONS.length > 0 && LESSONS.every((l) => isSolved(c.store[`lesson-${l.id}`])) },
  ...[1, 2, 3, 4, 5].map((lv): Achievement => ({
    id: `temporada-${lv}`,
    icon: ['🌱', '🌿', '🌳', '🔥', '👑'][lv - 1],
    title: `Temporada ${lv} completa`,
    desc: `Resuelve los 5 casos de la temporada ${lv}.`,
    test: (c) => c.regular.filter((r) => r.level === lv).every((r) => isSolved(r.p)),
  })),
  { id: 'todos', icon: '🏛️', title: 'Comisaría al completo', desc: 'Resuelve los 25 casos.', test: (c) => c.regular.every((r) => isSolved(r.p)) },
  { id: 'sin-pistas', icon: '🧠', title: 'Sin ayuda', desc: 'Resuelve un caso sin pedir ninguna pista.', test: (c) => c.solved.some((p) => p.solved && p.hints === 0) },
  { id: 'perfecto', icon: '⭐', title: 'Caso perfecto', desc: 'Consigue 3 estrellas: sin pistas, sin errores y sin revisar.', test: (c) => c.solved.some((p) => (p.stars ?? 0) >= 3) },
  { id: 'diez-perfectos', icon: '🌟', title: 'Diez de diez', desc: 'Consigue 3 estrellas en 10 casos.', test: (c) => c.solved.filter((p) => (p.stars ?? 0) >= 3).length >= 10 },
  { id: 'experto-solo', icon: '🦉', title: 'Experto sin pistas', desc: 'Resuelve un caso Experto sin pedir pistas.', test: (c) => c.regular.some((r) => r.level === 5 && r.p?.solved && r.p.hints === 0) },
  { id: 'pulso-firme', icon: '🎯', title: 'Pulso firme', desc: 'Resuelve un caso Difícil sin errores y sin revisar.', test: (c) => c.regular.some((r) => r.level === 4 && r.p?.solved && r.p.mistakes === 0 && r.p.checks === 0) },
  { id: 'relampago', icon: '⚡', title: 'Relámpago', desc: 'Resuelve un caso Muy fácil en menos de 10 minutos.', test: (c) => c.regular.some((r) => r.level === 1 && (r.p?.bestTime ?? Infinity) < 600) },
  { id: 'maraton', icon: '🏃', title: 'Maratón', desc: 'Resuelve 3 casos en un mismo día.', test: (c) => {
    const byDay = new Map<string, number>();
    for (const p of c.solved) if (p.firstSolvedAt) { const d = todayIso(new Date(p.firstSolvedAt)); byDay.set(d, (byDay.get(d) ?? 0) + 1); }
    return [...byDay.values()].some((n) => n >= 3);
  } },
  { id: 'nocturno', icon: '🌙', title: 'Detective nocturno', desc: 'Resuelve un caso entre las 00:00 y las 5:00.', secret: true, test: (c) => c.solved.some((p) => { const h = hour(p.firstSolvedAt ?? p.solvedAt); return h >= 0 && h < 5; }) },
  { id: 'diario', icon: '📅', title: 'Caso del día', desc: 'Resuelve tu primer caso del día.', test: (c) => Object.entries(c.store).some(([k, p]) => k.startsWith('d-') && isSolved(p)) },
  { id: 'racha-3', icon: '🔥', title: 'Racha de 3', desc: 'Resuelve el caso del día 3 días seguidos.', test: (c) => streakInfo(c.store).best >= 3 },
  { id: 'racha-7', icon: '🔥', title: 'Semana perfecta', desc: 'Resuelve el caso del día 7 días seguidos.', test: (c) => streakInfo(c.store).best >= 7 },
  { id: 'racha-30', icon: '🏆', title: 'Un mes sin fallar', desc: 'Resuelve el caso del día 30 días seguidos.', test: (c) => streakInfo(c.store).best >= 30 },
  { id: 'archivo-10', icon: '🗂️', title: 'Ratón de archivo', desc: 'Resuelve 10 casos del día.', test: (c) => Object.entries(c.store).filter(([k, p]) => k.startsWith('d-') && isSolved(p)).length >= 10 },
  { id: 'reto-enviado', icon: '💌', title: '¿Te atreves?', desc: 'Reta a tu churri con uno de tus tiempos.', test: (c) => (c.events.challengesSent ?? 0) > 0 },
  { id: 'reto-ganado', icon: '💘', title: 'Pareja imbatible', desc: 'Gana un reto: resuelve un caso más rápido que quien te retó.', test: (c) => Object.values(c.store).some((p) => p.challenge && isSolved(p) && (p.bestTime ?? Infinity) < p.challenge.t) },
  { id: 'instalada', icon: '📱', title: 'Siempre a mano', desc: 'Instala Churri-doku en tu móvil u ordenador.', secret: true, test: (c) => !!c.events.installed },
  { id: 'caso-final', icon: '📕', title: 'El club de las víctimas', desc: 'Resuelve el caso final del libro y escribe su código en la web.', secret: true, test: (c) => !!c.events.bookFinal },
];

// ------------------------------------------------------------- estado

let unlocked: Record<string, number> = load('achievements', {});
let events: Events = load('events', {});
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getEvents() { return events; }
export function getUnlocked() { return unlocked; }
export function recordEvent(patch: Partial<Events> | ((e: Events) => Partial<Events>)) {
  const p = typeof patch === 'function' ? patch(events) : patch;
  if ((Object.keys(p) as (keyof Events)[]).every((k) => events[k] === p[k])) return;
  events = { ...events, ...p, at: Date.now() };
  save('events', events);
  emit();
}

/** Sustituye logros y eventos por los que llegan de la nube. */
export function replaceAchievements(nextUnlocked: Record<string, number>, nextEvents: Events) {
  if (JSON.stringify(nextUnlocked) === JSON.stringify(unlocked) && JSON.stringify(nextEvents) === JSON.stringify(events)) return;
  unlocked = nextUnlocked;
  events = nextEvents;
  save('achievements', unlocked);
  save('events', events);
  emit();
}

/** Comprueba los logros y devuelve los recién conseguidos. */
export function checkAchievements(store: Store): Achievement[] {
  const ctx: Ctx = {
    store,
    events,
    // Solo partidas de verdad (los 25 casos y los del día): el tutorial y las lecciones no cuentan.
    solved: Object.entries(store).filter(([k, p]) => isSolved(p) && k !== 'tutorial' && !k.startsWith('lesson-')).map(([, p]) => p),
    regular: PUZZLES.map((p) => ({ level: p.level, p: store[p.id] })),
  };
  const fresh = ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.test(ctx));
  if (fresh.length) {
    const now = Date.now();
    unlocked = { ...unlocked, ...Object.fromEntries(fresh.map((a) => [a.id, now])) };
    save('achievements', unlocked);
    emit();
  }
  return fresh;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const subscribeAchievements = subscribe;

export function useEvents(): Events {
  return useSyncExternalStore(subscribe, () => events, () => events);
}

export function useUnlocked(): Record<string, number> {
  return useSyncExternalStore(subscribe, () => unlocked, () => unlocked);
}

export function resetAchievements() {
  unlocked = {};
  events = {};
  save('achievements', unlocked);
  save('events', events);
  emit();
}
