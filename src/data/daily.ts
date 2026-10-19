import { compilePuzzle } from '../engine/puzzle';
import { dailyInput, type DailyEntry } from '../engine/variant';
import { roomPhrase, withPrep } from '../engine/text';
import type { Puzzle } from '../engine/types';
import { INPUTS } from './puzzles';
import { MOTIVES } from './motives';

const BASE = import.meta.env.BASE_URL;

/** Fecha local de hoy (AAAA-MM-DD). */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return todayIso(new Date(y, m - 1, d + n));
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const monthName = (m: number) => MONTHS[m - 1];

/** «martes 20 de octubre» */
export function longDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${DAYS[new Date(y, m - 1, d).getDay()]} ${d} de ${MONTHS[m - 1]}`;
}

/** «20/10/2026» */
export const shortDate = (date: string) => date.split('-').reverse().join('/');

export interface DailyIndex { from: string; to: string; months: string[] }

let indexCache: Promise<DailyIndex | null> | null = null;
export function loadDailyIndex(): Promise<DailyIndex | null> {
  indexCache ??= fetch(`${BASE}daily/index.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return indexCache;
}

const monthCache = new Map<string, Promise<Record<string, DailyEntry>>>();
export function loadDailyMonth(ym: string): Promise<Record<string, DailyEntry>> {
  if (!monthCache.has(ym)) {
    monthCache.set(ym, fetch(`${BASE}daily/${ym}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
  }
  return monthCache.get(ym)!;
}

export async function loadDailyEntry(date: string): Promise<DailyEntry | null> {
  const month = await loadDailyMonth(date.slice(0, 7));
  return month[date] ?? null;
}

/** Final del caso del día: el móvil del culpable y dónde estaba cada uno. */
function dailyEpilogue(p: Puzzle): string {
  const base = p.meta?.kind === 'daily' ? p.meta.base : p.id;
  const murderer = p.cast.find((c) => c.id === p.murderer)!;
  const victim = p.cast.find((c) => c.victim)!;
  const motive = MOTIVES[base]?.[murderer.id] ?? `Estaba a solas con ${withPrep('', victim)} y no desaprovechó la ocasión.`;
  const byRoom = new Map<number, string[]>();
  for (const ch of p.cast) {
    if (ch.victim || ch.id === murderer.id) continue;
    const room = p.cells[p.solution[ch.id]].room;
    byRoom.set(room, [...(byRoom.get(room) ?? []), withPrep('', ch)]);
  }
  const parts = [...byRoom.entries()].map(([room, names]) => {
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : names[0];
    return `${list} ${names.length > 1 ? 'estaban' : 'estaba'} ${roomPhrase(p.rooms[room], 'en')}`;
  });
  const recap = parts.length ? ` Mientras tanto, ${parts.join('; ')}.` : '';
  return `¡Fue ${withPrep('', murderer)}! ${motive}${recap}`;
}

const compiled = new Map<string, Puzzle>();
/** Caso del día listo para jugar (o null si el caso base no existe). */
export function dailyPuzzle(e: DailyEntry): Puzzle | null {
  if (compiled.has(e.date)) return compiled.get(e.date)!;
  const base = INPUTS[e.base];
  if (!base) return null;
  const p = compilePuzzle(dailyInput(base, e));
  p.story = { intro: base.story.intro, epilogue: dailyEpilogue(p) };
  compiled.set(e.date, p);
  return p;
}

export const dailyId = (date: string) => `d-${date}`;
