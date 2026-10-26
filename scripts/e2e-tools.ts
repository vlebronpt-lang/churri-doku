/**
 * Prueba de las herramientas del tablero: X automáticas, marca «Ocupada», ventana de borrar y tachar
 * casillas con algo dentro (avisa antes, las vacía, se deshace y respeta «No volver a avisar»).
 *   npx tsx scripts/e2e-tools.ts [prefijo-capturas] [--mobile]   (con el servidor de desarrollo en marcha; E2E_BASE para otra web)
 */
import { chromium } from 'playwright-core';
import { compilePuzzle } from '../src/engine/puzzle';
import type { PuzzleInput } from '../src/engine/types';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? `${process.env.TMPDIR ?? '/tmp'}/e2e-tools`;
const mobile = process.argv.includes('--mobile');
async function main() {
  const p = compilePuzzle((await import('../src/data/puzzles/friends.ts')).default as PuzzleInput);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto((process.env.E2E_BASE ?? 'http://127.0.0.1:5173/') + '#/caso/friends', { waitUntil: 'networkidle' });
  await page.click('.dossier__actions .btn--primary');
  const cell = (i: number) => page.locator('.board__grid [role="gridcell"]').nth(i);
  const pick = async (k: number) => mobile ? page.locator('.strip .chip').nth(k).click() : page.locator('.suspects .suspect').nth(k).locator('.suspect__photo').click();
  const tool = (name: string) => page.locator('.tool:visible', { hasText: name }).first().click();
  const occ = p.cells.filter((c) => c.occupiable).map((c) => c.i);
  const S = p.size;
  // Rachel en su sitio (X automáticas fuertes)
  const r0 = p.solution[p.cast[0].id];
  await pick(0); await cell(r0).click();
  const free = occ.filter((i) => Math.floor(i / S) !== Math.floor(r0 / S) && i % S !== r0 % S);
  // Una X manual
  await tool('Tachar'); await cell(free[free.length - 1]).click();
  // Casilla ocupada
  const target = free[Math.floor(free.length / 2)];
  await tool('Ocupada'); await cell(target).click();
  // Notas de dos personas + ocupada en otra casilla
  const notesCell = free.find((i) => Math.floor(i / S) !== Math.floor(target / S) && i % S !== target % S && i !== free[free.length - 1])!;
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
  // Filas y columnas enteras desde las cabeceras
  const colH = (i: number) => page.locator('.line-handles--cols .line-handle').nth(i);
  const rowH = (i: number) => page.locator('.line-handles--rows .line-handle').nth(i);
  await tool('Lápiz');
  await pick(3);
  const c = 5;
  const openInCol = await page.evaluate(([col, n]) => [...document.querySelectorAll('.board__grid [role="gridcell"]')].filter((el, i) => i % n === col && !el.classList.contains('is-blocked') && !el.querySelector('.token, .cell__x')).length, [c, S]);
  await colH(c).click();
  const notedInCol = await page.evaluate(([col, n]) => [...document.querySelectorAll('.board__grid [role="gridcell"]')].filter((el, i) => i % n === col && el.classList.contains('hl-selnote')).length, [c, S]);
  if (notedInCol !== openInCol || !notedInCol) throw new Error(`anotar en toda la columna: ${notedInCol} de ${openInCol}`);
  await colH(c).click(); // otra vez: se quitan
  if (await page.locator('.cell.hl-selnote').count()) throw new Error('el segundo toque en la cabecera no quita las anotaciones');
  await tool('Tachar');
  await rowH(6).click();
  // Si en la fila hay algo, avisa antes de vaciarlo: aquí solo se quieren las vacías.
  await page.waitForTimeout(250);
  if (await page.locator('.cross-dialog').count()) await page.getByRole('button', { name: 'Cancelar' }).click();
  const xRow = await page.evaluate((n) => [...document.querySelectorAll('.board__grid [role="gridcell"]')].slice(6 * n, 7 * n).filter((el) => el.querySelector('.cell__x')).length, S);
  if (!xRow) throw new Error('tachar toda la fila no tachó nada');
  await tool('Ocupada');
  await rowH(5).click();
  const lineOcc = await page.locator('.cell.is-lineocc').count();
  if (!lineOcc && !(await page.locator('.cell__occ').count())) throw new Error('marcar la fila como ocupada no resaltó nada');
  await tool('Borrar');
  await rowH(5).click();
  await page.locator('.erase-dialog').waitFor();
  await page.getByRole('button', { name: 'Borrar todo' }).click();
  await page.waitForTimeout(200);
  if (await page.locator('.cell.is-lineocc').count()) throw new Error('borrar la fila no quitó su marca');
  console.log('✔ herramientas: X automáticas, Ocupada, borrar seleccionadas y borrar todo, filas y columnas enteras');

  // Tachar una casilla con algo dentro la vacía, pero antes pregunta.
  const blank = (i: number) => page.evaluate((k) => {
    const el = document.querySelectorAll('.board__grid [role="gridcell"]')[k];
    return !el.querySelector('.token, .note, .cell__x, .cell__occ') && !el.classList.contains('is-blocked');
  }, i);
  let noteCell = -1;
  for (const i of free) if (Math.floor(i / S) !== 6 && Math.floor(i / S) !== 5 && (await blank(i))) { noteCell = i; break; }
  if (noteCell < 0) throw new Error('no hay casilla libre para la prueba de tachar');
  await tool('Lápiz'); await pick(4); await cell(noteCell).click();
  await tool('Tachar'); await cell(noteCell).click();
  await page.locator('.cross-dialog').waitFor();
  await page.screenshot({ path: `${OUT}-cross.png` });
  await page.getByRole('button', { name: 'Cancelar' }).click();
  if ((await cell(noteCell).locator('.note').count()) !== 1 || (await cell(noteCell).locator('.cell__x').count())) throw new Error('cancelar el aviso de tachar cambió la casilla');
  await cell(noteCell).click();
  await page.locator('.cross-dialog').waitFor();
  await page.getByRole('button', { name: 'Tachar y borrar' }).click();
  await page.waitForTimeout(200);
  if ((await cell(noteCell).locator('.note').count()) || !(await cell(noteCell).locator('.cell__x').count())) throw new Error('tachar no vació la casilla');
  // A alguien colocado también se le quita, y «Deshacer» lo devuelve.
  await cell(r0).click();
  await page.locator('.cross-dialog').waitFor();
  if (!/Colocado aquí/.test(await page.locator('.cross-dialog').innerText())) throw new Error('el aviso no dice quién está colocado');
  await page.getByRole('button', { name: 'Tachar y borrar' }).click();
  await page.waitForTimeout(200);
  if (await cell(r0).locator('.token').count()) throw new Error('tachar no quitó a la persona colocada');
  await page.locator('.tool--undo:visible').first().click();
  await page.waitForTimeout(200);
  if (!(await cell(r0).locator('.token').count())) throw new Error('deshacer no devolvió a la persona tachada');
  // Toda una fila con algo dentro: tacha las vacías y pregunta por la que tiene notas.
  const rowOf = Math.floor(noteCell / S) === 0 ? 1 : 0;
  let rowNote = -1;
  for (let k = 0; k < S; k++) if (await blank(rowOf * S + k)) { rowNote = rowOf * S + k; break; }
  if (rowNote >= 0 && Math.floor(r0 / S) !== rowOf) {
    await tool('Lápiz'); await pick(4); await cell(rowNote).click();
    await tool('Tachar'); await rowH(rowOf).click();
    await page.locator('.cross-dialog').waitFor();
    await page.getByRole('button', { name: 'Tachar y borrar' }).click();
    await page.waitForTimeout(200);
    if ((await cell(rowNote).locator('.note').count()) || !(await cell(rowNote).locator('.cell__x').count())) throw new Error('tachar la fila no vació la casilla con notas');
  }
  // «No volver a avisar»: la siguiente vez se tacha sin preguntar.
  await cell(r0).click();
  await page.locator('.cross-dialog').waitFor();
  await page.locator('.cross-quiet input').check();
  await page.getByRole('button', { name: 'Tachar y borrar' }).click();
  await page.locator('.tool--undo:visible').first().click();
  await page.waitForTimeout(200);
  await cell(r0).click();
  await page.waitForTimeout(300);
  if ((await page.locator('.cross-dialog').count()) || (await cell(r0).locator('.token').count())) throw new Error('con «No volver a avisar» tenía que tachar sin preguntar');
  console.log('✔ tachar: avisa antes, vacía la casilla (también a quien está colocado y en filas enteras), se deshace y respeta «No volver a avisar»');
  await page.locator('.tools-bar').screenshot({ path: `${OUT}-tools.png` }).catch(() => {});
  await browser.close();
}
main().catch((e) => { console.error(`✘ ${(e as Error).message}`); process.exit(1); });
