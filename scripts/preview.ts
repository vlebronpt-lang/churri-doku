/**
 * Vista previa a PNG.
 *   npx tsx scripts/preview.ts icons            → galería de iconos
 *   npx tsx scripts/preview.ts <id> [--sol]     → tablero del puzzle (con solución opcional)
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ICONS } from '../src/render/icons';
import { renderBoard, boardSize, CELL } from '../src/render/board';
import { compilePuzzle } from '../src/engine/puzzle';
import type { PuzzleInput } from '../src/engine/types';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.PREVIEW_OUT ?? `${process.env.TMPDIR ?? '/tmp'}/churri-preview`;

async function shot(html: string, file: string, width: number, height: number) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  await page.screenshot({ path: file, fullPage: true });
  await browser.close();
  console.log(file);
}

const FONT = `<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;700&display=swap" rel="stylesheet">`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const what = process.argv[2];
  if (what === 'icons') {
    const names = Object.keys(ICONS);
    const cols = 10;
    const cells = names.map((n) => {
      const multi = ['sofa', 'bench', 'bed', 'bunk', 'stretcher', 'lounger', 'hammock', 'boat', 'longship', 'car', 'rv', 'ship', 'table', 'desk', 'counter', 'fence', 'holotable', 'press', 'pit', 'coffin', 'machine', 'console', 'titan'].includes(n);
      const w = multi ? 200 : 100;
      const h = n === 'titan' ? 200 : 100;
      const svg = ICONS[n](w, h, {});
      return `<div class="c"><svg viewBox="-6 -6 ${w + 12} ${h + 12}" width="${w * 0.9}" height="${h * 0.9}" style="background:#e9e2d3;border-radius:8px">${svg}</svg><div>${n}</div></div>`;
    });
    const html = `<html><head>${FONT}<style>body{font-family:Inter,sans-serif;background:#f6f1e6;margin:12px}.g{display:grid;grid-template-columns:repeat(${cols},auto);gap:10px}.c{font-size:11px;text-align:center}</style></head><body><div class="g">${cells.join('')}</div></body></html>`;
    await shot(html, `${OUT}/icons.png`, 1500, 900);
    return;
  }
  const mod = await import(`../src/data/puzzles/${what}.ts`);
  const input: PuzzleInput = mod.default;
  const p = compilePuzzle(input, { draft: !input.solution });
  const svg = renderBoard(p, { coords: true });
  const { w, h, off } = boardSize(p, true);
  let tokens = '';
  if (process.argv.includes('--sol') && input.solution) {
    for (const ch of p.cast) {
      const [r, c] = input.solution[ch.id];
      const x = off + c * CELL + CELL / 2, y = off + r * CELL + CELL / 2;
      tokens += `<circle cx="${x}" cy="${y}" r="30" fill="${ch.victim ? '#d9483b' : '#fff'}" stroke="#2b2631" stroke-width="5"/><text x="${x}" y="${y + 11}" font-family="Archivo Black" font-size="30" text-anchor="middle" fill="${ch.victim ? '#fff' : '#2b2631'}">${ch.tag}</text>`;
    }
  }
  const full = svg.replace('</svg>', `${tokens}</svg>`);
  const scale = Math.min(1, 900 / w);
  const html = `<html><head>${FONT}<style>body{margin:0;background:#f6f1e6}</style></head><body><div style="padding:14px;width:${w * scale}px">${full.replace(`width="${w}" height="${h}"`, `width="${w * scale}" height="${h * scale}"`)}</div></body></html>`;
  writeFileSync(`${OUT}/${what}.svg`, full);
  await shot(html, `${OUT}/${what}.png`, Math.ceil(w * scale) + 28, Math.ceil(h * scale) + 28);
}

main();
