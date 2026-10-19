/**
 * Escribe en el caso el candidato n (1 = el mejor) guardado por scripts/gen.ts:
 *   npx tsx scripts/pick.ts <id> <n>
 * Muestra la lista si no se indica n.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [id, nArg] = process.argv.slice(2);
const list = JSON.parse(readFileSync(new URL(`../.gen/${id}.json`, import.meta.url), 'utf8')) as {
  score: number; solution: Record<string, [number, number]>; clues: Record<string, unknown[]>; text: Record<string, string>; tech: Record<string, number>;
}[];
if (!nArg) {
  list.forEach((c, k) => {
    console.log(`#${k + 1} score/pj ${c.score.toFixed(2)} · ${Object.entries(c.tech).filter(([, v]) => v).map(([t, v]) => `${t}:${v}`).join(' ')}`);
    for (const [cid, t] of Object.entries(c.text)) console.log(`   ${cid.padEnd(3)} ${t}`);
  });
  process.exit(0);
}
const c = list[Number(nArg) - 1];
if (!c) throw new Error('No existe ese candidato');
const file = new URL(`../src/data/puzzles/${id}.ts`, import.meta.url);
const src = readFileSync(file, 'utf8');
const sol = Object.entries(c.solution).map(([k, [r, cc]]) => `${JSON.stringify(k)}: [${r}, ${cc}]`).join(', ');
const clues = Object.entries(c.clues).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
const block = `// <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)\n  solution: { ${sol} },\n  clues: {\n${clues}\n  },\n  // </gen>`;
const re = /\/\/ <gen>[\s\S]*?\/\/ <\/gen>/;
if (!re.test(src)) throw new Error('No encuentro el bloque // <gen> ... // </gen>');
writeFileSync(file, src.replace(re, block));
console.log(`✔ Candidato #${nArg} escrito en src/data/puzzles/${id}.ts`);
