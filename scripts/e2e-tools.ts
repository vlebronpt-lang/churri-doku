/**
 * Prueba de las herramientas del tablero: X automáticas, marca «Ocupada» y ventana de borrar.
 *   npx tsx scripts/e2e-tools.ts <prefijo-capturas> [--mobile]   (con el servidor de desarrollo en marcha)
 */
import { chromium } from 'playwright-core';
import { compilePuzzle } from '../src/engine/puzzle';
import type { PuzzleInput } from '../src/engine/types';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.argv[2];
const mobile = process.argv.includes('--mobile');
async function main() {
  const p = compilePuzzle((await import('../src/data/puzzles/friends.ts')).default as PuzzleInput);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto('http://127.0.0.1:5173/#/caso/friends', { waitUntil: 'networkidle' });
  await page.click('.dossier__actions .btn--primary');
  const cell = (i: number) => page.locator('.board__grid [role="gridcell"]').nth(i);
  const pick = async (k: number) => mobile ? page.locator('.strip .chip').nth(k).click() : page.locator('.suspects .suspect').nth(k).locator('.suspect__photo').click();
  const tool = (name: string) => page.locator('.tool:visible', { hasText: name }).first().click();
  const occ = p.cells.filter((c) => c.occupiable).map((c) => c.i);
  // Rachel en su sitio (X automáticas fuertes)
  const r0 = p.solution[p.cast[0].id];
  await pick(0); await cell(r0).click();
  const free = occ.filter((i) => Math.floor(i / 7) !== Math.floor(r0 / 7) && i % 7 !== r0 % 7);
  // Una X manual
  await tool('Tachar'); await cell(free[free.length - 1]).click();
  // Casilla ocupada
  const target = free[Math.floor(free.length / 2)];
  await tool('Ocupada'); await cell(target).click();
  // Notas de dos personas + ocupada en otra casilla
  const notesCell = free.find((i) => Math.floor(i / 7) !== Math.floor(target / 7) && i % 7 !== target % 7 && i !== free[free.length - 1])!;
  await tool('Lápiz'); await pick(1); await cell(notesCell).click(); await pick(2); await cell(notesCell).click();
  await tool('Ocupada'); await cell(notesCell).click();
  await page.waitForTimeout(400);
  await page.locator('.board').screenshot({ path: `${OUT}-board.png` });
  await tool('Borrar'); await cell(notesCell).click();
  await page.locator('.erase-dialog').waitFor();
  await page.locator('.erase-item').nth(0).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}-erase.png` });
  await page.getByRole('button', { name: /Borrar la seleccionada/ }).click();
  await page.waitForTimeout(300);
  const notes = await cell(notesCell).locator('.note').count();
  const hasOcc = await cell(notesCell).locator('.cell__occ').count();
  if (notes !== 1 || hasOcc !== 1) throw new Error(`el borrado selectivo falló: ${JSON.stringify({ notes, hasOcc })}`);
  // «Borrar todo» en la misma casilla
  await cell(notesCell).click();
  await page.locator('.erase-dialog').waitFor();
  await page.getByRole('button', { name: 'Borrar todo' }).click();
  await page.waitForTimeout(200);
  if ((await cell(notesCell).locator('.note, .cell__occ').count()) !== 0) throw new Error('«Borrar todo» no lo borró todo');
  console.log('✔ herramientas: X automáticas, Ocupada, borrar seleccionadas y borrar todo');
  await page.locator('.tools-bar').screenshot({ path: `${OUT}-tools.png` }).catch(() => {});
  await browser.close();
}
main().catch((e) => { console.error(`✘ ${(e as Error).message}`); process.exit(1); });
