/**
 * Núcleo del generador de pistas (lo usan scripts/gen.ts y scripts/daily.ts).
 *
 * Dado un mapa con reparto, busca una colocación (o usa la dada) y un juego de pistas que el
 * motor lógico resuelva sin adivinar y con la dificultad pedida. La solución única se verifica
 * además con el solver exhaustivo.
 */
import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically, type LogicReport } from '../src/engine/logic';
import { factsFor, type Fact } from '../src/engine/facts';
import { castIndex, cellHas, unaryDomain } from '../src/engine/clues';
import type { Clue, Level, Puzzle, PuzzleInput } from '../src/engine/types';
import { PROFILE, hardSteps, type Profile } from '../src/engine/difficulty';

export { PROFILE, type Profile };

export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const pickWith = <T,>(rng: Rng, a: T[]) => a[Math.floor(rng() * a.length)];
const shuffleWith = <T,>(rng: Rng, a: T[]) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** Preferencia de tipos de pista según el `clueLevel` del perfil (se multiplica por el "sabor" de cada hecho). */
export const KIND_WEIGHT: Record<Level, Record<string, number>> = {
  1: { inRoom: 3, on: 3, beside: 3, inRoomNotBeside: 2, row: 1.6, col: 1.6, dir: 1.4, alone: 2, onlyOn: 2, corner: 0.6 },
  2: { inRoom: 2, on: 2, beside: 2, inRoomNotBeside: 1.5, dir: 2, sameRoom: 2, aloneWith: 2, row: 1.2, col: 1.2, corner: 1.4, withGender: 1.6, offset: 1, alone: 1.6, onlyOn: 1.4, adjacentTo: 1.2, inRoomCorner: 1 },
  3: { inRoom: 1.4, on: 1.4, beside: 1.6, dir: 2, dirDiag: 1.2, offset: 1.6, sameRoom: 1.8, aloneWith: 1.6, withGender: 1.6, corner: 1.4, roomCount: 1.4, withSomeoneOn: 1.2, notAlone: 1, row2: 1, col2: 1, diagonal: 1, adjacentTo: 1.2, inRoomNotOn: 1, alone: 1.2 },
  4: { dir: 2, dirDiag: 1.6, offset: 2, diagonal: 1.6, sameRoom: 1.8, notSameRoom: 1, withGender: 1.8, roomCount: 1.6, notAlone: 1, someoneAtOffset: 1.6, besideN: 1.2, corner: 1.4, inRoomNotOn: 1, beside: 1.4, inRoom: 1, on: 1, row2: 1.4, col2: 1.4, roomEmpty: 1, withSomeoneOn: 1.4, withSomeoneBeside: 1.2, adjacentTo: 1.2, notBeside: 1 },
  5: { dir: 2, dirDiag: 1.8, offset: 2, diagonal: 1.8, sameRoom: 1.6, notSameRoom: 1.2, withGender: 1.8, roomCount: 1.6, notAlone: 1.2, someoneAtOffset: 2, besideN: 1.4, corner: 1.4, inRoomNotOn: 1, beside: 1.2, inRoom: 0.8, on: 0.8, row2: 1.4, col2: 1.4, roomEmpty: 1.2, withSomeoneOn: 1.4, withSomeoneBeside: 1.4, adjacentTo: 1.2, notBeside: 1.2 },
};

export interface GenResult { facts: (Fact | null)[]; rep: LogicReport; p: Puzzle; obj: number }

