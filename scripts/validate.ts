/**
 * Valida todos los casos (o los indicados):
 *   npx tsx scripts/validate.ts [id ...] [--steps]
 * Comprueba: compilación, solución única e igual a la declarada, resolución lógica sin adivinar
 * (con suposiciones solo en Experto), solidez del motor y texto de las pistas.
 */
import { readdirSync } from 'node:fs';
import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically } from '../src/engine/logic';
import { clueText, displayName } from '../src/engine/text';
import { assignmentValid } from '../src/engine/clues';
import type { PuzzleInput } from '../src/engine/types';

const LEVEL = ['', 'Muy fácil', 'Fácil', 'Medio', 'Difícil', 'Experto'];

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const showSteps = process.argv.includes('--steps');
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const ids = args.length ? args : readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, ''));
  let failures = 0;
  const rows: string[] = [];
  for (const id of ids) {
    const mod = await import(`../src/data/puzzles/${id}.ts`);
    const input: PuzzleInput = mod.default;
    const errs: string[] = [];
    const warns: string[] = [];
    let line = '';
    try {
      if (!input.solution) throw new Error('sin solución (ejecuta scripts/gen.ts --write)');
      const p = compilePuzzle(input);
      const sol = p.cast.map((ch) => p.solution[ch.id]);
      if (!assignmentValid(p, sol)) errs.push('la solución declarada NO cumple las pistas');
      const r = solve(p, 3);
      if (r.aborted) errs.push('el solver abortó (demasiados nodos)');
      if (r.count !== 1) errs.push(`tiene ${r.count} soluciones`);
      else if (r.solutions[0].some((i, k) => i !== sol[k])) errs.push('la solución única no coincide con la declarada');
      const L = solveLogically(p, { allowTrial: true });
      if (!L.sound) errs.push('¡el motor lógico hizo una deducción incorrecta!');
      if (!L.solved) errs.push('el motor lógico no lo resuelve');
      if (p.level < 5 && L.techCount.trial > (p.level === 4 ? 1 : 0)) errs.push(`requiere suponer (${L.techCount.trial} veces) para su nivel`);
      const MAX_LEVEL = [0, 2, 3, 4, 6, 6];
      if (L.maxLevel > MAX_LEVEL[p.level]) errs.push(`usa técnicas de nivel ${L.maxLevel}, demasiado difíciles para ${LEVEL[p.level]} (máx. ${MAX_LEVEL[p.level]})`);
      // Nombres de objetos ambiguos: «sofá» y «sofá naranja» en el mismo caso.
      const names = Object.values(p.objects).map((o) => o.name.toLowerCase());
      for (const a of names) for (const b of names) {
        if (a !== b && b.startsWith(a + ' ')) warns.push(`objetos ambiguos: «${a}» y «${b}»`);
      }
      if (!input.story?.intro || !input.story?.epilogue) errs.push('falta la historia (intro/epílogo)');
      const tc = Object.entries(L.techCount).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ');
      line = `${String(p.num).padStart(2)} ${p.id.padEnd(14)} ${LEVEL[p.level].padEnd(9)} ${p.size}x${p.size}  score/pj ${(L.score / p.cast.length).toFixed(2)}  max ${L.maxLevel}  pasos ${L.steps.length}  ${tc}  asesino=${p.murderer}`;
      if (showSteps || args.length) {
        console.log(`\n=== ${p.num}. ${p.title} (${p.franchise}) ===`);
        for (const ch of p.cast) console.log(`  ${ch.tag.padEnd(3)} ${displayName(ch)}: ${clueText(p, ch)}`);
        if (showSteps) L.steps.forEach((d, k) => console.log(`   ${k + 1}. [${d.tech}] ${d.text}`));
      }
    } catch (e) {
      errs.push((e as Error).message);
    }
    if (errs.length) {
      failures++;
      rows.push(`✘ ${id}: ${errs.join(' · ')}`);
    } else rows.push(`✔ ${line}${warns.length ? `\n   ⚠ ${[...new Set(warns)].join(' · ')}` : ''}`);
  }
  console.log('\n' + rows.join('\n'));
  console.log(`\n${ids.length - failures}/${ids.length} casos correctos`);
  process.exit(failures ? 1 : 0);
}

main();
