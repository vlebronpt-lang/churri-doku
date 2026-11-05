/**
 * Comprueba el motor con las reglas del caso y los planos con filas y columnas de sobra, sobre mapas reales:
 * para cada tipo de regla busca colocaciones que la cumplan, y para muchos juegos de pistas comprueba que el motor
 * lógico nunca descarta la solución (solidez) y que, si dice que ha resuelto el caso, el solver exhaustivo coincide.
 *   npx tsx scripts/test-rules.ts [juegos por regla]
 */
import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically } from '../src/engine/logic';
import { factsFor } from '../src/engine/facts';
import { ruleText, boardRuleSegs } from '../src/engine/text';
import { assignmentValid } from '../src/engine/clues';
import type { CaseRule, Clue, PuzzleInput } from '../src/engine/types';
import { makeRng, randomSolution } from './genlib';
import office from '../src/data/puzzles/office';
import friends from '../src/data/puzzles/friends';

const ROUNDS = Number(process.argv[2] ?? 25);
const bad: string[] = [];
let checked = 0, solved = 0;

/** Plano con una fila y una columna más: añade al final una zona nueva con casillas libres. */
function grow(input: PuzzleInput): PuzzleInput {
  const s = input.size;
  const row = (ch: string) => ch.repeat(s + 1);
  return {
    ...input, size: s + 1,
    rooms: { ...input.rooms, '#': { name: 'Pasillo', article: 'el', color: '#dddddd', floor: 'plain' } },
    layout: [...input.layout.map((r) => `${r}#`), row('#')],
    objects: [...input.objects.map((r) => `${r}.`), row('.')],
    floors: input.floors ? [...input.floors.map((r) => `${r}.`), row('.')] : undefined,
    clues: undefined, solution: undefined as never, wantMurderer: undefined, pins: undefined,
  };
}

function scenarios(): { name: string; input: PuzzleInput }[] {
  const base = (i: PuzzleInput): PuzzleInput => ({ ...i, clues: undefined, solution: undefined as never, wantMurderer: undefined, pins: undefined });
  const rk = Object.keys(office.rooms);
  const groups = {
    a: { label: 'Ventas', one: 'un vendedor', many: 'los vendedores' },
    b: { label: 'Contabilidad', one: 'un contable', many: 'los contables' },
  };
  const withGroups = (i: PuzzleInput): PuzzleInput => ({
    ...base(i), groups,
    cast: i.cast.map((ch, k) => ({ ...ch, clues: [], groups: k % 2 ? ['a'] : ['b'] })),
  });
  const rules: [string, CaseRule[]][] = [
    ['zoneOnly', [{ t: 'zoneOnly', rooms: [rk[0]], group: 'a' }]],
    ['zoneOnly×2', [{ t: 'zoneOnly', rooms: [rk[0]], group: 'a' }, { t: 'zoneOnly', rooms: [rk[1]], group: 'b' }]],
    ['zoneCount0', [{ t: 'zoneCount', room: rk[1], n: 0 }]],
    ['zoneCount3', [{ t: 'zoneCount', room: rk[0], n: 3 }]],
    ['zoneCount1', [{ t: 'zoneCount', room: rk[2], n: 1 }]],
    ['emptyZones0', [{ t: 'emptyZones', n: 0 }]],
    ['emptyZones1', [{ t: 'emptyZones', n: 1 }]],
    ['objCount', [{ t: 'objCount', obj: 'silla', n: 2 }]],
    ['zoneHasGroup', [{ t: 'zoneHasGroup', rooms: [rk[0], rk[1]], group: 'a' }]],
    ['groupsApart', [{ t: 'groupsApart', a: 'a', b: 'b' }]],
    ['noZoneWith', [{ t: 'noZoneWith', n: 1 }]],
  ];
  const out = rules.map(([name, r]) => ({ name, input: { ...withGroups(office), rules: r } }));
  out.push({ name: 'plano grande', input: grow(friends) });
  out.push({ name: 'plano grande + regla', input: { ...grow(friends), rules: [{ t: 'zoneCount', room: '#', n: 2 }] } });
  return out;
}

for (const sc of scenarios()) {
  const rng = makeRng(12345);
  const draft = compilePuzzle({ ...sc.input, solution: undefined as never, clues: undefined }, { draft: true });
  let found = 0;
  for (let t = 0; t < ROUNDS; t++) {
    const pos = randomSolution(draft, sc.input, rng);
    if (!pos) continue;
    found++;
    const sol = Object.fromEntries(draft.cast.map((ch, k) => [ch.id, [Math.floor(pos[k] / draft.size), pos[k] % draft.size]])) as Record<string, [number, number]>;
    const base = compilePuzzle({ ...sc.input, solution: sol, clues: undefined });
    if (!assignmentValid(base, pos)) bad.push(`${sc.name}: la colocación generada no es válida`);
    // Pistas al azar (ciertas en la solución): unas fuertes y otras flojas.
    const C: Clue[][] = base.cast.map((ch, k) => {
      if (ch.victim) return [{ t: 'victim' } as Clue];
      const fs = factsFor(base, k, pos);
      return fs[Math.floor(rng() * fs.length)]?.clue ?? [];
    });
    const q = { ...base, cast: base.cast.map((ch, k) => ({ ...ch, clues: C[k] })) };
    const L = solveLogically(q, { allowTrial: true, maxSteps: 300, deadline: Date.now() + 4000 });
    checked++;
    if (!L.sound) bad.push(`${sc.name}: el motor lógico descartó la solución (ronda ${t})`);
    const r = solve(q, 2, undefined, 2_000_000);
    if (L.solved && L.sound) {
      solved++;
      if (!r.aborted && r.count !== 1) bad.push(`${sc.name}: el motor dice resuelto, pero hay ${r.count} soluciones (ronda ${t})`);
    }
    if (!r.aborted && r.count === 0) bad.push(`${sc.name}: el solver no encuentra la solución (ronda ${t})`);
    if (!r.aborted && r.count >= 1 && !r.solutions.some((x) => x.every((v, k) => v === pos[k])) && r.count === 1) bad.push(`${sc.name}: la solución única no es la buena (ronda ${t})`);
  }
  if (!found) bad.push(`${sc.name}: no se encuentra ninguna colocación`);
  const sample = compilePuzzle({ ...sc.input, solution: undefined as never, clues: undefined }, { draft: true });
  const txt = [...sample.rules.map((r) => ruleText(sample, r)), boardRuleSegs(sample)?.map((x) => x.text).join('')].filter(Boolean).join(' | ');
  console.log(`${found ? '✔' : '✘'} ${sc.name.padEnd(22)} ${found}/${ROUNDS} colocaciones · ${txt}`);
}
console.log(`\n${checked} juegos de pistas comprobados, ${solved} resueltos por la lógica`);
console.log(bad.length ? `✘ ${bad.length} problemas:\n${[...new Set(bad)].slice(0, 30).join('\n')}` : '✔ el motor es sólido con todas las reglas');
process.exit(bad.length ? 1 : 0);
