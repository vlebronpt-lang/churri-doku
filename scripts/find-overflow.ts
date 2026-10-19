/** Dice qué elementos se salen por la derecha en una ruta y un ancho:  npx tsx scripts/find-overflow.ts <ancho> [ruta] */
import { chromium } from 'playwright-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
async function main() {
  const w = Number(process.argv[2] ?? 1024);
  const route = process.argv[3] ?? '#/';
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(`http://127.0.0.1:5173/${route}`, { waitUntil: 'networkidle' });
  const out = await page.evaluate(() => {
    const vw = window.innerWidth;
    return [...document.querySelectorAll('body *')].map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.right > vw + 0.5 && r.width > 0)
      .slice(0, 12)
      .map(({ el, r }) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className?.toString().split(' ').join('.')} right=${Math.round(r.right)}`);
  });
  console.log(out.join('\n') || 'nada se sale');
  await browser.close();
}
main();
