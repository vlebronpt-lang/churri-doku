/**
 * Comprueba el motor de pistas en los 25 casos: con la marca «Ocupada» (una correcta da una pista, una incorrecta
 * se detecta como error y, siguiendo las pistas, se llega a la solución) y como un jugador que lee cada explicación
 * y hace lo que propone o pasa a la siguiente: ninguna pista se repite y se llega al final sin revelar a nadie.
 *   npx tsx scripts/test-hints.ts
 */
import { readdirSync } from 'node:fs';
import { compilePuzzle } from '../src/engine/puzzle';
import { computeHint, remember, type HintMemory } from '../src/game/hints';
import type { PuzzleInput } from '../src/engine/types';
async function main() {
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const ids = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, ''));
  let ok = 0;
  for (const id of ids) {
    const p = compilePuzzle((await import(`../src/data/puzzles/${id}.ts`)).default as PuzzleInput);
    const sol = new Set(Object.values(p.solution));
    const right = [...sol][2];
    const wrong = p.cells.find((c) => c.occupiable && !sol.has(c.i))!.i;
    const good = computeHint(p, { placed: {}, notes: {}, xs: {}, occ: { [right]: true } });
    const bad = computeHint(p, { placed: {}, notes: {}, xs: {}, occ: { [wrong]: true } });
    // Resolver solo con pistas partiendo de una casilla ocupada correcta: debe llegar al final.
    const board = { placed: {} as Record<number, string>, notes: {}, xs: {} as Record<number, 'm' | 'a'>, occ: { [right]: true } as Record<number, true> };
    let steps = 0, res = computeHint(p, board);
    let reveals = 0;
    while ((res.kind === 'step' || res.kind === 'reveal') && steps < 400) {
      if (res.kind === 'reveal') {
        reveals++;
        board.placed[res.cell] = res.id;
        steps++;
        res = computeHint(p, board);
        continue;
      }
      const r = res;
      r.xCells.forEach((c) => { if (board.placed[c] === undefined) board.xs[c] = 'm'; });
      const target = r.d.place ? { id: p.cast[r.d.place.k].id, cell: r.d.place.i } : r.leadsTo;
      if (target) {
        for (const [k, v] of Object.entries(board.placed)) if (v === target.id) delete board.placed[Number(k)];
        board.placed[target.cell] = target.id;
        delete board.xs[target.cell];
      }
      steps++;
      res = computeHint(p, board);
    }
    const pass = good.kind === 'step' && bad.kind === 'errors' && bad.wrongOcc.includes(wrong) && res.kind === 'solved';
    if (pass) ok++;
    else console.log('✘', id, good.kind, bad.kind, res.kind, steps);
    if (reveals) console.log(`  · ${id}: ${reveals} veces hubo que revelar una posición`);
  }
  console.log(`${ok}/${ids.length} casos: pistas con casillas ocupadas correctas`);

  // Jugador que pide pista, lee la explicación y hace lo que propone (colocar, tachar, zona o lápiz) o pasa a la siguiente.
  let fine = 0;
  for (const id of ids) {
    const p = compilePuzzle((await import(`../src/data/puzzles/${id}.ts`)).default as PuzzleInput);
    const board = { placed: {} as Record<number, string>, notes: {} as Record<number, string[]>, xs: {} as Record<number, 'm' | 'a'>, occ: {}, zones: {} as Record<string, number> };
    let memo: HintMemory = {};
    let prev = '', repeats = 0, reveals = 0, steps = 0;
    for (; steps < 600; steps++) {
      const res = computeHint(p, board, memo);
      if (res.kind === 'solved') break;
      if (res.kind === 'reveal') { reveals++; board.placed[res.cell] = res.id; continue; }
      if (res.kind !== 'step') break;
      if (res.d.text === prev) repeats++;
      prev = res.d.text;
      memo = remember(memo, p, res.d);
      const d = res.d;
      if (d.place) board.placed[d.place.i] = p.cast[d.place.k].id;
      else if (res.xCells.length) res.xCells.forEach((c) => { board.xs[c] = 'm'; });
      else if (res.zone) board.zones[res.zone.id] = res.zone.room;
      else if (res.notes) for (const c of res.notes.cells) board.notes[c] = [...(board.notes[c] ?? []), res.notes.id];
    }
    const solved = Object.keys(board.placed).length === p.cast.length;
    if (solved && !repeats && !reveals) fine++;
    else console.log('✘', id, solved ? '' : 'sin resolver', repeats ? `${repeats} pistas repetidas` : '', reveals ? `${reveals} reveladas` : '');
  }
  console.log(`${fine}/${ids.length} casos: siguiendo las pistas ninguna se repite y se llega al final`);
  if (ok < ids.length || fine < ids.length) process.exit(1);
}
main();
