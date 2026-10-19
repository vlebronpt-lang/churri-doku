/**
 * Prueba la app instalable sobre la versión compilada: service worker, «Descargar todo»,
 * jugar sin conexión (portada, un caso con retratos y el caso del día) y el recordatorio .ics.
 *   npx tsx scripts/test-pwa.ts [url]   (por defecto, dist/ servido en http://127.0.0.1:4173/churri-doku/)
 */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://127.0.0.1:4173/churri-doku/';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let ok = true;
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✔ ${name}`);
    } catch (e) {
      ok = false;
      console.log(`✘ ${name}: ${(e as Error).message.split('\n')[0]}`);
    }
  };

  await step('El service worker se instala y controla la página', async () => {
    await page.goto(base, { waitUntil: 'networkidle' });
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    assert(scope.endsWith('/churri-doku/') || scope === new URL('./', location.href).href, `ámbito inesperado: ${scope}`);
    await page.reload({ waitUntil: 'networkidle' });
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    assert(controlled, 'la página no está controlada por el service worker');
  });

  await step('El manifiesto es válido', async () => {
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const res = await page.request.get(new URL(href!, base).href);
    const m = await res.json();
    assert(m.name && m.icons?.length >= 2 && m.start_url && m.display, 'faltan campos en el manifiesto');
    for (const ic of m.icons) assert((await page.request.get(new URL(ic.src, base).href)).ok(), `no existe el icono ${ic.src}`);
  });

  await step('«Descargar todo» guarda lo necesario para jugar sin conexión', async () => {
    await page.locator('.site-head__tools .icon-btn[aria-label="Ajustes"]').click();
    const row = page.locator('.setting', { hasText: 'Jugar sin conexión' });
    await row.locator('button').click();
    await row.locator('.share-ok', { hasText: '¡Listo!' }).waitFor({ timeout: 120000 });
    await page.keyboard.press('Escape');
  });

  await step('Recordatorio diario en el calendario (.ics)', async () => {
    await page.locator('.site-head__tools .icon-btn[aria-label="Ajustes"]').click();
    const row = page.locator('.setting', { hasText: 'Recordatorio del caso del día' });
    await row.locator('input[type="time"]').fill('20:30');
    const [dl] = await Promise.all([page.waitForEvent('download'), row.locator('button').click()]);
    const text = readFileSync((await dl.path())!, 'utf8');
    assert(text.includes('BEGIN:VCALENDAR') && text.includes('RRULE:FREQ=DAILY') && text.includes('T203000'), 'el .ics no es un recordatorio diario a las 20:30');
    assert(text.includes('#/diario'), 'el recordatorio no enlaza al caso del día');
    await page.keyboard.press('Escape');
  });

  await step('Sin conexión: portada, caso con retratos y caso del día', async () => {
    await ctx.setOffline(true);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('.hero__title').waitFor({ timeout: 10000 });
    await page.goto(`${base}#/caso/friends`, { waitUntil: 'domcontentloaded' });
    await page.locator('.dossier__actions .btn--primary').click();
    const broken = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll<HTMLImageElement>('.suspects img.portrait')];
      await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
      return imgs.filter((i) => !i.naturalWidth).length;
    });
    assert(broken === 0, `${broken} retratos no cargan sin conexión`);
    await page.goto(`${base}#/diario`, { waitUntil: 'domcontentloaded' });
    await page.locator('.dossier__tab', { hasText: 'Caso del día' }).waitFor({ timeout: 10000 });
    await ctx.setOffline(false);
  });

  await browser.close();
  if (errors.length) console.log(`Errores en la página:\n${[...new Set(errors)].join('\n')}`);
  console.log(ok && !errors.length ? 'Todo correcto' : 'Hay fallos');
  process.exit(ok && !errors.length ? 0 : 1);
}

main();
