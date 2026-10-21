/**
 * Conexión con una sala del modo pareja (actor «SalaPareja» de Base44) sin el SDK: pide el permiso
 * de conexión, abre el WebSocket, comprueba que sigue vivo y se reconecta sola si se cae.
 */
import { actors, CloudError, getToken } from '../cloud/api';
import { syncNow } from '../cloud/account';
import type { ALaSala, DeLaSala } from '../../base44/actors/SalaPareja/protocolo.ts';

export type EstadoConexion = 'conectando' | 'abierta' | 'reconectando' | 'cerrada';
/** Por qué se deja de intentar: sin sesión (hay que volver a entrar) o la sala no está disponible. */
export type FalloConexion = 'sesion' | 'servidor';

interface Opciones {
  sala: string;
  /** Cada vez que se abre (también tras reconectar): es el momento de decir quién eres. */
  alAbrir: () => void;
  alMensaje: (m: DeLaSala) => void;
  alCambiar: (e: EstadoConexion) => void;
  alFallar: (f: FalloConexion) => void;
}

/** Cada cuánto se comprueba que la conexión sigue viva y cuánto silencio se aguanta. */
const LATIDO = 2000;
const SILENCIO = 6500;
/** Cada cuánto se avisa a la sala de que sigues aquí (para el «sin señal» de tu pareja). */
const SIGO = 8000;
const ESPERAS = [500, 1000, 2000, 4000, 7000, 10_000];
/** Respuestas del permiso que significan «usa el camino antiguo». */
const AL_PROXY = new Set([405, 409, 503]);

/** Id al azar (crypto.randomUUID solo existe en páginas https; esto vale también abriendo el juego por la IP de casa). */
export function idAzar(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Id de la conexión: el mismo en toda la pestaña, así una reconexión sustituye a la anterior. */
function idConexion(): string {
  const k = 'churri-doku:conexion';
  try {
    const v = sessionStorage.getItem(k);
    if (v) return v;
    const id = idAzar();
    sessionStorage.setItem(k, id);
    return id;
  } catch {
    return idAzar();
  }
}

export class ConexionSala {
  private readonly o: Opciones;
  private readonly id = idConexion();
  private ws: WebSocket | null = null;
  private estado: EstadoConexion = 'conectando';
  private intentos = 0;
  private terminada = false;
  private ultimo = 0;
  private timerLatido = 0;
  private timerSigo = 0;
  private timerReintento = 0;
  private proxy = false;
  private abriendo = false;

  constructor(o: Opciones) {
    this.o = o;
    this.timerLatido = window.setInterval(() => this.comprobar(), LATIDO);
    this.timerSigo = window.setInterval(() => this.enviar({ type: 'sigo' }), SIGO);
    document.addEventListener('visibilitychange', this.alVolver);
    window.addEventListener('online', this.alRecuperarRed);
    void this.abrir();
  }

  get abierta() {
    return this.estado === 'abierta';
  }

  enviar(m: ALaSala) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(m));
      return true;
    } catch {
      return false;
    }
  }

  /** Cierra para siempre (al salir de la pantalla de la sala). */
  cerrar() {
    if (this.terminada) return;
    this.terminada = true;
    window.clearInterval(this.timerLatido);
    window.clearInterval(this.timerSigo);
    window.clearTimeout(this.timerReintento);
    document.removeEventListener('visibilitychange', this.alVolver);
    window.removeEventListener('online', this.alRecuperarRed);
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try {
        ws.close(1000, 'adios');
      } catch {
        /* ya cerrada */
      }
    }
    this.cambiar('cerrada');
  }

  private cambiar(e: EstadoConexion) {
    if (this.estado === e) return;
    this.estado = e;
    this.o.alCambiar(e);
  }

  private async url(): Promise<string> {
    if (!getToken()) throw new CloudError('Sin sesión', 401);
    if (!this.proxy) {
      try {
        const { websocket_url, token } = await actors.connectionToken(this.o.sala, this.id);
        return `${websocket_url}${websocket_url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
      } catch (e) {
        if (!(e instanceof CloudError) || !AL_PROXY.has(e.status)) throw e;
        this.proxy = true;
      }
    }
    return actors.proxyUrl(this.o.sala, this.id);
  }

  private async abrir() {
    if (this.terminada || this.abriendo || this.ws) return;
    this.abriendo = true;
    this.cambiar(this.intentos ? 'reconectando' : 'conectando');
    let url: string;
    try {
      url = await this.url();
    } catch (e) {
      this.abriendo = false;
      if (this.terminada) return;
      const status = e instanceof CloudError ? e.status : 0;
      // Con la sesión caducada, Base44 contesta 422 («falta el id de visitante»): la trata como si no hubiera sesión.
      if (status === 401 || status === 422) {
        void syncNow();
        return this.fallar('sesion');
      }
      if (status === 400 || status === 403 || status === 404) return this.fallar('servidor');
      return this.reintentar();
    }
    this.abriendo = false;
    if (this.terminada) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return this.reintentar();
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.intentos = 0;
      this.ultimo = Date.now();
      this.cambiar('abierta');
      this.o.alAbrir();
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      this.ultimo = Date.now();
      let m: { type?: string } | null = null;
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (!m || typeof m !== 'object' || m.type === '__pong') return;
      // La sala nos echa: el motivo llega antes que el cierre, así que se cierra desde aquí.
      if (m.type === 'error') {
        this.o.alMensaje(m as DeLaSala);
        this.cerrar();
        return;
      }
      this.o.alMensaje(m as DeLaSala);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (!this.terminada) this.reintentar();
    };
    ws.onerror = () => {
      /* también llega onclose */
    };
  }

  private fallar(f: FalloConexion) {
    this.cerrar();
    this.o.alFallar(f);
  }

  private reintentar() {
    if (this.terminada) return;
    this.cambiar('reconectando');
    window.clearTimeout(this.timerReintento);
    const espera = ESPERAS[Math.min(this.intentos, ESPERAS.length - 1)];
    this.intentos++;
    // Sin red no tiene sentido insistir: se vuelve a probar al recuperarla (evento «online»).
    if (navigator.onLine === false) return;
    this.timerReintento = window.setTimeout(() => void this.abrir(), espera);
  }

  /** Latido: la sala contesta sola a «__ping»; si no llega nada en un rato, la conexión está muerta. */
  private comprobar() {
    if (this.terminada || document.hidden) return;
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (Date.now() - this.ultimo > SILENCIO) {
      this.ws = null;
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try {
        ws.close();
      } catch {
        /* ya cerrada */
      }
      this.reintentar();
      return;
    }
    try {
      ws.send('{"type":"__ping"}');
    } catch {
      /* se verá en el siguiente latido */
    }
  }

  private alVolver = () => {
    if (document.hidden || this.terminada) return;
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Tras un rato en segundo plano: se da margen para que conteste antes de darla por muerta.
      this.ultimo = Math.max(this.ultimo, Date.now() - SILENCIO + 3000);
      this.enviar({ type: 'sigo' });
      try {
        this.ws.send('{"type":"__ping"}');
      } catch {
        /* nada */
      }
    } else if (!this.ws) {
      window.clearTimeout(this.timerReintento);
      void this.abrir();
    }
  };

  private alRecuperarRed = () => {
    if (this.terminada || this.ws) return;
    window.clearTimeout(this.timerReintento);
    this.intentos = 0;
    void this.abrir();
  };
}
