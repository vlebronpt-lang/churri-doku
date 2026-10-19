/**
 * Valida las lecciones de la academia:  npx tsx scripts/validate-academy.ts
 * Cada minicaso debe: compilar, tener solución única, resolverse con lógica (sin suponer, salvo la lección de suponer),
 * usar los tipos de pista y las técnicas de su lección, ser pequeño y tener retratos.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically } from '../src/engine/logic';
import { clueText, displayName } from '../src/engine/text';
import { LESSONS } from '../src/data/academy/lessons';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let bad = 0;
const ids = new Set<string>();
for (const l of LESSONS) {
  const errs: string[] = [];
  if (ids.has(l.id)) errs.push('id repetido');
  ids.add(l.id);
  try {
    const p = compilePuzzle({ ...l.puzzle, meta: { kind: 'lesson', lesson: l.id } });
    if (p.id !== `lesson-${l.id}`) errs.push(`el id del minicaso debe ser lesson-${l.id}`);
    if (p.size > 6) errs.push('tablero mayor de 6×6');
    const r = solve(p, 2, undefined, 2_000_000);
    if (r.count !== 1) errs.push(`soluciones: ${r.count}`);
    const trial = l.focusTech.includes('trial');
    const L = solveLogically(p, { allowTrial: trial });
    if (!L.solved || !L.sound) errs.push(trial ? 'la lógica no lo resuelve' : 'la lógica no lo resuelve sin suponer');
    if (trial && L.techCount.trial !== 1) errs.push(`debería necesitar exactamente una suposición (tiene ${L.techCount.trial})`);
    for (const t of l.focusTech) if (!L.techCount[t]) errs.push(`no necesita la técnica ${t}`);
    const used = new Set(p.cast.flatMap((ch) => ch.clues.map((c) => c.t)));
    for (const t of l.focusClues) if (!used.has(t as never)) errs.push(`no usa pistas de tipo ${t}`);
    const art = l.puzzle.art ?? p.id;
    for (const ch of p.cast) if (!existsSync(`${ROOT}public/img/portraits/${art}/${ch.id}.webp`)) errs.push(`falta retrato ${art}/${ch.id}`);
    if (!l.explain.length || !l.title || !l.skill || !l.tip) errs.push('faltan textos');
    console.log(`\n${errs.length ? '✘' : '✔'} ${l.id} · ${l.title} · ${p.size}×${p.size} · ${Object.entries(L.techCount).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ')}`);
    for (const ch of p.cast) console.log(`   ${displayName(ch)}: ${clueText(p, ch)}`);
  } catch (e) {
    errs.push((e as Error).message);
  }
  if (errs.length) { bad++; console.log(`   ⚠ ${errs.join(' · ')}`); }
}
console.log(`\n${LESSONS.length - bad}/${LESSONS.length} lecciones correctas`);
process.exit(bad || !LESSONS.length ? 1 : 0);
