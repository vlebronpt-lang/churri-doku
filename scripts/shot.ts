/**
 * Capturas de la web para revisar la interfaz (requiere el servidor de desarrollo).
 *   npx tsx scripts/shot.ts <ruta-hash> <salida.png> [--w 1280] [--h 860] [--dark] [--full]
 *        [--store progreso.json] [--settings ajustes.json] [--scroll selector] [--click selector] [--wait ms]
 */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.SHOT_BASE ?? 'http://localhost:5173/';

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string) => args.includes(`--${name}`);

async function main() {
  const [route, out] = args;
  if (!route || !out) throw new Error('uso: shot.ts <ruta> <salida.png> [opciones]');
  const w = Number(opt('w') ?? 1280);
  const h = Number(opt('h') ?? 860);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: w < 500 ? 2 : 1,
    colorScheme: flag('dark') ? 'dark' : 'light',
    isMobile: w < 500,
    hasTouch: w < 500,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  const store = opt('store');
  const settings = opt('settings');
  // El almacenamiento se prepara antes de que arranque la app (si no, la app lo sobrescribe).
  await ctx.addInitScript(([s, st]) => {
    if (sessionStorage.getItem('__shot')) return;
    sessionStorage.setItem('__shot', '1');
    localStorage.clear();
    if (s) localStorage.setItem('churri-doku:progress', s);
    if (st) localStorage.setItem('churri-doku:settings', st);
  }, [store ? readFileSync(store, 'utf8') : '', settings ? readFileSync(settings, 'utf8') : '']);
  await page.goto(`${BASE}#${route}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const click = opt('click');
  if (click) {
    for (const sel of click.split('||')) {
      await page.click(sel);
      await page.waitForTimeout(400);
    }
  }
  const scroll = opt('scroll');
  if (scroll) await page.locator(scroll).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(Number(opt('wait') ?? 700));
  await page.screenshot({ path: out, fullPage: flag('full') });
  await browser.close();
  console.log(out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
