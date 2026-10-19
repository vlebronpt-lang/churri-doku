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
import { castIndex, cellHas, clueHolds } from '../src/engine/clues';
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

/**
 * Recuento rápido de soluciones: ¿es única? Si no, devuelve una solución distinta de la buscada.
 * Primero deduce lo que pueda el motor lógico (sin suponer; sus deducciones nunca descartan una
 * solución válida) y el solver exhaustivo solo explora las casillas que quedan.
 */
const QUICK_NODES = 1_500_000;
function uniqueness(p: Puzzle, facts: (Fact | null)[], pos: number[], want = 1): { unique: boolean; alts: number[][] } {
  const C = cluesFrom(p, facts);
  const L = solveLogically(withClues(p, C), { allowTrial: false, maxSteps: 400 });
  if (!L.sound) return { unique: false, alts: [] };
  if (L.solved) return { unique: true, alts: [] };
  const r = solve(p, want + 1, C, QUICK_NODES, L.stuckState?.cand);
  const alts = r.solutions.filter((sol) => sol.some((x, k) => x !== pos[k]));
  if (!r.aborted && r.count === 1) return { unique: true, alts: [] };
  return { unique: false, alts };
}

/** Holgura de una pista: en cuántas casillas se cumpliría con los demás en su sitio (más holgura = pista más débil). */
function looseness(p: Puzzle, k: number, f: Fact, pos: number[]): number {
  const q = pos.slice();
  let cnt = 0;
  for (const c of p.cells) {
    if (!c.occupiable) continue;
    q[k] = c.i;
    if (f.clue.every((cl) => clueHolds(p, cl, k, q))) cnt++;
  }
  return cnt;
}

/**
 * Busca pistas para una colocación concreta. `deadline` (ms) corta el intento si se alarga.
 *
 * 1) Arranca con pistas flojas y las endurece de forma dirigida (con la solución alternativa que
 *    encuentra el solver exhaustivo) hasta que la solución es única.
 * 2) Si la lógica (con suposiciones, si el nivel las admite) no lo resuelve, endurece a quien más
 *    dudas deja.
 * 3) Ajusta la dificultad hacia la banda del nivel cambiando pistas por otras más flojas o más
 *    fuertes (siempre con solución única) y se rinde si se estanca.
 */