/** Colocación aleatoria válida: una persona por fila y columna, la víctima a solas con una sola persona. */
export function randomSolution(p: Puzzle, input: PuzzleInput, rng: Rng): number[] | null {
  const n = p.cast.length;
  const s = p.size;
  const idx = castIndex(p);
  const want = input.wantMurderer;
  const pins = input.pins ?? {};
  const allowed = p.cast.map((ch) => {
    const pin = pins[ch.id];
    return p.cells.filter((c) => {
      if (!c.occupiable) return false;
      if (!pin) return true;
      if (pin.rooms && !pin.rooms.some((rk) => p.roomByKey[rk] === c.room)) return false;
      if (pin.objs && !pin.objs.some((o) => cellHas(p, c.i, o))) return false;
      if (pin.cells && !pin.cells.some(([r, cc]) => r === c.r && cc === c.c)) return false;
      return true;
    }).map((c) => c.i);
  });
  for (let attempt = 0; attempt < 3000; attempt++) {
    const pos = new Array<number>(n).fill(-1);
    const rows = new Set<number>(), cols = new Set<number>();
    const order = shuffleWith(rng, Array.from({ length: n }, (_, k) => k)).sort((a, b) => allowed[a].length - allowed[b].length);
    let ok = true;
    for (const k of order) {
      const opts = shuffleWith(rng, allowed[k]).filter((i) => !rows.has(Math.floor(i / s)) && !cols.has(i % s));
      if (!opts.length) { ok = false; break; }
      const i = opts[0];
      pos[k] = i;
      rows.add(Math.floor(i / s));
      cols.add(i % s);
    }
    if (!ok) continue;
    const v = idx[p.victim];
    const vRoom = p.cells[pos[v]].room;
    const comp = pos.map((i, k) => (k !== v && p.cells[i].room === vRoom ? k : -1)).filter((k) => k >= 0);
    if (comp.length !== 1) continue;
    if (want && p.cast[comp[0]].id !== want) continue;
    return pos;
  }
  return null;
}

function cluesFrom(p: Puzzle, facts: (Fact | null)[]): Clue[][] {
  return p.cast.map((ch, k) => (ch.victim ? [{ t: 'victim' } as Clue] : facts[k]?.clue ?? []));
}

function withClues(p: Puzzle, C: Clue[][]): Puzzle {
  return { ...p, cast: p.cast.map((ch, k) => ({ ...ch, clues: C[k] })) };
}

/** Evalúa un juego de pistas: ¿lo resuelve la lógica? ¿cuántas posibilidades quedan? */
/** Tiempo máximo para evaluar un juego de pistas (los que tardan más no sirven: serían inhumanos). */
const EVAL_MS = 2500;
function evalSet(p: Puzzle, facts: (Fact | null)[], allowTrial: boolean) {
  const q = withClues(p, cluesFrom(p, facts));
  const rep = solveLogically(q, { allowTrial, maxSteps: 300, deadline: Date.now() + EVAL_MS });
  let rem = p.cast.length;
  const perChar = p.cast.map(() => 1);
  if (!rep.solved && rep.stuckState) {
    rem = 0;
    rep.stuckState.cand.forEach((a, k) => {
      let c = 0;
      for (let i = 0; i < a.length; i++) c += a[i];
      perChar[k] = c;
      rem += c;
    });
  }
  return { rep, rem, perChar, solved: rep.solved && rep.sound, q };
}

