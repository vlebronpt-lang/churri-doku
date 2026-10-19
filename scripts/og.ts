/**
 * Genera la imagen para compartir enlaces (public/og-image.jpg, 1200×630) y los iconos de la app.
 *   npx tsx scripts/og.ts
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const img = (rel: string, mime = 'image/webp') => `data:${mime};base64,${readFileSync(`${ROOT}public/${rel}`).toString('base64')}`;

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Figtree:wght@600;800&family=Special+Elite&display=block" rel="stylesheet">`;

const LENS = (stroke = '#251a37', card = '#fbf9ff') => `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <path d="M41 41 L57 57" stroke="${stroke}" stroke-width="11" stroke-linecap="round"/>
  <path d="M41 41 L56 56" stroke="#f3b53f" stroke-width="5" stroke-linecap="round"/>
  <circle cx="27" cy="27" r="21" fill="${card}" stroke="${stroke}" stroke-width="6.5"/>
  <path d="M27 38 C16 31 15.5 24.5 18.5 21.2 C21.5 18 25.5 19 27 22.6 C28.5 19 32.5 18 35.5 21.2 C38.5 24.5 38 31 27 38 Z" fill="#e23d6b" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M14 22 Q16 15 22 12" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".75"/>
</svg>`;

function ogHtml() {
  const covers = ['tronos', 'friends', 'titanes'].map((id) => img(`img/covers/${id}.webp`));
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #251a37; font-family: Figtree, sans-serif; color: #f2ecfb; position: relative; }
  body::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1.5px, transparent 0) 0 0 / 22px 22px; }
  .glow { position: absolute; width: 760px; height: 760px; right: -170px; top: -120px; border-radius: 50%; background: radial-gradient(circle, rgba(226,61,107,.35), transparent 65%); }
  .text { position: absolute; left: 64px; top: 96px; width: 520px; }
  .logo { font-family: Bungee; font-size: 64px; line-height: 1; display: flex; align-items: center; letter-spacing: .01em; }
  .logo .c { color: #e23d6b; text-shadow: 4px 4px 0 #120b1c; }
  .logo .d { color: #fbf9ff; display: inline-flex; align-items: center; text-shadow: 4px 4px 0 #120b1c; }
  .logo svg { width: .86em; height: .86em; transform: rotate(-8deg); margin: 0 .02em; }
  h1 { font-family: Bungee; font-weight: 400; font-size: 50px; line-height: 1.05; margin-top: 46px; }
  h1 span { color: #e23d6b; }
  p { font-size: 27px; line-height: 1.35; margin-top: 22px; color: #d9cfe9; font-weight: 600; }
  .chips { display: flex; gap: 12px; margin-top: 30px; }
  .chip { font-family: 'Special Elite'; font-size: 21px; padding: 7px 16px; border: 2.5px solid #f3b53f; color: #f3b53f; border-radius: 999px; }
  .pol { position: absolute; width: 214px; background: #fbf9ff; padding: 11px 11px 40px; border: 3px solid #120b1c; border-radius: 6px; box-shadow: 8px 8px 0 #120b1c; }
  .pol img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; border: 2px solid #251a37; }
  .pol b { position: absolute; left: 0; right: 0; bottom: 9px; text-align: center; font-family: 'Special Elite'; font-weight: 400; color: #251a37; font-size: 18px; white-space: nowrap; }
  .p1 { left: 590px; top: 150px; transform: rotate(-9deg); }
  .p2 { left: 782px; top: 104px; transform: rotate(2deg); z-index: 2; }
  .p3 { left: 972px; top: 152px; transform: rotate(9deg); }
  .tape { position: absolute; left: 560px; right: -60px; bottom: 44px; transform: rotate(-5deg); background: repeating-linear-gradient(-45deg, #f3c623 0 30px, #251a37 30px 35px, #f3c623 35px 64px); border-block: 4px solid #120b1c; color: #120b1c; font-family: Bungee; font-size: 25px; text-align: center; padding: 8px 0; letter-spacing: .08em; z-index: 3; }
  .tape span { background: #f3c623; padding: 0 14px; }
  </style></head><body>
  <div class="glow"></div>
  <div class="text">
    <div class="logo"><span class="c">CHURRI</span><span class="d">D${LENS()}KU</span></div>
    <h1>Sudoku con <span>asesinato</span></h1>
    <p>25 casos de lógica con los personajes de tus series y películas favoritas.</p>
    <div class="chips"><span class="chip">Gratis</span><span class="chip">En español</span><span class="chip">Online o en PDF</span></div>
  </div>
  <div class="pol p1"><img src="${covers[0]}"><b>Juego de Tronos</b></div>
  <div class="pol p2"><img src="${covers[1]}"><b>Friends</b></div>
  <div class="pol p3"><img src="${covers[2]}"><b>Ataque a los Titanes</b></div>
  <div class="tape"><span>ESCENA DEL CRIMEN · NO PASAR</span></div>
  </body></html>`;
}

function iconHtml(size: number, maskable: boolean) {
  const pad = maskable ? 0.2 : 0.1;
  return `<!doctype html><html><head><style>
  * { margin: 0; } body { width: ${size}px; height: ${size}px; background: #251a37; display: grid; place-items: center; }
  svg { width: ${size * (1 - 2 * pad)}px; height: ${size * (1 - 2 * pad)}px; transform: rotate(-8deg); }
  </style></head><body>${LENS('#120b1c')}</body></html>`;
}

async function main() {
  mkdirSync(`${ROOT}public/icons`, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(ogHtml(), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${ROOT}public/og-image.jpg`, type: 'jpeg', quality: 88 });
  console.log('public/og-image.jpg');
  for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false]] as const) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(iconHtml(size, maskable));
    await page.screenshot({ path: `${ROOT}public/icons/${name}` });
    console.log(`public/icons/${name}`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
