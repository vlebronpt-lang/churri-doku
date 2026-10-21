/**
 * La sala del modo pareja en directo vista desde el juego: lo que cuenta la sala (jugadores, fase,
 * tiempos, marcador), el tablero compartido del cooperativo, el tuyo del duelo y las acciones.
 * Solo hay una sala abierta a la vez.
 */
import { useSyncExternalStore } from 'react';
import { ConexionSala, idAzar, type EstadoConexion, type FalloConexion } from './conexion';
import { aplicar, colocados, diferencias, juntar, tableroVacio, type Cambios, type Tablero } from '../../base44/actors/SalaPareja/tablero.ts';
import {
  LARGO_CODIGO, LETRAS, VERSION,
  type ALaSala, type Asiento, type DeLaSala, type Marcador, type Modo, type Motivo, type VistaJugador, type VistaPartida,
} from '../../base44/actors/SalaPareja/protocolo.ts';
import type { Puzzle } from '../engine/types';
import type { BoardState } from '../state/progress';
import type { BoardSync } from '../game/useGame';
import { load, remove, save } from '../state/storage';
import { getSettings } from '../state/settings';
import { getAccount } from '../cloud/account';
import { recordarMarcador } from './marcador';

export type { Asiento, Modo };
export type PartidaSala = Omit<VistaPartida, 'tablero' | 'seq' | 'ultima'>;
export type ErrorSala = Motivo | FalloConexion;

export interface VistaSala {
  codigo: string;
  conexion: EstadoConexion;
  /** Por qué no se puede estar en la sala (null: todo bien). */
  error: ErrorSala | null;
  /** «Ya estás en esta sala con esta cuenta en otro dispositivo»: qué quieres hacer. */
  pregunta: 'misma-cuenta' | null;
  yo: Asiento | null;
  jugadores: Record<Asiento, VistaJugador | null>;
  partida: PartidaSala | null;
  marcador: (Marcador & { yo: 0 | 1 }) | null;
  /** Momento (en el reloj de este dispositivo) en que empieza o empezó la partida. */
  inicio: number | null;
  /** Aviso breve para enseñar («Lucía ha entrado en la sala»…) y cuándo llegó. */
  aviso: { texto: string; n: number; t: number } | null;
  /** Has salido con «Salir de la sala». */
  fuera: boolean;
}

export const otro = (a: Asiento): Asiento => (a === 'a' ? 'b' : 'a');

function sinTablero(p: VistaPartida): PartidaSala {
  const out: Partial<VistaPartida> = { ...p };
  delete out.tablero;
  delete out.seq;
  delete out.ultima;
  return out as PartidaSala;
}

// ------------------------------------------------------------ código, dispositivo y huella

export function nuevoCodigo(): string {
  const n = new Uint32Array(LARGO_CODIGO);
  crypto.getRandomValues(n);
  return [...n].map((x) => LETRAS[x % LETRAS.length]).join('');
}

/** Lo que alguien escribe como código (con espacios, guiones o en minúsculas) → código limpio. */
export const limpiarCodigo = (s: string) => [...s.toUpperCase()].filter((l) => LETRAS.includes(l)).join('').slice(0, LARGO_CODIGO);

/** Id fijo de este navegador: distingue tus dos dispositivos si juegas con la misma cuenta en los dos. */
function dispositivo(): string {
  let d = load<string>('dispositivo', '');
  if (!d) {
    d = idAzar();
    save('dispositivo', d);
  }
  return d;
}

