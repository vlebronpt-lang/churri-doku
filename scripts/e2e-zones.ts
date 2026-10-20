/**
 * Prueba de la herramienta «Zona» («A está en la Cocina» sin saber aún la casilla), en escritorio y en el móvil.
 *   npx tsx scripts/e2e-zones.ts [url]
 */
import { chromium } from 'playwright-core';
import { compilePuzzle } from '../src/engine/puzzle';
import type { PuzzleInput } from '../src/engine/types';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';

function check(cond: unknown, msg: string) {
  if (!cond) throw new Error(`✘ ${msg}`);
  console.log(`✔ ${msg}`);
}

async function run(mobile: boolean) {
  const p = compilePuzzle((await import('../src/data/puzzles/potter.ts')).default as PuzzleInput);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { throw new Error(`pageerror: ${e.message}`); });
  const tag = mobile ? '[móvil]' : '[escritorio]';
  const tool = (name: string) => page.locator(`${mobile ? '.tools-bar' : '.game__side'} .tool--${name}`);
  const cells = page.locator('.board__grid [role="gridcell"]');
  const tap = async (i: number) => { if (mobile) await cells.nth(i).tap(); else await cells.nth(i).click(); };
  /** Elige al sospechoso (si ya lo estaba, no lo suelta). */
  const pick = async (k: number) => {
    const el = mobile ? page.locator('.strip .chip').nth(k) : page.locator('.suspects .suspect').nth(k);
    if (await el.evaluate((e) => e.classList.contains('is-selected'))) return;
    if (mobile) await el.click();
    else await el.locator('.suspect__photo').click();
  };
  const line = (k: number) => (mobile ? page.locator('.selected-clue .zone-line') : page.locator('.suspects .suspect').nth(k).locator('.zone-line'));

  await page.goto(`${base}#/caso/${p.id}`, { waitUntil: 'networkidle' });
  await page.click('.dossier__actions .btn--primary');

  // Sospechoso y zona de prueba: su habitación de verdad (la de la solución).
  const k = p.cast.findIndex((c) => !c.victim);
  const ch = p.cast[k];
  const room = p.cells[p.solution[ch.id]].room;
  const roomCells = p.cells.filter((c) => c.room === room && c.occupiable).map((c) => c.i);
  const other = p.cells.find((c) => c.room !== room && c.occupiable)!;

  await pick(k);
  await tool('zone').click();
  await tap(roomCells[0]);
  const zoneNotes = async () => page.locator('.note--zone').count();
  check(await zoneNotes() === roomCells.length, `${tag} su letra sale en las ${roomCells.length} casillas posibles de ${p.rooms[room].name}`);
  check((await line(k).innerText()).includes(`${roomCells.length} posibles`), `${tag} su tarjeta dice cuántas casillas le quedan`);
  if (mobile) check(await page.locator('.strip .chip').nth(k).evaluate((el) => el.classList.contains('is-zoned')), `${tag} su ficha de la tira lleva la marca de zona`);

  // Tachar una casilla de la zona: una posible menos; deshacer la devuelve.
  await tool('x').click();
  await tap(roomCells[1]);
  check(await zoneNotes() === roomCells.length - 1, `${tag} al tachar una casilla de la zona, desaparece su letra`);
  await page.locator(`${mobile ? '.tools-bar' : '.game__side'} .tool--undo`).click();
  check(await zoneNotes() === roomCells.length, `${tag} deshacer lo devuelve`);

  // Zona equivocada: «Revisar» la marca en rojo.
  await pick(k);
  await tool('zone').click();
  await tap(other.i);
  check((await line(k).innerText()).includes(p.rooms[other.room].name) && await zoneNotes() === p.cells.filter((c) => c.room === other.room && c.occupiable).length, `${tag} tocar otra habitación cambia la zona`);
  await page.locator(`${mobile ? '.tools-bar' : '.game__side'} .tool--check`).click();
  if (mobile && !(await line(k).count())) await pick(k);
  check(/zona equivocada/.test(await line(k).innerText()), `${tag} «Revisar» avisa de la zona equivocada`);

  // Tocar la misma habitación otra vez la quita.
  await tap(other.i);
  check(await zoneNotes() === 0 && !(await line(k).count()), `${tag} tocar la misma habitación quita la zona`);

  // Se guarda: tras recargar sigue ahí.
  await tap(roomCells[0]);
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'networkidle' });
  check(await zoneNotes() === roomCells.length, `${tag} la zona sigue ahí al recargar`);

  // Al colocarlo, la zona deja de mostrarse (tras recargar la herramienta vuelve a ser «colocar»).
  await pick(k);
  await tap(p.solution[ch.id]);
  check(await page.locator('.board__grid .token').count() === 1 && await zoneNotes() === 0, `${tag} al colocarlo, su zona deja de verse`);

  if (mobile) {
    const overflow = await page.evaluate(() => {
      const bar = document.querySelector('.tools-bar .tools') as HTMLElement;
      return [...bar.querySelectorAll('.tool')].filter((t) => (t as HTMLElement).offsetParent && t.scrollWidth > (t as HTMLElement).clientWidth + 1).map((t) => t.className);
    });
    check(!overflow.length, `${tag} la barra de herramientas cabe sin cortar nada (${overflow.join(', ') || 'ok'})`);
  }
  await browser.close();
}

(async () => {
  await run(false);
  await run(true);
  console.log('\nZonas: todo correcto');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
