/**
 * Prueba la sala del modo pareja en el Base44 de verdad (sin navegador): despliega una copia temporal
 * del actor («SalaParejaPrueba», que deja entrar sin cuenta), juega con dos clientes y la borra al acabar.
 * Comprueba crear, unirse, sala llena, cuenta atrás, jugadas, la sala dormida, reconexión, cooperativo,
 * duelo, marcador (escrito por la sala con permisos de servidor), otro dispositivo y salir.
 *   npx tsx scripts/sala-real.ts      (con la CLI de Base44 dentro: npx base44 whoami)
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LETRAS } from '../base44/actors/SalaPareja/protocolo.ts';

const APP = '6ad7e5d5a1f2149ed0366eac';
const ACTOR = 'SalaParejaPrueba';
const ruta = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const ORIGEN = ruta('../base44/actors/SalaPareja/');
const COPIA = ruta(`../base44/actors/${ACTOR}/`);
const RAIZ = ruta('..');

const t0 = Date.now();
const log = (...a: unknown[]) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s]`, ...a);
let fallos = 0;
const check = (c: unknown, m: string) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cli = (args: string) => execSync(`npx base44 ${args}`, { cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] }).toString();

type Msg = { type: string; [k: string]: unknown };
interface Cliente {
  inbox: Msg[];
  cerrado: { code: number; reason: string } | null;
  send: (m: unknown) => void;
  espera: (pred: (m: Msg) => boolean, ms?: number, que?: string) => Promise<Msg>;
  estado: () => Msg | undefined;
  cerrar: () => void;
}

const codigo = Array.from({ length: 5 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');

async function cliente(nombre: string, anon: string, connId: string): Promise<Cliente> {
  const res = await fetch(`https://base44.app/api/apps/${APP}/actors/${ACTOR}/connection-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-App-Id': APP, 'X-Base44-Anonymous-Id': anon },
    body: JSON.stringify({ room: codigo, connection_id: connId }),
  });
  if (!res.ok) throw new Error(`permiso de conexión: ${res.status} ${await res.text()}`);
  const { websocket_url, token } = (await res.json()) as { websocket_url: string; token: string };
  const ws = new WebSocket(`${websocket_url}${websocket_url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`);
  const c: Cliente = {
    inbox: [],
    cerrado: null,
    send: (m) => ws.send(JSON.stringify(m)),
    espera: async (pred, ms = 8000, que = '') => {
      const t = Date.now();
      while (Date.now() - t < ms) {
        const hit = [...c.inbox].reverse().find(pred);
        if (hit) return hit;
        await wait(50);
      }
      throw new Error(`${nombre}: tiempo agotado esperando ${que}`);
    },
    estado: () => [...c.inbox].reverse().find((m) => m.type === 'estado'),
    cerrar: () => { clearInterval(latido); try { ws.close(1000, 'adios'); } catch { /* ya cerrada */ } },
  };
  ws.onmessage = (e) => { const m = JSON.parse(String(e.data)) as Msg; if (m.type !== '__pong') c.inbox.push(m); };
  ws.onclose = (e) => { c.cerrado = { code: e.code, reason: e.reason }; };
  await new Promise<void>((r, j) => { ws.onopen = () => r(); ws.onerror = () => j(new Error(`${nombre}: no se abre el WebSocket`)); });
  const latido = setInterval(() => { try { ws.send('{"type":"__ping"}'); } catch { /* cerrada */ } }, 1000);
  return c;
}

