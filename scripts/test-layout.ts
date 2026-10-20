/**
 * Comprueba que ninguna página se salga de lado en móviles estrechos (y que el menú quepa entero).
 *   npx tsx scripts/test-layout.ts [url]
 */
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let bad = 0;
  for (const w of [320, 360, 375, 390, 414, 768, 820, 901, 1024]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 760, hasTouch: w < 760, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    for (const route of ['#/', '#/logros', '#/academia', '#/archivo', '#/descargas', '#/panel', '#/caso/tronos', '#/tutorial']) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const nav = document.querySelector('.site-nav');
        const last = nav?.lastElementChild?.getBoundingClientRect();
        // Rótulos de la barra de herramientas del móvil que no caben enteros.
        const clipped = [...document.querySelectorAll('.tools-bar .tool span')].filter((t) => (t as HTMLElement).offsetParent && t.scrollWidth > t.clientWidth + 0.5).map((t) => t.textContent);
        return { overflow: document.documentElement.scrollWidth - window.innerWidth, navRight: last ? Math.round(last.right) : 0, vw: window.innerWidth, clipped };
      });
      if (r.overflow > 0 || r.navRight > r.vw || r.clipped.length) {
        bad++;
        console.log(`✘ ${w}px ${route}: se sale ${r.overflow}px${r.navRight > r.vw ? `, el menú llega a ${r.navRight}px` : ''}${r.clipped.length ? `, rótulos cortados: ${r.clipped.join(', ')}` : ''}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `${bad} páginas se salen de lado` : '✔ Ninguna página se sale de lado (320–1024 px)');
  process.exit(bad ? 1 : 0);
}

main();
