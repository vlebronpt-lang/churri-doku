/**
 * Prueba de la sala del modo pareja (la lógica del actor SalaPareja, sin Base44 ni navegador):
 * entrar, sala llena, cooperativo, duelo, rendirse, presencia, salir, la sala dormida y el marcador.
 *   npx tsx scripts/test-sala.ts
 */
import { SalaLogica, apuntar, type Almacen, type Conexion, type Entorno, type FilaMarcador } from '../base44/actors/SalaPareja/sala.ts';
import { aplicar, diferencias, juntar, tableroVacio, validarCambios } from '../base44/actors/SalaPareja/tablero.ts';
import { VERSION, type DeLaSala } from '../base44/actors/SalaPareja/protocolo.ts';

let fallos = 0;
function check(cond: unknown, msg: string) {
  if (cond) console.log(`✔ ${msg}`);
  else {
    fallos++;
    console.log(`✘ ${msg}`);
  }
}

// ------------------------------------------------------------ entorno de mentira

let reloj = 1_700_000_000_000;
const datos = new Map<string, string>();
const almacen: Almacen = {
  get: async <T>(k: string) => (datos.has(k) ? (JSON.parse(datos.get(k)!) as T) : undefined),
  put: async (k, v) => { datos.set(k, JSON.stringify(v)); },
  delete: async (k) => datos.delete(k),
  deleteAll: async () => { datos.clear(); },
};
const avisos = new Map<string, number>();
const filas = new Map<string, FilaMarcador>();
let fallaMarcador = false;
let conexiones: Fake[] = [];

class Fake implements Conexion {
  id: string;
  identity?: Conexion['identity'];
  recibidos: DeLaSala[] = [];
  cerrada: { code: number; reason: string } | null = null;
  constructor(id: string, uid: string | null) {
    this.id = id;
    this.identity = uid ? { type: 'authenticated', userId: uid } : { type: 'anonymous', anonymousId: id };
  }
  send(d: unknown) { this.recibidos.push(JSON.parse(JSON.stringify(d))); }
  reject(code: number, reason: string) {
    this.cerrada = { code, reason };
    conexiones = conexiones.filter((c) => c !== this);
  }
  ultimo<T extends DeLaSala['type']>(type: T) {
    return [...this.recibidos].reverse().find((m) => m.type === type) as Extract<DeLaSala, { type: T }> | undefined;
  }
  get estado() { return this.ultimo('estado'); }
}

const entorno = (codigo: string): Entorno => ({
  codigo,
  almacen,
  conexiones: () => conexiones,
  programar: async (k, en) => { avisos.set(k, en); },
  cancelar: async (k) => { avisos.delete(k); },
  marcadores: {
    leer: async (clave) => (fallaMarcador ? Promise.reject(new Error('caído')) : filas.get(clave) ?? null),
    guardar: async (f) => {
      if (fallaMarcador) throw new Error('caído');
      filas.set(f.clave, { ...f, id: f.id ?? `fila-${filas.size + 1}` });
    },
  },
  ahora: () => reloj,
});

let sala: SalaLogica;
const CODIGO = 'KZPTR';
const espera = (ms = 5) => new Promise((r) => setTimeout(r, ms));

async function conectar(id: string, uid: string | null) {
  const c = new Fake(id, uid);
  conexiones.push(c);
  await sala.conectar();
  return c;
}
async function cerrar(c: Fake) {
  conexiones = conexiones.filter((x) => x !== c);
  await sala.cerrar(c);
}
const entrar = (c: Fake, extra: Record<string, unknown>) => sala.mensaje(c, { type: 'entrar', v: VERSION, disp: `d-${c.id}`, nombre: c.id.toUpperCase(), ...extra });
const mandar = (c: Fake, msg: Record<string, unknown>) => sala.mensaje(c, msg);

