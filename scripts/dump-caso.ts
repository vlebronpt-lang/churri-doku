/**
 * Vuelca un caso resuelto en texto, para revisar que la historia encaja con la solución generada:
 *   npx tsx scripts/dump-caso.ts <id> [...]
 */
import { readFileSync } from 'node:fs';
import { compilePuzzle } from '../src/engine/puzzle';
import { caseRuleSegs, clueText, displayName, roomPhrase } from '../src/engine/text';
import type { PuzzleInput } from '../src/engine/types';

async function main() {
  for (const id of process.argv.slice(2)) {
    const input: PuzzleInput = (await import(`../src/data/puzzles/${id}.ts`)).default;
    const p = compilePuzzle(input);
    console.log(`\n===== ${id} · Nº ${p.num} · ${p.franchise} · «${p.title}» · ${p.size}×${p.size}`);
    console.log(`Zonas: ${p.rooms.map((r) => roomPhrase(r, '')).join(', ')}`);
    for (const segs of caseRuleSegs(p)) console.log(`Regla: ${segs.map((x) => x.text).join('')}`);
    console.log(`Asesino: ${displayName(p.cast.find((c) => c.id === p.murderer)!)}`);
    console.log('Dónde está cada uno y su pista:');
    for (const ch of p.cast) {
      const c = p.cells[p.solution[ch.id]];
      const on = [c.obj && p.objects[c.obj].name, c.floor && p.objects[c.floor].name].filter(Boolean).join(', ');
      console.log(`  ${ch.id} ${displayName(ch)}${ch.victim ? ' (VÍCTIMA)' : ''}${ch.groups?.length ? ` [${ch.groups.map((g) => p.groups[g].label).join(', ')}]` : ''}: ${roomPhrase(p.rooms[c.room], 'en')}, F${c.r + 1}·C${c.c + 1}${on ? `, sobre ${on}` : ''} — «${clueText(p, ch)}»`);
    }
    console.log(`INTRO: ${p.story.intro}`);
    console.log(`EPÍLOGO: ${p.story.epilogue}`);
    try {
      const t = JSON.parse(readFileSync(new URL(`../art/textos/${id}.json`, import.meta.url), 'utf8'));
      console.log('MÓVILES:'); for (const [k, v] of Object.entries(t.motives)) console.log(`  ${k}: ${v}`);
      console.log('AGRAVIOS:'); for (const [k, v] of Object.entries(t.grudges)) console.log(`  ${k}: ${v}`);
    } catch { /* caso antiguo, sin textos aparte */ }
  }
}
main();