/** Busca pistas para una colocación concreta. `deadline` (ms) corta el intento si se alarga. */
export function searchClues(p: Puzzle, pos: number[], _level: Level, prof: Profile, rng: Rng, deadline = Infinity): GenResult | null {
  const n = p.cast.length;
  const W = KIND_WEIGHT[prof.clueLevel];
  const all = p.cast.map((ch, k) => (ch.victim ? [] : factsFor(p, k, pos).filter((f) => f.minLevel <= prof.clueLevel)));
  if (all.some((fs, k) => !p.cast[k].victim && fs.length === 0)) return null;
  const weightOf = (f: Fact) => f.flavor * (W[f.kind] ?? 0.4);
  const weighted = (fs: Fact[]) => {
    const total = fs.reduce((a, f) => a + weightOf(f), 0);
    let x = rng() * total;
    for (const f of fs) {
      x -= weightOf(f);
      if (x <= 0) return f;
    }
    return fs[fs.length - 1];
  };
  const facts: (Fact | null)[] = all.map((fs) => (fs.length ? weighted(fs) : null));
  const free = Array.from({ length: n }, (_, j) => j).filter((j) => !p.cast[j].victim);

  const T0 = Date.now();
  // 1) Reforzar hasta que la deducción lógica (sin suposiciones) lo resuelva.
  let ev = evalSet(p, facts, false);
  for (let it = 0; it < 90 && !ev.solved; it++) {
    if (Date.now() > deadline) return null;
    const weights = free.map((j) => ev.perChar[j] + 1);
    let x = rng() * weights.reduce((a, b) => a + b, 0);
    let k = free[0];
    for (let q = 0; q < free.length; q++) { x -= weights[q]; if (x <= 0) { k = free[q]; break; } }
    let best: { f: Fact; e: ReturnType<typeof evalSet> } | null = null;
    const sample = shuffleWith(rng, all[k]).slice(0, 14);
    for (const f of sample) {
      const trial = facts.slice();
      trial[k] = f;
      const e = evalSet(p, trial, false);
      if (!best || e.rem < best.e.rem || (e.rem === best.e.rem && weightOf(f) > weightOf(best.f))) best = { f, e };
    }
    if (best && best.e.rem <= ev.rem) {
      facts[k] = best.f;
      ev = best.e;
    }
  }
  if (!ev.solved && prof.maxTrial > 0) ev = evalSet(p, facts, true);
  if (process.env.GEN_DEBUG) console.log(`  base: solved ${ev.solved} rem ${ev.rem} t=${((Date.now() - T0) / 1000).toFixed(1)}s`);
  if (!ev.solved) return null;

  // 2) Ajustar la dificultad hacia la banda del nivel.
  const allowTrial = prof.maxTrial > 0;
  const okRep = (r: LogicReport) => r.solved && r.sound && r.maxLevel <= prof.maxLevel && r.techCount.trial <= prof.maxTrial;
  // Demasiado fácil: por debajo de la banda, o sin las suposiciones o los pasos difíciles que pide el nivel.
  const easy = (r: LogicReport) => r.score / n < prof.band[0] || r.techCount.trial < prof.minTrial || hardSteps(r.techCount) < prof.minHard;
  let rep = evalSet(p, facts, allowTrial).rep;
  const domSize = (f: Fact, k: number) => {
    if (f.clue.length && f.clue.every((c) => ['inRoom', 'on', 'beside', 'row', 'col', 'corner', 'not', 'inRooms', 'onAny', 'besideN'].includes(c.t))) {
      const q = withClues(p, p.cast.map((ch, j) => (j === k ? f.clue : ch.victim ? [{ t: 'victim' } as Clue] : [])));
      return unaryDomain(q, k).length;
    }
    return 1000 + rng() * 100;
  };
  const rounds = prof.minTrial > 0 ? 90 : 60;
  for (let it = 0; it < rounds; it++) {
    if (Date.now() > deadline) return null;
    const sc = rep.score / n;
    const tooEasy = okRep(rep) && easy(rep);
    const tooHard = !okRep(rep) || sc > prof.band[1];
    if (process.env.GEN_DEBUG) console.log(`  it ${it} sc ${sc.toFixed(2)} trial ${rep.techCount.trial} hard ${hardSteps(rep.techCount)} ok ${okRep(rep)} easy ${tooEasy} hard? ${tooHard} t=${((Date.now() - T0) / 1000).toFixed(1)}s`);
    if (!tooEasy && !tooHard) break;
    const k = pickWith(rng, free);
    let cands = shuffleWith(rng, all[k]).slice(0, 12);
    if (tooEasy) cands = cands.sort((a, b) => domSize(b, k) - domSize(a, k));
    for (const f of cands) {
      if (f === facts[k]) continue;
      const trial = facts.slice();
      trial[k] = f;
      const e = evalSet(p, trial, allowTrial);
      if (!e.solved) continue;
      const better = tooHard
        ? okRep(e.rep) && (!okRep(rep) || e.rep.score < rep.score)
        : okRep(e.rep) && e.rep.score / n <= prof.band[1] && (e.rep.score > rep.score || e.rep.techCount.trial > rep.techCount.trial);
      if (better) {
        facts[k] = f;
        rep = e.rep;
        break;
      }
    }
  }
  if (!okRep(rep)) return null;
  const sc = rep.score / n;
  if (hardSteps(rep.techCount) < prof.minHard || rep.techCount.trial < prof.minTrial) return null;
  const C = cluesFrom(p, facts);
  // Verificación independiente de solución única.
  const tc0 = Date.now();
  const check = solve(p, 2, C, 40_000_000);
  if (process.env.GEN_DEBUG) console.log(`  unique? count ${check.count} aborted ${check.aborted} (${((Date.now() - tc0) / 1000).toFixed(1)}s)`);
  if (check.aborted || check.count !== 1) return null;
  const inBand = sc >= prof.band[0] && sc <= prof.band[1];
  const flavor = facts.reduce((a, f) => a + (f ? f.flavor : 0), 0) / free.length;
  const kinds = new Map<string, number>();
  facts.forEach((f) => f && kinds.set(f.kind, (kinds.get(f.kind) ?? 0) + 1));
  const maxShare = Math.max(...kinds.values()) / free.length;
  const victimRefs = facts.filter((f) => f && JSON.stringify(f.clue).includes(`"of":"${p.victim}"`)).length;
  // Preferimos variedad de pistas (que no se repita el mismo tipo) y quedar cerca del centro de la banda.
  const obj = (inBand ? 10 : 0) + flavor + kinds.size * 1.0 - maxShare * 10 - victimRefs * 1.5 - Math.abs(sc - (prof.band[0] + prof.band[1]) / 2) * 0.8;
  return { facts, rep, p: withClues(p, C), obj };
}