async function main() {
  // ------------------------------------------------ el tablero compartido
  {
    const a = tableroVacio();
    const b = { ...tableroVacio(), placed: { 4: 'x' }, notes: { 2: ['y', 'z'] }, xs: { 1: 'm' as const }, occ: { 9: true as const }, lines: { r2: true as const }, zones: { y: 3 } };
    const d = diferencias(a, b)!;
    check(JSON.stringify(aplicar(a, d).tablero) === JSON.stringify(b), 'aplicar las diferencias de A a B da B');
    const movido = aplicar(b, { p: { 7: 'x' } });
    check(movido.tablero.placed[4] === undefined && movido.tablero.placed[7] === 'x' && movido.efectivos.p?.['4'] === null, 'al colocar a alguien sale de su casilla anterior (y se avisa)');
    const cambio = aplicar({ ...b, placed: { 3: 'x', 5: 'y' } }, { p: { 3: 'y', 5: 'x' } }).tablero;
    check(cambio.placed[3] === 'y' && cambio.placed[5] === 'x', 'intercambiar dos fichas funciona en un solo paquete');
    const j = juntar({ n: { 2: { y: true } }, x: { 1: 'm' } }, { n: { 2: { y: false, z: true } }, x: { 1: null } })!;
    check(j.n!['2'].y === false && j.n!['2'].z === true && j.x!['1'] === null, 'juntar paquetes: manda el último');
    check(validarCambios({ p: { 500: 'x' } }) === null && validarCambios({ q: {} }) === null && validarCambios({ p: { 3: '<script>' } }) === null, 'se rechazan cambios raros');
    check(!!validarCambios({ p: { 3: 'shrek', 4: null }, n: { 3: { fiona: true } }, z: { asno: 2 } }), 'y se aceptan los normales');
  }

  // ------------------------------------------------ entrar
  sala = await SalaLogica.cargar(entorno(CODIGO));
  const anon = await conectar('anon', null);
  await sala.mensaje(anon, { type: 'entrar', v: VERSION, disp: 'x', nombre: 'x', quiero: 'unirme' });
  check(anon.cerrada?.code === 4001 && anon.ultimo('error')?.motivo === 'sin-cuenta', 'sin cuenta no se puede entrar');
  const perdido = await conectar('perdido', 'u-perdido');
  await entrar(perdido, { quiero: 'unirme' });
  check(perdido.ultimo('error')?.motivo === 'no-existe' && perdido.cerrada?.code === 4004, 'unirse a un código que no existe avisa');

  const A = await conectar('a1', 'u-victor');
  await entrar(A, { quiero: 'crear', caso: 'shrek', modo: 'coop', huella: 'h1' });
  check(A.estado?.yo === 'a' && A.estado.partida.fase === 'espera' && A.estado.jugadores.b === null, 'crear la sala: estás en el asiento a esperando');
  check(A.estado?.partida.tablero !== undefined && A.estado.partida.seq === 0, 'el cooperativo trae su tablero vacío');

  const impostor = await conectar('x1', 'u-otro');
  await entrar(impostor, { quiero: 'crear', caso: 'shrek', modo: 'coop', huella: 'h1' });
  check(impostor.ultimo('error')?.motivo === 'ocupada', 'crear con un código que ya usa otro: «ocupada»');

  const B = await conectar('b1', 'u-lucia');
  await entrar(B, { quiero: 'unirme' });
  check(B.estado?.yo === 'b' && !!A.estado?.jugadores.b?.conectado && A.estado.jugadores.b.nombre === 'B1', 'la pareja se une y los dos lo ven');
  const C = await conectar('c1', 'u-tercero');
  await entrar(C, { quiero: 'unirme' });
  check(C.cerrada?.code === 4003 && C.ultimo('error')?.motivo === 'llena', 'un tercero no puede entrar');
  const viejo = await conectar('v1', 'u-lucia');
  await sala.mensaje(viejo, { type: 'entrar', v: 0, disp: 'd', nombre: 'x', quiero: 'unirme' });
  check(viejo.ultimo('error')?.motivo === 'version', 'una versión antigua del juego recibe «version»');

  // ------------------------------------------------ cooperativo
  await mandar(A, { type: 'jugada', s: 'sa', c: 1, cambios: { p: { 3: 'shrek' } } });
  check(A.recibidos.filter((m) => m.type === 'jugada').length === 0, 'antes de empezar no se puede jugar');
  await mandar(A, { type: 'empezar' });
  check(A.estado?.partida.fase === 'cuenta' && A.estado.partida.empiezaEn === 3000 && B.estado?.partida.fase === 'cuenta', '«Empezar» pone la cuenta atrás en los dos');
  reloj += 3000;
  await mandar(A, { type: 'jugada', s: 'sa', c: 1, cambios: { p: { 5: 'shrek' } } });
  await mandar(B, { type: 'jugada', s: 'sb', c: 1, cambios: { p: { 7: 'shrek' }, n: { 2: { fiona: true } } } });
  const jb = A.ultimo('jugada');
  check(jb?.de === 'b' && jb.n === 2 && jb.cambios.p?.['5'] === null && jb.cambios.p?.['7'] === 'shrek', 'las jugadas llegan a los dos en orden, con la casilla que se vacía');
  await mandar(A, { type: 'jugada', s: 'sa', c: 1, cambios: { p: { 5: 'shrek' } } });
  check(A.ultimo('jugada')?.n === 2, 'una jugada repetida no se aplica dos veces');
  await mandar(B, { type: 'jugada', s: 'sb', c: 2, cambios: { p: { 999: 'x' } } });
  check(A.ultimo('jugada')?.n === 2, 'una jugada con datos raros se ignora');

  // La sala se duerme y se despierta: lo guardado sigue ahí.
  sala = await SalaLogica.cargar(entorno(CODIGO));
  await mandar(A, { type: 'jugada', s: 'sa', c: 2, cambios: { x: { 1: 'm' } } });
  check(A.ultimo('jugada')?.n === 3, 'tras dormirse, la sala sigue la cuenta de jugadas');

  // B se cae y vuelve: recibe el tablero y su última jugada aplicada.
  await cerrar(B);
  check(A.estado?.jugadores.b?.conectado === false, 'si tu pareja se desconecta, lo ves');
  const B2 = await conectar('b2', 'u-lucia');
  await sala.mensaje(B2, { type: 'entrar', v: VERSION, disp: 'd-b1', nombre: 'Lucía', quiero: 'unirme' });
  const eb = B2.estado!;
  check(eb.yo === 'b' && eb.partida.tablero?.placed[7] === 'shrek' && eb.partida.tablero.xs[1] === 'm' && eb.partida.ultima?.c === 1, 'al volver recibe el tablero entero y su última jugada aplicada');
  check(A.estado?.jugadores.b?.conectado === true && A.estado.jugadores.b.nombre === 'Lucía', 'y su pareja la ve otra vez (con su nombre)');

  // Sin señal: B deja de dar noticias.
  reloj += 25_000;
  await mandar(A, { type: 'sigo' });
  await sala.despertar('pulso');
  check(A.estado?.jugadores.b?.sinSenal === true && A.estado.jugadores.a?.sinSenal === false, 'si tu pareja deja de dar señales, sale «sin señal»');
  await mandar(B2, { type: 'sigo' });
  check(A.estado?.jugadores.b?.sinSenal === false, 'y en cuanto vuelve a dar señales, se quita');

  // Resuelto entre los dos.
  reloj += 61_000;
  await mandar(B2, { type: 'resuelto' });
  await espera();
  const fin = A.estado!.partida;
  check(fin.fase === 'fin' && fin.resolvio === 'b' && fin.tiempo === 86_000, 'cooperativo resuelto: termina para los dos con el tiempo de la sala (sin la cuenta atrás)');
  const clave = 'u-lucia|u-victor';
  const f1 = filas.get(clave);
  check(f1?.coop === 1 && JSON.parse(f1.tiempos).shrek[2] === 86 && f1.jugador_a === 'u-lucia', 'el marcador apunta el caso resuelto juntos (86 s)');
  const mA = A.ultimo('marcador')?.marcador;
  check(mA?.coop === 1 && mA.yo === 1 && B2.ultimo('marcador')?.marcador.yo === 0, 'los dos reciben el marcador (cada uno sabe cuál es su lado)');
  await mandar(A, { type: 'jugada', s: 'sa', c: 3, cambios: { x: { 2: 'm' } } });
  check(A.ultimo('jugada')?.n === 3, 'resuelto el caso, ya no se mueve nada');

  // ------------------------------------------------ duelo
  await mandar(A, { type: 'nueva', caso: 'friends', modo: 'duelo', huella: 'h2' });
  check(B2.estado?.partida.n === 2 && B2.estado.partida.modo === 'duelo' && B2.estado.partida.fase === 'espera' && B2.estado.partida.tablero === undefined, '«Otra partida»: duelo nuevo, en espera y sin tablero compartido');
  await mandar(B2, { type: 'empezar' });
  reloj += 3000;
  await mandar(A, { type: 'progreso', colocados: 4, total: 9 });
  check(B2.ultimo('progreso')?.de === 'a' && B2.ultimo('progreso')?.colocados === 4, 'en el duelo ves cuántos lleva tu pareja');
  reloj += 120_400;
  await mandar(A, { type: 'resuelto' });
  await espera();
  check(B2.estado?.partida.ganador === 'a' && B2.estado.partida.tiempos.a === 120_400 && B2.estado.partida.fase === 'fin', 'el primero en resolverlo gana (y su pareja lo ve al momento)');
  reloj += 30_000;
  await mandar(B2, { type: 'resuelto' });
  await espera();
  const f2 = filas.get(clave)!;
  const t2 = JSON.parse(f2.tiempos).friends;
  check(f2.duelos === 1 && f2.victorias_b === 1 && f2.victorias_a === 0 && t2[1] === 120 && t2[0] === 150, 'marcador del duelo: victoria y tiempos de cada uno');
  const u2 = JSON.parse(f2.ultimas)[0];
  check(u2.g === 1 && u2.s[0] === 150 && u2.s[1] === 120, 'el historial guarda quién ganó y los dos tiempos');

  // Duelo en el que alguien se va: pierde.
  await mandar(B2, { type: 'nueva', caso: 'office', modo: 'duelo', huella: 'h3' });
  await mandar(A, { type: 'empezar' });
  reloj += 10_000;
  await mandar(A, { type: 'salir' });
  await espera();
  check(B2.estado?.partida.ganador === 'b' && B2.estado.partida.rendido === 'a' && B2.estado.jugadores.a?.salio === true, 'salir a mitad de un duelo es rendirse: gana tu pareja');
  check(filas.get(clave)!.victorias_a === 1 && filas.get(clave)!.duelos === 2, 'y cuenta en el marcador');
  const A2 = await conectar('a2', 'u-victor');
  await sala.mensaje(A2, { type: 'entrar', v: VERSION, disp: 'd-a1', nombre: 'Víctor', quiero: 'unirme' });
  check(A2.estado?.yo === 'a' && B2.estado?.jugadores.a?.salio === false, 'quien sale puede volver a entrar con el código');

  // El mismo asiento en otro dispositivo: se queda el nuevo.
  const A3 = await conectar('a3', 'u-victor');
  await sala.mensaje(A3, { type: 'entrar', v: VERSION, disp: 'd-movil', nombre: 'Víctor', quiero: 'unirme' });
  check(A3.estado?.yo === 'a' && A2.ultimo('error')?.motivo === 'otro-dispositivo' && A2.cerrada?.code === 4009, 'abrir la sala en otro dispositivo saca al anterior');

  // Fallo de Base44 al guardar el marcador: se reintenta.
  await mandar(A3, { type: 'nueva', caso: 'shrek', modo: 'coop', huella: 'h1' });
  await mandar(A3, { type: 'empezar' });
  reloj += 3000 + 40_000;
  fallaMarcador = true;
  await mandar(A3, { type: 'resuelto' });
  await espera();
  check(avisos.has('marcador') && filas.get(clave)!.coop === 1, 'si Base44 falla, el resultado queda pendiente y se programa otro intento');
  fallaMarcador = false;
  await sala.despertar('marcador');
  await espera();
  check(filas.get(clave)!.coop === 2 && JSON.parse(filas.get(clave)!.tiempos).shrek[2] === 40, 'en el reintento se apunta (y el mejor tiempo juntos baja a 40 s)');

  // Salir los dos: la sala se borra.
  await mandar(B2, { type: 'salir' });
  await mandar(A3, { type: 'salir' });
  await espera();
  check(datos.size === 0, 'cuando salen los dos, la sala se borra');

  // ------------------------------------------------ misma cuenta en dos dispositivos
  conexiones = [];
  sala = await SalaLogica.cargar(entorno('BCDFG'));
  const U1 = await conectar('u1', 'u-solo');
  await entrar(U1, { quiero: 'crear', caso: 'shrek', modo: 'duelo', huella: 'h1' });
  const U2 = await conectar('u2', 'u-solo');
  await entrar(U2, { quiero: 'unirme' });
  check(U2.ultimo('pregunta')?.que === 'misma-cuenta', 'con tu misma cuenta en otro dispositivo, se pregunta qué quieres');
  await entrar(U2, { quiero: 'unirme', como: 'segundo' });
  check(U2.estado?.yo === 'b' && U1.estado?.jugadores.b?.conectado === true, '«como segundo jugador» te sienta enfrente (para probar con una cuenta)');
  // El segundo se va antes de jugar: su asiento queda libre.
  await mandar(U2, { type: 'salir' });
  check(U1.estado?.jugadores.b === null, 'si el segundo sale antes de empezar, su sitio queda libre');
  const D = await conectar('d1', 'u-dani');
  await entrar(D, { quiero: 'unirme' });
  check(D.estado?.yo === 'b', 'y puede entrar otra persona');

  // ------------------------------------------------ apuntar no cuenta dos veces
  const r = { id: 'X.1:1:coop', caso: 'shrek', modo: 'coop' as const, t: 1, uids: ['p', 'q'] as [string, string], nombres: ['P', 'Q'] as [string, string], lados: { a: 0 as const, b: 1 as const }, juntos: 50 };
  const fila = apuntar(null, r)!;
  check(fila.coop === 1 && apuntar(fila, r) === null, 'un mismo resultado no se apunta dos veces');

  console.log(fallos ? `\n${fallos} fallos` : '\nTodo bien.');
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
