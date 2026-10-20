/**
 * Prueba de las cuentas con un Base44 de mentira (en memoria): bienvenida, registro con código,
 * entrar desde otro dispositivo, progreso que viaja entre dispositivos, entrar con Google
 * con progreso sin cuenta (pregunta de juntar), sesión caducada, borrar progreso y cerrar sesión.
 *   npx tsx scripts/e2e-account.ts [url]
 */
import { chromium, type Browser, type Page, type Route } from 'playwright-core';
import { compilePuzzle } from '../src/engine/puzzle';
import { displayName } from '../src/engine/text';
import type { PuzzleInput } from '../src/engine/types';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const APP = '6ad7e5d5a1f2149ed0366eac';
const APP_DOMAIN = 'https://churri-doku-d0366eac.base44.app';

// ------------------------------------------------------------ Base44 de mentira

interface User { id: string; email: string; full_name: string; password: string; verified: boolean }
interface Save { id: string; data: string; updated?: number; solved?: number; created_by: string; updated_date: string }
const db = {
  users: new Map<string, User>(),
  tokens: new Map<string, string>(),
  saves: [] as Save[],
  calls: [] as string[],
  verifyReturnsToken: false,
};
let nextId = 1;
const newId = () => `id${nextId++}`;
const newToken = (email: string) => {
  const t = `tok-${newId()}`;
  db.tokens.set(t, email);
  return t;
};

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS' };
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const fail = (route: Route, status: number, message: string) => json(route, status, { error_type: 'HTTPException', message, detail: message });

async function api(route: Route) {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const url = new URL(req.url());
  const path = url.pathname.replace(`/api/apps/${APP}`, '');
  const body = req.postData() ? JSON.parse(req.postData()!) : {};
  const auth = req.headers()['authorization']?.replace('Bearer ', '');
  const me = auth ? db.users.get(db.tokens.get(auth) ?? '') : undefined;
  db.calls.push(`${req.method()} ${path}`);
  if (req.headers()['x-app-id'] !== APP) return fail(route, 400, 'Missing app id');

  if (path === '/auth/register') {
    if (db.users.has(body.email)) return fail(route, 400, 'User already exists');
    db.users.set(body.email, { id: newId(), email: body.email, full_name: body.full_name ?? '', password: body.password, verified: false });
    return json(route, 200, { message: 'OTP sent' });
  }
  if (path === '/auth/verify-otp') {
    const u = db.users.get(body.email);
    if (!u) return fail(route, 400, 'User not found');
    if (body.otp_code !== '123456') return fail(route, 400, 'Invalid OTP code');
    u.verified = true;
    return json(route, 200, db.verifyReturnsToken ? { access_token: newToken(u.email), user: u } : { message: 'verified' });
  }
  if (path === '/auth/resend-otp') return db.users.has(body.email) ? json(route, 200, {}) : fail(route, 400, 'User not found');
  if (path === '/auth/login') {
    const u = db.users.get(body.email);
    if (!u || u.password !== body.password) return fail(route, 401, 'Invalid email or password');
    if (!u.verified) return fail(route, 403, 'Email not verified');
    return json(route, 200, { access_token: newToken(u.email), user: u });
  }
  if (path === '/auth/reset-password-request') return json(route, 200, { message: 'If an account exists with this email, you will receive a password reset link.' });
  if (path === '/entities/User/me') {
    if (!me) return fail(route, 401, 'Authentication required to view users');
    if (req.method() === 'PUT') Object.assign(me, body);
    return json(route, 200, me);
  }
  if (path.startsWith('/entities/PlayerSave')) {
    if (!me) return req.method() === 'GET' ? json(route, 200, []) : fail(route, 403, 'Permission denied for create operation on PlayerSave entity');
    const id = path.split('/')[3];
    const mine = db.saves.filter((s) => s.created_by === me.email);
    if (req.method() === 'GET') {
      const q = JSON.parse(url.searchParams.get('q') ?? '{}');
      return json(route, 200, mine.filter((s) => !q.created_by || s.created_by === q.created_by).sort((a, b) => b.updated_date.localeCompare(a.updated_date)));
    }
    if (req.method() === 'POST') {
      const s: Save = { id: newId(), ...body, created_by: me.email, updated_date: new Date().toISOString() };
      db.saves.push(s);
      return json(route, 200, s);
    }
    const s = mine.find((x) => x.id === id);
    if (!s) return fail(route, 404, 'Not found');
    if (req.method() === 'PUT') {
      Object.assign(s, body, { updated_date: new Date().toISOString() });
      return json(route, 200, s);
    }
    if (req.method() === 'DELETE') {
      db.saves = db.saves.filter((x) => x !== s);
      return json(route, 200, { success: true });
    }
  }
  return fail(route, 404, `Sin simular: ${req.method()} ${path}`);
}

