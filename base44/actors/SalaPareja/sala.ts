/**
 * Lógica de una sala del modo pareja en directo: quién se sienta (dos asientos como mucho), en qué fase
 * está la partida, el tablero compartido del cooperativo, el progreso y los tiempos del duelo, quién está
 * conectado y el marcador de la pareja. No depende del runtime de Base44 (entry.ts la conecta con él),
 * así las pruebas la pueden ejecutar tal cual.
 */
import { aplicar, tableroVacio, validarCambios, type Tablero } from './tablero.ts';
import {
  CIERRE, VERSION, esCaso, esCodigo,
  type Asiento, type DeLaSala, type Fase, type Marcador, type Modo, type Motivo, type PartidaPareja, type VistaJugador, type VistaPartida,
} from './protocolo.ts';

// ------------------------------------------------------------ lo que da el entorno

export type Identidad = { type: 'authenticated'; userId: string } | { type: 'anonymous'; anonymousId: string };

export interface Conexion {
  id: string;
  identity?: Identidad;
  send(data: unknown): void;
  reject(code: number, reason: string): void;
}

export interface Almacen {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteAll(): Promise<void>;
}

/** Fila de la entidad MarcadorPareja (los campos JSON van como texto). */
export interface FilaMarcador {
  id?: string;
  clave: string;
  jugador_a: string;
  jugador_b: string;
  nombre_a: string;
  nombre_b: string;
  victorias_a: number;
  victorias_b: number;
  duelos: number;
  coop: number;
  tiempos: string;
  ultimas: string;
  aplicados: string;
  ultima: number;
}

export interface Marcadores {
  leer(clave: string): Promise<FilaMarcador | null>;
  /** Crea la fila (sin id) o la actualiza (con id). */
  guardar(fila: FilaMarcador): Promise<void>;
}

export interface Entorno {
  /** Código de la sala (el id de la instancia del actor). */
  codigo: string;
  almacen: Almacen;
  conexiones(): Conexion[];
  programar(clave: string, en: number): Promise<void>;
  cancelar(clave: string): Promise<void>;
  marcadores: Marcadores;
  ahora(): number;
  /** Solo en la sala de pruebas: deja entrar sin cuenta. */
  sinCuenta?: boolean;
  aviso?(texto: string): void;
}

// ------------------------------------------------------------ estado guardado

interface Plaza {
  uid: string;
  disp: string;
  nombre: string;
  salio?: boolean;
}

interface Partida {
  n: number;
  caso: string;
  modo: Modo;
  huella: string;
  fase: Fase;
  /** Quién la preparó. */
  por?: Asiento;
  /** Momento de inicio (reloj de la sala). */
  empieza?: number;
  /** Ya se jugó algo en esta sala (el segundo asiento deja de quedar libre al salir). */
  empezada?: boolean;
  tiempo?: number;
  resolvio?: Asiento;
  tiempos: Partial<Record<Asiento, number>>;
  ganador: Asiento | null;
  rendido?: Asiento;
  progreso: Partial<Record<Asiento, { colocados: number; total: number }>>;
}

interface EstadoSala {
  v: 1;
  codigo: string;
  creada: number;
  a: Plaza;
  b: Plaza | null;
  /** Conexión → asiento (sobrevive a que la sala se duerma). */
  conexiones: Record<string, Asiento>;
  partida: Partida;
  /** Último marcador conocido de la pareja. */
  marcador: Marcador | null;
  /** Resultados por apuntar en el marcador (si Base44 falla, se reintenta). */
  pendientes: Resultado[];
  intentos?: number;
}

interface EstadoTablero {
  tablero: Tablero;
  seq: number;
  ultimas: Partial<Record<Asiento, { s: string; c: number }>>;
}

/** Algo que apuntar en el marcador. */
export interface Resultado {
  /** Partida y qué se apunta de ella («KZPTR.lw3x:2:gana»): el mismo id no se cuenta dos veces. */
  id: string;
  caso: string;
  modo: Modo;
  t: number;
  /** Ids y nombres por lado del marcador, y el lado de cada asiento. */
  uids: [string, string];
  nombres: [string, string];
  lados: Record<Asiento, 0 | 1>;
  /** Cooperativo: segundos juntos. */
  juntos?: number;
  /** Duelo: quién ganó (asiento), si fue porque el otro se rindió, y el tiempo de alguien. */
  ganador?: Asiento;
  rendido?: boolean;
  tiempoDe?: { asiento: Asiento; s: number };
}

