/**
 * Prueba del modo pareja en directo con dos navegadores (ordenador y móvil) y un Base44 de mentira.
 * La sala es la de verdad (la lógica del actor SalaPareja corre dentro de la prueba, detrás de los WebSocket):
 * crear y unirse con código, cooperativo en directo (colocar, X, notas, ocupadas, zonas, deshacer),
 * conexión de la pareja, reconexión, la sala dormida, recargar, resolver juntos, duelo con progreso
 * y ganador, marcador en la portada, sala llena, código que no existe, sin cuenta y salir.
 *   npx tsx scripts/e2e-pareja.ts [url]
 */
import { mkdirSync } from 'node:fs';
import { chromium, type Browser, type BrowserContext, type Page, type Route, type WebSocketRoute } from 'playwright-core';
import { compilePuzzle } from '../src/engine/puzzle';
import { displayName } from '../src/engine/text';
import type { Puzzle, PuzzleInput } from '../src/engine/types';
import { SalaLogica, type Conexion, type Entorno, type FilaMarcador } from '../base44/actors/SalaPareja/sala.ts';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const APP = '6ad7e5d5a1f2149ed0366eac';
const SHOTS = `${process.env.TMPDIR ?? '/tmp'}/e2e-pareja`;
mkdirSync(SHOTS, { recursive: true });

// ------------------------------------------------------------ Base44 de mentira (cuentas y copias)

interface User { id: string; email: string; full_name: string }
const users = new Map<string, User>();
const tokens = new Map<string, User>();
const saves: { id: string; data: string; created_by: string; updated_date: string }[] = [];
let nextId = 1;
const newId = () => `id${String(nextId++).padStart(4, '0')}`;

function cuenta(email: string, full_name: string) {
  const u: User = { id: newId(), email, full_name };
  users.set(email, u);
  const t = `tok-${u.id}`;
  tokens.set(t, u);
  return { u, token: t };
}

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS' };
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });

// ------------------------------------------------------------ la sala (lógica de verdad del actor)

interface ConnMock extends Conexion { ws: WebSocketRoute }
interface SalaMock {
  codigo: string;
  datos: Map<string, string>;
  conns: ConnMock[];
  logica: Promise<SalaLogica>;
  avisos: Map<string, ReturnType<typeof setTimeout>>;
  cola: Promise<unknown>;
}
const salas = new Map<string, SalaMock>();
const filas = new Map<string, FilaMarcador & { id: string }>();
const permisos = new Map<string, string>();
let cortarPermisos = false;

function entorno(s: SalaMock): Entorno {
  return {
    codigo: s.codigo,
    almacen: {
      get: async <T>(k: string) => (s.datos.has(k) ? (JSON.parse(s.datos.get(k)!) as T) : undefined),
      put: async (k, v) => { s.datos.set(k, JSON.stringify(v)); },
      delete: async (k) => s.datos.delete(k),
      deleteAll: async () => { s.datos.clear(); },
    },
    conexiones: () => s.conns,
    programar: async (k, en) => {
      clearTimeout(s.avisos.get(k));
      s.avisos.set(k, setTimeout(() => { s.avisos.delete(k); void enCola(s, async (l) => l.despertar(k)); }, Math.max(0, en - Date.now())));
    },
    cancelar: async (k) => { clearTimeout(s.avisos.get(k)); s.avisos.delete(k); },
    marcadores: {
      leer: async (clave) => filas.get(clave) ?? null,
      guardar: async (f) => { filas.set(f.clave, { ...f, id: f.id ?? newId() }); },
    },
    ahora: () => Date.now(),
  };
}

/** Como en Base44, la sala atiende los mensajes de uno en uno. */
function enCola(s: SalaMock, fn: (l: SalaLogica) => Promise<unknown>) {
  s.cola = s.cola.then(async () => fn(await s.logica)).catch((e) => console.log(`  [sala] ${e}`));
  return s.cola;
}

function salaDe(codigo: string): SalaMock {
  let s = salas.get(codigo);
  if (!s) {
    s = { codigo, datos: new Map(), conns: [], logica: Promise.resolve(null as unknown as SalaLogica), avisos: new Map(), cola: Promise.resolve() };
    s.logica = SalaLogica.cargar(entorno(s));
    salas.set(codigo, s);
  }
  return s;
}

