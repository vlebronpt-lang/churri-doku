/**
 * Galería de todos los objetos del plano (para revisar el dibujo).
 *   npx tsx scripts/icons.ts [salida.png] [--only statue,armor]
 */
import { chromium } from 'playwright-core';
import { ICONS } from '../src/render/icons';
import { CATALOG } from '../src/engine/catalog';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  const args = process.argv.slice(2);
  const out = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--only')) ?? `${process.env.TMPDIR ?? '/tmp'}/icons.png`;
  const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
  const only = onlyArg ? new Set(onlyArg.split(',')) : null;
  const S = 150;
  const cells: string[] = [];
  const names = new Map<string, string>();
  for (const b of Object.values(CATALOG)) if (!names.has(b.icon)) names.set(b.icon, `${b.name}${b.occupiable ? ' ✓' : ''}`);
  for (const [icon, fn] of Object.entries(ICONS)) {
    if (only && !only.has(icon)) continue;
    if (icon === 'carpet' || icon === 'water') continue;
    const variants: { w: number; h: number; tint?: string }[] = [{ w: 100, h: 100 }];
    if (['statue', 'orb', 'pedestal', 'banner', 'throne', 'armor', 'pillar'].includes(icon)) variants.push({ w: 100, h: 100, tint: '#e3b341' }, { w: 100, h: 100, tint: '#7d7466' });
    for (const v of variants) {
      const body = fn(v.w, v.h, { tint: v.tint });
      cells.push(`<div class="c"><svg width="${S}" height="${S}" viewBox="-8 -8 116 116"><rect x="-8" y="-8" width="116" height="116" fill="#e9dcc3"/><rect x="0" y="0" width="100" height="100" fill="#efe3cc" stroke="#d8c8a8"/>${body}</svg><div>${icon}${v.tint ? ` · ${v.tint}` : ''}<br><small>${names.get(icon) ?? ''}</small></div></div>`);
    }
  }
  const html = `<html><body style="margin:10px;background:#fff;font:12px Arial"><div style="display:grid;grid-template-columns:repeat(8,${S}px);gap:10px">${cells.join('')}</div><style>.c{text-align:center}</style></body></html>`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 8 * (S + 10) + 20, height: 600 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log(out);
}

main();
