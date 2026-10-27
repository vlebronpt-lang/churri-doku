/** La copia del progreso que se guarda en la cuenta del jugador, y cómo se juntan dos copias. */
import { getStore, mergeCase, replaceProgress, wasSolved, type CaseProgress } from '../state/progress';
import { getEvents, getUnlocked, replaceAchievements, type Events } from '../state/achievements';
import { getSettings, setSetting } from '../state/settings';
import { load, save } from '../state/storage';
import { decodeProgress, packValue } from '../share';

export interface SaveData {
  v: 1;
  /** Progreso de cada caso (los 25, los del día, el tutorial y las lecciones). */
  p: Record<string, CaseProgress>;
  /** Logros conseguidos: id → fecha. */
  a: Record<string, number>;
  /** Cosas sueltas que cuentan para los logros. */
  e: Events;
  /** Nombre para los retos y cuándo se cambió. */
  n?: { v: string; at: number };
  /** Último «Borrar mi progreso»: lo anterior a esa fecha ya no vuelve. */
  r?: number;
}

export const emptySave = (): SaveData => ({ v: 1, p: {}, a: {}, e: {} });

/** Lo que hay ahora mismo en este dispositivo. */
export function localSave(): SaveData {
  const name = getSettings().playerName;
  const nameAt = load<number>('name-at', 0);
  const r = load<number>('reset-at', 0);
  return {
    v: 1,
    p: getStore(),
    a: getUnlocked(),
    e: getEvents(),
    ...(name || nameAt ? { n: { v: name, at: nameAt } } : {}),
    ...(r ? { r } : {}),
  };
}

/** Pone en este dispositivo una copia completa (los logros van antes para que no salten avisos repetidos). */
export function applySave(d: SaveData) {
  replaceAchievements(d.a, d.e);
  replaceProgress(d.p);
  if (d.n) {
    setSetting('playerName', d.n.v);
    save('name-at', d.n.at);
  }
  save('reset-at', d.r ?? 0);
}

/** Junta dos copias: de cada caso, la partida más reciente sin perder lo conseguido; de los logros, todos. */
export function mergeSaves(x: SaveData, y: SaveData): SaveData {
  const r = Math.max(x.r ?? 0, y.r ?? 0);
  const alive = (c?: CaseProgress) => (c && (c.at ?? 0) >= r ? c : undefined);
  const p: Record<string, CaseProgress> = {};
  for (const id of new Set([...Object.keys(x.p), ...Object.keys(y.p)])) {
    const c = mergeCase(alive(x.p[id]), alive(y.p[id]));
    if (c) p[id] = c;
  }
  const a: Record<string, number> = {};
  for (const src of [x.a, y.a]) {
    for (const [id, t] of Object.entries(src)) if (t >= r && (a[id] == null || t < a[id])) a[id] = t;
  }
  const e: Events = {};
  for (const s of [x.e, y.e]) {
    if ((s.at ?? 0) < r) continue;
    if (s.challengesSent) e.challengesSent = Math.max(e.challengesSent ?? 0, s.challengesSent);
    if (s.tutorialDone) e.tutorialDone = true;
    if (s.installed) e.installed = true;
    if (s.bookFinal) e.bookFinal = true;
    if (s.at) e.at = Math.max(e.at ?? 0, s.at);
  }
  const n = !x.n ? y.n : !y.n ? x.n : y.n.at > x.n.at ? y.n : x.n;
  return { v: 1, p, a, e, ...(n ? { n } : {}), ...(r ? { r } : {}) };
}

/**
 * Progreso jugado sin cuenta que pasa a una cuenta: no arrastra los borrados de este dispositivo,
 * y lo anterior al último borrado de la cuenta cuenta como de ese momento para no perderse al juntarlo.
 */
export function adoptSave(d: SaveData, accountReset = 0): SaveData {
  const lift = (t: number | undefined) => Math.max(t ?? 0, accountReset);
  const p = Object.fromEntries(Object.entries(d.p).map(([id, c]) => [id, { ...c, at: lift(c.at) }]));
  const a = Object.fromEntries(Object.entries(d.a).map(([id, t]) => [id, lift(t)]));
  const e = Object.keys(d.e).length ? { ...d.e, at: lift(d.e.at) } : d.e;
  return { v: 1, p, a, e, ...(d.n ? { n: d.n } : {}) };
}

const realCase = (id: string) => id !== 'tutorial' && !id.startsWith('lesson-');

/** Casos resueltos (sin contar el tutorial ni las lecciones de la academia). */
export const solvedCount = (d: SaveData) => Object.entries(d.p).filter(([id, c]) => realCase(id) && wasSolved(c)).length;

/** ¿Hay algo que merezca la pena conservar? */
export const hasProgress = (d: SaveData) =>
  Object.keys(d.a).length > 0 || Object.values(d.p).some((c) => wasSolved(c) || Object.keys(c.board?.placed ?? {}).length > 0);

/** JSON con las claves ordenadas: dos copias iguales dan el mismo texto. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

export const sameSave = (x: SaveData, y: SaveData) => stable(x) === stable(y);

export const encodeSave = (d: SaveData) => packValue(d);

/** Lee una copia de la nube (null si está dañada o este navegador no sabe descomprimirla). */
export async function decodeSave(text: string): Promise<SaveData | null> {
  const o = (await decodeProgress(text)) as Partial<SaveData> | null;
  if (!o || o.v !== 1 || !o.p || typeof o.p !== 'object') return null;
  return { v: 1, p: o.p, a: o.a ?? {}, e: o.e ?? {}, ...(o.n ? { n: o.n } : {}), ...(o.r ? { r: o.r } : {}) };
}
