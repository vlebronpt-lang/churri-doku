/**
 * Actor «SalaPareja» de Base44: una sala del modo pareja en directo por cada código (el id de la instancia).
 * Aquí solo se conecta la lógica (sala.ts) con el runtime: almacenamiento, avisos programados, conexiones
 * y el marcador de la pareja (entidad MarcadorPareja, que solo escribe la sala).
 *   Publicar: npx base44 actors deploy SalaPareja
 */
import { Actor, type Conn } from 'base44:runtime/actors';
import { SalaLogica, type Conexion, type Entorno, type FilaMarcador } from './sala.ts';
import { PRUEBA } from './ajustes.ts';

/** Solo los campos de la entidad (lo que devuelve Base44 trae además id, fechas, autor…). */
function campos(f: FilaMarcador): Omit<FilaMarcador, 'id'> {
  return {
    clave: f.clave, jugador_a: f.jugador_a, jugador_b: f.jugador_b, nombre_a: f.nombre_a, nombre_b: f.nombre_b,
    victorias_a: f.victorias_a, victorias_b: f.victorias_b, duelos: f.duelos, coop: f.coop,
    tiempos: f.tiempos, ultimas: f.ultimas, aplicados: f.aplicados, ultima: f.ultima,
  };
}

export default class SalaPareja extends Actor {
  private cargada: Promise<SalaLogica> | null = null;

  private entorno(): Entorno {
    const marcador = () => this.client.asServiceRole.entities.MarcadorPareja;
    return {
      codigo: this.instanceId,
      almacen: this.storage,
      conexiones: () => this.getConnections() as Conexion[],
      programar: (clave, en) => this.schedule(clave, en),
      cancelar: (clave) => this.cancelSchedule(clave),
      marcadores: {
        leer: async (clave) => {
          const filas = (await marcador().filter({ clave }, '-updated_date', 1)) as FilaMarcador[] | null;
          return filas?.[0] ?? null;
        },
        guardar: async (fila) => {
          if (fila.id) await marcador().update(fila.id, campos(fila));
          else await marcador().create(campos(fila));
        },
      },
      ahora: () => Date.now(),
      sinCuenta: PRUEBA,
      aviso: (texto) => console.warn(`[SalaPareja ${this.instanceId}] ${texto}`),
    };
  }

  private sala(): Promise<SalaLogica> {
    return (this.cargada ??= SalaLogica.cargar(this.entorno()));
  }

  async handleStart() {
    this.cargada = SalaLogica.cargar(this.entorno());
    await this.cargada;
  }

  /** Quién es y si puede entrar se decide con su primer mensaje («entrar»). */
  async handleConnect() {
    await (await this.sala()).conectar();
  }

  async handleMessage(conn: Conn, msg: unknown) {
    const m = msg as { type?: unknown; clave?: unknown } | null;
    // Solo en la copia de pruebas: borrar el marcador de prueba (de jugadores sin cuenta) al terminar.
    if (PRUEBA && m?.type === 'prueba:borrar' && typeof m.clave === 'string' && /^anon:[^|]+\|anon:[^|]+$/.test(m.clave)) {
      const filas = (await this.client.asServiceRole.entities.MarcadorPareja.filter({ clave: m.clave })) as FilaMarcador[] | null;
      for (const f of filas ?? []) if (f.id) await this.client.asServiceRole.entities.MarcadorPareja.delete(f.id);
      conn.send({ type: 'prueba:borrado', filas: filas?.length ?? 0 });
      return;
    }
    await (await this.sala()).mensaje(conn as Conexion, msg);
  }

  async handleClose(conn: Conn) {
    await (await this.sala()).cerrar(conn as Conexion);
  }

  protected async handleWake(key: string) {
    await (await this.sala()).despertar(key);
  }

  handleTick() {}
}
