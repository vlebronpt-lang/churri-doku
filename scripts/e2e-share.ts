/**
 * Prueba del juego en pareja con dos navegadores independientes:
 * A resuelve un caso y manda un reto; B lo abre, ve el reto, lo resuelve y ve el duelo;
 * A pasa su progreso a un tercer navegador.
 *   npx tsx scripts/e2e-share.ts [url]
 */
import { chromium, type Browser, type Page } from 'playwright-core';
import { compilePuzzle } from '../src/engine/puzzle';
import { displayName } from '../src/engine/text';
import type { PuzzleInput } from '../src/engine/types';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://localhost:5173/';

async function fresh(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { throw new Error(`pageerror: ${e.message}`); });
  // Sin hoja de compartir nativa: se usa el portapapeles.
  await page.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined }); });
  return page;
}

async function solve(page: Page, p: ReturnType<typeof compilePuzzle>) {
  for (const [k, ch] of p.cast.entries()) {
    await page.locator('.suspects .suspect').nth(k).locator('.suspect__photo').click();
    await page.locator('.board__grid [role="gridcell"]').nth(p.solution[ch.id]).click();
  }
  await page.locator('.tool--accuse:visible').first().click();
  await page.locator('.accuse .polaroid--btn', { hasText: displayName(p.cast.find((c) => c.id === p.murderer)!) }).click();
  await page.locator('.result__title').waitFor({ timeout: 15000 });
}

function check(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
  console.log(`✔ ${msg}`);
}

async function main() {
  const p = compilePuzzle((await import('../src/data/puzzles/office.ts')).default as PuzzleInput);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  // A resuelve y reta.
  const a = await fresh(browser);
  await a.goto(`${base}#/caso/${p.id}`, { waitUntil: 'networkidle' });
  await a.click('.dossier__actions .btn--primary');
  await a.waitForTimeout(2200); // que pase algo de tiempo en el reloj
  await solve(a, p);
  await a.getByRole('button', { name: /Retar a mi churri/ }).click();
  await a.locator('.share-dialog input').fill('Víctor');
  await a.getByRole('button', { name: /Enviar reto/ }).click();
  await a.locator('.share-ok').waitFor();
  const msg = await a.evaluate(() => navigator.clipboard.readText());
  const url = msg.split('\n').find((l) => l.startsWith('http'))!;
  check(msg.startsWith('💘 Víctor te reta en Churri-doku') && url.includes('?reto='), 'A copia un mensaje de reto con enlace');

  // B abre el reto en otro navegador.
  const b = await fresh(browser);
  await b.goto(url, { waitUntil: 'networkidle' });
  check((await b.locator('.duel--intro').innerText()).includes('Víctor te reta'), 'B ve «Víctor te reta» en el expediente');
  check(!(await b.evaluate(() => location.hash)).includes('reto='), 'la dirección queda limpia');
  await b.click('.dossier__actions .btn--primary');
  check(await b.locator('.timer__duel').isVisible(), 'B ve el tiempo de Víctor junto a su reloj');
  await solve(b, p);
  const duel = await b.locator('.result .duel').innerText();
  check(/Víctor/.test(duel) && /(ganado|sigue ganando|Empate)/.test(duel), `B ve el duelo al terminar: «${duel.split('\n')[0]}»`);
  await b.goto(`${base}#/`, { waitUntil: 'networkidle' });
  check((await b.locator('.case__duel').first().innerText()).includes('Víctor'), 'la tarjeta del caso muestra el duelo');

  // A pasa su progreso a otro dispositivo.
  await a.goto(`${base}#/`, { waitUntil: 'networkidle' });
  await a.locator('[aria-label="Ajustes"]').first().click();
  await a.getByRole('button', { name: /Copiar enlace/ }).click();
  await a.locator('.settings .share-ok').waitFor();
  const prog = (await a.evaluate(() => navigator.clipboard.readText())).split('\n').find((l) => l.startsWith('http'))!;
  check(prog.includes('#/progreso/'), 'A copia el enlace de progreso');
  const c = await fresh(browser);
  await c.goto(prog, { waitUntil: 'networkidle' });
  await c.getByRole('button', { name: /Combinar con el mío/ }).click();
  await c.waitForTimeout(300);
  check((await c.locator('.progress__label').innerText()).startsWith('1/'), 'el otro dispositivo recibe el caso resuelto');

  await browser.close();
  console.log('\nJuego en pareja: todo correcto');
}

main().catch((e) => {
  console.error(`✘ ${(e as Error).message}`);
  process.exit(1);
});
