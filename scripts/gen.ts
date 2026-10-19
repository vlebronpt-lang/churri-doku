/**
 * Generador de pistas para Churri-doku.
 *
 *   npx tsx scripts/gen.ts <id> [--tries 60] [--seed 1] [--time 240] [--band 1.0-1.7] [--keep-solution] [--top 4] [--write N]
 *
 * Lee src/data/puzzles/<id>.ts (mapa, reparto y, opcionalmente, solución) y busca juegos de pistas
 * que el motor lógico resuelva sin adivinar (o con suposiciones, solo en Difícil/Experto) y con la
 * dificultad del nivel. La solución única se verifica además con el solver exhaustivo.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically, type LogicReport } from '../src/engine/logic';
import { factsFor, type Fact } from '../src/engine/facts';
import { clueText } from '../src/engine/text';
import { castIndex, cellHas, unaryDomain } from '../src/engine/clues';
import type { Clue, Level, Puzzle, PuzzleInput } from '../src/engine/types';

const args = process.argv.slice(2);
const id = args[0];
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const flag = (name: string) => args.includes(`--${name}`);

let seed = Number(opt('seed', String(Date.now() % 100000)));
const rng = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
const shuffle = <T,>(a: T[]) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** Bandas de dificultad (puntuación del motor lógico por personaje) y técnicas permitidas. */
const PROFILE: Record<Level, { band: [number, number]; maxLevel: number; maxTrial: number; minHard: number }> = {
  1: { band: [1.0, 1.75], maxLevel: 2, maxTrial: 0, minHard: 0 },
  2: { band: [1.5, 2.4], maxLevel: 3, maxTrial: 0, minHard: 1 },
  3: { band: [2.0, 3.2], maxLevel: 4, maxTrial: 0, minHard: 2 },
  4: { band: [2.6, 4.2], maxLevel: 6, maxTrial: 1, minHard: 3 },
  5: { band: [3.2, 7.0], maxLevel: 6, maxTrial: 5, minHard: 4 },
};

/** Preferencia de tipos de pista por nivel (se multiplica por el "sabor" de cada hecho). */
const KIND_WEIGHT: Record<Level, Record<string, number>> = {
  1: { inRoom: 3, on: 3, beside: 3, inRoomNotBeside: 2, row: 1.6, col: 1.6, dir: 1.4, alone: 2, onlyOn: 2, corner: 0.6 },
  2: { inRoom: 2, on: 2, beside: 2, inRoomNotBeside: 1.5, dir: 2, sameRoom: 2, aloneWith: 2, row: 1.2, col: 1.2, corner: 1.4, withGender: 1.6, offset: 1, alone: 1.6, onlyOn: 1.4, adjacentTo: 1.2, inRoomCorner: 1 },
  3: { inRoom: 1.4, on: 1.4, beside: 1.6, dir: 2, dirDiag: 1.2, offset: 1.6, sameRoom: 1.8, aloneWith: 1.6, withGender: 1.6, corner: 1.4, roomCount: 1.4, withSomeoneOn: 1.2, notAlone: 1, row2: 1, col2: 1, diagonal: 1, adjacentTo: 1.2, inRoomNotOn: 1, alone: 1.2 },
  4: { dir: 2, dirDiag: 1.6, offset: 2, diagonal: 1.6, sameRoom: 1.8, notSameRoom: 1, withGender: 1.8, roomCount: 1.6, notAlone: 1, someoneAtOffset: 1.6, besideN: 1.2, corner: 1.4, inRoomNotOn: 1, beside: 1.4, inRoom: 1, on: 1, row2: 1.4, col2: 1.4, roomEmpty: 1, withSomeoneOn: 1.4, withSomeoneBeside: 1.2, adjacentTo: 1.2, notBeside: 1 },
  5: { dir: 2, dirDiag: 1.8, offset: 2, diagonal: 1.8, sameRoom: 1.6, notSameRoom: 1.2, withGender: 1.8, roomCount: 1.6, notAlone: 1.2, someoneAtOffset: 2, besideN: 1.4, corner: 1.4, inRoomNotOn: 1, beside: 1.2, inRoom: 0.8, on: 0.8, row2: 1.4, col2: 1.4, roomEmpty: 1.2, withSomeoneOn: 1.4, withSomeoneBeside: 1.4, adjacentTo: 1.2, notBeside: 1.2 },
};

