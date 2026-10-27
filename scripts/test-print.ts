/**
 * Comprueba la versión para imprimir en formato libro: en los 25 casos (color y B/N) hay portada, doble página
 * (con el QR del caso bajo el plano) y contraportada (con el QR de la web); nada se sale de su página y ningún
 * nombre de objeto se corta. Las soluciones (asesino y paso a paso) ocupan las páginas que haga falta sin cortar
 * ningún paso. El libro completo: número de páginas par, numeración seguida, cómo se juega, ejemplo y web al
 * principio, y un QR por caso.
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
    await page.waitForSelector('body[data-print-ready="1"]', { timeout: 60000 });
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
      for (const el of pg.querySelectorAll('.print-legend, .case-right__answer, .case-right__rules, .case-right__notes, .case-right__foot, .case-back__cast, .case-back__web, .web__how, .example__tip, .book-back__web')) {
        const r = el.getBoundingClientRect();
        if (r.bottom > box.bottom - 2 || r.right > box.right + 1) out.push(`página ${n}: ${(el as HTMLElement).className} se sale`);
      }
      const svg = pg.querySelector('.case-right .print-board svg');
      const ans = pg.querySelector('.case-right__answer');
      if (svg && ans && svg.getBoundingClientRect().bottom > ans.getBoundingClientRect().top + 1) out.push(`página ${n}: el plano tapa «El asesino es»`);
      const notes = pg.querySelector('.case-right__notes');
      if (notes && notes.getBoundingClientRect().height < 30) out.push(`página ${n}: no queda sitio para notas`);
      if (pg.classList.contains('case-right') && !pg.querySelector('.case-right__foot .qr svg')) out.push(`página ${n}: falta el QR del caso`);
      // Paso a paso: ningún paso queda cortado al final de su página.
      const steps = pg.querySelector('.solution__steps');
      if (steps) {
        const limit = steps.getBoundingClientRect().bottom;
        const cut = [...steps.children].filter((li) => li.getBoundingClientRect().bottom > limit + 1).length;
        if (cut) out.push(`página ${n}: ${cut} pasos de la solución no caben`);
      }
      const cut = [...pg.querySelectorAll('.print-legend__name')].filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent);
      if (cut.length) out.push(`página ${n}: objetos cortados ${cut.join(', ')}`);
      const num = pg.querySelector('.page__num');
      if (num && num.textContent !== String(n)) out.push(`página ${n}: lleva el número ${num.textContent}`);
    });
    return { count: pages.length, out, steps: document.querySelectorAll('.solution__steps li').length, qr: document.querySelectorAll('.qr svg').length };
  });
  const bad: string[] = [];
  let tight = 0;
  let solPages = 0;
  for (const id of ids) {
    for (const kind of ['color', 'bn']) {
      await open(`${id}/${kind}`);
      const r = await problems();
      if (r.count !== 4) bad.push(`${id}/${kind}: ${r.count} páginas (deberían ser 4)`);
      if (r.qr < 2) bad.push(`${id}/${kind}: ${r.qr} códigos QR (deberían ser 2)`);
      r.out.forEach((o) => bad.push(`${id}/${kind}: ${o}`));
      if (await page.locator('.case-left.is-tight1, .case-left.is-tight2').count()) tight++;
    }
    await open(`${id}/solucion`);
    const s = await problems();
    solPages += s.count;
    if (s.count < 1 || !s.steps) bad.push(`${id}/solucion: ${s.count} páginas, ${s.steps} pasos`);
    if (!(await page.locator('.solution__verdict strong').count())) bad.push(`${id}/solucion: no dice quién es el asesino`);
    s.out.forEach((o) => bad.push(`${id}/solucion: ${o}`));
  }
  await open('libro');
  const b = await problems();
  if (b.count % 2) bad.push(`libro: ${b.count} páginas (tiene que ser par para que la contraportada cierre el libro)`);
  if (b.qr < ids.length + 3) bad.push(`libro: ${b.qr} códigos QR`);
  for (const sel of ['.rules', '.example', '.web', '.book-index']) if (!(await page.locator(sel).count())) bad.push(`libro: falta ${sel}`);
  b.out.forEach((o) => bad.push(`libro: ${o}`));
  await browser.close();
  console.log(bad.length
    ? `✘ problemas en la versión para imprimir:\n${bad.join('\n')}`
    : `✔ ${ids.length * 2} casos en formato libro (con su QR), ${ids.length} soluciones con el paso a paso (${solPages} páginas) y el libro de ${b.count} páginas: todo cabe sin cortes y bien numerado${tight ? ` (${tight} con la letra algo más pequeña para que quepa)` : ''}`);
  process.exit(bad.length ? 1 : 0);
}
main();