/** Google: Base44 vuelve a su dominio y el puente trae la sesión al juego (aquí se simula de golpe). */
const googleUser = { email: 'lucia@example.com', full_name: 'Lucía Pérez' };
async function appDomain(route: Route) {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/apps/auth/login') {
    if (!db.users.has(googleUser.email)) db.users.set(googleUser.email, { id: newId(), ...googleUser, password: '', verified: true });
    return route.fulfill({ status: 302, headers: { location: `${base}?access_token=${newToken(googleUser.email)}&is_new_user=false#/` } });
  }
  if (url.pathname === '/api/apps/auth/logout') return route.fulfill({ status: 302, headers: { location: base } });
  return route.fulfill({ status: 404, body: 'no' });
}

// ------------------------------------------------------------ utilidades

async function device(browser: Browser, opts: { welcome?: boolean; mobile?: boolean } = {}) {
  const ctx = await browser.newContext(opts.mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 860 } });
  await ctx.route('https://base44.app/api/**', api);
  await ctx.route(`${APP_DOMAIN}/**`, appDomain);
  if (opts.welcome) await ctx.addInitScript(() => localStorage.setItem('churri-doku:welcome-test', 'true'));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { throw new Error(`pageerror: ${e.message}`); });
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log(`  [consola] ${m.text()}`); });
  return { ctx, page };
}

function check(cond: unknown, msg: string) {
  if (!cond) throw new Error(`✘ ${msg}`);
  console.log(`✔ ${msg}`);
}

async function until(fn: () => boolean | Promise<boolean>, msg: string, ms = 10_000) {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > ms) throw new Error(`✘ (tiempo agotado) ${msg}`);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`✔ ${msg}`);
}

async function solve(page: Page, p: ReturnType<typeof compilePuzzle>) {
  await page.goto(`${base}#/caso/${p.id}`, { waitUntil: 'networkidle' });
  await page.click('.dossier__actions .btn--primary');
  for (const [k, ch] of p.cast.entries()) {
    await page.locator('.suspects .suspect').nth(k).locator('.suspect__photo').click();
    await page.locator('.board__grid [role="gridcell"]').nth(p.solution[ch.id]).click();
  }
  await page.locator('.tool--accuse:visible').first().click();
  await page.locator('.accuse .polaroid--btn', { hasText: displayName(p.cast.find((c) => c.id === p.murderer)!) }).click();
  await page.locator('.result__title').waitFor({ timeout: 15000 });
}

const progress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('churri-doku:progress') ?? '{}'));
const solvedIds = async (page: Page) => Object.entries(await progress(page)).filter(([, c]) => (c as { solved?: boolean; bestTime?: number }).solved || (c as { bestTime?: number }).bestTime != null).map(([id]) => id).sort();
const cloudSave = (email: string) => db.saves.filter((s) => s.created_by === email);
const cloudData = async (page: Page, email: string) => {
  const s = cloudSave(email)[0];
  if (!s) return null;
  return page.evaluate(async (text) => {
    const b64 = text.slice(1).replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64 + '==='.slice((b64.length + 3) % 4)), (c) => c.charCodeAt(0));
    const raw = text[0] === 'z' ? new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()) : bytes;
    return JSON.parse(new TextDecoder().decode(raw));
  }, s.data);
};