export function searchClues(p: Puzzle, pos: number[], _level: Level, prof: Profile, rng: Rng, deadline = Infinity): GenResult | null {
  const n = p.cast.length;
  const W = KIND_WEIGHT[prof.clueLevel];
  const all = p.cast.map((ch, k) => (ch.victim ? [] : factsFor(p, k, pos).filter((f) => f.minLevel <= prof.clueLevel)));
  if (all.some((fs, k) => !p.cast[k].victim && fs.length === 0)) return null;
  const weightOf = (f: Fact) => f.flavor * (W[f.kind] ?? 0.4);
  const loose = all.map((fs, k) => new Map(fs.map((f) => [f, looseness(p, k, f, pos)])));
  const L = (k: number, f: Fact) => loose[k].get(f) ?? 0;
  const weighted = (fs: Fact[], w: (f: Fact) => number) => {
    const total = fs.reduce((acc, f) => acc + w(f), 0);
    let x = rng() * total;
    for (const f of fs) {
      x -= w(f);
      if (x <= 0) return f;
    }
    return fs[fs.length - 1];
  };
  const free = Array.from({ length: n }, (_, j) => j).filter((j) => !p.cast[j].victim);
  const allowTrial = prof.maxTrial > 0;
  const T0 = Date.now();
  const dbg = (m: string) => process.env.GEN_DEBUG && console.log(`  ${m} t=${((Date.now() - T0) / 1000).toFixed(1)}s`);

  // 1) Pistas flojas y reparación dirigida hasta la solución única.
  const facts: (Fact | null)[] = all.map((fs, k) => (fs.length ? weighted(fs, (f) => weightOf(f) * Math.sqrt(L(k, f))) : null));
  let unique = false;
  for (let it = 0; it < 120 && !unique; it++) {
    if (Date.now() > deadline) return null;
    const u = uniqueness(p, facts, pos, 24);
    if (process.env.GEN_DEBUG2) console.log(`    rep ${it} unique ${u.unique} alts ${u.alts.length}`);
    if (u.unique) { unique = true; break; }
    if (u.alts.length) {
      // Candidatas: pistas verdaderas que descarten alguna solución alternativa; de ellas, la que
      // deje menos posibilidades al motor lógico (medida global: cambiar una pista quita la anterior).
      const alts = u.alts;
      const cands: { k: number; f: Fact; x: number }[] = [];
      for (const k of free) {
        for (const f of all[k]) {
          if (f === facts[k]) continue;
          let x = 0;
          for (const alt of alts) if (!f.clue.every((cl) => clueHolds(p, cl, k, alt))) x++;
          if (x) cands.push({ k, f, x });
        }
      }
      // Ninguna pista distingue las soluciones: esta colocación no sirve.
      if (!cands.length) return null;
      const maxX = Math.max(...cands.map((c) => c.x));
      const pool = shuffleWith(rng, cands.filter((c) => c.x >= Math.max(1, Math.ceil(maxX * 0.5)))).slice(0, 24);
      let best: { c: (typeof cands)[number]; rem: number } | null = null;
      for (const c of pool) {
        const trial = facts.slice();
        trial[c.k] = c.f;
        const e = evalSet(p, trial, false);
        const score = e.rem - c.x * 0.01;
        if (!best || score < best.rem || (score === best.rem && weightOf(c.f) > weightOf(best.c.f))) best = { c, rem: score };
      }
      facts[best!.c.k] = best!.c.f;
    } else {
      // El recuento se cortó sin otra solución a mano: endurecer a alguien al azar.
      const k = pickWith(rng, free);
      const cur = facts[k]!;
      const opts = all[k].filter((f) => L(k, f) < L(k, cur));
      if (opts.length) facts[k] = weighted(opts, (f) => weightOf(f) * Math.sqrt(L(k, f)));
    }
  }
  dbg(`única: ${unique}`);
  if (!unique) return null;

  // 2) Que la lógica lo resuelva.
  let ev = evalSet(p, facts, allowTrial);
  for (let it = 0; it < 40 && !ev.solved; it++) {
    if (Date.now() > deadline) return null;
    const ev0 = evalSet(p, facts, false);
    const weights = free.map((j) => ev0.perChar[j] + 0.5);
    let x = rng() * weights.reduce((acc, v) => acc + v, 0);
    let k = free[0];
    for (let q = 0; q < free.length; q++) { x -= weights[q]; if (x <= 0) { k = free[q]; break; } }
    const cur = facts[k]!;
    const cands = shuffleWith(rng, all[k].filter((f) => f !== cur && L(k, f) <= L(k, cur))).slice(0, 10);
    let best: { f: Fact; rem: number } | null = null;
    for (const f of cands) {
      const trial = facts.slice();
      trial[k] = f;
      if (!uniqueness(p, trial, pos).unique) continue;
      const e = evalSet(p, trial, false);
      if (!best || e.rem < best.rem || (e.rem === best.rem && weightOf(f) > weightOf(best.f))) best = { f, rem: e.rem };
    }
    if (best) {
      facts[k] = best.f;
      ev = evalSet(p, facts, allowTrial);
    }
  }
  dbg(`resoluble: ${ev.solved}`);
  if (!ev.solved) return null;

  // 3) Ajustar la dificultad hacia la banda del nivel.
  const badness = (r: LogicReport) => {
    if (!(r.solved && r.sound)) return 1e9;
    const sc = r.score / n;
    let b = 0;
    if (r.maxLevel > prof.maxLevel) b += 100;
    if (r.techCount.trial > prof.maxTrial) b += 2 * (r.techCount.trial - prof.maxTrial);
    if (sc > prof.band[1]) b += (sc - prof.band[1]) * 4;
    if (sc < prof.band[0]) b += (prof.band[0] - sc) * 4;
    if (r.techCount.trial < prof.minTrial) b += prof.minTrial - r.techCount.trial;
    const h = hardSteps(r.techCount);
    if (h < prof.minHard) b += (prof.minHard - h) * 0.5;
    return b;
  };
  let rep = ev.rep;
  let bad = badness(rep);
  let stagn = 0;
  type Move = { changes: [number, Fact][]; rep: LogicReport; bad: number };
  const tryMove = (changes: [number, Fact][], acc: { best: Move | null }) => {
    const trial = facts.slice();
    for (const [k, f] of changes) trial[k] = f;
    const e = evalSet(p, trial, allowTrial);
    if (!e.solved) return;
    const b = badness(e.rep);
    if (!acc.best || b < acc.best.bad) acc.best = { changes, rep: e.rep, bad: b };
  };
  for (let it = 0; it < 200 && bad > 0 && stagn < 12; it++) {
    if (Date.now() > deadline) return null;
    const sc = rep.score / n;
    const harder = sc < prof.band[0] || rep.techCount.trial < prof.minTrial || hardSteps(rep.techCount) < prof.minHard;
    const acc: { best: Move | null } = { best: null };
    // Movimiento simple: cambiar la pista de alguien por otra más floja (o más fuerte) con solución única.
    for (const k of shuffleWith(rng, free).slice(0, 4)) {
      const cur = facts[k]!;
      const cands = shuffleWith(rng, all[k].filter((f) => f !== cur && (harder ? L(k, f) >= L(k, cur) : L(k, f) <= L(k, cur)))).slice(0, 6);
      for (const f of cands) {
        const trial = facts.slice();
        trial[k] = f;
        if (!uniqueness(p, trial, pos).unique) continue;
        tryMove([[k, f]], acc);
        if (acc.best?.bad === 0) break;
      }
      if (acc.best?.bad === 0) break;
    }
    // Intercambio: aflojar la pista de alguien (rompe la unicidad) y compensarlo con la de otro.
    if (harder && (!acc.best || acc.best.bad >= bad)) {
      for (let t = 0; t < 3 + Math.min(stagn, 5) && acc.best?.bad !== 0; t++) {
        const k = pickWith(rng, free);
        const cur = facts[k]!;
        const looser = all[k].filter((f) => f !== cur && L(k, f) > L(k, cur));
        if (!looser.length) continue;
        const f = weighted(looser, (x) => weightOf(x) * Math.sqrt(L(k, x)));
        const trial = facts.slice();
        trial[k] = f;
        const u = uniqueness(p, trial, pos, 24);
        if (u.unique) { tryMove([[k, f]], acc); continue; }
        if (!u.alts.length) continue;
        const fixes: { j: number; g: Fact; x: number }[] = [];
        for (const j of free) {
          if (j === k) continue;
          for (const g of all[j]) {
            if (g === facts[j]) continue;
            let x = 0;
            for (const alt of u.alts) if (!g.clue.every((cl) => clueHolds(p, cl, j, alt))) x++;
            if (x === u.alts.length) fixes.push({ j, g, x });
          }
        }
        for (const fx of shuffleWith(rng, fixes).sort((a, b) => L(b.j, b.g) - L(a.j, a.g)).slice(0, 5)) {
          const trial2 = trial.slice();
          trial2[fx.j] = fx.g;
          if (!uniqueness(p, trial2, pos).unique) continue;
          tryMove([[k, f], [fx.j, fx.g]], acc);
        }
      }
    }
    const best = acc.best;
    if (best && (best.bad < bad || (best.bad === bad && rng() < 0.3))) {
      stagn = best.bad < bad ? 0 : stagn + 1;
      for (const [k, f] of best.changes) facts[k] = f;
      rep = best.rep;
      bad = best.bad;
    } else stagn++;
    dbg(`it ${it} sc ${(rep.score / n).toFixed(2)} trial ${rep.techCount.trial} hard ${hardSteps(rep.techCount)} bad ${bad.toFixed(2)} stagn ${stagn}${best && best.changes.length > 1 ? ' (intercambio)' : ''}`);
  }
  if (bad > 0) return null;
  const sc = rep.score / n;
  const C = cluesFrom(p, facts);
  // Verificación independiente de solución única.
  const tc0 = Date.now();
  const L0 = solveLogically(withClues(p, C), { allowTrial: false, maxSteps: 400 });
  const check = L0.solved && L0.sound ? { count: 1, aborted: false } : solve(p, 2, C, 40_000_000, L0.sound ? L0.stuckState?.cand : undefined);
  dbg(`unique? count ${check.count} aborted ${check.aborted} (${((Date.now() - tc0) / 1000).toFixed(1)}s)`);
  if (check.aborted || check.count !== 1) return null;
  const inBand = sc >= prof.band[0] && sc <= prof.band[1];
  const flavor = facts.reduce((acc, f) => acc + (f ? f.flavor : 0), 0) / free.length;
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
