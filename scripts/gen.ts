/**
 * Generador de pistas para Churri-doku.
 *
 *   npx tsx scripts/gen.ts <id> [--file ruta.ts] [--tries 60] [--seed 1] [--time 240] [--band 1.0-1.7] [--keep-solution] [--top 4] [--write N] [--stop N]
 *
 * Lee src/data/puzzles/<id>.ts (o el archivo de --file, como el caso final del libro: src/data/final.ts)
 * (mapa, reparto y, opcionalmente, solución) y busca juegos de pistas
 * que el motor lógico resuelva sin adivinar (o con suposiciones, solo en Difícil/Experto) y con la
 * dificultad del nivel. La solución única se verifica además con el solver exhaustivo.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { clueText } from '../src/engine/text';
import type { Level, Puzzle, PuzzleInput } from '../src/engine/types';
import type { LogicReport } from '../src/engine/logic';
import { generate, makeRng, PROFILE, type GenResult } from './genlib';

const args = process.argv.slice(2);
const id = args[0];
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const flag = (name: string) => args.includes(`--${name}`);
const file = opt('file', `src/data/puzzles/${id}.ts`);

async function main() {
  const mod = await import(`../${file}`);
  const input: PuzzleInput = mod.default;
  const level = Number(opt('level', String(input.level))) as Level;
  const prof = { ...PROFILE[level] };
  if (args.includes('--band')) {
    const [a, b] = opt('band', '').split('-').map(Number);
    prof.band = [a, b];
  }
  const tries = Number(opt('tries', '60'));
  const top = Number(opt('top', '4'));
  const rng = makeRng(Number(opt('seed', String(Date.now() % 100000))));
  const results = generate(input, {
    level, prof, rng, tries,
    timeMs: Number(opt('time', '240')) * 1000,
    attemptMs: Number(opt('attempt', '0')) * 1000 || undefined,
    keepSolution: flag('keep-solution'),
    stopAfter: Number(opt('stop', '0')) || undefined,
    onCandidate: (res, ms) => process.stdout.write(`· (${(ms / 1000).toFixed(0)}s, score/pj ${(res.rep.score / res.p.cast.length).toFixed(2)})\n`),
  });
  const uniq: GenResult[] = [];
  for (const r of results) if (!uniq.some((u) => JSON.stringify(u.p.cast.map((c) => c.clues)) === JSON.stringify(r.p.cast.map((c) => c.clues)))) uniq.push(r);
  console.log(`\n${id}: ${results.length} candidatos válidos (nivel ${level}, banda ${prof.band.join('–')})\n`);
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
    writeBlock(id, uniq[Math.min(nth, uniq.length) - 1].p, file);
  }
}

export function writeBlock(pid: string, p: Puzzle, path = `src/data/puzzles/${pid}.ts`) {
  const file = new URL(`../${path}`, import.meta.url);
  const src = readFileSync(file, 'utf8');
  const s = p.size;
  const sol = p.cast.map((ch) => `${JSON.stringify(ch.id)}: [${Math.floor(p.solution[ch.id] / s)}, ${p.solution[ch.id] % s}]`).join(', ');
  const clues = p.cast.filter((ch) => !ch.victim).map((ch) => `    ${JSON.stringify(ch.id)}: ${JSON.stringify(ch.clues)},`).join('\n');
  const block = `// <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)\n  solution: { ${sol} },\n  clues: {\n${clues}\n  },\n  // </gen>`;
  const re = /\/\/ <gen>[\s\S]*?\/\/ <\/gen>/;
  if (!re.test(src)) throw new Error('No encuentro el bloque // <gen> ... // </gen>');
  writeFileSync(file, src.replace(re, block));
  console.log(`✔ Escrito en ${path}`);
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

if (process.argv[1]?.endsWith('gen.ts')) main();
