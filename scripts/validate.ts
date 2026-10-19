/**
 * Valida todos los casos (o los indicados):
 *   npx tsx scripts/validate.ts [id ...] [--steps]
 * Comprueba: compilación, solución única e igual a la declarada, resolución lógica (con las
 * suposiciones que pide cada nivel), solidez del motor, que la dificultad esté dentro de la banda de
 * su nivel (y nunca por debajo de «La habitación del pánico» de Murdoku) y que el tablero sea de 9×9 o más.
 */
import { readdirSync } from 'node:fs';
import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically } from '../src/engine/logic';
import { clueText, displayName } from '../src/engine/text';
import { assignmentValid } from '../src/engine/clues';
import type { PuzzleInput } from '../src/engine/types';
import { PROFILE, REFERENCE, hardSteps } from '../src/engine/difficulty';

const LEVEL = ['', 'Muy fácil', 'Fácil', 'Medio', 'Difícil', 'Experto'];

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const showSteps = process.argv.includes('--steps');
  const dir = new URL('../src/data/puzzles/', import.meta.url);
  const ids = args.length ? args : readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, ''));
  let failures = 0;
  const rows: string[] = [];
  const stats: { level: number; sc: number; total: number; trial: number; size: number }[] = [];
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
      let r = solve(p, 3, undefined, 60_000_000);
      if (r.aborted) {
        // Búsqueda exhaustiva sobre lo que deja el motor lógico sin suponer (sus deducciones son válidas).
        const L0 = solveLogically(p, { allowTrial: false });
        if (L0.sound) r = solve(p, 3, undefined, 200_000_000, L0.stuckState?.cand ?? undefined);
      }
      if (r.aborted) errs.push('el solver abortó (demasiados nodos)');
      if (r.count !== 1) errs.push(`tiene ${r.count} soluciones`);
      else if (r.solutions[0].some((i, k) => i !== sol[k])) errs.push('la solución única no coincide con la declarada');
      const L = solveLogically(p, { allowTrial: true });
      if (!L.sound) errs.push('¡el motor lógico hizo una deducción incorrecta!');
      if (!L.solved) errs.push('el motor lógico no lo resuelve');
      const prof = PROFILE[p.level];
      if (L.techCount.trial > prof.maxTrial) errs.push(`requiere suponer ${L.techCount.trial} veces (máx. ${prof.maxTrial} en ${LEVEL[p.level]})`);
      if (L.techCount.trial < prof.minTrial) errs.push(`solo requiere suponer ${L.techCount.trial} veces (mín. ${prof.minTrial} en ${LEVEL[p.level]})`);
      if (L.maxLevel > prof.maxLevel) errs.push(`usa técnicas de nivel ${L.maxLevel}, demasiado difíciles para ${LEVEL[p.level]} (máx. ${prof.maxLevel})`);
      const sc = L.score / p.cast.length;
      if (sc < prof.band[0]) errs.push(`más fácil de lo exigido en ${LEVEL[p.level]} (${sc.toFixed(2)} < ${prof.band[0]})`);
      if (sc > prof.band[1]) errs.push(`más difícil de lo previsto para ${LEVEL[p.level]} (${sc.toFixed(2)} > ${prof.band[1]})`);
      if (hardSteps(L.techCount) < prof.minHard) errs.push(`pocos pasos difíciles (${hardSteps(L.techCount)} < ${prof.minHard})`);
      if (sc < REFERENCE.perChar || L.techCount.trial < REFERENCE.trials) errs.push(`más fácil que «${REFERENCE.title}» (${sc.toFixed(2)} por personaje, ${L.techCount.trial} suposiciones)`);
      if (p.size < 9) errs.push(`tablero de ${p.size}×${p.size} (mínimo 9×9)`);
      stats.push({ level: p.level, sc, total: L.score, trial: L.techCount.trial, size: p.size });
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
  // Resumen por nivel: cada nivel debe empezar por encima de donde acaba el anterior.
  if (stats.length) {
    console.log(`\nReferencia: «${REFERENCE.title}» (${REFERENCE.source}) · ${REFERENCE.perChar.toFixed(2)} por personaje · ${REFERENCE.total} en total · ${REFERENCE.trials} suposiciones`);
    let prevMax = -Infinity;
    for (let l = 1; l <= 5; l++) {
      const xs = stats.filter((x) => x.level === l);
      if (!xs.length) continue;
      const min = Math.min(...xs.map((x) => x.sc)), max = Math.max(...xs.map((x) => x.sc));
      const tmin = Math.min(...xs.map((x) => x.trial)), tmax = Math.max(...xs.map((x) => x.trial));
      const tot = xs.map((x) => x.total);
      const ok = min > prevMax;
      if (!ok) failures++;
      console.log(`${ok ? '✔' : '✘'} ${LEVEL[l].padEnd(9)} ${[...new Set(xs.map((x) => `${x.size}×${x.size}`))].join('/')} · por personaje ${min.toFixed(2)}–${max.toFixed(2)} · total ${Math.min(...tot).toFixed(0)}–${Math.max(...tot).toFixed(0)} · suposiciones ${tmin}–${tmax}${ok ? '' : ' (se solapa con el nivel anterior)'}`);
      prevMax = max;
    }
  }
  console.log(`\n${ids.length - failures}/${ids.length} casos correctos`);
  process.exit(failures ? 1 : 0);
}

main();
