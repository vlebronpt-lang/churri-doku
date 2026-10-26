/**
 * Comprueba la versión para imprimir en formato libro: en los 25 casos (color y B/N) hay portada, doble página
 * y contraportada; nada se sale de su página (sospechosos, objetos del plano, plano, «El asesino es» y notas) y
 * ningún nombre de objeto se corta. También las 25 soluciones y el libro completo (80 páginas, contraportada en par).
 *   npx tsx scripts/test-print.ts [url]
 */
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';

async function main() {
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const ids = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, ''));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  // tsx añade __name a las funciones con nombre; en el navegador no existe.
  await page.addInitScript(() => { (window as unknown as { __name: (f: unknown) => unknown }).__name = (f) => f; });
  const open = async (route: string) => {
    await page.goto(`${base}#/imprimir/${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('body[data-print-ready="1"]', { timeout: 30000 });
  };
  /** Problemas de maquetación en todas las páginas abiertas. */
  const problems = () => page.evaluate(() => {
    const out: string[] = [];
    const pages = [...document.querySelectorAll('.page')] as HTMLElement[];
    pages.forEach((pg, k) => {
      const n = k + 1;
      if (pg.scrollHeight > pg.clientHeight + 1) out.push(`página ${n}: se sale ${pg.scrollHeight - pg.clientHeight}px`);
      const inner = pg.querySelector('.page__inner') as HTMLElement | null;
      if (inner && inner.scrollHeight > inner.clientHeight + 1) out.push(`página ${n}: no caben sospechosos y objetos (${inner.scrollHeight - inner.clientHeight}px)`);
      const box = pg.getBoundingClientRect();
      for (const el of pg.querySelectorAll('.print-legend, .case-right__answer, .case-right__rules, .case-right__notes, .page__foot, .solution__steps, .case-back__cast')) {
        const r = el.getBoundingClientRect();
        if (r.bottom > box.bottom - 2 || r.right > box.right + 1) out.push(`página ${n}: ${(el as HTMLElement).className} se sale`);
      }
      const svg = pg.querySelector('.case-right .print-board svg');
      const ans = pg.querySelector('.case-right__answer');
      if (svg && ans && svg.getBoundingClientRect().bottom > ans.getBoundingClientRect().top + 1) out.push(`página ${n}: el plano tapa «El asesino es»`);
      const notes = pg.querySelector('.case-right__notes');
      if (notes && notes.getBoundingClientRect().height < 40) out.push(`página ${n}: no queda sitio para notas`);
      const cut = [...pg.querySelectorAll('.print-legend__name')].filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent);
      if (cut.length) out.push(`página ${n}: objetos cortados ${cut.join(', ')}`);
    });
    return { count: pages.length, out };
  });
  const bad: string[] = [];
  let tight = 0;
  for (const id of ids) {
    for (const kind of ['color', 'bn']) {
      await open(`${id}/${kind}`);
      const r = await problems();
      if (r.count !== 4) bad.push(`${id}/${kind}: ${r.count} páginas (deberían ser 4)`);
      r.out.forEach((o) => bad.push(`${id}/${kind}: ${o}`));
      if (await page.locator('.case-left.is-tight1, .case-left.is-tight2').count()) tight++;
    }
    await open(`${id}/solucion`);
    const s = await problems();
    if (s.count !== 1) bad.push(`${id}/solucion: ${s.count} páginas`);
    s.out.forEach((o) => bad.push(`${id}/solucion: ${o}`));
  }
  await open('libro');
  const b = await problems();
  if (b.count !== 3 + ids.length * 3 + 2 || b.count % 2) bad.push(`libro: ${b.count} páginas (deberían ser ${3 + ids.length * 3 + 2})`);
  b.out.forEach((o) => bad.push(`libro: ${o}`));
  await browser.close();
  console.log(bad.length ? `✘ problemas en la versión para imprimir:\n${bad.join('\n')}` : `✔ ${ids.length * 2} casos en formato libro (portada, doble página y contraportada), ${ids.length} soluciones y el libro de ${b.count} páginas: todo cabe sin cortes${tight ? ` (${tight} con la letra algo más pequeña para que quepa)` : ''}`);
  process.exit(bad.length ? 1 : 0);
}
main();
