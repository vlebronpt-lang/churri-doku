/**
 * Prueba de punta a punta de lo nuevo: tutorial guiado, arrastrar fichas, zoom, móvil en horizontal,
 * academia, logros, avisos de pistas, informes y panel, y caso del día (si hay calendario).
 *   npx tsx scripts/e2e-new.ts [url]
 */
import { chromium, type BrowserContext, type Page } from 'playwright-core';
import { compilePuzzle } from '../src/engine/puzzle';
import { displayName } from '../src/engine/text';
import { TUTORIAL } from '../src/data/tutorial';
import { LESSONS } from '../src/data/academy/lessons';
import type { Puzzle, PuzzleInput } from '../src/engine/types';
import { dailyInput, type DailyEntry } from '../src/engine/variant';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:5173/';
const SHOTS = `${process.env.TMPDIR ?? '/tmp'}/e2e-new`;

let failures = 0;
const errors: string[] = [];
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].toLowerCase() : '';
async function check(name: string, fn: () => Promise<void>) {
  if (only && !name.toLowerCase().includes(only)) return;
  const t0 = Date.now();
  try {
    await fn();
    console.log(`✔ ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (e) {
    failures++;
    console.log(`✘ ${name}: ${(e as Error).message.split('\n').slice(0, process.env.E2E_VERBOSE ? 30 : 2).join(' | ')}`);
    for (const pg of openPages) await pg.screenshot({ path: `${SHOTS}/fallo-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}-${openPages.indexOf(pg)}.png` }).catch(() => {});
  }
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const openPages: Page[] = [];
async function newPage(ctx: BrowserContext) {
  const page = await ctx.newPage();
  openPages.push(page);
  page.on('close', () => openPages.splice(openPages.indexOf(page), 1));
  // Sin «Compartir» del sistema (como en la mayoría de ordenadores): se copia al portapapeles.
  await page.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: undefined }); } catch { /* */ } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  return page;
}

const cells = (page: Page) => page.locator('.board__grid > .cell');
async function cellCenter(page: Page, i: number) {
  const b = await cells(page).nth(i).boundingBox();
  assert(b, `no encuentro la casilla ${i}`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Arrastre con el dedo (eventos táctiles reales a través de CDP). */
async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, holdMs = 260) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (p: { x: number; y: number }) => [{ x: Math.round(p.x), y: Math.round(p.y), id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from) });
  await page.waitForTimeout(holdMs);
  const steps = 8;
  for (let k = 1; k <= steps; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt({ x: from.x + ((to.x - from.x) * k) / steps, y: from.y + ((to.y - from.y) * k) / steps }) });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function placedAt(page: Page, i: number) {
  return (await cells(page).nth(i).locator('.token').count()) > 0;
}

async function solveTutorial(page: Page, mobile: boolean) {
  const p = compilePuzzle(TUTORIAL);
  const idx = (id: string) => p.cast.findIndex((c) => c.id === id);
  const pick = async (id: string) => {
    if (mobile) await page.locator('.strip .chip').nth(idx(id)).click();
    else await page.locator('.suspects .suspect').nth(idx(id)).locator('.suspect__photo').click();
  };
  const step = async () => (await page.locator('.coach__step').innerText()).trim();
  await page.goto(`${base}#/tutorial`);
  await page.locator('.dossier__actions .btn--primary', { hasText: 'Empezar el tutorial' }).click();
  await page.locator('.coach').waitFor();
  assert((await step()).startsWith('Paso 1 de'), 'el tutorial no empieza en el paso 1');
  await page.screenshot({ path: `${SHOTS}/tutorial-1${mobile ? '-movil' : ''}.png` });
  await page.locator('.coach .btn--primary').click();
  // Un error a propósito: elegir a Homer cuando toca Lisa.
  await pick('H');
  await page.locator('.toast', { hasText: 'Lisa' }).waitFor({ timeout: 3000 });
  await pick('L');
  await cells(page).nth(3).click();
  assert(await placedAt(page, 3), 'Lisa no se ha colocado');
  await page.locator('.coach .btn--primary').click();
  await pick('H');
  await page.screenshot({ path: `${SHOTS}/tutorial-homer${mobile ? '-movil' : ''}.png` });
  await cells(page).nth(5).click();
  assert(await placedAt(page, 5), 'Homer no se ha colocado');
  await page.locator('.tool--occ:visible').first().click();
  await cells(page).nth(14).click();
  assert(await cells(page).nth(14).locator('.cell__occ').count(), 'no aparece la marca «Ocupada»');
  await pick('B');
  await cells(page).nth(8).click();
  await pick('V');
  await cells(page).nth(14).click();
  assert((await step()).includes('13 de 13'), `debería estar en el último paso (${await step()})`);
  await page.locator('.tool--accuse:visible').first().click();
  await page.locator('.accuse .polaroid--btn', { hasText: 'Bart' }).click();
  await page.locator('.lesson-done', { hasText: 'Caso cerrado' }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/tutorial-fin${mobile ? '-movil' : ''}.png` });
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('churri-doku:events') ?? '{}').tutorialDone);
  assert(done, 'no se ha guardado el tutorial como hecho');
}

async function load(id: string): Promise<Puzzle> {
  return compilePuzzle((await import(`../src/data/puzzles/${id}.ts`)).default as PuzzleInput);
}

async function main() {
  const { mkdirSync } = await import('node:fs');
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const desk = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await desk.grantPermissions(['clipboard-read', 'clipboard-write']);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const dpage = await newPage(desk);
  const mpage = await newPage(phone);

  await check('Tutorial guiado (escritorio)', () => solveTutorial(dpage, false));
  await check('Tutorial guiado (móvil)', () => solveTutorial(mpage, true));

  await check('Arrastrar un sospechoso al plano y mover su ficha (ratón)', async () => {
    const p = await load('shrek');
    await dpage.goto(`${base}#/caso/shrek`);
    await dpage.evaluate(() => localStorage.removeItem('churri-doku:progress'));
    await dpage.reload();
    await dpage.locator('.dossier__actions .btn--primary').click();
    const k = p.cast.findIndex((c) => !c.victim);
    const target = p.cells.find((c) => c.occupiable)!.i;
    const photo = await dpage.locator('.suspects .suspect').nth(k).locator('.suspect__photo').boundingBox();
    assert(photo, 'sin foto');
    const to = await cellCenter(dpage, target);
    await dpage.mouse.move(photo.x + photo.width / 2, photo.y + photo.height / 2);
    await dpage.mouse.down();
    await dpage.mouse.move(photo.x + photo.width / 2 + 20, photo.y + 20, { steps: 4 });
    await dpage.mouse.move(to.x, to.y, { steps: 12 });
    assert(await dpage.locator('.drag-ghost').count(), 'no aparece la ficha que se arrastra');
    assert(await cells(dpage).nth(target).evaluate((el) => el.classList.contains('is-drop')), 'no se resalta la casilla de destino');
    await dpage.mouse.up();
    assert(await placedAt(dpage, target), 'no se ha colocado al soltar');
    // Mover la ficha a otra casilla libre de otra fila y columna.
    const other = p.cells.find((c) => c.occupiable && c.r !== p.cells[target].r && c.c !== p.cells[target].c)!.i;
    const a = await cellCenter(dpage, target), b = await cellCenter(dpage, other);
    await dpage.mouse.move(a.x, a.y);
    await dpage.mouse.down();
    await dpage.mouse.move(b.x, b.y, { steps: 10 });
    await dpage.mouse.up();
    assert(await placedAt(dpage, other) && !(await placedAt(dpage, target)), 'la ficha no se ha movido');
  });

  await check('Arrastrar desde la tira con el dedo (móvil)', async () => {
    const p = await load('shrek');
    await mpage.goto(`${base}#/caso/shrek`);
    await mpage.evaluate(() => localStorage.removeItem('churri-doku:progress'));
    await mpage.reload();
    await mpage.locator('.dossier__actions .btn--primary').click();
    const k = p.cast.findIndex((c) => !c.victim);
    const target = p.solution[p.cast[k].id];
    const chip = await mpage.locator('.strip .chip').nth(k).boundingBox();
    assert(chip, 'sin ficha en la tira');
    await touchDrag(mpage, { x: chip.x + chip.width / 2, y: chip.y + chip.height / 2 }, await cellCenter(mpage, target));
    assert(await placedAt(mpage, target), 'no se ha colocado al arrastrar con el dedo');
    // Un deslizamiento rápido no debe colocar a nadie.
    const k2 = p.cast.findIndex((c, j) => j > k && !c.victim);
    const chip2 = await mpage.locator('.strip .chip').nth(k2).boundingBox();
    const t2 = p.solution[p.cast[k2].id];
    await touchDrag(mpage, { x: chip2!.x + chip2!.width / 2, y: chip2!.y + chip2!.height / 2 }, await cellCenter(mpage, t2), 0);
    assert(!(await placedAt(mpage, t2)), 'un deslizamiento rápido ha colocado a alguien');
  });

  await check('Zoom del plano en el móvil (10×10)', async () => {
    await mpage.goto(`${base}#/caso/tronos`);
    await mpage.locator('.dossier__actions .btn--primary').click();
    const btn = mpage.locator('.zoom-btn');
    assert(await btn.isVisible(), 'no se ve el botón de ampliar');
    const w0 = (await mpage.locator('.board-frame').boundingBox())!.width;
    await btn.click();
    const w1 = (await mpage.locator('.board-frame').boundingBox())!.width;
    assert(w1 > w0 * 1.5, `el plano no se amplía (${w0} → ${w1})`);
    const scroll = await mpage.locator('.board-wrap').evaluate(async (el) => {
      for (let k = 0; k < 20 && !(el.scrollWidth > el.clientWidth && el.scrollLeft > 0); k++) await new Promise((r) => setTimeout(r, 50));
      return el.scrollWidth > el.clientWidth && el.scrollLeft > 0;
    });
    assert(scroll, 'el plano ampliado no se puede desplazar o no está centrado');
    await mpage.screenshot({ path: `${SHOTS}/zoom.png` });
    await btn.click();
    const w2 = (await mpage.locator('.board-frame').boundingBox())!.width;
    assert(Math.abs(w2 - w0) < 2, 'no vuelve al tamaño normal');
  });

  for (const [w, h] of [[844, 390], [667, 375]] as const) {
    await check(`Móvil en horizontal ${w}×${h}: plano y herramientas a la vista`, async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const page = await newPage(ctx);
      await page.goto(`${base}#/caso/anillos`);
      await page.locator('.dossier__actions .btn--primary').click();
      const board = (await page.locator('.board-frame').boundingBox())!;
      assert(board.y + board.height <= h + 1, `el plano no cabe en alto (${Math.round(board.y + board.height)} > ${h})`);
      const accuse = page.locator('.tool--accuse:visible').first();
      const ab = (await accuse.boundingBox())!;
      assert(ab.y + ab.height <= h + 1 && ab.x + ab.width <= w + 1, 'el botón de acusar no se ve sin desplazarse');
      const hint = (await page.locator('.tool--hint:visible').first().boundingBox())!;
      assert(hint.y + hint.height <= h + 1, 'el botón de pista no se ve');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert(!overflow, 'hay desplazamiento horizontal');
      await page.screenshot({ path: `${SHOTS}/horizontal-${w}.png` });
      await ctx.close();
    });
  }

  await check('Academia: lecciones y lección superada', async () => {
    await dpage.goto(`${base}#/academia`);
    const n = await dpage.locator('.lessons .lesson-card').count();
    assert(n === LESSONS.length, `se ven ${n} lecciones de ${LESSONS.length}`);
    await dpage.screenshot({ path: `${SHOTS}/academia.png`, fullPage: true });
    const l = LESSONS[0];
    const p = compilePuzzle({ ...l.puzzle, meta: { kind: 'lesson', lesson: l.id } });
    await dpage.locator('.lessons .lesson-card').first().click();
    await dpage.locator('.dossier__actions .btn--primary', { hasText: 'práctica' }).click();
    for (const [k, ch] of p.cast.entries()) {
      await dpage.locator('.suspects .suspect').nth(k).locator('.suspect__photo').click();
      await cells(dpage).nth(p.solution[ch.id]).click();
    }
    await dpage.locator('.tool--accuse:visible').first().click();
    await dpage.locator('.accuse .polaroid--btn', { hasText: displayName(p.cast.find((c) => c.id === p.murderer)!) }).click();
    await dpage.locator('.lesson-done').waitFor({ timeout: 15000 });
    assert(await dpage.locator('.lesson-done', { hasText: LESSONS[1].title }).count(), 'no propone la siguiente lección');
  });

  await check('Avisar de una pista confusa', async () => {
    await dpage.goto(`${base}#/caso/simpson`);
    const intro = dpage.locator('.dossier__actions .btn--primary');
    if (await intro.count()) await intro.click();
    await dpage.locator('.suspects .suspect').first().hover();
    await dpage.locator('.clue-flag').first().click();
    await dpage.locator('.feedback-dialog').waitFor();
    await dpage.locator('.feedback-dialog .seg button').nth(1).click();
    await dpage.locator('.feedback-dialog textarea').fill('Prueba automática');
    await dpage.locator('.feedback-dialog .btn--primary', { hasText: 'Guardar' }).click();
    await dpage.locator('.feedback-dialog .share-ok').waitFor();
    const n = await dpage.evaluate(() => JSON.parse(localStorage.getItem('churri-doku:feedback') ?? '[]').length);
    assert(n >= 1, 'no se ha guardado el aviso');
  });

  await check('Informe de juego: enlace → panel', async () => {
    await dpage.goto(`${base}#/`);
    await dpage.evaluate(() => {
      const k = 'churri-doku:feedback';
      const list = JSON.parse(localStorage.getItem(k) ?? '[]');
      if (!list.length) localStorage.setItem(k, JSON.stringify([{ c: 'simpson', ch: 'H', text: 'Pista de prueba', reason: 'ambigua', comment: 'Prueba automática', at: Date.now() }]));
    });
    await dpage.reload();
    await dpage.locator('.site-head__tools .icon-btn[aria-label="Ajustes"]').click();
    const send = dpage.locator('.setting', { hasText: 'Enviar mis datos de juego' }).locator('button');
    await send.scrollIntoViewIfNeeded();
    await send.click();
    await dpage.locator('.setting .share-ok', { hasText: 'Enlace copiado' }).waitFor();
    const copied = await dpage.evaluate(() => navigator.clipboard.readText());
    const url = copied.match(/https?:\/\/\S*#\/informe\/[A-Za-z0-9_-]+/)?.[0] ?? '';
    assert(url, `el portapapeles no tiene un enlace de informe: ${copied.slice(0, 80)}`);
    await dpage.keyboard.press('Escape');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await newPage(ctx);
    await page.goto(base + url.slice(url.indexOf('#')));
    await page.locator('.modal', { hasText: 'Informe de juego recibido' }).waitFor();
    await page.locator('.modal .btn--primary', { hasText: 'Añadir' }).click();
    await page.locator('.modal .btn--primary', { hasText: 'Ver el panel' }).click();
    await page.locator('.panel-table').waitFor();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('churri-doku:reports') ?? '[]').length);
    assert(saved === 1, `el panel tiene ${saved} informes`);
    assert(await page.locator('.feedback-list li', { hasText: 'Prueba automática' }).count(), 'el panel no muestra el aviso de la pista');
    await page.screenshot({ path: `${SHOTS}/panel.png`, fullPage: true });
    await ctx.close();
  });

  await check('Logros y estadísticas', async () => {
    await dpage.goto(`${base}#/logros`);
    await dpage.locator('.badges .badge').first().waitFor();
    const on = await dpage.locator('.badge.is-on').count();
    assert(on >= 1, 'no aparece ningún logro conseguido (debería estar el del tutorial)');
    await dpage.screenshot({ path: `${SHOTS}/logros.png`, fullPage: true });
  });

  const hasDaily = await dpage.evaluate(async (b) => { try { await (await fetch(`${b}daily/index.json`)).json(); return true; } catch { return false; } }, base);
  if (hasDaily) {
    await check('Caso del día: jugar hoy, racha y archivo', async () => {
      const idx = await dpage.evaluate(async (b) => (await fetch(`${b}daily/index.json`)).json(), base);
      const today = await dpage.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
      assert(idx.from <= today && today <= idx.to, `no hay caso para hoy (${today}; calendario ${idx.from}–${idx.to})`);
      await dpage.goto(`${base}#/`);
      await dpage.locator('.daily-card').waitFor();
      await dpage.screenshot({ path: `${SHOTS}/portada.png` });
      await dpage.locator('.daily-card .btn--primary').click();
      await dpage.locator('.dossier__tab', { hasText: 'Caso del día' }).waitFor();
      const month: Record<string, DailyEntry> = await dpage.evaluate(async ([b, m]) => (await fetch(`${b}daily/${m}.json`)).json(), [base, today.slice(0, 7)] as const);
      const entry = month[today];
      const baseInput = (await import(`../src/data/puzzles/${entry.base}.ts`)).default as PuzzleInput;
      const p = compilePuzzle(dailyInput(baseInput, entry));
      await dpage.locator('.dossier__actions .btn--primary').click();
      for (const [k, ch] of p.cast.entries()) {
        await dpage.locator('.suspects .suspect').nth(k).locator('.suspect__photo').click();
        await cells(dpage).nth(p.solution[ch.id]).click();
      }
      await dpage.locator('.tool--accuse:visible').first().click();
      await dpage.locator('.accuse .polaroid--btn', { hasText: displayName(p.cast.find((c) => c.id === p.murderer)!) }).click();
      await dpage.locator('.streak-line').waitFor({ timeout: 15000 });
      await dpage.screenshot({ path: `${SHOTS}/diario-final.png` });
      await dpage.goto(`${base}#/archivo`);
      await dpage.locator('.day.is-today.day--onday').waitFor();
      await dpage.screenshot({ path: `${SHOTS}/archivo.png`, fullPage: true });
    });
  } else console.log('· (sin calendario de casos del día: me salto esa prueba)');

  await browser.close();
  if (errors.length) console.log(`\nErrores en la página:\n${[...new Set(errors)].join('\n')}`);
  console.log(`\n${failures ? `${failures} pruebas fallidas` : 'Todo correcto'} · capturas en ${SHOTS}`);
  process.exit(failures || errors.length ? 1 : 0);
}

main();