async function openProfile(page: Page) {
  await page.locator('.me-btn').click();
  await page.locator('.account--profile').waitFor();
}

async function saveNow(page: Page) {
  await openProfile(page);
  await page.getByRole('button', { name: /Guardar ahora/ }).click();
  await page.locator('.sync-line--ok').waitFor({ timeout: 10_000 });
  await page.keyboard.press('Escape');
}

// ------------------------------------------------------------ prueba

async function main() {
  const load = async (id: string) => compilePuzzle((await import(`../src/data/puzzles/${id}.ts`)).default as PuzzleInput);
  const office = await load('office');
  const friends = await load('friends');
  const shrek = await load('shrek');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  // 1 · A juega sin cuenta, ve la bienvenida y se registra con su correo.
  const A = await device(browser, { welcome: true });
  await A.page.goto(base, { waitUntil: 'networkidle' });
  await A.page.locator('.account--welcome').waitFor({ timeout: 5000 });
  check(/Hola, detective/i.test(await A.page.locator('.account--welcome').innerText()), 'A ve la bienvenida al entrar');
  await A.page.getByRole('button', { name: /Ahora no, jugar sin cuenta/ }).click();
  await A.page.reload({ waitUntil: 'networkidle' });
  await A.page.waitForTimeout(1500);
  check(!(await A.page.locator('.account--welcome').count()), 'tras «Ahora no» no vuelve a salir al recargar');
  await solve(A.page, office);
  await A.page.goto(base, { waitUntil: 'networkidle' });
  check(/solo está en este navegador/.test(await A.page.locator('.nudge').innerText()), 'la portada avisa de que el progreso solo está en el navegador');
  await A.page.locator('.account-btn').click();
  await A.page.getByRole('tab', { name: 'Crear cuenta' }).click();
  await A.page.getByLabel(/Tu nombre/).fill('Víctor');
  await A.page.getByLabel('Correo').fill('victor@example.com');
  await A.page.getByLabel('Contraseña', { exact: true }).fill('corto');
  await A.page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  check(/al menos 8 caracteres/.test(await A.page.locator('.account__error').innerText()), 'avisa si la contraseña es corta');
  await A.page.getByLabel('Contraseña', { exact: true }).fill('secreta123');
  await A.page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await A.page.locator('.account--verify').waitFor();
  check((await A.page.locator('.account--verify').innerText()).includes('victor@example.com'), 'pide el código enviado a su correo');
  await A.page.getByLabel('Código').fill('000000');
  await A.page.getByRole('button', { name: 'Confirmar' }).click();
  check(/no es correcto o ha caducado/.test(await A.page.locator('.account__error').innerText()), 'un código malo da un aviso claro');
  await A.page.getByLabel('Código').fill('123456');
  await A.page.getByRole('button', { name: 'Confirmar' }).click();
  await A.page.locator('.me-btn').waitFor();
  check(db.users.get('victor@example.com')?.verified, 'la cuenta queda confirmada');
  await until(() => cloudSave('victor@example.com').length === 1, 'su progreso se guarda en la cuenta');
  const cloudA = await cloudData(A.page, 'victor@example.com');
  check(cloudA.p[office.id]?.solved && cloudA.n?.v === 'Víctor', 'la copia de la nube tiene su caso resuelto y su nombre');
  check(/ya está guardado en tu cuenta/.test(await A.page.locator('.notice-toast').innerText()), 'le avisa de que su progreso ya está en la cuenta');

  // 2 · B (otro dispositivo, en el móvil) entra con correo y contraseña: recibe lo de A.
  const B = await device(browser, { mobile: true });
  await B.page.goto(base, { waitUntil: 'networkidle' });
  await B.page.locator('.account-btn').click();
  await B.page.getByLabel('Correo').fill('victor@example.com');
  await B.page.getByLabel('Contraseña', { exact: true }).fill('mala-clave');
  await B.page.getByRole('button', { name: 'Entrar', exact: true }).click();
  check(/no son correctos/.test(await B.page.locator('.account__error').innerText()), 'una contraseña mala da un aviso claro');
  await B.page.getByLabel('Contraseña', { exact: true }).fill('secreta123');
  await B.page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await B.page.locator('.me-btn').waitFor();
  await until(async () => (await solvedIds(B.page)).includes(office.id), 'B recibe el caso resuelto en A');
  check(!(await B.page.locator('.account--welcome, .choice').count()), 'B no ve preguntas (no tenía progreso)');
  check(await B.page.evaluate(() => JSON.parse(localStorage.getItem('churri-doku:settings') ?? '{}').playerName) === 'Víctor', 'B recibe el nombre de los retos');
  check(await B.page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('churri-doku:achievements') ?? '{}')).includes('primer-caso')), 'B recibe los logros');

  // 3 · B empieza otro caso; A lo ve al volver a la pestaña.
  await B.page.goto(`${base}#/caso/${friends.id}`, { waitUntil: 'networkidle' });
  await B.page.click('.dossier__actions .btn--primary');
  const [c0, c1] = friends.cast;
  await B.page.locator('.strip .chip').nth(0).click();
  await B.page.locator('.board__grid [role="gridcell"]').nth(friends.solution[c0.id]).click();
  await B.page.locator('.strip .chip').nth(1).click();
  await B.page.locator('.board__grid [role="gridcell"]').nth(friends.solution[c1.id]).click();
  await B.page.goto(base, { waitUntil: 'networkidle' });
  await saveNow(B.page);
  await A.page.reload({ waitUntil: 'networkidle' });
  await until(async () => Object.keys((await progress(A.page))[friends.id]?.board?.placed ?? {}).length === 2, 'A recibe la partida a medias de B');
  await A.page.goto(`${base}#/caso/${friends.id}`, { waitUntil: 'networkidle' });
  if (await A.page.locator('.dossier__actions .btn--primary').count()) await A.page.click('.dossier__actions .btn--primary');
  await until(async () => (await A.page.locator('.board__grid .token').count()) === 2, 'en A el tablero muestra las dos fichas de B');

  // 4 · A resuelve otro caso con la cuenta abierta: se guarda enseguida y B lo recibe al recargar.
  await solve(A.page, shrek);
  await until(async () => (await cloudData(A.page, 'victor@example.com'))?.p[shrek.id]?.solved === true, 'al resolver un caso se guarda en la cuenta en segundos');
  await B.page.reload({ waitUntil: 'networkidle' });
  await until(async () => (await solvedIds(B.page)).includes(shrek.id), 'B recibe el caso resuelto en A');

  // 5 · C juega sin cuenta y entra con Google en la cuenta de Lucía, que ya tenía progreso: se le pregunta.
  const L = await device(browser);
  await L.page.goto(base, { waitUntil: 'networkidle' });
  await L.page.locator('.account-btn').click();
  await L.page.locator('.btn--google').click();
  await L.page.locator('.me-btn').waitFor();
  check(!(await L.page.evaluate(() => location.search)).includes('access_token'), 'la vuelta de Google deja la dirección limpia');
  await solve(L.page, friends);
  await until(async () => (await cloudData(L.page, googleUser.email))?.p[friends.id]?.solved === true, 'la cuenta de Google de Lucía guarda su caso');
  const C = await device(browser);
  await solve(C.page, office);
  await C.page.goto(base, { waitUntil: 'networkidle' });
  await C.page.locator('.account-btn').click();
  await C.page.locator('.btn--google').click();
  await C.page.locator('.choice').waitFor({ timeout: 10_000 });
  check(/Este dispositivo\s*1 caso resuelto[\s\S]*Tu cuenta\s*1 caso resuelto/.test(await C.page.locator('.choice').innerText()), 'pregunta qué hacer con el progreso de este dispositivo');
  await C.page.getByRole('button', { name: 'Juntarlo todo' }).click();
  await until(async () => (await solvedIds(C.page)).join() === [friends.id, office.id].sort().join(), 'al juntar, C tiene los dos casos');
  await until(async () => { const d = await cloudData(C.page, googleUser.email); return !!d?.p[office.id]?.solved && !!d?.p[friends.id]?.solved; }, 'y la cuenta de Lucía también');
  check(await C.page.evaluate(() => JSON.parse(localStorage.getItem('churri-doku:settings') ?? '{}').playerName) === 'Lucía', 'el nombre de los retos sale de su cuenta de Google');

  // 6 · Sesión caducada: el juego sigue, avisa y no pierde nada.
  for (const [t, e] of db.tokens) if (e === googleUser.email) db.tokens.delete(t);
  await C.page.reload({ waitUntil: 'networkidle' });
  await C.page.locator('.nudge--warn').waitFor({ timeout: 10_000 });
  check(/sesión ha caducado/.test(await C.page.locator('.nudge').innerText()), 'si la sesión caduca, la portada lo dice');
  check((await solvedIds(C.page)).length === 2, 'y el progreso sigue en el dispositivo');

  // 7 · Borrar el progreso con cuenta: se borra también en los demás dispositivos.
  await B.page.locator('[aria-label="Ajustes"]').first().click();
  await B.page.getByRole('button', { name: /Borrar mi progreso/ }).click();
  check(/también de tu cuenta/.test(await B.page.locator('.settings__danger').innerText()), 'el aviso de borrar menciona la cuenta');
  await B.page.getByRole('button', { name: 'Sí, borrar' }).click();
  await until(async () => { const d = await cloudData(B.page, 'victor@example.com'); return !!d && Object.keys(d.p).length === 0; }, 'la copia de la cuenta se vacía');
  await A.page.goto(base, { waitUntil: 'networkidle' });
  await A.page.reload({ waitUntil: 'networkidle' });
  await until(async () => (await solvedIds(A.page)).length === 0, 'A también se queda a cero');

  // 8 · Cerrar sesión: el dispositivo vuelve a empezar y la cuenta conserva lo suyo.
  await solve(A.page, office);
  await until(async () => (await cloudData(A.page, 'victor@example.com'))?.p[office.id]?.solved === true, 'tras borrar, lo nuevo se vuelve a guardar');
  await A.page.goto(base, { waitUntil: 'networkidle' });
  await openProfile(A.page);
  await A.page.getByRole('button', { name: /Cerrar sesión/ }).click();
  await A.page.locator('.account-btn').waitFor();
  check((await solvedIds(A.page)).length === 0, 'al cerrar sesión el dispositivo empieza de cero');
  check(!(await A.page.evaluate(() => localStorage.getItem('churri-doku:token'))), 'y no queda la sesión guardada');
  check((await cloudData(A.page, 'victor@example.com'))?.p[office.id]?.solved, 'la cuenta conserva el progreso');

  // 9 · La pantalla de restablecer contraseña se abre desde el enlace del correo.
  await A.page.goto(`${base}#/cuenta/restablecer?token=abc`, { waitUntil: 'networkidle' });
  await A.page.locator('.account--reset').waitFor();
  check(!(await A.page.evaluate(() => location.hash)).includes('token'), 'el enlace de restablecer abre su pantalla y limpia la dirección');

  console.log(`\nLlamadas al servidor: ${db.calls.length}`);
  await browser.close();
  console.log('\nTodo bien.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
