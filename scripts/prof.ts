import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically } from '../src/engine/logic';
import { factsFor } from '../src/engine/facts';
import type { Clue, PuzzleInput } from '../src/engine/types';

const id = process.argv[2];
const mod = await import(`../src/data/puzzles/${id}.ts`);
const input: PuzzleInput = mod.default;
let seed = 7;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const draft = compilePuzzle({ ...input, solution: undefined as never }, { draft: true });
// solución aleatoria válida
const s = draft.size, n = draft.cast.length;
let pos: number[] | null = null;
for (let a = 0; a < 2000 && !pos; a++) {
  const p2: number[] = []; const rows = new Set<number>(), cols = new Set<number>(); let ok = true;
  for (let k = 0; k < n; k++) {
    const opts = draft.cells.filter(c => c.occupiable && !rows.has(c.r) && !cols.has(c.c) && (!input.pins?.[draft.cast[k].id]?.rooms || input.pins[draft.cast[k].id].rooms!.some(rk => draft.roomByKey[rk] === c.room)));
    if (!opts.length) { ok = false; break; }
    const c = opts[Math.floor(rng() * opts.length)]; p2.push(c.i); rows.add(c.r); cols.add(c.c);
  }
  if (!ok) continue;
  const v = draft.cast.findIndex(c => c.victim); const vr = draft.cells[p2[v]].room;
  const comp = p2.map((i, k) => k !== v && draft.cells[i].room === vr ? k : -1).filter(k => k >= 0);
  if (comp.length === 1 && draft.cast[comp[0]].id === input.wantMurderer) pos = p2;
}
console.log('solution found', !!pos);
const p = compilePuzzle({ ...input, solution: Object.fromEntries(draft.cast.map((ch, k) => [ch.id, [Math.floor(pos![k] / s), pos![k] % s]])) });
const facts = p.cast.map((ch, k) => ch.victim ? [] : factsFor(p, k, pos!));
console.log('facts per char', facts.map(f => f.length).join(','));
// todas las unarias más fuertes: elegir inRoom + algo
const C: Clue[][] = p.cast.map((ch, k) => ch.victim ? [{ t: 'victim' } as Clue] : facts[k][Math.floor(rng() * facts[k].length)].clue);
let t0 = Date.now();
let r = solve(p, 30, C, 400000);
console.log('initial solve', r.count, r.nodes, r.aborted, Date.now() - t0, 'ms');
// reducir con hechos 'on'/'inRoom' fuertes
for (let it = 0; it < 30 && r.count !== 1; it++) {
  const k = Math.floor(rng() * n); if (p.cast[k].victim) continue;
  let best: { c: Clue[]; cnt: number } | null = null;
  for (const f of facts[k].slice(0, 25)) {
    const T = C.slice(); T[k] = f.clue; t0 = Date.now(); const rr = solve(p, 30, T, 400000);
    if (rr.count >= 1 && (!best || rr.count < best.cnt)) best = { c: f.clue, cnt: rr.count };
  }
  if (best) { C[k] = best.c; r = solve(p, 30, C, 400000); }
  console.log('it', it, 'count', r.count, 'nodes', r.nodes, 'aborted', r.aborted);
}
const q = { ...p, cast: p.cast.map((ch, k) => ({ ...ch, clues: C[k] })) };
t0 = Date.now();
const L0 = solveLogically(q, { allowTrial: false });
console.log('logic no-trial', L0.solved, L0.steps.length, Date.now() - t0, 'ms', JSON.stringify(L0.techCount));
t0 = Date.now();
const L1 = solveLogically(q, { allowTrial: true });
console.log('logic trial', L1.solved, L1.steps.length, Date.now() - t0, 'ms', JSON.stringify(L1.techCount), 'score/char', (L1.score / n).toFixed(2));