/** La sala se duerme y se despierta: solo queda lo que tenía guardado. */
async function dormir(codigo: string) {
  const s = salas.get(codigo)!;
  await s.cola;
  s.logica = SalaLogica.cargar(entorno(s));
  await s.logica;
}

const quitar = (s: SalaMock, c: ConnMock) => { s.conns = s.conns.filter((x) => x !== c); };

async function socket(ws: WebSocketRoute) {
  const url = new URL(ws.url());
  const codigo = decodeURIComponent(url.pathname.split('/').pop()!);
  const id = url.searchParams.get('_pk')!;
  const uid = permisos.get(url.searchParams.get('token') ?? '');
  const s = salaDe(codigo);
  const conn: ConnMock = {
    id,
    ws,
    identity: uid ? { type: 'authenticated', userId: uid } : { type: 'anonymous', anonymousId: id },
    send: (d) => { try { ws.send(JSON.stringify(d)); } catch { /* cerrada */ } },
    reject: (code, reason) => { quitar(s, conn); ws.close({ code, reason }); },
  };
  // Al reconectar con el mismo id, Base44 sustituye la conexión vieja (sin avisar de que se cierra).
  const vieja = s.conns.find((c) => c.id === id);
  if (vieja) { quitar(s, vieja); vieja.ws.close({ code: 4408, reason: 'Superseded' }); }
  s.conns.push(conn);
  ws.onMessage((m) => {
    const msg = JSON.parse(String(m));
    if (msg?.type === '__ping') { ws.send('{"type":"__pong"}'); return; }
    void enCola(s, (l) => l.mensaje(conn, msg));
  });
  ws.onClose(() => {
    if (!s.conns.includes(conn)) return;
    quitar(s, conn);
    void enCola(s, (l) => l.cerrar(conn));
  });
  await enCola(s, (l) => l.conectar());
}

async function api(route: Route) {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const url = new URL(req.url());
  const path = url.pathname.replace(`/api/apps/${APP}`, '');
  const body = req.postData() ? JSON.parse(req.postData()!) : {};
  const me = tokens.get(req.headers()['authorization']?.replace('Bearer ', '') ?? '');
  if (path === '/entities/User/me') return me ? json(route, 200, me) : json(route, 401, { message: 'Authentication required' });
  if (path.startsWith('/entities/PlayerSave')) {
    if (!me) return json(route, 403, { message: 'Permission denied' });
    const id = path.split('/')[3];
    if (req.method() === 'GET') return json(route, 200, saves.filter((x) => x.created_by === me.email));
    if (req.method() === 'POST') { const r = { id: newId(), ...body, created_by: me.email, updated_date: new Date().toISOString() }; saves.push(r); return json(route, 200, r); }
    const r = saves.find((x) => x.id === id && x.created_by === me.email);
    if (!r) return json(route, 404, { message: 'Not found' });
    Object.assign(r, body);
    return json(route, 200, r);
  }
  if (path.startsWith('/entities/MarcadorPareja')) {
    // Reglas: solo los dos de la pareja leen su marcador; nadie lo escribe desde el juego.
    if (req.method() !== 'GET') return json(route, 403, { message: 'Permission denied' });
    const mias = [...filas.values()].filter((f) => me && (f.jugador_a === me.id || f.jugador_b === me.id)).sort((a, b) => b.ultima - a.ultima);
    return json(route, 200, mias);
  }
  if (path === '/actors/SalaPareja/connection-token') {
    // Como Base44: con un token que ya no vale, trata la petición como anónima y pide el id de visitante.
    if (!me) return json(route, 422, { message: 'X-Base44-Anonymous-Id is required' });
    if (cortarPermisos) return route.abort('internetdisconnected');
    const t = `act-${newId()}`;
    permisos.set(t, me.id);
    return json(route, 200, { websocket_url: `wss://actores.prueba/v1/actors/actor-p-prueba/rooms/${encodeURIComponent(body.room)}?_pk=${encodeURIComponent(body.connection_id)}`, token: t });
  }
  return json(route, 404, { message: `Sin simular: ${req.method()} ${path}` });
}