/** Intenta varias colocaciones y devuelve los candidatos válidos (mejores primero). */
export function generate(input: PuzzleInput, opts: { level: Level; prof?: Profile; rng: Rng; tries: number; timeMs: number; attemptMs?: number; keepSolution?: boolean; stopAfter?: number; onCandidate?: (r: GenResult, elapsedMs: number) => void }): GenResult[] {
  const { level, rng, tries, timeMs } = opts;
  const prof = opts.prof ?? PROFILE[level];
  const keep = !!opts.keepSolution && !!input.solution;
  const draft = compilePuzzle({ ...input, solution: keep ? input.solution : (undefined as never), clues: undefined }, { draft: !keep });
  const results: GenResult[] = [];
  const t0 = Date.now();
  for (let t = 0; t < tries && Date.now() - t0 < timeMs; t++) {
    const pos = keep
      ? draft.cast.map((ch) => input.solution[ch.id][0] * draft.size + input.solution[ch.id][1])
      : randomSolution(draft, input, rng);
    if (!pos) continue;
    const solInput: PuzzleInput = { ...input, clues: undefined, solution: Object.fromEntries(draft.cast.map((ch, k) => [ch.id, [Math.floor(pos[k] / draft.size), pos[k] % draft.size]])) };
    let base: Puzzle;
    try {
      base = compilePuzzle(solInput);
    } catch {
      continue;
    }
    const deadline = Math.min(t0 + timeMs, Date.now() + (opts.attemptMs ?? Infinity));
    const res = searchClues(base, pos, level, prof, rng, deadline);
    if (res) {
      results.push(res);
      opts.onCandidate?.(res, Date.now() - t0);
      if (opts.stopAfter && results.length >= opts.stopAfter) break;
    }
  }
  results.sort((a, b) => b.obj - a.obj);
  return results;
}
