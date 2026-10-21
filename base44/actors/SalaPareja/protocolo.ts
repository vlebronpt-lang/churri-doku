/**
 * Mensajes entre el juego y la sala del modo pareja en directo (actor «SalaPareja» de Base44).
 * Este archivo lo usan los dos lados: si cambia algo incompatible, sube VERSION.
 */
import type { Cambios, Tablero } from './tablero.ts';

export const VERSION = 1;

export type Asiento = 'a' | 'b';
/** coop: los dos resuelven el mismo tablero · duelo: el mismo caso, cada uno el suyo. */
export type Modo = 'coop' | 'duelo';
/** espera: falta alguien o darle a «Empezar» · cuenta: 3, 2, 1… · jugando · fin: resuelto o decidido. */
export type Fase = 'espera' | 'cuenta' | 'jugando' | 'fin';

/** Letras del código de sala (sin vocales, para que no salgan palabras, ni letras que se confundan). */
export const LETRAS = 'BCDFGHJKMNPRSTVWXZ';
export const LARGO_CODIGO = 5;
export const esCodigo = (c: string) => c.length === LARGO_CODIGO && [...c].every((l) => LETRAS.includes(l));
export const esCaso = (c: unknown): c is string => typeof c === 'string' && /^[a-z0-9-]{1,40}$/.test(c);

/** Motivos por los que la sala no te deja entrar (o te saca). */
export type Motivo = 'no-existe' | 'llena' | 'sin-cuenta' | 'ocupada' | 'version' | 'otro-dispositivo' | 'datos';

// ------------------------------------------------------------ del juego a la sala

export type ALaSala =
  | {
      type: 'entrar';
      v: number;
      /** crear: la sala es nueva (la crea quien inventa el código) · unirme: entrar o volver a entrar. */
      quiero: 'crear' | 'unirme';
      /** Dispositivo (fijo en cada navegador): distingue tus dos dispositivos si los usas a la vez. */
      disp: string;
      nombre: string;
      caso?: string;
      modo?: Modo;
      /** Huella del caso: si los dos no tenéis la misma versión del caso, se avisa. */
      huella?: string;
      /** Respuesta a «ya estás en esta sala con esta cuenta». */
      como?: 'segundo' | 'mismo';
    }
  | { type: 'empezar' }
  | { type: 'jugada'; s: string; c: number; cambios: Cambios }
  | { type: 'progreso'; colocados: number; total: number }
  | { type: 'resuelto' }
  | { type: 'rendirse' }
  | { type: 'nueva'; caso: string; modo: Modo; huella: string }
  | { type: 'nombre'; nombre: string }
  | { type: 'sigo' }
  | { type: 'salir' };

// ------------------------------------------------------------ de la sala al juego

export interface VistaJugador {
  nombre: string;
  /** Tiene la sala abierta ahora mismo. */
  conectado: boolean;
  /** Sin noticias suyas desde hace un rato (móvil sin cobertura, app en segundo plano…). */
  sinSenal: boolean;
  /** Ha salido de la sala con «Salir». */
  salio: boolean;
}

export interface Progreso { colocados: number; total: number }

export interface VistaPartida {
  /** Número de partida dentro de la sala (cambia con «Otra partida»). */
  n: number;
  caso: string;
  modo: Modo;
  fase: Fase;
  huella: string;
  /** Quién la preparó (al crear la sala o con «Otra partida»). */
  por?: Asiento;
  /** Milisegundos hasta que empieza (negativo: los que lleva en marcha). */
  empiezaEn: number | null;
  /** Cooperativo: lo que tardasteis (ms) y quién acusó al culpable. */
  tiempo?: number;
  resolvio?: Asiento;
  /** Duelo: lo que tardó cada uno (ms), quién ganó y quién se rindió. */
  tiempos: Partial<Record<Asiento, number>>;
  ganador: Asiento | null;
  rendido?: Asiento;
  progreso: Partial<Record<Asiento, Progreso>>;
  /** Cooperativo: tablero de los dos, número de la última jugada y la última tuya que ya está aplicada. */
  tablero?: Tablero;
  seq?: number;
  ultima?: { s: string; c: number } | null;
}

/** Una partida del historial de la pareja (lados 0 y 1: los del marcador). */
export interface PartidaPareja {
  id: string;
  caso: string;
  modo: Modo;
  /** Cuándo terminó (ms). */
  t: number;
  /** Duelo: lado ganador y segundos de cada lado (null si no lo terminó). */
  g?: 0 | 1;
  s?: [number | null, number | null];
  /** Se rindió el que perdió. */
  r?: boolean;
  /** Cooperativo: segundos juntos. */
  j?: number;
}

/** Marcador de una pareja. */
export interface Marcador {
  jugadores: [{ uid: string; nombre: string }, { uid: string; nombre: string }];
  victorias: [number, number];
  duelos: number;
  coop: number;
  /** Caso → mejores tiempos en segundos: [lado 0 en duelo, lado 1 en duelo, juntos]. */
  tiempos: Record<string, [number | null, number | null, number | null]>;
  ultimas: PartidaPareja[];
  actualizado: number;
}

export type DeLaSala =
  | {
      type: 'estado';
      codigo: string;
      yo: Asiento;
      jugadores: Record<Asiento, VistaJugador | null>;
      partida: VistaPartida;
      /** Con el lado que eres tú en el marcador. */
      marcador: (Marcador & { yo: 0 | 1 }) | null;
    }
  | { type: 'jugada'; n: number; de: Asiento; s: string; c: number; cambios: Cambios }
  | { type: 'progreso'; de: Asiento; colocados: number; total: number }
  | { type: 'marcador'; marcador: Marcador & { yo: 0 | 1 } }
  | { type: 'pregunta'; que: 'misma-cuenta' }
  | { type: 'error'; motivo: Motivo };

/** Códigos con los que la sala cierra la conexión (además de mandar antes el motivo). */
export const CIERRE: Record<Motivo, number> = {
  datos: 4000,
  'sin-cuenta': 4001,
  llena: 4003,
  'no-existe': 4004,
  version: 4005,
  ocupada: 4006,
  'otro-dispositivo': 4009,
};