// ------------------------------------------------------------ utilidades

let fallos = 0;
function check(cond: unknown, msg: string) {
  if (!cond) {
    fallos++;
    console.log(`✘ ${msg}`);
  } else console.log(`✔ ${msg}`);
}

async function until(fn: () => boolean | Promise<boolean>, msg: string, ms = 10_000) {
  const t0 = Date.now();
  while (!(await fn().catch(() => false))) {
    if (Date.now() - t0 > ms) {
      fallos++;
      console.log(`✘ (tiempo agotado) ${msg}`);
      return false;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  console.log(`✔ ${msg}`);
  return true;
}

interface Jugador { ctx: BrowserContext; page: Page; movil: boolean; errores: string[] }

async function jugador(browser: Browser, token: string | null, movil: boolean): Promise<Jugador> {
  const ctx = await browser.newContext(movil
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1366, height: 860 } });
  await ctx.route('https://base44.app/api/**', api);
  await ctx.routeWebSocket(/actores\.prueba/, socket);
  if (token) await ctx.addInitScript((t) => { if (!localStorage.getItem('churri-doku:token')) localStorage.setItem('churri-doku:token', JSON.stringify(t)); }, token);
  await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: undefined }); } catch { /* */ } });
  // Sin https (abriendo el juego por la IP de casa) no hay portapapeles que permitir.
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin }).catch(() => undefined);
  const page = await ctx.newPage();
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text())) errores.push(`consola: ${m.text()}`); });
  return { ctx, page, movil, errores };
}

const celda = (j: Jugador, i: number) => j.page.locator('.board__grid [role="gridcell"]').nth(i);
/** Elige a un sospechoso (si ya lo estaba, no lo suelta). */
async function elegir(j: Jugador, k: number) {
  const ficha = j.movil ? j.page.locator('.strip .chip').nth(k) : j.page.locator('.suspects .suspect').nth(k);
  if (/is-selected/.test((await ficha.getAttribute('class')) ?? '')) return;
  if (j.movil) await ficha.click();
  else await ficha.locator('.suspect__photo').click();
}
const herramienta = (j: Jugador, nombre: string) => j.page.locator('.tool:visible', { hasText: nombre }).first().click();
/** Vuelve a «colocar» (quita el lápiz, la X…, si hay alguna herramienta puesta). */
async function soltarHerramienta(j: Jugador) {
  const puesta = j.page.locator('.tools:visible .tool.is-on').first();
  if (await puesta.count()) await puesta.click();
}
async function colocar(j: Jugador, p: Puzzle, k: number) {
  await soltarHerramienta(j);
  await elegir(j, k);
  await celda(j, p.solution[p.cast[k].id]).click();
}
async function acusar(j: Jugador, p: Puzzle) {
  await j.page.locator('.tool--accuse:visible').first().click();
  await j.page.locator('.accuse .polaroid--btn', { hasText: displayName(p.cast.find((c) => c.id === p.murderer)!) }).click();
}
const fichas = (j: Jugador) => j.page.locator('.board__grid .token').count();
const sinDesbordar = (j: Jugador) => j.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth <= 0);
const texto = (j: Jugador, sel: string) => j.page.locator(sel).first().innerText().catch(() => '');
const codigoDe = (j: Jugador) => new URL(j.page.url()).hash.replace('#/sala/', '');
const foto = (j: Jugador, nombre: string) => j.page.screenshot({ path: `${SHOTS}/${nombre}.png` });
/** Apunta en la página si llega a verse algo (aunque dure poco y la prueba mire tarde). */
const vigilar = (j: Jugador, sel: string) => j.page.evaluate((s) => {
  const w = window as unknown as Record<string, boolean>;
  w[`visto:${s}`] = !!document.querySelector(s);
  new MutationObserver(() => { if (document.querySelector(s)) w[`visto:${s}`] = true; }).observe(document.body, { childList: true, subtree: true });
}, sel);
const visto = (j: Jugador, sel: string) => j.page.evaluate((s) => !!(window as unknown as Record<string, boolean>)[`visto:${s}`], sel);

