/**
 * Comprueba la versión para imprimir en formato libro: en los 25 casos (color y B/N) hay portada, doble página
 * (sospechosos con su pista y su móvil; el plano con la cuadrícula de deducción y el QR del caso) y contraportada
 * (con el QR de la web); nada se sale de su página ni de su caja y ningún nombre de objeto se corta. Cada
 * solución cabe en media página (plano resuelto, perfil del asesino y orden de colocación). El libro completo:
 * número de páginas par, numeración seguida, los casos en página par, cómo se juega, ejemplo, escuela de
 * detectives, web, índice, dedicatoria, el caso final con su código y las soluciones de dos en dos. También el
 * libro para encuadernar (margen de lomo en el lado que toca) y el libro dedicado.
 *   npx tsx scripts/test-print.ts [url]
 */
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { compilePuzzle } from '../src/engine/puzzle';
import type { PuzzleInput } from '../src/engine/types';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';

async function main() {
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
  const cast: Record<string, number> = {};
  for (const f of files) {
    const p = compilePuzzle((await import(`../src/data/puzzles/${f}`)).default as PuzzleInput);
    cast[p.id] = p.cast.length;
  }
  const ids = Object.keys(cast);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  // tsx añade __name a las funciones con nombre; en el navegador no existe.
  await page.addInitScript(() => { (window as unknown as { __name: (f: unknown) => unknown }).__name = (f) => f; });
  const open = async (route: string) => {
    // Documento nuevo en cada hoja: con solo cambiar el #, la señal de «listo» sería la de la anterior.
    await page.goto('about:blank');
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
      for (const inner of pg.querySelectorAll<HTMLElement>('.page__inner, .sol-half__inner')) {
        if (inner.scrollHeight > inner.clientHeight + 1) out.push(`página ${n}: no cabe el contenido de ${inner.className} (${inner.scrollHeight - inner.clientHeight}px)`);
      }
      const box = pg.getBoundingClientRect();
      for (const el of pg.querySelectorAll('.print-legend, .dgrid, .case-right__answer, .case-right__foot, .final-code, .case-back__cast, .case-back__web, .web__how, .example__tip, .book-back__web, .school__item, .dedication__card, .sol-final__box, .sol-closed__web')) {
        const r = el.getBoundingClientRect();
        if (r.bottom > box.bottom - 2 || r.right > box.right + 1) out.push(`página ${n}: ${(el as HTMLElement).className} se sale`);
      }
      // Página derecha: el plano no pisa la cuadrícula ni la cuadrícula la respuesta.
      const svg = pg.querySelector('.case-right .print-board svg');
      const grid = pg.querySelector('.case-right .dgrid');
      const ans = pg.querySelector('.case-right__answer');
      if (svg && grid && svg.getBoundingClientRect().bottom > grid.getBoundingClientRect().top + 1) out.push(`página ${n}: el plano tapa la cuadrícula`);
      if (grid && ans && grid.getBoundingClientRect().bottom > ans.getBoundingClientRect().top + 1) out.push(`página ${n}: la cuadrícula tapa «El asesino es»`);
      if (svg && svg.getBoundingClientRect().height < 400) out.push(`página ${n}: el plano ha quedado muy pequeño (${Math.round(svg.getBoundingClientRect().height)}px)`);
      if (pg.classList.contains('case-right') && !pg.classList.contains('is-final') && !pg.querySelector('.case-right__foot .qr svg')) out.push(`página ${n}: falta el QR del caso`);
      const cut = [...pg.querySelectorAll('.print-legend__name')].filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent);
      if (cut.length) out.push(`página ${n}: objetos cortados ${cut.join(', ')}`);
      const num = pg.querySelector('.page__num');
      if (num && num.textContent !== String(n)) out.push(`página ${n}: lleva el número ${num.textContent}`);
    });
    return {
      count: pages.length,
      out,
      qr: document.querySelectorAll('.qr svg').length,
      grid: document.querySelectorAll('.dgrid tbody tr').length,
      motives: document.querySelectorAll('.ps__motive').length,
      order: document.querySelectorAll('.sol-order li').length,
      halves: document.querySelectorAll('.sol-half').length,
    };
  });
  const bad: string[] = [];
  let tight = 0;
  for (const id of ids) {
    for (const kind of ['color', 'bn']) {
      await open(`${id}/${kind}`);
      const r = await problems();
      if (r.count !== 4) bad.push(`${id}/${kind}: ${r.count} páginas (deberían ser 4)`);
      if (r.qr < 2) bad.push(`${id}/${kind}: ${r.qr} códigos QR (deberían ser 2)`);
      if (r.grid !== cast[id]) bad.push(`${id}/${kind}: la cuadrícula de deducción tiene ${r.grid} filas (deberían ser ${cast[id]})`);
      if (r.motives !== cast[id] - 1) bad.push(`${id}/${kind}: ${r.motives} móviles (deberían ser ${cast[id] - 1})`);
      r.out.forEach((o) => bad.push(`${id}/${kind}: ${o}`));
      if (await page.locator('.case-left[class*="is-tight"]').count()) tight++;
    }
    await open(`${id}/solucion`);
    const s = await problems();
    if (s.count !== 1 || s.halves !== 2) bad.push(`${id}/solucion: ${s.count} páginas y ${s.halves} medias páginas (deberían ser 1 y 2)`);
    if (s.order !== cast[id]) bad.push(`${id}/solucion: el orden de colocación tiene ${s.order} personas (deberían ser ${cast[id]})`);
    if (!(await page.locator('.sol-profile__id strong').count())) bad.push(`${id}/solucion: no dice quién es el asesino`);
    s.out.forEach((o) => bad.push(`${id}/solucion: ${o}`));
  }

  // El libro completo.
  await open('libro');
  const b = await problems();
  if (b.count % 2) bad.push(`libro: ${b.count} páginas (tiene que ser par para que la contraportada cierre el libro)`);
  if (b.qr < ids.length + 6) bad.push(`libro: ${b.qr} códigos QR`);
  for (const [sel, n] of [['.dedication', 1], ['.rules', 1], ['.example', 1], ['.school', 3], ['.school__item', 9], ['.web', 1], ['.book-index', 1], ['.case-left.is-final', 1], ['.final-code__box', 10]] as const) {
    const c = await page.locator(sel).count();
    if (c !== n) bad.push(`libro: ${c} × ${sel} (deberían ser ${n})`);
  }
  const sheets = await page.locator('.sol-sheet').count();
  if (sheets !== Math.ceil((ids.length + 1) / 2) || b.halves !== ids.length + 1) bad.push(`libro: ${sheets} páginas de soluciones con ${b.halves} medias páginas`);
  const oddCases = await page.evaluate(() => [...document.querySelectorAll('.page')].map((pg, k) => (pg.classList.contains('case-left') && (k + 1) % 2 ? k + 1 : 0)).filter(Boolean));
  if (oddCases.length) bad.push(`libro: casos que empiezan en página impar: ${oddCases.join(', ')}`);
  b.out.forEach((o) => bad.push(`libro: ${o}`));

  // Para encuadernar: el margen de lomo va a la izquierda en las impares y a la derecha en las pares.
  await open('libro?encuadernar=1');
  const e = await problems();
  if (e.count !== b.count) bad.push(`libro para encuadernar: ${e.count} páginas (el normal tiene ${b.count})`);
  e.out.forEach((o) => bad.push(`libro para encuadernar: ${o}`));
  const gutters = await page.evaluate(() => [...document.querySelectorAll('.page')].map((pg, k) => {
    if (pg.classList.contains('book-cover') || pg.classList.contains('book-back')) return '';
    const st = getComputedStyle(pg);
    const l = parseFloat(st.borderLeftWidth), r = parseFloat(st.borderRightWidth);
    return (k + 1) % 2 ? (l > 25 && r === 0 ? '' : `${k + 1}`) : (r > 25 && l === 0 ? '' : `${k + 1}`);
  }).filter(Boolean));
  if (gutters.length) bad.push(`libro para encuadernar: sin margen de lomo en ${gutters.join(', ')}`);

  // Dedicado: la portada y la página 2 llevan los nombres.
  await page.goto('about:blank');
  await page.goto(`${base}#/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('churri-doku:dedicatoria', JSON.stringify({ para: 'Ana Prueba', de: 'Leo Prueba', msg: 'Un mensaje de prueba para la dedicatoria del libro.' })));
  await open('libro?dedicado=1');
  const d = await problems();
  d.out.forEach((o) => bad.push(`libro dedicado: ${o}`));
  const cover = await page.locator('.book-cover__for').textContent().catch(() => '');
  const ded = await page.locator('.dedication__text').textContent().catch(() => '');
  if (!cover?.includes('Ana Prueba') || !ded?.includes('Para Ana Prueba') || !ded.includes('De Leo Prueba')) bad.push(`libro dedicado: no lleva los nombres (portada «${cover}», dedicatoria «${ded}»)`);
  await page.evaluate(() => localStorage.removeItem('churri-doku:dedicatoria'));

  await browser.close();
  console.log(bad.length
    ? `✘ problemas en la versión para imprimir:\n${bad.join('\n')}`
    : `✔ ${ids.length * 2} casos en formato libro (con móviles, cuadrícula de deducción y QR), ${ids.length} soluciones en media página y el libro de ${b.count} páginas (también para encuadernar y dedicado): todo cabe sin cortes y bien numerado${tight ? ` (${tight} con la letra algo más pequeña para que quepa)` : ''}`);
  process.exit(bad.length ? 1 : 0);
}
main();
