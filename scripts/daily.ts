/**
 * Calendario del «caso del día».
 *
 * Cada fecha usa uno de los 25 mapas (a veces en espejo) con la víctima en su sitio original
 * (así la historia sigue valiendo), una colocación nueva y pistas nuevas. La dificultad depende
 * del día de la semana. Todo es determinista: la misma fecha da siempre el mismo caso.
 *
 *   npx tsx scripts/daily.ts plan  --from 2026-10-20 --days 30           → qué mapa toca cada día
 *   npx tsx scripts/daily.ts gen   --from 2026-10-20 --days 365 --shard 0/8   → genera (.gen/daily/<fecha>.json)
 *   npx tsx scripts/daily.ts merge                                        → public/daily/<AAAA-MM>.json + index.json
 *   npx tsx scripts/daily.ts check                                        → vuelve a validar todo lo publicado
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically } from '../src/engine/logic';
import { dailyInput, mirrorInput, type DailyEntry } from '../src/engine/variant';
import type { Level, PuzzleInput } from '../src/engine/types';
import { generate, makeRng, PROFILE, type Profile } from './genlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GEN_DIR = `${ROOT}.gen/daily`;
const OUT_DIR = `${ROOT}public/daily`;

/** Dificultad según el día de la semana (0 = domingo). */
export const WEEK_LEVEL: Record<number, Level> = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5, 0: 4 };

/** Perfil del caso del día: el mismo que el de los casos de su nivel. */
function dailyProfile(level: Level): Profile {
  return PROFILE[level];
}