async function main() {
  const mod = await import(`../src/data/puzzles/${id}.ts`);
  const input: PuzzleInput = mod.default;
  const level = Number(opt('level', String(input.level))) as Level;
  const prof = { ...PROFILE[level] };
  if (args.includes('--band')) {
    const [a, b] = opt('band', '').split('-').map(Number);
    prof.band = [a, b];
  }
  const tries = Number(opt('tries', '60'));
  const top = Number(opt('top', '4'));
  const keep = flag('keep-solution') && !!input.solution;
  const draft = compilePuzzle({ ...input, solution: keep ? input.solution : (undefined as never), clues: undefined }, { draft: !keep });

  type Res = { facts: (Fact | null)[]; rep: LogicReport; p: Puzzle; obj: number };
  const results: Res[] = [];
  const t0 = Date.now();
  const budget = Number(opt('time', '240')) * 1000;
  for (let t = 0; t < tries && Date.now() - t0 < budget; t++) {
    const pos = keep
      ? draft.cast.map((ch) => input.solution[ch.id][0] * draft.size + input.solution[ch.id][1])
      : randomSolution(draft, input);
    if (!pos) continue;
    const solInput: PuzzleInput = { ...input, clues: undefined, solution: Object.fromEntries(draft.cast.map((ch, k) => [ch.id, [Math.floor(pos[k] / draft.size), pos[k] % draft.size]])) };
    let base: Puzzle;
    try {
      base = compilePuzzle(solInput);
    } catch {
      continue;
    }
    const res = searchClues(base, pos, level, prof);
    if (res) {
      results.push(res);
      process.stdout.write(`· ${results.length} (${((Date.now() - t0) / 1000).toFixed(0)}s, score/pj ${(res.rep.score / base.cast.length).toFixed(2)})\n`);
    }
  }
  results.sort((a, b) => b.obj - a.obj);
  const uniq: Res[] = [];
  for (const r of results) if (!uniq.some((u) => JSON.stringify(u.p.cast.map((c) => c.clues)) === JSON.stringify(r.p.cast.map((c) => c.clues)))) uniq.push(r);
  console.log(`\n${id}: ${results.length} candidatos válidos en ${((Date.now() - t0) / 1000).toFixed(0)} s (nivel ${level}, banda ${prof.band.join('–')})\n`);
  uniq.slice(0, top).forEach((r, k) => {
    console.log(`#${k + 1}`);
    report(r);
  });
  // Guardar candidatos para elegir después con scripts/pick.ts
  mkdirSync(new URL('../.gen/', import.meta.url), { recursive: true });
  const dump = uniq.slice(0, 30).map((r) => ({
    obj: r.obj,
    score: r.rep.score / r.p.cast.length,
    tech: r.rep.techCount,
    solution: Object.fromEntries(r.p.cast.map((ch) => [ch.id, [Math.floor(r.p.solution[ch.id] / r.p.size), r.p.solution[ch.id] % r.p.size]])),
    clues: Object.fromEntries(r.p.cast.filter((ch) => !ch.victim).map((ch) => [ch.id, ch.clues])),
    text: Object.fromEntries(r.p.cast.map((ch) => [ch.id, clueText(r.p, ch)])),
  }));
  writeFileSync(new URL(`../.gen/${id}.json`, import.meta.url), JSON.stringify(dump, null, 1));
  console.log(`Candidatos guardados en .gen/${id}.json (elige con: npx tsx scripts/pick.ts ${id} <n>)`);
  if (flag('write') && uniq.length) {
    const nth = Number(opt('write', '1')) || 1;
    writeBlock(id, uniq[Math.min(nth, uniq.length) - 1].p);
  }
}

export function writeBlock(pid: string, p: Puzzle) {
  const file = new URL(`../src/data/puzzles/${pid}.ts`, import.meta.url);
  const src = readFileSync(file, 'utf8');
  const s = p.size;
  const sol = p.cast.map((ch) => `${JSON.stringify(ch.id)}: [${Math.floor(p.solution[ch.id] / s)}, ${p.solution[ch.id] % s}]`).join(', ');
  const clues = p.cast.filter((ch) => !ch.victim).map((ch) => `    ${JSON.stringify(ch.id)}: ${JSON.stringify(ch.clues)},`).join('\n');
  const block = `// <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)\n  solution: { ${sol} },\n  clues: {\n${clues}\n  },\n  // </gen>`;
  const re = /\/\/ <gen>[\s\S]*?\/\/ <\/gen>/;
  if (!re.test(src)) throw new Error('No encuentro el bloque // <gen> ... // </gen>');
  writeFileSync(file, src.replace(re, block));
  console.log(`✔ Escrito en src/data/puzzles/${pid}.ts`);
}

