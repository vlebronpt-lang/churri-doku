/**
 * Tablero compartido del modo cooperativo. Cada jugada viaja como un paquete de cambios sueltos
 * (quién hay en una casilla, una nota, una X…) y la sala los aplica en el orden en que le llegan:
 * si los dos tocan lo mismo a la vez, gana el último. Lo usan la sala (en Base44) y el juego.
 */

/** Mismo formato que el tablero guardado del juego (BoardState). */
export interface Tablero {
  placed: Record<number, string>;
  notes: Record<number, string[]>;
  xs: Record<number, 'm' | 'a'>;
  occ?: Record<number, true>;
  lines?: Record<string, true>;
  zones?: Record<string, number>;
}

/** Cambios de una jugada; null quita la marca. */
export interface Cambios {
  /** Casilla → quién está (al ponerlo en una casilla, sale de la que tuviera). */
  p?: Record<string, string | null>;
  /** Casilla → sospechoso → nota puesta o quitada. */
  n?: Record<string, Record<string, boolean>>;
  /** Casilla → X. */
  x?: Record<string, 'm' | 'a' | null>;
  /** Casilla → «ocupada». */
  o?: Record<string, true | null>;
  /** Fila o columna «ocupada» ('r3', 'c0'…). */
  l?: Record<string, true | null>;
  /** Sospechoso → zona. */
  z?: Record<string, number | null>;
}

export const tableroVacio = (): Tablero => ({ placed: {}, notes: {}, xs: {}, occ: {}, lines: {}, zones: {} });

export function copiar(t: Tablero): Tablero {
  return {
    placed: { ...t.placed },
    notes: Object.fromEntries(Object.entries(t.notes).map(([k, v]) => [k, [...v]])),
    xs: { ...t.xs },
    occ: { ...(t.occ ?? {}) },
    lines: { ...(t.lines ?? {}) },
    zones: { ...(t.zones ?? {}) },
  };
}

const vacio = (c: Cambios) => !Object.values(c).some((m) => m && Object.keys(m).length);

/** Lo que hay que cambiar en `a` para que quede como `b` (null si son iguales). */
export function diferencias(a: Tablero, b: Tablero): Cambios | null {
  const c: Cambios = {};
  const claves = (x: object | undefined, y: object | undefined) => new Set([...Object.keys(x ?? {}), ...Object.keys(y ?? {})]);
  for (const k of claves(a.placed, b.placed)) {
    const va = a.placed[Number(k)], vb = b.placed[Number(k)];
    if (va !== vb) (c.p ??= {})[k] = vb ?? null;
  }
  for (const k of claves(a.notes, b.notes)) {
    const na = new Set(a.notes[Number(k)] ?? []), nb = new Set(b.notes[Number(k)] ?? []);
    for (const id of nb) if (!na.has(id)) ((c.n ??= {})[k] ??= {})[id] = true;
    for (const id of na) if (!nb.has(id)) ((c.n ??= {})[k] ??= {})[id] = false;
  }
  for (const k of claves(a.xs, b.xs)) {
    const va = a.xs[Number(k)], vb = b.xs[Number(k)];
    if (va !== vb) (c.x ??= {})[k] = vb ?? null;
  }
  for (const k of claves(a.occ, b.occ)) {
    if (!a.occ?.[Number(k)] !== !b.occ?.[Number(k)]) (c.o ??= {})[k] = b.occ?.[Number(k)] ? true : null;
  }
  for (const k of claves(a.lines, b.lines)) {
    if (!a.lines?.[k] !== !b.lines?.[k]) (c.l ??= {})[k] = b.lines?.[k] ? true : null;
  }
  for (const k of claves(a.zones, b.zones)) {
    const va = a.zones?.[k], vb = b.zones?.[k];
    if (va !== vb) (c.z ??= {})[k] = vb ?? null;
  }
  return vacio(c) ? null : c;
}

/**
 * Aplica unos cambios. Devuelve el tablero nuevo (el de entrada no se toca) y los cambios que de verdad
 * se han hecho, incluidos los que arrastra una colocación (la persona sale de su casilla anterior).
 */
