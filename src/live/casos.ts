/** Casos que se pueden jugar en pareja: los 25 de siempre y los del día («d-2026-10-21»). */
import { useEffect, useState } from 'react';
import type { Puzzle } from '../engine/types';
import { getPuzzle, LEVELS, PUZZLES } from '../data/puzzles';
import { dailyId, dailyPuzzle, loadDailyEntry, shortDate, todayIso } from '../data/daily';

export const esDelDia = (id: string) => /^d-\d{4}-\d{2}-\d{2}$/.test(id);
const fechaDe = (id: string) => id.slice(2);

/** Carga un caso por su id (los del día vienen de su archivo). */
export async function cargarCaso(id: string): Promise<Puzzle | null> {
  if (!esDelDia(id)) return getPuzzle(id) ?? null;
  const entry = await loadDailyEntry(fechaDe(id));
  return entry ? dailyPuzzle(entry) : null;
}

export type CasoCargado = { estado: 'cargando' } | { estado: 'listo'; p: Puzzle } | { estado: 'no-esta' };

/** El caso de una partida, listo para jugar (o «no-esta» si esta versión del juego no lo tiene). */
export function useCaso(id: string | null): CasoCargado {
  const directo = id && !esDelDia(id) ? getPuzzle(id) ?? null : undefined;
  const [cargado, setCargado] = useState<{ id: string; p: Puzzle | null } | null>(null);
  useEffect(() => {
    if (!id || !esDelDia(id)) return;
    let vivo = true;
    void cargarCaso(id).then((p) => { if (vivo) setCargado({ id, p }); });
    return () => { vivo = false; };
  }, [id]);
  if (!id) return { estado: 'no-esta' };
  if (directo !== undefined) return directo ? { estado: 'listo', p: directo } : { estado: 'no-esta' };
  if (cargado?.id !== id) return { estado: 'cargando' };
  return cargado.p ? { estado: 'listo', p: cargado.p } : { estado: 'no-esta' };
}

/** Nombre corto para listas y avisos: «Nº 01 · El pantano de Shrek» o «Caso del día · 21/10/2026». */
export function nombreCaso(id: string): string {
  if (esDelDia(id)) return `Caso del día · ${shortDate(fechaDe(id))}`;
  const p = getPuzzle(id);
  return p ? `Nº ${String(p.num).padStart(2, '0')} · ${p.title}` : id;
}

export interface GrupoCasos { nombre: string; casos: { id: string; texto: string }[] }

/** Opciones para elegir el caso (el del día primero; luego por temporadas). `tambien`: un caso del día de otra fecha. */
export function gruposDeCasos(tambien?: string): GrupoCasos[] {
  const hoy = dailyId(todayIso());
  const otroDia = tambien && esDelDia(tambien) && tambien !== hoy ? [{ id: tambien, texto: `Caso del día (${shortDate(fechaDe(tambien))})` }] : [];
  return [
    { nombre: 'Caso del día', casos: [{ id: hoy, texto: `Caso del día de hoy (${shortDate(todayIso())})` }, ...otroDia] },
    ...LEVELS.map((l) => ({
      nombre: `Temporada ${l.season} · ${l.name}`,
      casos: PUZZLES.filter((p) => p.level === l.level).map((p) => ({ id: p.id, texto: `Nº ${String(p.num).padStart(2, '0')} · ${p.title} (${p.franchise})` })),
    })),
  ];
}