/** Huella del caso: si los dos tenéis versiones distintas del juego, el plano no sería el mismo. */
export function huella(p: Puzzle): string {
  const s = `${p.id}|${p.size}|${p.murderer}|${p.cast.map((c) => `${c.id}:${p.solution[c.id]}`).join(',')}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// ------------------------------------------------------------ sala abierta en este dispositivo

interface SalaGuardada { codigo: string; t: number }
const VIGENCIA = 12 * 3600_000;

/** Sala en la que estás (para volver a ella desde la portada). */
export function salaAbierta(): string | null {
  const s = load<SalaGuardada | null>('sala', null);
  return s && Date.now() - s.t < VIGENCIA ? s.codigo : null;
}
const olvidarSala = () => remove('sala');

/** Salas que se acaban de crear desde la ventana «Jugar en pareja» (código → caso y modo). */
const porCrear = new Map<string, { caso: string; modo: Modo }>();

export function prepararSala(caso: string, modo: Modo): string {
  const codigo = nuevoCodigo();
  porCrear.set(codigo, { caso, modo });
  return codigo;
}

export const creacionPendiente = (codigo: string) => porCrear.get(codigo) ?? null;

// ------------------------------------------------------------ tableros

type Escucha = (remoto?: (b: BoardState) => BoardState) => void;

/** Ordena las notas de cada casilla como los sospechosos (así los dos las veis igual). */
function ordenar(t: Tablero, orden: string[]): Tablero {
  if (!orden.length) return t;
  const pos = new Map(orden.map((id, i) => [id, i]));
  const notes: Record<number, string[]> = {};
  for (const [k, v] of Object.entries(t.notes)) notes[Number(k)] = [...v].sort((x, y) => (pos.get(x) ?? 99) - (pos.get(y) ?? 99));
  return { ...t, notes };
}

/**
 * Tablero del cooperativo: el último que ha confirmado la sala con tus jugadas aún sin confirmar encima.
 * Lo que cambia tu pareja también se aplica al historial de deshacer (así «Deshacer» solo deshace lo tuyo).
 */
export class TableroCompartido implements BoardSync {
  private confirmado: Tablero = tableroVacio();
  private seq = 0;
  private pendientes: { c: number; cambios: Cambios }[] = [];
  private buffer: Cambios | null = null;
  private mostrado: Tablero = tableroVacio();
  private contador = 0;
  private escuchas = new Set<Escucha>();
  private timer = 0;
  private listo = false;
  private reenviar = false;
  /** Casilla → hasta cuándo se ilumina (lo que acaba de tocar tu pareja). */
  private recientes = new Map<number, number>();
  private timerRecientes = 0;
  destacadas: ReadonlySet<number> = new Set();
  private readonly mandar: (m: ALaSala) => boolean;
  private readonly sesion: string;
  private readonly orden: string[];

  constructor(mandar: (m: ALaSala) => boolean, sesion: string, orden: string[]) {
    this.mandar = mandar;
    this.sesion = sesion;
    this.orden = orden;
  }

  get = () => this.mostrado as BoardState;

  set = (next: BoardState) => {
    const d = diferencias(this.mostrado, next);
    if (!d) return;
    this.buffer = juntar(this.buffer, d);
    this.mostrado = ordenar(next, this.orden);
    this.avisar();
    this.programar();
  };

  subscribe = (l: Escucha) => {
    this.escuchas.add(l);
    return () => { this.escuchas.delete(l); };
  };

  /** Hay jugadas tuyas que la sala aún no ha confirmado. */
  get ocupado() {
    return !!this.buffer || this.pendientes.length > 0;
  }

  private avisar(remoto?: (b: BoardState) => BoardState) {
    this.escuchas.forEach((l) => l(remoto));
  }

  /** Las jugadas se juntan un instante (pintar X arrastrando son muchas seguidas) y se mandan juntas. */
  private programar() {
    if (this.timer) return;
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      this.soltar();
    }, 80);
  }

  private soltar() {
    if (!this.buffer || !this.listo) return;
    const c = ++this.contador;
    if (this.mandar({ type: 'jugada', s: this.sesion, c, cambios: this.buffer })) {
      this.pendientes.push({ c, cambios: this.buffer });
      this.buffer = null;
    } else {
      this.contador--;
    }
  }

  private reconstruir(antes: Tablero) {
    let t = this.confirmado;
    for (const p of this.pendientes) t = aplicar(t, p.cambios).tablero;
    if (this.buffer) t = aplicar(t, this.buffer).tablero;
    t = ordenar(t, this.orden);
    const delta = diferencias(antes, t);
    if (!delta) return;
    this.mostrado = t;
    this.avisar((b) => ordenar(aplicar(b, delta).tablero, this.orden) as BoardState);
  }

  private destacar(c: Cambios) {
    const hasta = Date.now() + 1600;
    for (const k of [...Object.keys(c.p ?? {}), ...Object.keys(c.n ?? {}), ...Object.keys(c.x ?? {}), ...Object.keys(c.o ?? {})]) this.recientes.set(Number(k), hasta);
    this.repasarDestacadas();
  }

  private repasarDestacadas() {
    const ahora = Date.now();
    for (const [k, t] of this.recientes) if (t <= ahora) this.recientes.delete(k);
    this.destacadas = new Set(this.recientes.keys());
    window.clearTimeout(this.timerRecientes);
    if (!this.recientes.size) return;
    this.timerRecientes = window.setTimeout(() => {
      this.repasarDestacadas();
      this.avisar();
    }, Math.max(50, Math.min(...this.recientes.values()) - ahora));
  }

  /** La conexión se ha caído: lo pendiente se vuelve a mandar al volver a entrar. */
  desconectado() {
    this.listo = false;
  }

  /** Estado completo de la sala (al entrar, al volver a entrar o cuando hay un hueco). */
  alEstado(p: VistaPartida) {
    if (!p.tablero || p.seq == null) return;
    const antes = this.mostrado;
    this.confirmado = p.tablero;
    this.seq = p.seq;
    const u = p.ultima;
    this.pendientes = this.pendientes.filter((x) => !(u && u.s === this.sesion && x.c <= u.c));
    this.listo = true;
    if (this.reenviar) {
      this.reenviar = false;
      for (const x of this.pendientes) this.mandar({ type: 'jugada', s: this.sesion, c: x.c, cambios: x.cambios });
    }
    this.reconstruir(antes);
    if (this.buffer) this.programar();
  }

  alAbrir() {
    this.reenviar = true;
  }

  /** Una jugada (tuya o de tu pareja) confirmada por la sala. Devuelve false si falta alguna anterior. */
  alJugada(m: Extract<DeLaSala, { type: 'jugada' }>): boolean {
    if (m.n <= this.seq) return true;
    if (m.n !== this.seq + 1) return false;
    const antes = this.mostrado;
    this.confirmado = aplicar(this.confirmado, m.cambios).tablero;
    this.seq = m.n;
    if (m.s === this.sesion) this.pendientes = this.pendientes.filter((x) => x.c > m.c);
    else this.destacar(m.cambios);
    this.reconstruir(antes);
    return true;
  }
}

/** Tablero propio del duelo: solo en este dispositivo (sobrevive a recargar la página). */
export class TableroDuelo implements BoardSync {
  private t: Tablero;
  private escuchas = new Set<Escucha>();
  private timer = 0;
  private readonly clave: string;
  private readonly alCambiar: (t: Tablero) => void;

  constructor(clave: string, alCambiar: (t: Tablero) => void) {
    this.clave = clave;
    this.alCambiar = alCambiar;
    const g = load<{ k: string; t: Tablero } | null>('duelo', null);
    this.t = g?.k === clave ? g.t : tableroVacio();
  }

  get = () => this.t as BoardState;

  set = (next: BoardState) => {
    if (!diferencias(this.t, next)) return;
    this.t = next;
    this.escuchas.forEach((l) => l());
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      save('duelo', { k: this.clave, t: this.t });
      this.alCambiar(this.t);
    }, 250);
  };

  subscribe = (l: Escucha) => {
    this.escuchas.add(l);
    return () => { this.escuchas.delete(l); };
  };

  get tablero() {
    return this.t;
  }
}

// ------------------------------------------------------------ la sala

const vacia = (codigo: string): VistaSala => ({
  codigo, conexion: 'conectando', error: null, pregunta: null, yo: null,
  jugadores: { a: null, b: null }, partida: null, marcador: null, inicio: null, aviso: null, fuera: false,
});

export class Sala {
  vista: VistaSala;
  private readonly conexion: ConexionSala;
  private readonly escuchas = new Set<() => void>();
  private crear: { caso: string; modo: Modo; huella: string } | null;
  private como: 'segundo' | 'mismo' | null = null;
  private readonly sesion = idAzar().slice(0, 12);
  private compartido: { n: number; t: TableroCompartido } | null = null;
  /** Estado del cooperativo que llegó antes de que la partida pidiera su tablero. */
  private pendienteCoop: VistaPartida | null = null;
  private duelo: { n: number; t: TableroDuelo } | null = null;
  private totalDuelo = 0;
  private avisos = 0;
  private recienAbierta = false;
  /** Partida que has resuelto y la sala aún no ha confirmado (si se cae la conexión, se vuelve a avisar). */
  private resueltaSinConfirmar: number | null = null;

  constructor(codigo: string, crear: { caso: string; modo: Modo; huella: string } | null) {
    this.vista = vacia(codigo);
    this.crear = crear;
    this.conexion = new ConexionSala({
      sala: codigo,
      alAbrir: () => {
        this.compartido?.t.alAbrir();
        this.recienAbierta = true;
        this.entrar();
      },
      alMensaje: (m) => this.alMensaje(m),
      alCambiar: (e) => {
        if (e !== 'abierta') this.compartido?.t.desconectado();
        this.cambiar({ conexion: e });
      },
      alFallar: (f) => this.cambiar({ error: f }),
    });
  }

  private cambiar(patch: Partial<VistaSala>) {
    this.vista = { ...this.vista, ...patch };
    this.escuchas.forEach((l) => l());
  }

  subscribe = (l: () => void) => {
    this.escuchas.add(l);
    return () => { this.escuchas.delete(l); };
  };

  private mandar = (m: ALaSala) => this.conexion.enviar(m);

  private entrar() {
    const cuenta = getAccount();
    const nombre = (getSettings().playerName.trim() || cuenta.player?.name || 'Detective').slice(0, 24);
    this.mandar({
      type: 'entrar', v: VERSION, quiero: this.crear ? 'crear' : 'unirme', disp: dispositivo(), nombre,
      ...(this.crear ?? {}),
      ...(this.como ? { como: this.como } : {}),
    });
  }

  private decir(texto: string) {
    this.cambiar({ aviso: { texto, n: ++this.avisos, t: Date.now() } });
  }

  private alMensaje(m: DeLaSala) {
    switch (m.type) {
      case 'estado': return this.alEstado(m);
      case 'jugada':
        if (this.compartido && this.vista.partida && this.compartido.n === this.vista.partida.n && !this.compartido.t.alJugada(m)) this.entrar();
        return;
      case 'progreso': {
        const p = this.vista.partida;
        if (p) this.cambiar({ partida: { ...p, progreso: { ...p.progreso, [m.de]: { colocados: m.colocados, total: m.total } } } });
        return;
      }
      case 'marcador':
        recordarMarcador(m.marcador);
        return this.cambiar({ marcador: m.marcador });
      case 'pregunta':
        return this.cambiar({ pregunta: m.que });
      case 'error':
        if (m.motivo !== 'otro-dispositivo' && m.motivo !== 'version') olvidarSala();
        return this.cambiar({ error: m.motivo });
    }
  }

  private alEstado(m: Extract<DeLaSala, { type: 'estado' }>) {
    const antes = this.vista;
    const partida = sinTablero(m.partida);
    this.crear = null;
    porCrear.delete(m.codigo);
    save('sala', { codigo: m.codigo, t: Date.now() } satisfies SalaGuardada);
    // El tablero compartido es de cada partida (uno nuevo con cada «Otra partida»).
    if (this.compartido && (partida.modo !== 'coop' || this.compartido.n !== partida.n)) this.compartido = null;
    if (partida.modo === 'coop') {
      if (this.compartido) this.compartido.t.alEstado(m.partida);
      else this.pendienteCoop = m.partida;
    }
    // Reloj: se ajusta si se ha movido más de un segundo y medio (la red no es instantánea).
    let inicio = antes.inicio;
    if (partida.empiezaEn == null) inicio = null;
    else {
      const nuevo = Date.now() + partida.empiezaEn;
      if (inicio == null || antes.partida?.n !== partida.n || Math.abs(nuevo - inicio) > 1500) inicio = nuevo;
    }
    if (m.marcador) recordarMarcador(m.marcador);
    this.cambiar({ yo: m.yo, jugadores: m.jugadores, partida, marcador: m.marcador ?? antes.marcador, inicio, pregunta: null, error: null });
    this.avisarCambios(antes, m);
    const confirmada = partida.modo === 'coop' ? partida.fase === 'fin' : partida.tiempos[m.yo] != null;
    if (this.resueltaSinConfirmar !== partida.n || confirmada) this.resueltaSinConfirmar = null;
    if (this.recienAbierta) {
      this.recienAbierta = false;
      this.contarProgreso();
      if (this.resueltaSinConfirmar != null) this.mandar({ type: 'resuelto' });
    }
  }

  /** Avisos de lo que hace tu pareja. */
  private avisarCambios(antes: VistaSala, m: Extract<DeLaSala, { type: 'estado' }>) {
    if (!antes.yo) return;
    const pareja = otro(m.yo);
    const a = antes.jugadores[pareja], b = m.jugadores[pareja];
    if (b && !a) this.decir(`${b.nombre} ha entrado en la sala.`);
    else if (b && a && b.salio && !a.salio) this.decir(`${b.nombre} ha salido de la sala.`);
    else if (b && a && !b.salio && a.salio) this.decir(`${b.nombre} ha vuelto a la sala.`);
    else if (!b && a) this.decir(`${a.nombre} ha salido de la sala.`);
    const pa = antes.partida, pb = m.partida;
    if (pa && pb.n !== pa.n && b && pb.por === pareja) this.decir(`${b.nombre} ha preparado otra partida.`);
    if (pa && pb.n === pa.n && pb.rendido === pareja && pa.rendido !== pareja && b && !b.salio) this.decir(`${b.nombre} se ha rendido.`);
  }

  // ---------------------------------------------------------- tableros de la partida

  /** Tablero de la partida en curso para el juego (el compartido o el tuyo del duelo). */
  tablero(p: Puzzle): BoardSync | null {
    const partida = this.vista.partida;
    if (!partida) return null;
    if (partida.modo === 'coop') {
      if (this.compartido?.n !== partida.n) {
        this.compartido = { n: partida.n, t: new TableroCompartido(this.mandar, this.sesion, p.cast.map((c) => c.id)) };
        if (this.pendienteCoop?.n === partida.n) this.compartido.t.alEstado(this.pendienteCoop);
        this.pendienteCoop = null;
      }
      return this.compartido.t;
    }
    if (this.duelo?.n !== partida.n) {
      this.totalDuelo = p.cast.length;
      this.duelo = { n: partida.n, t: new TableroDuelo(`${this.vista.codigo}:${partida.n}`, (t) => this.mandar({ type: 'progreso', colocados: colocados(t), total: this.totalDuelo })) };
    }
    return this.duelo.t;
  }

  /** Tu progreso en el duelo (al empezar y al volver a entrar, para que tu pareja lo vea). */
  contarProgreso() {
    const t = this.duelo?.t.tablero;
    if (t && this.vista.partida?.modo === 'duelo') this.mandar({ type: 'progreso', colocados: colocados(t), total: this.totalDuelo });
  }

  // ---------------------------------------------------------- acciones

  empezar() { this.mandar({ type: 'empezar' }); }
  resuelto() {
    this.resueltaSinConfirmar = this.vista.partida?.n ?? null;
    this.mandar({ type: 'resuelto' });
  }
  rendirse() { this.mandar({ type: 'rendirse' }); }
  nueva(caso: string, modo: Modo, h: string) { this.mandar({ type: 'nueva', caso, modo, huella: h }); }

  responder(como: 'segundo' | 'mismo') {
    this.como = como;
    this.cambiar({ pregunta: null });
    this.entrar();
  }

  salir() {
    this.mandar({ type: 'salir' });
    olvidarSala();
    if (this.duelo) remove('duelo');
    this.conexion.cerrar();
    this.cambiar({ fuera: true });
  }

  cerrar() {
    this.conexion.cerrar();
  }
}

let actual: Sala | null = null;
let cierre = 0;
const escuchas = new Set<() => void>();
const avisarCambioDeSala = () => escuchas.forEach((l) => l());

/** Abre (o devuelve, si ya está abierta) la sala de un código. */
export function abrirSala(codigo: string, crear: { caso: string; modo: Modo; huella: string } | null = null): Sala {
  window.clearTimeout(cierre);
  if (actual && actual.vista.codigo === codigo && !actual.vista.error && !actual.vista.fuera) return actual;
  actual?.cerrar();
  actual = new Sala(codigo, crear);
  avisarCambioDeSala();
  return actual;
}

/**
 * Deja la sala sin salir de ella (al ir a otra pantalla): tu pareja te verá desconectado.
 * Espera un instante por si la pantalla vuelve a montarse enseguida (React lo hace en desarrollo).
 */
export function dejarSala(codigo: string) {
  if (actual?.vista.codigo !== codigo) return;
  window.clearTimeout(cierre);
  cierre = window.setTimeout(() => {
    if (actual?.vista.codigo !== codigo) return;
    actual.cerrar();
    actual = null;
    avisarCambioDeSala();
  }, 400);
}

export const salaActual = () => actual;

const sinSala = () => () => {};
const nada = () => null;

/** Vista de la sala abierta (se actualiza sola). */
export function useSala(): VistaSala | null {
  const sala = useSyncExternalStore((l) => { escuchas.add(l); return () => { escuchas.delete(l); }; }, () => actual, () => actual);
  return useSyncExternalStore(sala ? sala.subscribe : sinSala, sala ? () => sala.vista : nada, sala ? () => sala.vista : nada);
}
