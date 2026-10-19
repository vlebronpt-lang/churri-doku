/**
 * Prueba de punta a punta: resuelve los 25 casos en la web como lo haría una persona
 * (abre el expediente, pide una pista, coloca a todos, acusa y comprueba el final).
 *   npx tsx scripts/e2e.ts [url] [--mobile]
 */
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { compilePuzzle } from '../src/engine/puzzle';
import { displayName } from '../src/engine/text';
import type { PuzzleInput } from '../src/engine/types';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  const base = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'https://vlebronpt-lang.github.io/churri-doku/';
  const mobile = process.argv.includes('--mobile');
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const ids = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, ''));
  const puzzles = [];
  for (const id of ids) puzzles.push(compilePuzzle((await import(`../src/data/puzzles/${id}.ts`)).default as PuzzleInput));
  puzzles.sort((a, b) => a.num - b.num);

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  let ok = 0;
  for (const p of puzzles) {
    const t0 = Date.now();
    try {
      await page.goto(`${base}#/caso/${p.id}`, { waitUntil: 'networkidle' });
      await page.click('.dossier__actions .btn--primary');
      // Una pista: debe aparecer el panel con texto.
      await page.locator('.tool--hint:visible').first().click();
      const hint = page.locator('.hint');
      await hint.waitFor({ timeout: 5000 });
      const hintText = (await hint.innerText()).trim();
      if (hintText.length < 20) throw new Error('pista vacía');
      await page.keyboard.press('Escape');
      // Marca «Ocupada» en la casilla del primero: aparece el hueco y se tachan su fila y su columna.
      const occCell = p.solution[p.cast[0].id];
      await page.locator('.tool--occ:visible').first().click();
      await page.locator('.board__grid [role="gridcell"]').nth(occCell).click();
      if (!(await page.locator('.board__grid [role="gridcell"]').nth(occCell).locator('.cell__occ').count())) throw new Error('no aparece la marca «Ocupada»');
      if ((await page.locator('.cell__x--auto').count()) < 2) throw new Error('la marca «Ocupada» no tacha su fila y su columna');
      // Colocar a cada personaje en su casilla.
      for (const [k, ch] of p.cast.entries()) {
        if (mobile) await page.locator('.strip .chip').nth(k).click();
        else await page.locator('.suspects .suspect').nth(k).locator('.suspect__photo').click();
        await page.locator('.board__grid [role="gridcell"]').nth(p.solution[ch.id]).click();
      }
      await page.locator('.tool--accuse:visible').first().click();
      const murderer = p.cast.find((c) => c.id === p.murderer)!;
      await page.locator('.accuse .polaroid--btn', { hasText: displayName(murderer) }).click();
      await page.locator('.result__title').waitFor({ timeout: 15000 });
      const title = await page.locator('.result__title').innerText();
      if (!title.toLowerCase().includes(displayName(murderer).toLowerCase())) throw new Error(`final inesperado: ${title}`);
      ok++;
      console.log(`✔ ${String(p.num).padStart(2)} ${p.id.padEnd(11)} ${((Date.now() - t0) / 1000).toFixed(1)}s · ${title}`);
    } catch (e) {
      console.log(`✘ ${String(p.num).padStart(2)} ${p.id.padEnd(11)} ${(e as Error).message.split('\n')[0]}`);
      await page.screenshot({ path: `${process.env.TMPDIR ?? '/tmp'}/e2e-${p.id}.png` });
    }
  }
  await browser.close();
  if (errors.length) console.log(`\nErrores en la página:\n${[...new Set(errors)].join('\n')}`);
  console.log(`\n${ok}/${puzzles.length} casos resueltos de principio a fin${mobile ? ' (móvil)' : ''}`);
  process.exit(ok === puzzles.length && !errors.length ? 0 : 1);
}

main();
