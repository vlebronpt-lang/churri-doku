/**
 * Comprueba las 50 hojas imprimibles (color y B/N): la leyenda de objetos, el plano y la línea
 * «El asesino es» caben sin taparse ni cortarse.   npx tsx scripts/test-print.ts [url]
 */
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';

async function main() {
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const ids = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, ''));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1123, height: 794 } });
  // tsx añade __name a las funciones con nombre; en el navegador no existe.
  await page.addInitScript(() => { (window as unknown as { __name: (f: unknown) => unknown }).__name = (f) => f; });
  const bad: string[] = [];
  for (const id of ids) for (const kind of ['color', 'bn']) {
    await page.goto(`${base}#/imprimir/${id}/${kind}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('body[data-print-ready="1"]');
    const r = await page.evaluate(() => {
      const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
      const leg = box('.print-legend'), foot = box('.sheet__foot'), ans = box('.sheet__answer'), board = box('.sheet__right .print-board svg');
      const wide = !!document.querySelector('.print-legend--wide');
      const sheet = document.querySelector('.sheet')!;
      const cut = [...document.querySelectorAll('.print-legend__name')].filter((n) => n.scrollWidth > n.clientWidth + 1).map((n) => n.textContent);
      return {
        legendOk: foot.top - leg.bottom >= 2,
        boardOk: wide ? ans.bottom <= leg.top + 1 && board.bottom <= leg.top + 1 : ans.bottom <= foot.top + 1,
        overflow: sheet.scrollHeight - sheet.clientHeight,
        cut,
      };
    });
    if (!r.legendOk || !r.boardOk || r.overflow > 1 || r.cut.length) bad.push(`${id}/${kind}: ${JSON.stringify(r)}`);
  }
  await browser.close();
  console.log(bad.length ? `✘ hojas con problemas:\n${bad.join('\n')}` : `✔ ${ids.length * 2} hojas: leyenda, plano y respuesta caben sin cortes`);
  process.exit(bad.length ? 1 : 0);
}
main();