function randomSolution(p: Puzzle, input: PuzzleInput): number[] | null {
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
    const order = shuffle(Array.from({ length: n }, (_, k) => k)).sort((a, b) => allowed[a].length - allowed[b].length);
    let ok = true;
    for (const k of order) {
      const opts = shuffle(allowed[k]).filter((i) => !rows.has(Math.floor(i / s)) && !cols.has(i % s));
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
function evalSet(p: Puzzle, facts: (Fact | null)[], allowTrial: boolean) {
  const q = withClues(p, cluesFrom(p, facts));
  const rep = solveLogically(q, { allowTrial, maxSteps: 300 });
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

function searchClues(p: Pick<Puzzle, never> & Puzzle, pos: number[], level: Level, prof: typeof PROFILE[1]) {
  const n = p.cast.length;
  const W = KIND_WEIGHT[level];
  const all = p.cast.map((ch, k) => (ch.victim ? [] : factsFor(p, k, pos).filter((f) => f.minLevel <= level)));
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

  // 1) Reforzar hasta que la deducción lógica (sin suposiciones) lo resuelva.
  let ev = evalSet(p, facts, false);
  for (let it = 0; it < 90 && !ev.solved; it++) {
    const weights = free.map((j) => ev.perChar[j] + 1);
    let x = rng() * weights.reduce((a, b) => a + b, 0);
    let k = free[0];
    for (let q = 0; q < free.length; q++) { x -= weights[q]; if (x <= 0) { k = free[q]; break; } }
    let best: { f: Fact; e: ReturnType<typeof evalSet> } | null = null;
    const sample = shuffle(all[k]).slice(0, 14);
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
  if (!ev.solved) return null;

  // 2) Ajustar la dificultad hacia la banda del nivel.
  const allowTrial = prof.maxTrial > 0;
  const okRep = (r: LogicReport) => r.solved && r.sound && r.maxLevel <= prof.maxLevel && r.techCount.trial <= prof.maxTrial;
  let rep = evalSet(p, facts, allowTrial).rep;
  const domSize = (f: Fact, k: number) => {
    if (f.clue.length && f.clue.every((c) => ['inRoom', 'on', 'beside', 'row', 'col', 'corner', 'not', 'inRooms', 'onAny', 'besideN'].includes(c.t))) {
      const q = withClues(p, p.cast.map((ch, j) => (j === k ? f.clue : ch.victim ? [{ t: 'victim' } as Clue] : [])));
      return unaryDomain(q, k).length;
    }
    return 1000 + rng() * 100;
  };
  for (let it = 0; it < 50; it++) {
    const sc = rep.score / n;
    const tooEasy = okRep(rep) && sc < prof.band[0];
    const tooHard = !okRep(rep) || sc > prof.band[1];
    if (!tooEasy && !tooHard) break;
    const k = pick(free);
    let cands = shuffle(all[k]).slice(0, 12);
    if (tooEasy) cands = cands.sort((a, b) => domSize(b, k) - domSize(a, k));
    for (const f of cands) {
      if (f === facts[k]) continue;
      const trial = facts.slice();
      trial[k] = f;
      const e = evalSet(p, trial, allowTrial);
      if (!e.solved) continue;
      const better = tooHard ? okRep(e.rep) && (!okRep(rep) || e.rep.score < rep.score) : okRep(e.rep) && e.rep.score > rep.score;
      if (better) {
        facts[k] = f;
        rep = e.rep;
        break;
      }
    }
  }
  if (!okRep(rep)) return null;
  const sc = rep.score / n;
  const hard = rep.techCount.room + rep.techCount.subset + rep.techCount.trial + rep.techCount.relation + rep.techCount.pointing;
  if (hard < prof.minHard) return null;
  const C = cluesFrom(p, facts);
  // Verificación independiente de solución única.
  const check = solve(p, 2, C, 3_000_000);
  if (check.aborted || check.count !== 1) return null;
  const inBand = sc >= prof.band[0] && sc <= prof.band[1];
  const flavor = facts.reduce((a, f) => a + (f ? f.flavor : 0), 0) / free.length;
  const kinds = new Map<string, number>();
  facts.forEach((f) => f && kinds.set(f.kind, (kinds.get(f.kind) ?? 0) + 1));
  const maxShare = Math.max(...kinds.values()) / free.length;
  const victimRefs = facts.filter((f) => f && JSON.stringify(f.clue).includes(`"of":"${p.victim}"`)).length;
  const obj = (inBand ? 10 : 0) + flavor + kinds.size * 0.7 - maxShare * 6 - victimRefs * 1.5 - Math.abs(sc - (prof.band[0] + prof.band[1]) / 2);
  return { facts, rep, p: withClues(p, C), obj };
}

function report(r: { rep: LogicReport; p: Puzzle; obj: number }) {
  const { p, rep } = r;
  const s = p.size;
  const tc = Object.entries(rep.techCount).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`— obj ${r.obj.toFixed(2)} · score/pj ${(rep.score / p.cast.length).toFixed(2)} · maxLevel ${rep.maxLevel} · pasos ${rep.steps.length} · ${tc}`);
  console.log(`  asesino: ${p.murderer}`);
  for (const ch of p.cast) {
    const i = p.solution[ch.id];
    console.log(`  ${ch.id.padEnd(3)} (${Math.floor(i / s)},${i % s}) ${clueText(p, ch)}`);
  }
  console.log();
}

main();