export function aplicar(t: Tablero, c: Cambios): { tablero: Tablero; efectivos: Cambios } {
  const out = copiar(t);
  const ef: Cambios = {};
  for (const [k, id] of Object.entries(c.p ?? {})) {
    const cell = Number(k);
    if (id === null) {
      delete out.placed[cell];
      (ef.p ??= {})[k] = null;
      continue;
    }
    for (const [k2, v2] of Object.entries(out.placed)) {
      if (v2 === id && Number(k2) !== cell) {
        delete out.placed[Number(k2)];
        (ef.p ??= {})[k2] = null;
      }
    }
    out.placed[cell] = id;
    (ef.p ??= {})[k] = id;
  }
  for (const [k, ids] of Object.entries(c.n ?? {})) {
    const cell = Number(k);
    let list = out.notes[cell] ?? [];
    for (const [id, on] of Object.entries(ids)) {
      if (on && !list.includes(id)) list = [...list, id];
      if (!on) list = list.filter((x) => x !== id);
      ((ef.n ??= {})[k] ??= {})[id] = on;
    }
    if (list.length) out.notes[cell] = list;
    else delete out.notes[cell];
  }
  for (const [k, v] of Object.entries(c.x ?? {})) {
    if (v) out.xs[Number(k)] = v;
    else delete out.xs[Number(k)];
    (ef.x ??= {})[k] = v;
  }
  for (const [k, v] of Object.entries(c.o ?? {})) {
    if (v) out.occ![Number(k)] = true;
    else delete out.occ![Number(k)];
    (ef.o ??= {})[k] = v;
  }
  for (const [k, v] of Object.entries(c.l ?? {})) {
    if (v) out.lines![k] = true;
    else delete out.lines![k];
    (ef.l ??= {})[k] = v;
  }
  for (const [k, v] of Object.entries(c.z ?? {})) {
    if (v === null) delete out.zones![k];
    else out.zones![k] = v;
    (ef.z ??= {})[k] = v;
  }
  return { tablero: out, efectivos: ef };
}

/** Junta dos paquetes de cambios seguidos en uno (lo de `b` manda). */
export function juntar(a: Cambios | null, b: Cambios | null): Cambios | null {
  if (!a) return b;
  if (!b) return a;
  const out: Cambios = {};
  for (const k of ['p', 'x', 'o', 'l', 'z'] as const) {
    if (a[k] || b[k]) (out as Record<string, unknown>)[k] = { ...(a[k] ?? {}), ...(b[k] ?? {}) };
  }
  if (a.n || b.n) {
    out.n = {};
    for (const src of [a.n ?? {}, b.n ?? {}]) for (const [cell, ids] of Object.entries(src)) out.n[cell] = { ...(out.n[cell] ?? {}), ...ids };
  }
  return out;
}

export const colocados = (t: Tablero) => Object.keys(t.placed).length;

// ------------------------------------------------------------ datos que llegan de fuera

const CASILLAS = 400;
const esCasilla = (k: string) => /^\d{1,3}$/.test(k) && Number(k) < CASILLAS;
const esId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,40}$/.test(v);
const esLinea = (k: string) => /^[rc]\d{1,2}$/.test(k);
const MAX = 2000;

/** Comprueba unos cambios recibidos (en la sala no hay que fiarse de nada). Null si no valen. */
export function validarCambios(raw: unknown): Cambios | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: Cambios = {};
  let n = 0;
  const mapa = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
  for (const key of Object.keys(r)) if (!['p', 'n', 'x', 'o', 'l', 'z'].includes(key)) return null;
  if (r.p !== undefined) {
    const m = mapa(r.p);
    if (!m) return null;
    out.p = {};
    for (const [k, v] of Object.entries(m)) {
      if (!esCasilla(k) || (v !== null && !esId(v)) || ++n > MAX) return null;
      out.p[k] = v;
    }
  }
  if (r.n !== undefined) {
    const m = mapa(r.n);
    if (!m) return null;
    out.n = {};
    for (const [k, v] of Object.entries(m)) {
      const ids = mapa(v);
      if (!esCasilla(k) || !ids) return null;
      out.n[k] = {};
      for (const [id, on] of Object.entries(ids)) {
        if (!esId(id) || typeof on !== 'boolean' || ++n > MAX) return null;
        out.n[k][id] = on;
      }
    }
  }
  if (r.x !== undefined) {
    const m = mapa(r.x);
    if (!m) return null;
    out.x = {};
    for (const [k, v] of Object.entries(m)) {
      if (!esCasilla(k) || (v !== null && v !== 'm' && v !== 'a') || ++n > MAX) return null;
      out.x[k] = v;
    }
  }
  if (r.o !== undefined) {
    const m = mapa(r.o);
    if (!m) return null;
    out.o = {};
    for (const [k, v] of Object.entries(m)) {
      if (!esCasilla(k) || (v !== null && v !== true) || ++n > MAX) return null;
      out.o[k] = v;
    }
  }
  if (r.l !== undefined) {
    const m = mapa(r.l);
    if (!m) return null;
    out.l = {};
    for (const [k, v] of Object.entries(m)) {
      if (!esLinea(k) || (v !== null && v !== true) || ++n > MAX) return null;
      out.l[k] = v;
    }
  }
  if (r.z !== undefined) {
    const m = mapa(r.z);
    if (!m) return null;
    out.z = {};
    for (const [k, v] of Object.entries(m)) {
      if (!esId(k) || (v !== null && !(Number.isInteger(v) && (v as number) >= 0 && (v as number) < 100)) || ++n > MAX) return null;
      out.z[k] = v as number | null;
    }
  }
  return out;
}
