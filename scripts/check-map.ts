/**
 * Comprueba el mapa de un caso sin generar pistas:  npx tsx scripts/check-map.ts <id>
 * Zonas conexas y de tamaño razonable, casillas ocupables por fila y columna, densidad de objetos, reparto completo,
 * reglas bien escritas y que existan colocaciones que las cumplan con el asesino y la víctima pedidos.
 */
import { compilePuzzle } from '../src/engine/puzzle';
import { caseRuleSegs } from '../src/engine/text';
import type { PuzzleInput } from '../src/engine/types';
import { makeRng, randomSolution } from './genlib';

async function main() {
  const id = process.argv[2];
  const input: PuzzleInput = (await import(`../src/data/puzzles/${id}.ts`)).default;
  const p = compilePuzzle({ ...input, solution: undefined as never, clues: undefined }, { draft: true });
  const s = p.size;
  const bad: string[] = [];
  const warn: string[] = [];
  const zones = p.rooms.map((R) => ({ R, cells: p.cells.filter((c) => c.room === R.id) }));
  for (const { R, cells } of zones) {
    if (cells.length < 4) bad.push(`la zona «${R.name}» tiene ${cells.length} casillas (mínimo 4)`);
    const free = cells.filter((c) => c.occupiable).length;
    if (free < 2) bad.push(`la zona «${R.name}» solo tiene ${free} casillas ocupables (mínimo 2)`);
  }
  const minZ = s === 9 ? 7 : s === 10 ? 8 : 9;
  if (p.rooms.length < minZ || p.rooms.length > minZ + 2) warn.push(`${p.rooms.length} zonas en un plano de ${s}×${s} (lo normal son ${minZ}–${minZ + 1})`);
  for (let k = 0; k < s; k++) {
    const row = p.cells.filter((c) => c.r === k && c.occupiable).length;
    const col = p.cells.filter((c) => c.c === k && c.occupiable).length;
    if (row < 3) bad.push(`la fila ${k + 1} solo tiene ${row} casillas ocupables (mínimo 3)`);
    if (col < 3) bad.push(`la columna ${k + 1} solo tiene ${col} casillas ocupables (mínimo 3)`);
  }
  const withObj = p.cells.filter((c) => c.obj || c.floor).length / p.cells.length;
  const blocked = p.cells.filter((c) => !c.occupiable).length / p.cells.length;
  if (withObj < 0.42 || withObj > 0.7) warn.push(`objetos en el ${Math.round(withObj * 100)} % de las casillas (lo normal: 50–60 %)`);
  if (blocked < 0.2 || blocked > 0.42) warn.push(`bloqueadas el ${Math.round(blocked * 100)} % de las casillas (lo normal: 30–35 %)`);
  const uniques = Object.values(p.objects).filter((o) => o.unique).length;
  if (!uniques) warn.push('ningún objeto único con nombre propio (lo normal: 1–3)');
  const want = s === 9 ? 9 : 10;
  if (p.cast.length !== want) warn.push(`${p.cast.length} personajes en ${s}×${s} (se esperaban ${want})`);
  if (!input.story?.intro || !input.story?.epilogue) bad.push('falta la historia');
  if (!input.wantMurderer) bad.push('falta wantMurderer');
  // Colocaciones posibles.
  const rng = makeRng(7);
  let found = 0;
  const T0 = Date.now();
  for (let t = 0; t < 12 && Date.now() - T0 < 25000; t++) if (randomSolution(p, input, rng)) found++;
  if (!found) bad.push('no aparece ninguna colocación que cumpla el asesino, la víctima, las fijaciones y las reglas');
  console.log(`${id}: ${s}×${s}, ${p.cast.length} personas, ${p.rooms.length} zonas (${zones.map((z) => z.cells.length).join(', ')} casillas), objetos ${Math.round(withObj * 100)} %, bloqueadas ${Math.round(blocked * 100)} %, únicos ${uniques}, colocaciones ${found}/12`);
  for (const segs of caseRuleSegs(p)) console.log(`  regla: ${segs.map((x) => x.text).join('')}`);
  warn.forEach((w) => console.log(`  ⚠ ${w}`));
  bad.forEach((b) => console.log(`  ✘ ${b}`));
  console.log(bad.length ? '✘ hay que corregirlo' : '✔ mapa correcto');
  process.exit(bad.length ? 1 : 0);
}
main();
