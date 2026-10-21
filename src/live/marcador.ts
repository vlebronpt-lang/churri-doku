/**
 * Marcadores de las parejas del modo en directo. Los apunta la sala en Base44 (entidad MarcadorPareja,
 * que solo pueden leer los dos de cada pareja); aquí se leen y se guarda una copia por si no hay conexión.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { marcadores as api, type MarcadorRecord } from '../cloud/api';
import { getAccount, useAccount } from '../cloud/account';
import { load, save } from '../state/storage';
import type { Marcador } from '../../base44/actors/SalaPareja/protocolo.ts';

export type { Marcador };
/** Marcador con el lado que eres tú (si se sabe). */
export type MarcadorVisto = Marcador & { yo?: 0 | 1 };

const leer = <T,>(s: string | undefined, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Fila de Base44 → marcador. */
export function aMarcador(r: MarcadorRecord): Marcador {
  return {
    jugadores: [{ uid: r.jugador_a, nombre: r.nombre_a ?? '' }, { uid: r.jugador_b, nombre: r.nombre_b ?? '' }],
    victorias: [r.victorias_a ?? 0, r.victorias_b ?? 0],
    duelos: r.duelos ?? 0,
    coop: r.coop ?? 0,
    tiempos: leer(r.tiempos, {}),
    ultimas: leer(r.ultimas, []),
    actualizado: r.ultima ?? 0,
  };
}

const claveDe = (m: Marcador) => m.jugadores.map((j) => j.uid).join('|');

// ------------------------------------------------------------ copia en este dispositivo (de cada cuenta)

interface Copia { cuenta: string; datos: Record<string, MarcadorVisto> }
let copia: Copia = load<Copia>('marcadores', { cuenta: '', datos: {} });
const escuchas = new Set<() => void>();
let lista: MarcadorVisto[] = [];
let listaDe: { copia: Copia; cuenta: string } | null = null;

function cuentaActual() {
  return getAccount().player?.email ?? '';
}

function guardar(next: Copia) {
  copia = next;
  save('marcadores', copia);
  escuchas.forEach((l) => l());
}

function datosDeLaCuenta(): Record<string, MarcadorVisto> {
  return copia.cuenta === cuentaActual() ? copia.datos : {};
}

/** Lo que cuenta la sala (al entrar o al terminar una partida). */
export function recordarMarcador(m: Marcador & { yo?: 0 | 1 }) {
  const cuenta = cuentaActual();
  if (!cuenta) return;
  const datos = datosDeLaCuenta();
  const clave = claveDe(m);
  const prev = datos[clave];
  if (prev && prev.actualizado > m.actualizado) return;
  guardar({ cuenta, datos: { ...datos, [clave]: { ...m, yo: m.yo ?? prev?.yo } } });
}

/** Lee de Base44 los marcadores de tus parejas. */
export async function cargarMarcadores(): Promise<void> {
  const cuenta = cuentaActual();
  const yo = getAccount().player?.id;
  if (!cuenta) return;
  const filas = await api.list();
  const datos = { ...datosDeLaCuenta() };
  for (const f of filas ?? []) {
    const m = aMarcador(f);
    const clave = claveDe(m);
    const prev = datos[clave];
    if (prev && prev.actualizado > m.actualizado) continue;
    const lado = m.jugadores[0].uid === yo ? 0 : m.jugadores[1].uid === yo ? 1 : undefined;
    datos[clave] = { ...m, yo: lado ?? prev?.yo };
  }
  if (cuentaActual() === cuenta) guardar({ cuenta, datos });
}

function instantanea(): MarcadorVisto[] {
  const cuenta = cuentaActual();
  if (listaDe?.copia !== copia || listaDe.cuenta !== cuenta) {
    listaDe = { copia, cuenta };
    lista = Object.values(datosDeLaCuenta()).sort((x, y) => y.actualizado - x.actualizado);
  }
  return lista;
}

/** Marcadores de tus parejas (los más recientes primero); se piden a Base44 al montarse. */
export function useMarcadores(): MarcadorVisto[] {
  const account = useAccount();
  const enCuenta = account.status === 'in';
  useEffect(() => {
    if (enCuenta) void cargarMarcadores().catch(() => undefined);
  }, [enCuenta, account.player?.email]);
  const todos = useSyncExternalStore((l) => { escuchas.add(l); return () => { escuchas.delete(l); }; }, instantanea, instantanea);
  return account.player ? todos : [];
}