async function probar() {
  const anonA = `prueba-a-${t0}`, anonB = `prueba-b-${t0}`;
  const clave = [`anon:${anonA}`, `anon:${anonB}`].sort().join('|');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (o: unknown) => o as any;
  log('sala', codigo);
  const A = await cliente('A', anonA, 'conn-a');
  A.send({ type: 'entrar', v: 1, quiero: 'crear', disp: 'disp-a', nombre: 'Víctor', caso: 'shrek', modo: 'coop', huella: 'h1' });
  const e1 = await A.espera((m) => m.type === 'estado', 8000, 'estado');
  check(e1.yo === 'a' && p(e1.partida).fase === 'espera', 'crear la sala');
  const B = await cliente('B', anonB, 'conn-b');
  B.send({ type: 'entrar', v: 1, quiero: 'unirme', disp: 'disp-b', nombre: 'Lucía' });
  await A.espera((m) => m.type === 'estado' && !!p(m.jugadores).b?.conectado, 8000, 'la pareja dentro');
  check(B.estado()?.yo === 'b', 'la pareja entra con el código');
  const C = await cliente('C', `prueba-c-${t0}`, 'conn-c');
  C.send({ type: 'entrar', v: 1, quiero: 'unirme', disp: 'disp-c', nombre: 'Intruso' });
  await wait(1500);
  check(C.cerrado?.code === 4003 && C.inbox.some((m) => m.type === 'error' && m.motivo === 'llena'), 'un tercero recibe «llena» y se le cierra la conexión');
  A.send({ type: 'empezar' });
  const cuenta = await B.espera((m) => m.type === 'estado' && p(m.partida).fase === 'cuenta', 8000, 'cuenta atrás');
  check(p(cuenta.partida).empiezaEn > 2000, 'cuenta atrás en los dos');
  await wait(3300);
  const tj = Date.now();
  A.send({ type: 'jugada', s: 'sa', c: 1, cambios: { p: { 5: 'shrek' } } });
  await B.espera((m) => m.type === 'jugada' && m.n === 1, 8000, 'jugada 1');
  check(true, `la jugada de A llega a B (${Date.now() - tj} ms)`);
  B.send({ type: 'jugada', s: 'sb', c: 1, cambios: { p: { 7: 'shrek' } } });
  const j2 = await A.espera((m) => m.type === 'jugada' && m.n === 2, 8000, 'jugada 2');
  check(p(j2.cambios).p['5'] === null && p(j2.cambios).p['7'] === 'shrek', 'la de B llega a A y mueve la ficha');
  log('16 s sin mensajes para que la sala se duerma…');
  await wait(16_000);
  A.send({ type: 'jugada', s: 'sa', c: 2, cambios: { x: { 1: 'm' } } });
  await B.espera((m) => m.type === 'jugada' && m.n === 3, 8000, 'jugada 3');
  check(true, 'tras dormirse, la sala conserva lo jugado');
  B.cerrar();
  await A.espera((m) => m.type === 'estado' && !!p(m.jugadores).b && !p(m.jugadores).b.conectado, 8000, 'B desconectada');
  check(true, 'A ve que B se ha desconectado');
  const B2 = await cliente('B2', anonB, 'conn-b2');
  B2.send({ type: 'entrar', v: 1, quiero: 'unirme', disp: 'disp-b', nombre: 'Lucía' });
  const eb = await B2.espera((m) => m.type === 'estado', 8000, 'estado de B al volver');
  check(eb.yo === 'b' && p(eb.partida).tablero.placed['7'] === 'shrek' && p(eb.partida).ultima?.c === 1, 'B vuelve y recibe el tablero entero');
  B2.send({ type: 'resuelto' });
  const fin = await A.espera((m) => m.type === 'estado' && p(m.partida).fase === 'fin', 8000, 'fin');
  check(p(fin.partida).resolvio === 'b', 'cooperativo resuelto');
  const mar = await A.espera((m) => m.type === 'marcador', 15_000, 'marcador');
  check(p(mar.marcador).coop === 1, 'Base44 guarda el marcador (la sala lo escribe con permisos de servidor)');
  A.send({ type: 'nueva', caso: 'friends', modo: 'duelo', huella: 'h2' });
  await B2.espera((m) => m.type === 'estado' && p(m.partida).n === 2, 8000, 'duelo');
  B2.send({ type: 'empezar' });
  await wait(3300);
  A.send({ type: 'progreso', colocados: 3, total: 9 });
  await B2.espera((m) => m.type === 'progreso' && m.colocados === 3, 8000, 'progreso');
  check(true, 'en el duelo B ve el progreso de A');
  A.send({ type: 'resuelto' });
  const gana = await B2.espera((m) => m.type === 'estado' && !!p(m.partida).ganador, 8000, 'ganador');
  check(p(gana.partida).ganador === 'a', 'gana el primero en resolverlo');
  await A.espera((m) => m.type === 'marcador' && p(m.marcador).duelos === 1, 15_000, 'marcador del duelo');
  check(true, 'el marcador apunta la victoria');
  const A2 = await cliente('A2', anonA, 'conn-a2');
  A2.send({ type: 'entrar', v: 1, quiero: 'unirme', disp: 'disp-a-movil', nombre: 'Víctor' });
  await A2.espera((m) => m.type === 'estado', 8000, 'estado de A en otro dispositivo');
  await wait(1200);
  check(A.cerrado?.code === 4009 && A.inbox.some((m) => m.type === 'error' && m.motivo === 'otro-dispositivo'), 'abrir la sala en otro dispositivo cierra el anterior');
  A2.send({ type: 'prueba:borrar', clave });
  const borrado = await A2.espera((m) => m.type === 'prueba:borrado', 15_000, 'borrado');
  check(borrado.filas === 1, 'la fila de prueba del marcador se borra');
  A2.send({ type: 'salir' });
  B2.send({ type: 'salir' });
  await wait(1500);
  const D = await cliente('D', `prueba-d-${t0}`, 'conn-d');
  D.send({ type: 'entrar', v: 1, quiero: 'unirme', disp: 'disp-d', nombre: 'Dani' });
  await wait(1500);
  check(D.inbox.some((m) => m.type === 'error' && m.motivo === 'no-existe'), 'al salir los dos, la sala desaparece');
  for (const c of [A, A2, B2, C, D]) c.cerrar();
}

async function main() {
  rmSync(COPIA, { recursive: true, force: true });
  mkdirSync(COPIA, { recursive: true });
  for (const f of ['entry.ts', 'sala.ts', 'tablero.ts', 'protocolo.ts']) cpSync(`${ORIGEN}${f}`, `${COPIA}${f}`);
  writeFileSync(`${COPIA}ajustes.ts`, '/** Copia de pruebas: deja entrar sin cuenta. */\nexport const PRUEBA = true;\n');
  try {
    log('desplegando la copia de pruebas…');
    cli(`actors deploy ${ACTOR}`);
    await probar();
  } catch (e) {
    fallos++;
    console.log(`✘ ${(e as Error).message}`);
  } finally {
    try { cli(`actors delete ${ACTOR}`); log('copia de pruebas borrada de Base44'); } catch (e) { fallos++; console.log(`✘ no se pudo borrar ${ACTOR}: ${(e as Error).message}`); }
    rmSync(COPIA, { recursive: true, force: true });
  }
  console.log(fallos ? `\n${fallos} fallos` : '\nSala de verdad en Base44: todo bien.');
  process.exit(fallos ? 1 : 0);
}

main();