const TIME: Record<Level, { total: number; attempt: number; tries: number }> = {
  1: { total: 120, attempt: 40, tries: 200 },
  2: { total: 240, attempt: 80, tries: 120 },
  3: { total: 420, attempt: 150, tries: 60 },
  4: { total: 600, attempt: 220, tries: 40 },
  5: { total: 720, attempt: 260, tries: 30 },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
function dates(from: string, days: number): string[] {
  const [y, m, d] = from.split('-').map(Number);
  return Array.from({ length: days }, (_, k) => iso(new Date(Date.UTC(y, m - 1, d + k))));
}
const weekday = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

async function loadInputs(): Promise<PuzzleInput[]> {
  const dir = `${ROOT}src/data/puzzles`;
  const out: PuzzleInput[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts')) {
    out.push((await import(`${dir}/${f}`)).default as PuzzleInput);
  }
  return out.sort((a, b) => a.num - b.num);
}

/** Qué mapa toca cada día: cada nivel recorre sus 5 mapas en orden barajado y alterna el espejo por vuelta. */
export function plan(inputs: PuzzleInput[], from: string, days: number) {
  const byLevel = new Map<Level, string[]>();
  for (const inp of inputs) byLevel.set(inp.level, [...(byLevel.get(inp.level) ?? []), inp.id]);
  const counters = new Map<Level, number>();
  const orders = new Map<string, string[]>();
  // El plan empieza siempre en la misma fecha para que añadir días no cambie los anteriores.
  const START = '2026-10-19';
  const all = dates(START, Math.max(0, daysBetween(START, from)) + days);
  const result: { date: string; base: string; mirror: boolean; level: Level }[] = [];
  for (const date of all) {
    const level = WEEK_LEVEL[weekday(date)];
    const list = byLevel.get(level)!;
    const n = counters.get(level) ?? 0;
    counters.set(level, n + 1);
    const cycle = Math.floor(n / list.length);
    const key = `${level}-${cycle}`;
    if (!orders.has(key)) {
      const rng = makeRng(hash(`ciclo-${key}`));
      const order = list.map((id) => ({ id, k: rng() })).sort((a, b) => a.k - b.k).map((o) => o.id);
      // Que el último mapa de una vuelta no se repita al empezar la siguiente.
      const prev = orders.get(`${level}-${cycle - 1}`);
      if (prev && order[0] === prev[prev.length - 1]) order.push(order.shift()!);
      orders.set(key, order);
    }
    const base = orders.get(key)![n % list.length];
    const mirror = (cycle + hash(base)) % 2 === 1;
    if (date >= from) result.push({ date, base, mirror, level });
  }
  return result;
}

function daysBetween(a: string, b: string) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function validate(base: PuzzleInput, e: DailyEntry): string | null {
  try {
    const p = compilePuzzle(dailyInput(base, e));
    const prof = dailyProfile(e.level);
    const L = solveLogically(p, { allowTrial: prof.maxTrial > 0 });
    if (!L.solved || !L.sound) return 'la lógica no lo resuelve';
    if (L.maxLevel > prof.maxLevel) return `técnica de nivel ${L.maxLevel}`;
    if (L.techCount.trial > prof.maxTrial || L.techCount.trial < prof.minTrial) return `suposiciones: ${L.techCount.trial}`;
    const r = solve(p, 2, undefined, 60_000_000);
    if (r.aborted || r.count !== 1) return `soluciones: ${r.count}${r.aborted ? ' (abortado)' : ''}`;
    const victim = base.cast.find((c) => c.victim)!.id;
    const want = (e.mirror ? mirrorInput(base) : base).solution[victim];
    if (e.solution[victim][0] !== want[0] || e.solution[victim][1] !== want[1]) return 'la víctima no está en su sitio';
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}

async function genCmd(from: string, days: number, shard: number, shards: number) {
  const inputs = await loadInputs();
  const byId = new Map(inputs.map((i) => [i.id, i]));
  mkdirSync(GEN_DIR, { recursive: true });
  const todo = plan(inputs, from, days).filter((_, k) => k % shards === shard);
  for (const slot of todo) {
    const file = `${GEN_DIR}/${slot.date}.json`;
    if (existsSync(file)) continue;
    const base = byId.get(slot.base)!;
    const src = slot.mirror ? mirrorInput(base) : base;
    const victim = base.cast.find((c) => c.victim)!.id;
    const [vr, vc] = src.solution[victim];
    const pinned: PuzzleInput = { ...src, pins: { [victim]: { cells: [[vr, vc]] } }, wantMurderer: undefined };
    const t0 = Date.now();
    let entry: DailyEntry | null = null;
    for (let round = 0; round < 4 && !entry; round++) {
      const lv = slot.level;
      const results = generate(pinned, {
        level: lv,
        prof: dailyProfile(lv),
        rng: makeRng(hash(`${slot.date}-${round}`)),
        tries: TIME[lv].tries,
        timeMs: TIME[lv].total * 1000,
        attemptMs: TIME[lv].attempt * 1000,
        stopAfter: 2,
      });
      for (const r of results) {
        const s = r.p.size;
        const cand: DailyEntry = {
          date: slot.date, base: slot.base, mirror: slot.mirror, level: lv,
          solution: Object.fromEntries(r.p.cast.map((ch) => [ch.id, [Math.floor(r.p.solution[ch.id] / s), r.p.solution[ch.id] % s]])),
          clues: Object.fromEntries(r.p.cast.filter((ch) => !ch.victim).map((ch) => [ch.id, ch.clues])),
          score: Math.round((r.rep.score / r.p.cast.length) * 100) / 100,
          steps: r.rep.steps.length,
        };
        // Que no sea la misma colocación del caso original.
        const same = Object.entries(cand.solution).every(([id, [r0, c0]]) => src.solution[id][0] === r0 && src.solution[id][1] === c0);
        if (same) continue;
        const err = validate(base, cand);
        if (!err) { entry = cand; break; }
      }
    }
    if (entry) {
      writeFileSync(file, JSON.stringify(entry));
      console.log(`✔ ${slot.date} ${slot.base}${slot.mirror ? ' (espejo)' : ''} nivel ${slot.level} · score ${entry.score} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } else {
      console.log(`✘ ${slot.date} ${slot.base}: sin candidato (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }
}

function mergeCmd() {
  const files = readdirSync(GEN_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  const byMonth = new Map<string, Record<string, DailyEntry>>();
  for (const f of files) {
    const e = JSON.parse(readFileSync(`${GEN_DIR}/${f}`, 'utf8')) as DailyEntry;
    const m = e.date.slice(0, 7);
    byMonth.set(m, { ...(byMonth.get(m) ?? {}), [e.date]: e });
  }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [m, entries] of byMonth) writeFileSync(`${OUT_DIR}/${m}.json`, JSON.stringify(entries));
  const datesDone = files.map((f) => f.slice(0, 10));
  // Primer hueco: el calendario publicado no puede tener días sin caso.
  let last = datesDone[0];
  for (const d of datesDone.slice(1)) {
    if (daysBetween(last, d) !== 1) break;
    last = d;
  }
  writeFileSync(`${OUT_DIR}/index.json`, JSON.stringify({ from: datesDone[0], to: last, months: [...byMonth.keys()] }));
  console.log(`✔ ${files.length} casos en ${byMonth.size} meses · calendario continuo del ${datesDone[0]} al ${last}`);
}

async function checkCmd() {
  const inputs = await loadInputs();
  const byId = new Map(inputs.map((i) => [i.id, i]));
  let bad = 0, n = 0;
  for (const f of readdirSync(OUT_DIR).filter((f) => /^\d{4}-\d{2}\.json$/.test(f))) {
    const entries = JSON.parse(readFileSync(`${OUT_DIR}/${f}`, 'utf8')) as Record<string, DailyEntry>;
    for (const e of Object.values(entries)) {
      n++;
      const err = validate(byId.get(e.base)!, e);
      if (err) { bad++; console.log(`✘ ${e.date} ${e.base}: ${err}`); }
    }
  }
  console.log(bad ? `${bad} casos del día con problemas` : `✔ ${n} casos del día correctos`);
  process.exit(bad ? 1 : 0);
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string, def: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : def;
  };
  const cmd = args[0];
  const from = opt('from', '2026-10-19');
  const days = Number(opt('days', '30'));
  if (cmd === 'plan') {
    for (const s of plan(await loadInputs(), from, days)) console.log(`${s.date} ${['D', 'L', 'M', 'X', 'J', 'V', 'S'][weekday(s.date)]} nivel ${s.level} ${s.base}${s.mirror ? ' (espejo)' : ''}`);
  } else if (cmd === 'gen') {
    const [k, n] = opt('shard', '0/1').split('/').map(Number);
    await genCmd(from, days, k, n);
  } else if (cmd === 'merge') {
    mergeCmd();
  } else if (cmd === 'check') {
    await checkCmd();
  } else {
    console.log('uso: daily.ts plan|gen|merge|check [--from AAAA-MM-DD] [--days N] [--shard k/n]');
  }
}

if (process.argv[1]?.endsWith('daily.ts')) main();