// ------------------------------------------------------------ constantes

const CUENTA_ATRAS = 3000;
/** Cada cuánto se mira si alguien se ha quedado sin señal, y a partir de cuándo se considera. */
const PULSO = 10_000;
const SIN_SENAL = 22_000;
/** Una sala vacía se borra sola pasado este tiempo. */
const LIMPIEZA = 12 * 3600_000;
const REINTENTO = 30_000;
const MAX_INTENTOS = 30;
const ULTIMAS = 12;
const APLICADOS = 40;

const otro = (a: Asiento): Asiento => (a === 'a' ? 'b' : 'a');
/** Texto que llega de fuera: sin caracteres de control y con un largo máximo. */
const texto = (v: unknown, max: number) => (typeof v === 'string' ? [...v].filter((l) => l.charCodeAt(0) >= 32).join('').trim().slice(0, max) : '');
const entero = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : null);
const leerJSON = <T>(s: string | undefined, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Fila de la entidad → marcador para el juego. */
export function filaAMarcador(f: FilaMarcador): Marcador {
  return {
    jugadores: [{ uid: f.jugador_a, nombre: f.nombre_a }, { uid: f.jugador_b, nombre: f.nombre_b }],
    victorias: [f.victorias_a ?? 0, f.victorias_b ?? 0],
    duelos: f.duelos ?? 0,
    coop: f.coop ?? 0,
    tiempos: leerJSON(f.tiempos, {}),
    ultimas: leerJSON(f.ultimas, []),
    actualizado: f.ultima ?? 0,
  };
}

/** Apunta un resultado en la fila de la pareja (null si ya estaba apuntado: cada resultado tiene su id). */
export function apuntar(fila: FilaMarcador | null, r: Resultado): FilaMarcador | null {
  const [u0, u1] = r.uids;
  const lados = r.lados;
  const f: FilaMarcador = fila ? { ...fila } : {
    clave: `${u0}|${u1}`, jugador_a: u0, jugador_b: u1, nombre_a: '', nombre_b: '',
    victorias_a: 0, victorias_b: 0, duelos: 0, coop: 0, tiempos: '{}', ultimas: '[]', aplicados: '[]', ultima: 0,
  };
  const aplicados = leerJSON<string[]>(f.aplicados, []);
  if (aplicados.includes(r.id)) return null;
  const tiempos = leerJSON<Marcador['tiempos']>(f.tiempos, {});
  const ultimas = leerJSON<PartidaPareja[]>(f.ultimas, []);
  const mejor = (lado: 0 | 1 | 2, s: number) => {
    const t = (tiempos[r.caso] ??= [null, null, null]);
    if (t[lado] == null || s < t[lado]!) t[lado] = s;
  };
  const partida = r.id.replace(/:[^:]*$/, '');
  let entrada = ultimas.find((u) => u.id === partida);
  if (!entrada) {
    entrada = { id: partida, caso: r.caso, modo: r.modo, t: r.t };
    ultimas.unshift(entrada);
  }
  if (r.modo === 'coop' && r.juntos != null) {
    f.coop++;
    mejor(2, r.juntos);
    entrada.j = r.juntos;
  }
  if (r.modo === 'duelo') {
    if (r.ganador) {
      f.duelos++;
      if (lados[r.ganador] === 0) f.victorias_a++;
      else f.victorias_b++;
      entrada.g = lados[r.ganador];
      if (r.rendido) entrada.r = true;
    }
    if (r.tiempoDe) {
      const lado = lados[r.tiempoDe.asiento];
      mejor(lado, r.tiempoDe.s);
      const s = entrada.s ?? [null, null];
      s[lado] = r.tiempoDe.s;
      entrada.s = s;
    }
  }
  f.nombre_a = r.nombres[0] || f.nombre_a;
  f.nombre_b = r.nombres[1] || f.nombre_b;
  f.tiempos = JSON.stringify(tiempos);
  f.ultimas = JSON.stringify(ultimas.slice(0, ULTIMAS));
  f.aplicados = JSON.stringify([r.id, ...aplicados].slice(0, APLICADOS));
  f.ultima = Math.max(f.ultima ?? 0, r.t);
  return f;
}

// ------------------------------------------------------------ la sala

export class SalaLogica {
  private readonly e: Entorno;
  private s: EstadoSala | null = null;
  private t: EstadoTablero | null = null;
  private visto: Record<Asiento, number> = { a: 0, b: 0 };
  private sinSenal: Record<Asiento, boolean> = { a: false, b: false };
  private pulso = false;
  private cola: Promise<unknown> = Promise.resolve();

  private constructor(e: Entorno) {
    this.e = e;
  }

  /** Carga la sala guardada (al crearse o al despertar). */
  static async cargar(e: Entorno): Promise<SalaLogica> {
    const sala = new SalaLogica(e);
    sala.s = (await e.almacen.get<EstadoSala>('sala')) ?? null;
    sala.t = (await e.almacen.get<EstadoTablero>('tablero')) ?? null;
    if (sala.s) {
      // Si la sala se durmió del todo, las conexiones que tenía ya no están.
      const vivas = new Set(e.conexiones().map((c) => c.id));
      const antes = Object.keys(sala.s.conexiones).length;
      for (const id of Object.keys(sala.s.conexiones)) if (!vivas.has(id)) delete sala.s.conexiones[id];
      if (Object.keys(sala.s.conexiones).length !== antes) await sala.guardar();
      const ahora = e.ahora();
      sala.visto = { a: ahora, b: ahora };
      if (sala.s.pendientes.length) await e.programar('marcador', ahora + 2000);
    }
    if (e.conexiones().length) await sala.armarPulso();
    return sala;
  }

  // ---------------------------------------------------------- utilidades

  private ahora() {
    return this.e.ahora();
  }

  private async guardar() {
    if (this.s) await this.e.almacen.put('sala', this.s);
  }

  private uid(conn: Conexion): string | null {
    const id = conn.identity;
    if (id?.type === 'authenticated' && id.userId) return id.userId;
    if (this.e.sinCuenta && id?.type === 'anonymous' && id.anonymousId) return `anon:${id.anonymousId}`;
    return null;
  }

  /**
   * Avisa del motivo y cierra la conexión. Base44 solo entrega el cierre a quien ya ha mandado algún
   * mensaje (cerrar al conectarse no llega), por eso todo se decide al recibir su «entrar».
   */
  private fuera(conn: Conexion, motivo: Motivo) {
    try {
      conn.send({ type: 'error', motivo } satisfies DeLaSala);
      conn.reject(CIERRE[motivo], motivo);
    } catch {
      /* ya cerrada */
    }
  }

  private fase(p: Partida): Fase {
    if (p.fase === 'cuenta' && p.empieza != null && this.ahora() >= p.empieza) return 'jugando';
    return p.fase;
  }

  private plaza(a: Asiento): Plaza | null {
    return this.s ? (a === 'a' ? this.s.a : this.s.b) : null;
  }

  private conectado(a: Asiento) {
    const s = this.s;
    return !!s && this.e.conexiones().some((c) => s.conexiones[c.id] === a);
  }

  /** Lado de cada asiento en el marcador (por orden de id; con la misma cuenta, por asiento). */
  private lados(): Record<Asiento, 0 | 1> {
    const s = this.s!;
    if (!s.b || s.a.uid <= s.b.uid) return { a: 0, b: 1 };
    return { a: 1, b: 0 };
  }

  private clave() {
    const s = this.s!;
    return s.b ? [s.a.uid, s.b.uid].sort().join('|') : '';
  }

  private nuevaPartida(n: number, caso: string, modo: Modo, huella: string, por: Asiento, empezada: boolean): Partida {
    return { n, caso, modo, huella, por, fase: 'espera', tiempos: {}, ganador: null, progreso: {}, ...(empezada ? { empezada } : {}) };
  }

  private vistaJugador(a: Asiento): VistaJugador | null {
    const pl = this.plaza(a);
    if (!pl) return null;
    const conectado = this.conectado(a);
    return { nombre: pl.nombre, conectado, sinSenal: conectado && this.sinSenal[a], salio: !!pl.salio };
  }

  private vista(a: Asiento): DeLaSala {
    const s = this.s!;
    const p = s.partida;
    const partida: VistaPartida = {
      n: p.n,
      caso: p.caso,
      modo: p.modo,
      fase: this.fase(p),
      huella: p.huella,
      ...(p.por ? { por: p.por } : {}),
      empiezaEn: p.empieza != null ? p.empieza - this.ahora() : null,
      ...(p.tiempo != null ? { tiempo: p.tiempo } : {}),
      ...(p.resolvio ? { resolvio: p.resolvio } : {}),
      tiempos: p.tiempos,
      ganador: p.ganador,
      ...(p.rendido ? { rendido: p.rendido } : {}),
      progreso: p.progreso,
      ...(p.modo === 'coop' && this.t ? { tablero: this.t.tablero, seq: this.t.seq, ultima: this.t.ultimas[a] ?? null } : {}),
    };
    return {
      type: 'estado',
      codigo: s.codigo,
      yo: a,
      jugadores: { a: this.vistaJugador('a'), b: this.vistaJugador('b') },
      partida,
      marcador: s.marcador && s.b ? { ...s.marcador, yo: this.lados()[a] } : null,
    };
  }

  /** Manda algo solo a quienes están dentro de la sala (nunca a una conexión que aún no ha entrado). */
  private aMiembros(msg: (a: Asiento) => DeLaSala) {
    const s = this.s;
    if (!s) return;
    for (const c of this.e.conexiones()) {
      const a = s.conexiones[c.id];
      if (a) {
        try {
          c.send(msg(a));
        } catch {
          /* conexión que se está cerrando */
        }
      }
    }
  }

  private avisarEstado() {
    this.aMiembros((a) => this.vista(a));
  }

  private async armarPulso() {
    if (this.pulso) return;
    this.pulso = true;
    await this.e.programar('pulso', this.ahora() + PULSO);
  }

  private latido(a: Asiento) {
    this.visto[a] = this.ahora();
    if (this.sinSenal[a]) {
      this.sinSenal[a] = false;
      this.avisarEstado();
    }
  }

  // ---------------------------------------------------------- ciclo de vida

  async conectar() {
    // Quién es y si puede entrar se decide con su «entrar».
    if (this.s) await this.e.cancelar('limpieza');
  }

  async mensaje(conn: Conexion, raw: unknown) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const msg = raw as Record<string, unknown>;
    const uid = this.uid(conn);
    if (msg.type === 'entrar') {
      if (!uid) return this.fuera(conn, 'sin-cuenta');
      if (!esCodigo(this.e.codigo)) return this.fuera(conn, 'no-existe');
      // Sala completa y no eres de ella.
      const s = this.s;
      if (s?.b && s.a.uid !== uid && s.b.uid !== uid) return this.fuera(conn, 'llena');
      return this.entrar(conn, uid, msg);
    }
    if (!uid) return;
    const s = this.s;
    const a = s?.conexiones[conn.id];
    if (!s || !a) return;
    this.latido(a);
    switch (msg.type) {
      case 'sigo': return;
      case 'jugada': return this.jugada(a, msg);
      case 'progreso': return this.progreso(a, msg);
      case 'empezar': return this.empezar();
      case 'resuelto': return this.resuelto(a);
      case 'rendirse': return this.rendirse(a);
      case 'nueva': return this.nueva(a, msg);
      case 'nombre': return this.nombre(a, msg);
      case 'salir': return this.salir(conn, a);
    }
  }

  async cerrar(conn: Conexion) {
    const s = this.s;
    if (!s) return;
    if (s.conexiones[conn.id]) {
      delete s.conexiones[conn.id];
      await this.guardar();
      this.avisarEstado();
    }
    if (!this.e.conexiones().some((c) => c.id !== conn.id)) await this.e.programar('limpieza', this.ahora() + LIMPIEZA);
  }

  async despertar(clave: string) {
    if (clave === 'pulso') {
      this.pulso = false;
      const s = this.s;
      if (s) {
        let cambio = false;
        for (const a of ['a', 'b'] as const) {
          if (this.conectado(a) && !this.sinSenal[a] && this.ahora() - this.visto[a] > SIN_SENAL) {
            this.sinSenal[a] = true;
            cambio = true;
          }
        }
        if (cambio) this.avisarEstado();
      }
      if (this.e.conexiones().length) await this.armarPulso();
    } else if (clave === 'limpieza') {
      if (!this.e.conexiones().length) await this.borrar();
    } else if (clave === 'marcador') {
      await this.apuntarPendientes();
    }
  }

  // ---------------------------------------------------------- entrar

  private async entrar(conn: Conexion, uid: string, msg: Record<string, unknown>) {
    if (msg.v !== VERSION) return this.fuera(conn, 'version');
    const disp = texto(msg.disp, 64) || conn.id;
    const nombre = texto(msg.nombre, 24) || 'Detective';
    const ahora = this.ahora();
    if (!this.s) {
      if (msg.quiero !== 'crear') return this.fuera(conn, 'no-existe');
      const modo = msg.modo === 'coop' || msg.modo === 'duelo' ? msg.modo : null;
      const huella = texto(msg.huella, 40);
      if (!esCaso(msg.caso) || !modo || !huella) return this.fuera(conn, 'datos');
      this.s = {
        v: 1, codigo: this.e.codigo, creada: ahora,
        a: { uid, disp, nombre }, b: null,
        conexiones: { [conn.id]: 'a' },
        partida: this.nuevaPartida(1, msg.caso, modo, huella, 'a', false),
        marcador: null, pendientes: [],
      };
      this.t = modo === 'coop' ? { tablero: tableroVacio(), seq: 0, ultimas: {} } : null;
      if (this.t) await this.e.almacen.put('tablero', this.t);
      await this.guardar();
      this.visto.a = ahora;
      this.sinSenal.a = false;
      await this.armarPulso();
      this.avisarEstado();
      return;
    }
    const s = this.s;
    // Alguien ha creado otra sala con el mismo código: que pruebe con otro.
    if (msg.quiero === 'crear' && s.a.uid !== uid) return this.fuera(conn, 'ocupada');
    const asientos: Asiento[] = s.b ? ['a', 'b'] : ['a'];
    let a = asientos.find((x) => this.plaza(x)!.uid === uid && this.plaza(x)!.disp === disp);
    if (!a) {
      const mismos = asientos.filter((x) => this.plaza(x)!.uid === uid);
      if (!s.b && mismos.length && msg.como !== 'segundo' && msg.como !== 'mismo') {
        conn.send({ type: 'pregunta', que: 'misma-cuenta' } satisfies DeLaSala);
        return;
      }
      if (!s.b && (!mismos.length || msg.como === 'segundo')) {
        a = 'b';
        s.b = { uid, disp, nombre };
      } else if (mismos.length) {
        a = mismos.find((x) => !this.conectado(x)) ?? mismos[0];
      } else {
        return this.fuera(conn, 'llena');
      }
    }
    // El mismo asiento abierto en otro dispositivo o pestaña: se queda el nuevo.
    for (const c of this.e.conexiones()) {
      if (c.id !== conn.id && s.conexiones[c.id] === a) {
        delete s.conexiones[c.id];
        this.fuera(c, 'otro-dispositivo');
      }
    }
    const pl = this.plaza(a)!;
    pl.disp = disp;
    pl.nombre = nombre;
    delete pl.salio;
    s.conexiones[conn.id] = a;
    this.visto[a] = ahora;
    this.sinSenal[a] = false;
    await this.guardar();
    await this.armarPulso();
    this.avisarEstado();
    if (s.b && !s.marcador) void this.cargarMarcador();
  }

  // ---------------------------------------------------------- partida

  private async empezar() {
    const s = this.s!;
    const p = s.partida;
    if (p.fase !== 'espera' || !s.b || !this.conectado('a') || !this.conectado('b')) return;
    p.fase = 'cuenta';
    p.empieza = this.ahora() + CUENTA_ATRAS;
    p.empezada = true;
    await this.guardar();
    this.avisarEstado();
  }

  private async jugada(a: Asiento, msg: Record<string, unknown>) {
    const p = this.s!.partida;
    if (p.modo !== 'coop' || this.fase(p) !== 'jugando' || !this.t) return;
    const cambios = validarCambios(msg.cambios);
    const sesion = texto(msg.s, 40);
    const c = entero(msg.c, 1e9);
    if (!cambios || !sesion || c === null) return;
    const ultima = this.t.ultimas[a];
    if (ultima && ultima.s === sesion && c <= ultima.c) return;
    const { tablero, efectivos } = aplicar(this.t.tablero, cambios);
    this.t = { tablero, seq: this.t.seq + 1, ultimas: { ...this.t.ultimas, [a]: { s: sesion, c } } };
    await this.e.almacen.put('tablero', this.t);
    const n = this.t.seq;
    this.aMiembros(() => ({ type: 'jugada', n, de: a, s: sesion, c, cambios: efectivos }));
  }

  private async progreso(a: Asiento, msg: Record<string, unknown>) {
    const p = this.s!.partida;
    const colocados = entero(msg.colocados, 400), total = entero(msg.total, 400);
    if (p.modo !== 'duelo' || colocados === null || total === null) return;
    p.progreso[a] = { colocados, total };
    await this.guardar();
    this.aMiembros(() => ({ type: 'progreso', de: a, colocados, total }));
  }

  private async resuelto(a: Asiento) {
    const s = this.s!;
    const p = s.partida;
    const fase = this.fase(p);
    const ahora = this.ahora();
    if (p.empieza == null) return;
    const ms = Math.max(0, ahora - p.empieza);
    if (p.modo === 'coop') {
      if (fase !== 'jugando') return;
      p.fase = 'fin';
      p.tiempo = ms;
      p.resolvio = a;
      this.resultado({ id: `${this.idSala()}:${p.n}:coop`, juntos: Math.floor(ms / 1000) });
    } else {
      if ((fase !== 'jugando' && fase !== 'fin') || p.tiempos[a] != null || p.rendido === a) return;
      p.tiempos[a] = ms;
      const seg = Math.floor(ms / 1000);
      if (!p.ganador) {
        p.ganador = a;
        p.fase = 'fin';
        this.resultado({ id: `${this.idSala()}:${p.n}:gana`, ganador: a, tiempoDe: { asiento: a, s: seg } });
      } else {
        this.resultado({ id: `${this.idSala()}:${p.n}:${a}`, tiempoDe: { asiento: a, s: seg } });
      }
    }
    await this.guardar();
    this.avisarEstado();
    void this.apuntarPendientes();
  }

  private async rendirse(a: Asiento) {
    const s = this.s!;
    const p = s.partida;
    const fase = this.fase(p);
    if (p.modo !== 'duelo' || (fase !== 'cuenta' && fase !== 'jugando') || p.ganador || !s.b) return;
    p.rendido = a;
    p.ganador = otro(a);
    p.fase = 'fin';
    this.resultado({ id: `${this.idSala()}:${p.n}:gana`, ganador: otro(a), rendido: true });
    await this.guardar();
    this.avisarEstado();
    void this.apuntarPendientes();
  }

  private async nueva(a: Asiento, msg: Record<string, unknown>) {
    const s = this.s!;
    const p = s.partida;
    const fase = this.fase(p);
    const modo = msg.modo === 'coop' || msg.modo === 'duelo' ? msg.modo : null;
    const huella = texto(msg.huella, 40);
    if ((fase !== 'fin' && fase !== 'espera') || !esCaso(msg.caso) || !modo || !huella) return;
    s.partida = this.nuevaPartida(p.n + 1, msg.caso, modo, huella, a, !!p.empezada);
    this.t = modo === 'coop' ? { tablero: tableroVacio(), seq: 0, ultimas: {} } : null;
    if (this.t) await this.e.almacen.put('tablero', this.t);
    else await this.e.almacen.delete('tablero');
    await this.guardar();
    this.avisarEstado();
  }

  private async nombre(a: Asiento, msg: Record<string, unknown>) {
    const nombre = texto(msg.nombre, 24);
    const pl = this.plaza(a);
    if (!nombre || !pl || pl.nombre === nombre) return;
    pl.nombre = nombre;
    await this.guardar();
    this.avisarEstado();
  }

  /** «Salir de la sala». En un duelo sin terminar, salir es rendirse. */
  private async salir(conn: Conexion, a: Asiento) {
    const s = this.s!;
    const p = s.partida;
    const fase = this.fase(p);
    if (p.modo === 'duelo' && (fase === 'cuenta' || fase === 'jugando') && !p.ganador && s.b) await this.rendirse(a);
    for (const [id, x] of Object.entries(s.conexiones)) if (x === a) delete s.conexiones[id];
    // Si el segundo se va antes de jugar nada, su asiento vuelve a quedar libre.
    if (a === 'b' && !p.empezada && p.n === 1) s.b = null;
    else this.plaza(a)!.salio = true;
    if (s.a.salio && (!s.b || s.b.salio)) {
      await this.apuntarPendientes();
      conn.reject(1000, 'salir');
      await this.borrar();
      return;
    }
    await this.guardar();
    this.avisarEstado();
    conn.reject(1000, 'salir');
  }

  private async borrar() {
    if (this.s?.pendientes.length) await this.apuntarPendientes();
    await this.e.cancelar('pulso');
    await this.e.cancelar('marcador');
    await this.e.almacen.deleteAll();
    this.s = null;
    this.t = null;
  }

  // ---------------------------------------------------------- marcador

  /** Id de esta sala en el marcador: el código con su fecha de creación (un código puede repetirse meses después). */
  private idSala() {
    return `${this.s!.codigo}.${this.s!.creada.toString(36)}`;
  }

  private resultado(r: Omit<Resultado, 'caso' | 'modo' | 't' | 'uids' | 'nombres' | 'lados'>) {
    const s = this.s!;
    if (!s.b) return;
    const lados = this.lados();
    const uids: [string, string] = lados.a === 0 ? [s.a.uid, s.b.uid] : [s.b.uid, s.a.uid];
    const nombres: [string, string] = lados.a === 0 ? [s.a.nombre, s.b.nombre] : [s.b.nombre, s.a.nombre];
    s.pendientes.push({ ...r, caso: s.partida.caso, modo: s.partida.modo, t: this.ahora(), uids, nombres, lados });
  }

  private async cargarMarcador() {
    const s = this.s;
    if (!s?.b) return;
    try {
      const fila = await this.e.marcadores.leer(this.clave());
      if (!this.s?.b || this.s !== s) return;
      s.marcador = fila ? filaAMarcador(fila) : null;
      if (s.marcador) {
        await this.guardar();
        this.aMiembros((a) => ({ type: 'marcador', marcador: { ...s.marcador!, yo: this.lados()[a] } }));
      }
    } catch (err) {
      this.e.aviso?.(`No se pudo leer el marcador: ${String(err)}`);
    }
  }

  /** Apunta en Base44 los resultados pendientes (de uno en uno y sin pisarse). */
  private apuntarPendientes(): Promise<unknown> {
    this.cola = this.cola.then(() => this.apuntarAhora()).catch(() => undefined);
    return this.cola;
  }

  private async apuntarAhora() {
    const s = this.s;
    if (!s?.b || !s.pendientes.length) return;
    const clave = this.clave();
    try {
      while (s.pendientes.length) {
        const r = s.pendientes[0];
        const fila = await this.e.marcadores.leer(r.uids.join('|'));
        const nueva = apuntar(fila, r);
        if (nueva) await this.e.marcadores.guardar(nueva);
        const vale = nueva ?? fila;
        if (vale && r.uids.join('|') === clave) s.marcador = filaAMarcador(vale);
        s.pendientes.shift();
        s.intentos = 0;
        if (this.s === s) await this.guardar();
      }
      if (this.s === s && s.marcador) this.aMiembros((a) => ({ type: 'marcador', marcador: { ...s.marcador!, yo: this.lados()[a] } }));
    } catch (err) {
      this.e.aviso?.(`No se pudo guardar el marcador: ${String(err)}`);
      s.intentos = (s.intentos ?? 0) + 1;
      if (s.intentos > MAX_INTENTOS) s.pendientes.shift();
      if (this.s === s) {
        await this.guardar();
        await this.e.programar('marcador', this.ahora() + REINTENTO);
      }
    }
  }
}
