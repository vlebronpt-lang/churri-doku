/**
 * Hoja de contactos con los tableros de todos los casos (para revisar etiquetas y objetos).
 *   npx tsx scripts/boards.ts [salida.png] [--sol]
 */
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { renderBoard, boardSize, CELL } from '../src/render/board';
import { compilePuzzle } from '../src/engine/puzzle';
import type { PuzzleInput } from '../src/engine/types';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&display=block" rel="stylesheet">`;

async function main() {
  const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? `${process.env.TMPDIR ?? '/tmp'}/boards.png`;
  const sol = process.argv.includes('--sol');
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const ids = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, ''));
  const items: { num: number; html: string }[] = [];
  for (const id of ids) {
    const input: PuzzleInput = (await import(`../src/data/puzzles/${id}.ts`)).default;
    const p = compilePuzzle(input, { draft: !input.solution });
    let svg = renderBoard(p, {});
    const { w, h, off } = boardSize(p, false);
    if (sol && input.solution) {
      let tokens = '';
      for (const ch of p.cast) {
        const [r, c] = input.solution[ch.id];
        const x = off + c * CELL + CELL / 2, y = off + r * CELL + CELL / 2;
        tokens += `<circle cx="${x}" cy="${y}" r="41" fill="${ch.victim ? '#d9483b' : '#fff'}" stroke="#2b2631" stroke-width="5" opacity=".92"/><text x="${x}" y="${y + 11}" font-family="Archivo Black" font-size="30" text-anchor="middle" fill="${ch.victim ? '#fff' : '#2b2631'}">${ch.tag}</text>`;
      }
      svg = svg.replace('</svg>', `${tokens}</svg>`);
    }
    const S = 380;
    svg = svg.replace(`width="${w}" height="${h}"`, `width="${S}" height="${(S * h) / w}"`);
    items.push({ num: p.num, html: `<div class="c">${svg}<div>${p.num}. ${p.id}</div></div>` });
  }
  items.sort((a, b) => a.num - b.num);
  const html = `<html><head>${FONT}<style>body{margin:10px;background:#f6f1e6;font:12px Arial}.g{display:grid;grid-template-columns:repeat(5,380px);gap:12px}.c{text-align:center}</style></head><body><div class="g">${items.map((i) => i.html).join('')}</div></body></html>`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 5 * 392 + 20, height: 800 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log(out);
}

main();
