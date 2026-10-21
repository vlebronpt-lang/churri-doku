/**
 * Comprueba que el panel de sospechosos quepa sin desplazarse en los 25 casos y en varios tamaños de pantalla.
 *   npx tsx scripts/test-fit.ts [url]   (con el servidor de desarrollo en marcha)
 */
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
async function main() {
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const ids = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, ''));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 720], [1024, 768]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const res: string[] = [];
    for (const id of ids) {
      await page.goto(`${base}#/caso/${id}`, { waitUntil: 'networkidle' });
      const intro = page.locator('.dossier__actions .btn--primary');
      if (await intro.count()) await intro.click();
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => {
        const panel = document.querySelector('.game__suspects') as HTMLElement;
        const list = document.querySelector('.suspects') as HTMLElement;
        return { d: list.className.replace('suspects ', '').replace(' is-compact', ''), over: panel.scrollHeight - panel.clientHeight, n: list.children.length };
      });
      res.push(`${id}:${r.n}:${r.d}${r.over > 1 ? `(+${r.over})` : ''}`);
    }
    console.log(`${w}x${h}  ${res.join('  ')}`);
    if (res.some((r) => r.includes('(+'))) process.exitCode = 1;
    await ctx.close();
  }
  await browser.close();
}
main();
