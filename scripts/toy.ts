import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically } from '../src/engine/logic';
import { clueText } from '../src/engine/text';

const p = compilePuzzle({
  id: 'toy', num: 0, level: 1, franchise: 'Test', title: 'Toy', size: 5,
  rooms: {
    a: { name: 'Biblioteca', article: 'la', color: '#ccc', floor: 'wood' },
    b: { name: 'Salón', article: 'el', color: '#ddd', floor: 'tiles' },
    c: { name: 'Cocina', article: 'la', color: '#eee', floor: 'checker' },
    d: { name: 'Jardín', article: 'el', color: '#9c9', floor: 'grass' },
  },
  layout: ['aabbb', 'aabbb', 'ccbdd', 'ccddd', 'ccddd'],
  objects: ['S..T.', '.p.T.', '....S', '.T...', 'S...p'],
  legend: { S: 'silla', T: 'mesa', p: 'planta' },
  cast: [
    { id: 'A', tag: 'A', name: 'Ana', gender: 'f', clues: [{ t: 'beside', obj: 'mesa' }] },
    { id: 'B', tag: 'B', name: 'Profesor', article: 'el', gender: 'm', clues: [{ t: 'sameRoom', of: 'A' }] },
    { id: 'C', tag: 'C', name: 'Carla', gender: 'f', clues: [{ t: 'alone' }] },
    { id: 'D', tag: 'D', name: 'Dani', gender: 'm', clues: [{ t: 'col', cols: [0] }] },
    { id: 'V', tag: 'V', name: 'Vera', gender: 'f', victim: true, clues: [] },
  ],
  solution: { A: [0, 4], B: [1, 2], D: [2, 0], C: [3, 3], V: [4, 1] },
  story: { intro: '', epilogue: '' },
});
for (const ch of p.cast) console.log(ch.id, '·', clueText(p, ch), '| simple:', clueText(p, ch, { simple: true }));
const r = solve(p, 5);
console.log('solutions:', r.count, 'nodes:', r.nodes, r.solutions.map((s) => s.map((i) => `(${Math.floor(i / 5)},${i % 5})`).join(' ')));
const L = solveLogically(p);
console.log('logic solved:', L.solved, 'sound:', L.sound, 'maxLevel:', L.maxLevel, 'score:', L.score.toFixed(1));
for (const d of L.steps) console.log(` - [${d.tech}] ${d.text}`);
console.log('murderer:', p.murderer);