// ------------------------------------------------------------ prueba

async function main() {
  const load = async (id: string) => compilePuzzle((await import(`../src/data/puzzles/${id}.ts`)).default as PuzzleInput);
  const shrek = await load('shrek');
  const friends = await load('friends');
  const victor = cuenta('victor@example.com', 'Víctor Lebrón');
  const lucia = cuenta('lucia@example.com', 'Lucía Pérez');
  const dani = cuenta('dani@example.com', 'Dani Ruiz');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  const A = await jugador(browser, victor.token, false);
  const B = await jugador(browser, lucia.token, true);

  // 1 · Víctor crea una sala cooperativa desde la portada.
  await A.page.goto(base, { waitUntil: 'networkidle' });
  await A.page.locator('.me-btn').waitFor();
  await A.page.locator('.hero').screenshot({ path: `${SHOTS}/0-portada-ordenador.png` });
  await A.page.getByRole('button', { name: 'crear una sala' }).click();
  await A.page.locator('.pareja').waitFor();
  await foto(A, '0-ventana-crear');
  check((await A.page.locator('.modo.is-on').innerText()).includes('Cooperativo'), 'la ventana «Jugar en pareja» abre con el cooperativo elegido');
  await A.page.locator('.pareja select').selectOption('shrek');
  await A.page.getByRole('button', { name: 'Crear la sala' }).click();
  await A.page.locator('.lobby__letras').waitFor();
  const codigo = codigoDe(A);
  check(/^[BCDFGHJKMNPRSTVWXZ]{5}$/.test(codigo) && (await texto(A, '.lobby__letras')) === codigo, `la sala tiene un código corto (${codigo})`);
  check(/Esperando a tu pareja/.test(await texto(A, '.lobby')) && await A.page.getByRole('button', { name: /Empezar/ }).isDisabled(), 'mientras no entra la pareja, «Empezar» espera');
  await A.page.getByRole('button', { name: 'Copiar el código' }).click();
  // Abriendo el juego por la IP de casa (sin https) no hay portapapeles: se pide dictar el código.
  if (await A.page.evaluate(() => window.isSecureContext)) check(await A.page.evaluate(() => navigator.clipboard.readText()) === codigo, '«Copiar el código» copia las cinco letras');
  else check(/díctale el código/.test(await texto(A, '.lobby__codigo')), 'sin https no se puede copiar y se pide dictar el código');
  await foto(A, '1-espera-ordenador');
  await A.page.emulateMedia({ colorScheme: 'dark' });
  await foto(A, '1-espera-oscuro');
  await A.page.emulateMedia({ colorScheme: 'light' });

  // 2 · Lucía, en el móvil, entra con el código (lo escribe en minúsculas y con un espacio).
  await B.page.goto(base, { waitUntil: 'networkidle' });
  await B.page.locator('.me-btn').waitFor();
  await B.page.locator('.hero').screenshot({ path: `${SHOTS}/0-portada-movil.png` });
  await B.page.getByRole('button', { name: 'Tengo un código' }).click();
  await B.page.locator('.pareja input').fill(`${codigo.slice(0, 2).toLowerCase()} ${codigo.slice(2).toLowerCase()}`);
  check((await B.page.locator('.pareja input').inputValue()) === codigo, 'el código se escribe en mayúsculas y sin espacios');
  await foto(B, '0-ventana-codigo-movil');
  await B.page.getByRole('button', { name: 'Entrar en la sala' }).click();
  await B.page.locator('.lobby').waitFor();
  await until(async () => /Lucía/.test(await texto(A, '.lobby__jugadores')) && /en línea/.test(await texto(A, '.lobby__jugadores')), 'Víctor ve que Lucía ha entrado (en línea)');
  check(/Víctor/.test(await texto(B, '.lobby__jugadores')), 'Lucía ve a Víctor en la sala');
  check(await sinDesbordar(B), 'la sala de espera cabe en el móvil');
  await foto(B, '2-espera-movil');

  // 3 · Empiezan: cuenta atrás en los dos y el tablero se desbloquea.
  await vigilar(A, '.cuenta');
  await vigilar(B, '.cuenta');
  await A.page.getByRole('button', { name: /^Empezar$/ }).click();
  await B.page.locator('.cuenta').waitFor({ timeout: 4000 }).then(() => foto(B, '2b-cuenta-movil')).catch(() => undefined);
  await until(async () => (await visto(A, '.cuenta')) && (await visto(B, '.cuenta')), 'cuenta atrás en los dos dispositivos', 6000);
  await until(async () => !(await A.page.locator('.cuenta, .lobby').count()) && !(await B.page.locator('.cuenta, .lobby').count()), 'tras la cuenta atrás se juega', 6000);
  check(/Lucía/.test(await texto(A, '.sala-bar')) && /en línea/.test(await texto(A, '.sala-bar')), 'la barra de la sala dice que Lucía está en línea');

  // 4 · Cooperativo: lo de uno aparece en el tablero del otro.
  await vigilar(B, '.cell__pareja');
  await colocar(A, shrek, 0);
  await until(async () => (await fichas(B)) === 1, 'Lucía ve al instante la ficha que coloca Víctor');
  await until(async () => visto(B, '.cell__pareja'), 'y la casilla se ilumina un momento en su tablero');
  check(!(await A.page.locator('.cell__pareja').count()), 'en el de Víctor no (lo ha hecho él)');
  const libres = shrek.cells.filter((c) => c.occupiable && !Object.values(shrek.solution).includes(c.i)).map((c) => c.i);
  const fila0 = Math.floor(shrek.solution[shrek.cast[0].id] / shrek.size), col0 = shrek.solution[shrek.cast[0].id] % shrek.size;
  const lejos = libres.filter((i) => Math.floor(i / shrek.size) !== fila0 && i % shrek.size !== col0);
  const [cx, cn, co] = [lejos[0], lejos[3], lejos[6]];
  await herramienta(B, 'Tachar');
  await celda(B, cx).click();
  await herramienta(B, 'Lápiz');
  await elegir(B, 2);
  await celda(B, cn).click();
  await herramienta(B, 'Ocupada');
  await celda(B, co).click();
  await until(async () => (await celda(A, cx).locator('.cell__x:not(.cell__x--auto)').count()) === 1, 'Víctor ve la X que pone Lucía');
  await until(async () => (await celda(A, cn).locator('.note').innerText().catch(() => '')) === shrek.cast[2].tag, 'y su nota a lápiz');
  await until(async () => (await celda(A, co).locator('.cell__occ').count()) === 1, 'y la casilla que marca como ocupada');
  // Zona: Víctor sitúa a un sospechoso en una habitación y Lucía ve sus casillas posibles.
  const k3 = 3;
  await elegir(A, k3);
  await herramienta(A, 'Zona');
  await celda(A, shrek.solution[shrek.cast[k3].id]).click();
  await until(async () => (await B.page.locator('.board__grid .note--zone').count()) > 0, 'Lucía ve la zona que marca Víctor');
  await herramienta(A, 'Zona');
  // Deshacer solo deshace lo tuyo: Víctor quita su zona y la X de Lucía sigue.
  await A.page.locator('.tool--undo:visible').first().click();
  await until(async () => (await B.page.locator('.board__grid .note--zone').count()) === 0, '«Deshacer» de Víctor quita su zona en los dos tableros');
  check((await celda(B, cx).locator('.cell__x:not(.cell__x--auto)').count()) === 1, 'y no toca lo que hizo Lucía');
  await foto(A, '3-cooperativo-ordenador');
  await foto(B, '3-cooperativo-movil');
  check(await sinDesbordar(B), 'la partida en el móvil no se sale de lado');
  await B.page.setViewportSize({ width: 320, height: 640 });
  await B.page.waitForTimeout(300);
  check(await sinDesbordar(B), 'ni en un móvil de 320 px');
  await foto(B, '3-cooperativo-320');
  await B.page.setViewportSize({ width: 844, height: 390 });
  await B.page.waitForTimeout(300);
  check(await sinDesbordar(B), 'ni con el móvil en horizontal');
  await foto(B, '3-cooperativo-horizontal');
  await B.page.setViewportSize({ width: 390, height: 844 });
  const cabe = (j: Jugador) => j.page.evaluate(() => document.querySelector('.board-frame')!.getBoundingClientRect().bottom <= window.innerHeight + 1);
  check(await cabe(A), 'en el ordenador, el plano cabe entero bajo la barra de la sala');
  await A.page.setViewportSize({ width: 1280, height: 720 });
  await A.page.waitForTimeout(300);
  check(await cabe(A), 'también en una pantalla de 1280×720');
  await foto(A, '3-cooperativo-720');
  await A.page.setViewportSize({ width: 1366, height: 860 });

  // 5 · Se cae la conexión de Lucía: se reconecta sola y no se pierde nada.
  const s = salas.get(codigo)!;
  const deLucia = () => s.conns.find((c) => c.identity?.type === 'authenticated' && c.identity.userId === lucia.u.id);
  deLucia()?.ws.close({ code: 1011, reason: 'caída' });
  await colocar(A, shrek, 1);
  await until(async () => (await fichas(B)) === 2, 'tras caerse la conexión, Lucía se reconecta y recibe lo que se jugó');
  await until(async () => /en línea/.test(await texto(A, '.sala-bar')), 'y Víctor la vuelve a ver en línea');

  // 6 · Lucía pierde la red un rato: Víctor la ve reconectando y, al volver, todo sigue.
  cortarPermisos = true;
  deLucia()?.ws.close({ code: 1011, reason: 'sin red' });
  await until(async () => /reconectando/.test(await texto(A, '.sala-bar')), 'si Lucía pierde la conexión, Víctor ve «reconectando…»', 4000);
  await until(async () => /desconectada/.test(await texto(A, '.sala-bar')), 'y si tarda, «desconectada»', 8000);
  await colocar(A, shrek, 2);
  await herramienta(B, 'Lápiz');
  await elegir(B, 4);
  await celda(B, lejos[9]).click();
  cortarPermisos = false;
  await until(async () => (await fichas(B)) === 3 && (await celda(A, lejos[9]).locator('.note').count()) === 1, 'al volver la red, lo de los dos se junta (también lo que hizo Lucía sin conexión)', 20_000);

  // 7 · La sala se duerme (Base44 la saca de memoria) y se despierta: sigue igual.
  await dormir(codigo);
  await colocar(B, shrek, 4);
  await until(async () => (await fichas(A)) === 4, 'tras dormirse la sala, las jugadas siguen llegando');

  // 8 · Lucía recarga la página: vuelve a entrar sola y ve el tablero entero.
  await B.page.reload({ waitUntil: 'networkidle' });
  await until(async () => (await fichas(B)) === 4 && (await celda(B, cx).locator('.cell__x:not(.cell__x--auto)').count()) === 1, 'al recargar, Lucía vuelve a la sala con el tablero entero');

  // 9 · Resuelven entre los dos: Lucía coloca a los que faltan y Víctor acusa.
  for (let k = 3; k < shrek.cast.length; k++) if (k !== 4) await colocar(k % 2 ? B : A, shrek, k);
  await until(async () => (await fichas(A)) === shrek.cast.length, 'el tablero compartido se completa');
  await acusar(A, shrek);
  await until(async () => /Resuelto entre los dos/.test(await texto(A, '.final')) && /Resuelto entre los dos/.test(await texto(B, '.final')), 'caso cerrado en los dos dispositivos', 12_000);
  check(/Acusaste tú/.test(await texto(A, '.final__texto')) && /Acusó Víctor/.test(await texto(B, '.final__texto')), 'cada uno sabe quién acusó');
  await until(async () => /1 caso resuelto juntos/.test(await texto(A, '.final .marcador')), 'el marcador apunta el caso resuelto juntos');
  await foto(B, '4-resuelto-movil');
  check(!(await A.page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('churri-doku:progress') ?? '{}')).includes('shrek'))), 'la partida en pareja no toca el progreso de siempre');

  // 10 · Otra partida: duelo con otro caso.
  await A.page.getByRole('button', { name: /Otra partida/ }).click();
  await A.page.locator('.pareja .modo', { hasText: 'Duelo' }).click();
  await A.page.locator('.pareja select').selectOption('friends');
  await A.page.getByRole('button', { name: 'Preparar la partida' }).click();
  await until(async () => /Duelo/.test(await texto(B, '.lobby')) && /Friends/.test(await texto(B, '.lobby')), 'Lucía ve la sala de espera del duelo');
  await until(async () => /ha preparado otra partida/.test(await texto(B, '.sala-toast')), 'y un aviso de que Víctor ha preparado otra partida', 3000);
  check(!/ha preparado otra partida/.test(await texto(A, '.sala-toast')), 'ese aviso no le sale a quien la ha preparado');
  await B.page.getByRole('button', { name: /^Empezar$/ }).click();
  await until(async () => !(await A.page.locator('.cuenta, .lobby').count()), 'empieza el duelo', 8000);
  check(await A.page.locator('.tool--hint:visible').first().isDisabled(), 'en el duelo no hay pistas');
  check((await fichas(A)) === 0 && (await fichas(B)) === 0, 'cada uno empieza con su tablero vacío');
  await colocar(B, friends, 0);
  await colocar(B, friends, 1);
  await until(async () => /2\/9/.test(await texto(A, '.sala-bar__prog')), 'Víctor ve cuánto lleva Lucía (2/9)');
  check((await fichas(A)) === 0, 'pero no ve su tablero');
  await foto(A, '5-duelo-ordenador');
  for (let k = 0; k < friends.cast.length; k++) await colocar(A, friends, k);
  // La conexión de Víctor se cae justo al acusar: el aviso de «resuelto» se manda en cuanto vuelve.
  cortarPermisos = true;
  s.conns.filter((c) => c.identity?.type === 'authenticated' && c.identity.userId === victor.u.id).forEach((c) => c.ws.close({ code: 1011, reason: 'caída' }));
  await acusar(A, friends);
  await A.page.waitForTimeout(1500);
  cortarPermisos = false;
  await until(async () => /gana el duelo/.test(await texto(B, '.final')), 'aunque se cayera la conexión al acusar, al volver cuenta y Lucía sabe que ha perdido', 20_000);
  await until(async () => /Has ganado el duelo/.test(await texto(A, '.final')), 'y Víctor que ha ganado', 12_000);
  await foto(A, '6-duelo-ganado-ordenador');
  await foto(B, '6-duelo-perdido-movil');
  await B.page.getByRole('button', { name: 'Seguir hasta resolverlo' }).click();
  for (let k = 2; k < friends.cast.length; k++) await colocar(B, friends, k);
  await acusar(B, friends);
  await until(async () => /Tú, en/.test(await texto(B, '.final__texto')), 'Lucía lo termina y ve su tiempo junto al de Víctor', 12_000);
  await until(async () => {
    const f = [...filas.values()][0];
    return !!f && f.duelos === 1 && JSON.parse(f.tiempos).friends.filter((x: number | null) => x != null).length === 2;
  }, 'el marcador guarda la victoria y el tiempo de cada uno');

  // 11 · Un tercero no puede entrar; un código inventado no existe; sin cuenta hay que entrar.
  const C = await jugador(browser, dani.token, false);
  await C.page.goto(`${base}#/sala/${codigo}`, { waitUntil: 'networkidle' });
  await until(async () => /La sala está completa/.test(await texto(C, '.daily-empty__card')), 'una tercera persona ve «La sala está completa»');
  await C.page.goto(`${base}#/sala/BBBBB`, { waitUntil: 'networkidle' });
  await until(async () => /Esa sala no existe/.test(await texto(C, '.daily-empty__card')), 'con un código que no existe: «Esa sala no existe»');
  const D = await jugador(browser, null, true);
  await D.page.goto(`${base}#/sala/${codigo}`, { waitUntil: 'networkidle' });
  await until(async () => /Entra con tu cuenta/.test(await texto(D, '.daily-empty__card')), 'sin cuenta se pide entrar antes de abrir la sala');

  // 12 · Víctor va a la portada sin salir: allí ve su sala abierta y vuelve a ella.
  await A.page.locator('.final').getByRole('button', { name: 'Ver el tablero' }).click();
  await A.page.locator('.game__head').getByRole('button', { name: /Casos/ }).click();
  await until(async () => /Tienes una sala abierta \(/.test(await texto(A, '.pareja-nudge')), 'en la portada, Víctor ve que tiene la sala abierta');
  await until(async () => /desconectad|reconectando/.test(await texto(B, '.sala-bar')), 'y Lucía ve que Víctor no está en la sala');
  await A.page.getByRole('button', { name: 'Volver a la sala' }).click();
  await until(async () => (await A.page.locator('.sala-bar').count()) > 0 && /en línea/.test(await texto(B, '.sala-bar')), 'Víctor vuelve a la sala desde la portada');

  // 13 · Salir: Lucía sale y Víctor lo ve; al salir los dos, la sala desaparece.
  await B.page.locator('.final').getByRole('button', { name: 'Ver el tablero' }).click();
  await B.page.locator('.sala-bar').getByRole('button', { name: /Salir/ }).click();
  await B.page.locator('.pareja').getByRole('button', { name: /Salir de la sala/ }).click();
  await until(async () => new URL(B.page.url()).hash === '#/', 'Lucía sale y vuelve a la portada');
  await until(async () => /ha salido/.test(await texto(A, '.sala-bar')) || /ha salido/.test(await texto(A, '.sala-toast')), 'Víctor ve que Lucía ha salido');
  check(!/Tienes una sala abierta/.test(await texto(B, '.pareja-nudge')), 'en la portada de Lucía ya no sale la sala abierta');
  // Al volver a una partida terminada se ve otra vez el final: se sale desde ahí.
  if (await A.page.locator('.final').count()) await A.page.locator('.final').getByRole('button', { name: /Salir de la sala/ }).click();
  else await A.page.locator('.sala-bar').getByRole('button', { name: /Salir/ }).click();
  await A.page.locator('.pareja').getByRole('button', { name: /Salir de la sala/ }).click();
  await until(async () => new URL(A.page.url()).hash === '#/' && s.datos.size === 0, 'al salir los dos, la sala se borra');

  // 14 · El marcador de la pareja en la portada (lo lee de Base44 con sus reglas).
  await A.page.reload({ waitUntil: 'networkidle' });
  await until(async () => /Vuestro marcador/.test(await texto(A, '.couple__marcadores')), 'la portada de Víctor enseña el marcador de la pareja');
  const m = await texto(A, '.couple__marcadores .marcador');
  check(/1 caso resuelto juntos/.test(m) && /Tú/.test(m) && /Lucía/.test(m) && /Friends|Nº/.test(m), 'con las victorias, los casos juntos y los mejores tiempos de cada uno');
  await A.page.locator('.couple').scrollIntoViewIfNeeded();
  await A.page.locator('.couple').screenshot({ path: `${SHOTS}/7-marcador-portada.png` });
  const Cm = await jugador(browser, dani.token, false);
  await Cm.page.goto(base, { waitUntil: 'networkidle' });
  await Cm.page.waitForTimeout(1500);
  check(!(await Cm.page.locator('.couple__marcadores').count()), 'quien no es de la pareja no ve su marcador');

  // 15 · La sesión caduca con la sala abierta: al reconectar, se pide volver a entrar (sin bucles ni errores).
  await Cm.page.getByRole('button', { name: 'crear una sala' }).click();
  await Cm.page.getByRole('button', { name: 'Crear la sala' }).click();
  await Cm.page.locator('.lobby__letras').waitFor();
  const codigoDani = codigoDe(Cm);
  tokens.delete(dani.token);
  salas.get(codigoDani)!.conns.forEach((c) => c.ws.close({ code: 1011, reason: 'caída' }));
  await until(async () => /Tu sesión ha caducado/.test(await texto(Cm, '.daily-empty__card')), 'si la sesión caduca con la sala abierta, se pide volver a entrar');

  for (const j of [A, B, C, D, Cm]) for (const e of j.errores) { fallos++; console.log(`✘ ${e}`); }
  await browser.close();
  console.log(fallos ? `\n${fallos} fallos · capturas en ${SHOTS}` : `\nModo pareja: todo correcto · capturas en ${SHOTS}`);
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
