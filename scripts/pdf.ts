/**
 * Genera los PDF descargables a partir de la web compilada (dist/):
 *   npm run build && npx tsx scripts/pdf.ts
 * Crea en dist/downloads/:
 *   - churri-doku-NN-<id>-color.pdf / -bn.pdf (cada caso en formato libro: portada, doble página con los
 *     sospechosos, sus pistas y móviles y los objetos a la izquierda, y el plano con la cuadrícula de deducción a
 *     la derecha, y contraportada) y -solucion.pdf (una página: la solución en media página y «caso cerrado»)
 *   - churri-doku-libro-completo.pdf (portada, dedicatoria, cómo se juega, un ejemplo resuelto, la escuela de
 *     detectives, la web con QR, índice, 25 casos en doble página, el caso final exclusivo, las soluciones de dos
 *     en dos, notas y contraportada)
 *   - churri-doku-libro-encuadernar-interior.pdf y -cubiertas.pdf (el libro con margen de lomo: el interior en
 *     papel y las cubiertas, portada y contraportada con sus reversos, en cartulina)
 *   - churri-doku-todos-los-casos.zip (todos los PDF sueltos por nivel)
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright-core';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { downloadName, BOOK_BOUND_COVERS, BOOK_BOUND_INTERIOR, BOOK_PDF, ZIP_ALL, type PdfKind } from '../src/downloads';
import type { PuzzleInput } from '../src/engine/types';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const OUT = join(DIST, 'downloads');
const LEVEL_DIR = ['', '1-muy-facil', '2-facil', '3-medio', '4-dificil', '5-experto'];
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf', '.zip': 'application/zip',
};

function serve(port: number) {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = normalize(join(DIST, url));
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise<typeof server>((resolve) => server.listen(port, () => resolve(server)));
}

async function loadPuzzles() {
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
  const list: PuzzleInput[] = [];
  for (const f of files) {
    const mod = await import(`../src/data/puzzles/${f}`);
    if (mod.default?.solution) list.push(mod.default as PuzzleInput);
  }
  return list.sort((a, b) => a.num - b.num);
}

async function render(page: Page, base: string, route: string): Promise<Uint8Array> {
  // Cada hoja en un documento nuevo: con solo cambiar el #, la señal de «listo» sería la de la hoja anterior.
  await page.goto('about:blank');
  await page.goto(`${base}#${route}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('body[data-print-ready="1"]', { timeout: 30000 });
  await page.waitForTimeout(150);
  return page.pdf({ format: 'A4', landscape: false, printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('Primero compila la web: npm run build');
  mkdirSync(OUT, { recursive: true });
  const puzzles = await loadPuzzles();
  const port = 4791;
  const server = await serve(port);
  const base = `http://localhost:${port}/`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));

  const zip = new JSZip();
  const kinds: PdfKind[] = ['color', 'bn', 'solucion'];
  const sheets: Record<string, Record<PdfKind, Uint8Array>> = {};
  for (const p of puzzles) {
    sheets[p.id] = {} as Record<PdfKind, Uint8Array>;
    for (const kind of kinds) {
      const doc = await PDFDocument.load(await render(page, base, `/imprimir/${p.id}/${kind}`));
      // Cada caso en formato libro son 4 páginas; la solución, una (media página y «caso cerrado»).
      if (doc.getPageCount() !== (kind === 'solucion' ? 1 : 4)) throw new Error(`${p.id}/${kind}: ${doc.getPageCount()} páginas`);
      doc.setTitle(`Churri-doku Nº ${String(p.num).padStart(2, '0')} · ${p.title}${kind === 'solucion' ? ' (solución)' : kind === 'bn' ? ' (blanco y negro)' : ''}`);
      doc.setAuthor('Churri-doku');
      doc.setSubject(`${p.franchise} · sudoku con asesinato`);
      doc.setLanguage('es-ES');
      const bytes = await doc.save();
      sheets[p.id][kind] = bytes;
      const name = downloadName(p, kind);
      writeFileSync(join(OUT, name), bytes);
      zip.file(`churri-doku/${LEVEL_DIR[p.level]}/${name}`, bytes);
    }
    console.log(`✔ ${String(p.num).padStart(2)} ${p.id}`);
  }

  // Libro completo: un único documento (portada, reglas, casos y soluciones al final).
  const book = await PDFDocument.load(await render(page, base, '/imprimir/libro'));
  book.setTitle('Churri-doku · Libro completo');
  book.setAuthor('Churri-doku');
  book.setSubject(`${puzzles.length} casos de lógica: sudoku con asesinato`);
  book.setLanguage('es-ES');
  const bookBytes = await book.save();
  writeFileSync(join(OUT, BOOK_PDF), bookBytes);
  // Portada, dedicatoria, cómo se juega, ejemplo, escuela, web, índice, 2 páginas por caso y por el caso final, las
  // soluciones de dos en dos, notas y contraportada: número par, para que la contraportada cierre el libro.
  const minPages = 9 + 2 * (puzzles.length + 1) + Math.ceil((puzzles.length + 1) / 2) + 2;
  if (book.getPageCount() % 2 || book.getPageCount() < minPages) throw new Error(`El libro tiene ${book.getPageCount()} páginas`);

  // Para encuadernar: el mismo libro con margen de lomo. Las cubiertas (portada y su reverso, la dedicatoria;
  // contraportada y su reverso, las notas) van en cartulina; el interior empieza en la página 3, que es impar.
  const bound = await PDFDocument.load(await render(page, base, '/imprimir/libro?encuadernar=1'));
  const n = bound.getPageCount();
  if (n !== book.getPageCount()) throw new Error(`El libro para encuadernar tiene ${n} páginas y el normal ${book.getPageCount()}`);
  const part = async (title: string, idx: number[]) => {
    const doc = await PDFDocument.create();
    for (const pg of await doc.copyPages(bound, idx)) doc.addPage(pg);
    doc.setTitle(`Churri-doku · ${title}`);
    doc.setAuthor('Churri-doku');
    doc.setLanguage('es-ES');
    return doc.save();
  };
  const interior = await part('Libro para encuadernar (interior)', Array.from({ length: n - 4 }, (_, i) => i + 2));
  const covers = await part('Libro para encuadernar (cubiertas)', [0, 1, n - 2, n - 1]);
  writeFileSync(join(OUT, BOOK_BOUND_INTERIOR), interior);
  writeFileSync(join(OUT, BOOK_BOUND_COVERS), covers);
  zip.file('churri-doku/LEEME.txt', [
    'Churri-doku · Sudoku con asesinato',
    '',
    'Cada caso viene en tres archivos:',
    '  -color.pdf     el caso a color, en formato libro (4 páginas)',
    '  -bn.pdf        lo mismo en blanco y negro (ahorra tinta)',
    '  -solucion.pdf  la solución (el plano resuelto, el perfil del asesino y el orden en que',
    '                 se coloca a cada uno), aparte para no verla sin querer',
    '',
    'Formato libro: portada, doble página (a la izquierda, los sospechosos con su pista y su',
    'móvil y los objetos del plano; a la derecha, el plano y la cuadrícula de deducción) y',
    'contraportada. Imprime en A4 vertical a doble cara (volteo por el borde largo): al',
    'abrirlo, el plano queda frente a los sospechosos.',
    '',
    'Juega online, con pistas paso a paso:',
    'https://vlebronpt-lang.github.io/churri-doku/',
    '',
    'Proyecto fan sin ánimo de lucro. Los personajes pertenecen a sus propietarios.',
  ].join('\n'));
  const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  writeFileSync(join(OUT, ZIP_ALL), zipBytes);
  // Tamaños para mostrarlos en la página de descargas.
  writeFileSync(join(OUT, 'tamanos.json'), JSON.stringify({ libro: bookBytes.length, zip: zipBytes.length, interior: interior.length, cubiertas: covers.length }));
  console.log(`✔ libro (${n} páginas, ${(bookBytes.length / 1e6).toFixed(1)} MB), para encuadernar (${(interior.length / 1e6).toFixed(1)} + ${(covers.length / 1e6).toFixed(1)} MB) y zip (${(zipBytes.length / 1e6).toFixed(1)} MB)`);

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
