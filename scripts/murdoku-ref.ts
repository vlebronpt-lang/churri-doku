/**
 * Casos de referencia de Murdoku traducidos a nuestro formato, para medir su dificultad con nuestro motor.
 *   npx tsx scripts/murdoku-ref.ts [--steps]
 *
 * «La habitación del pánico» (Hard, 10×10, Manuel Garand): murdoku.com/play/puzzle-the-panic-room-hard
 * Traducción fiel de su JSON público: zonas, objetos (silla, alfombra y cama se pueden ocupar; mesa,
 * planta, televisión, árbol, estantería y estatua no), sexos, pistas y solución.
 */
import { compilePuzzle } from '../src/engine/puzzle';
import { solve } from '../src/engine/solver';
import { solveLogically } from '../src/engine/logic';
import { clueText } from '../src/engine/text';
import { hardSteps } from '../src/engine/difficulty';
import type { PuzzleInput } from '../src/engine/types';

export const PANIC_ROOM: PuzzleInput = {
  id: 'ref-panic-room', num: 0, level: 1, franchise: 'Murdoku', title: 'La habitación del pánico', size: 10,
  rooms: {
    P: { name: 'Habitación del pánico', article: 'la', color: '#9a9ba6', floor: 'tiles' },
    Y: { name: 'Patio', article: 'el', color: '#8fb3a0', floor: 'grass' },
    D: { name: 'Comedor', article: 'el', color: '#e8ebed', floor: 'wood' },
    L: { name: 'Salón', article: 'el', color: '#cdcae2', floor: 'wood' },
    F: { name: 'Recibidor', article: 'el', color: '#d6c7cc', floor: 'tiles' },
    K: { name: 'Cocina', article: 'la', color: '#d8d0d3', floor: 'checker' },
    M: { name: 'Dormitorio principal', article: 'el', color: '#d1dae6', floor: 'wood' },
    H: { name: 'Pasillo', article: 'el', color: '#f1f5f9', floor: 'wood' },
    G: { name: 'Habitación de invitados', article: 'la', color: '#e3d3dd', floor: 'wood' },
  },
  layout: [
    'DDDDDKKPPP',
    'DDDDDKKPPP',
    'DDDDDKKKPP',
    'DDFFFHHHHH',
    'YYFFFHLLLL',
    'YYFFFHLLLL',
    'YYFFFHLLLL',
    'YYYMMHHGGG',
    'YYYMMMHGGG',
    'YYYMMMHGGG',
  ],
  objects: [
    '.s...mm.t.',
    'smmms.....',
    '.ss.pe....',
    '.m.s.....z',
    '.a..z..s..',
    '.z....s..t',
    'a.p....ssm',
    '...mb..ebs',
    '....b...b.',
    'a.ap.....t',
  ],
  floors: [
    '..........',
    '..........',
    '..........',
    '......ww..',
    '..........',
    '..ww...ww.',
    '...w.w....',
    '.....ww...',
    '.......w..',
    '.......ww.',
  ],
  legend: { s: 'silla', m: 'mesa', t: 'television', p: 'planta', e: 'estanteria', z: 'estatua', a: 'arbol', b: 'cama', w: 'alfombra' },
  cast: [
    { id: 'A', tag: 'A', name: 'Alvin', gender: 'm', clues: [] },
    { id: 'B', tag: 'B', name: 'Bobby', gender: 'm', clues: [] },
    { id: 'C', tag: 'C', name: 'Charlie', gender: 'm', clues: [] },
    { id: 'D', tag: 'D', name: 'Dina', gender: 'f', clues: [] },
    { id: 'E', tag: 'E', name: 'Evan', gender: 'm', clues: [] },
    { id: 'F', tag: 'F', name: 'Fawn', gender: 'f', clues: [] },
    { id: 'G', tag: 'G', name: 'Graham', gender: 'm', clues: [] },
    { id: 'H', tag: 'H', name: 'Harold', gender: 'm', clues: [] },
    { id: 'I', tag: 'I', name: 'Iona', gender: 'f', clues: [] },
    { id: 'V', tag: 'V', name: 'Violet', gender: 'f', victim: true, clues: [] },
  ],
  solution: { A: [6, 1], B: [5, 6], C: [8, 7], D: [1, 5], E: [2, 8], F: [4, 9], G: [9, 4], H: [0, 3], I: [7, 2], V: [3, 0] },
  clues: {
    A: [{ t: 'beside', obj: 'estatua' }],
    B: [{ t: 'on', obj: 'silla' }],
    C: [{ t: 'inRoom', room: 'G' }],
    D: [{ t: 'beside', obj: 'estanteria' }],
    E: [{ t: 'inRoom', room: 'P' }],
    F: [{ t: 'beside', obj: 'television' }],
    G: [{ t: 'someoneAtOffset', axis: 'row', n: 1, dir: 'N', cond: { t: 'on', obj: 'alfombra' } }],
    H: [{ t: 'inRoom', room: 'D' }, { t: 'withGender', g: 'f' }],
    I: [{ t: 'someoneAtOffset', axis: 'col', n: 2, dir: 'W', g: 'f' }],
  },
  story: { intro: 'Referencia de Murdoku.', epilogue: 'Fue Harold.' },
} as PuzzleInput;

const R = (name: string) => ({ name, article: 'el' as const, color: '#dddddd', floor: 'wood' as const });
const HUECO = { base: 'caja', key: 'hueco', name: 'hueco', plural: 'huecos', fem: false };
const CHARCO = { base: 'banco', key: 'charco', name: 'charco', plural: 'charcos', fem: false };
const CARRITO = { base: 'coche', key: 'carrito', name: 'carrito', plural: 'carritos', fem: false };
const FLORES = { base: 'planta', key: 'flores', name: 'flores', plural: 'flores', fem: true };
const ESCOMBROS = { base: 'caja', key: 'escombros', name: 'escombros', plural: 'escombros', fem: false };
const story = { intro: 'Referencia de Murdoku.', epilogue: '' };

/**
 * Otros casos de Murdoku (traducción fiel de su JSON público) para comprobar que la medida los ordena como ellos.
 * Solo los que no tienen «pistas generales» (p. ej. «No había ninguna habitación vacía»), que nuestro motor no usa.
 * En Murdoku la cama 7 ocupa dos casillas en vertical, y la cama 6 y el coche, dos en horizontal.
 */
export const REFS: { level: string; input: PuzzleInput }[] = [
  { level: 'Fácil', input: {
    id: 'ref-hoarders', num: 0, level: 1, franchise: 'Murdoku', title: 'Acaparadores', size: 8,
    rooms: { B: R('Dormitorio'), C: R('Salón'), D: R('Comedor'), E: R('Garaje'), F: R('Cocina'), G: R('Baño') },
    layout: ['BBBFFDDD', 'BBBFFDDD', 'BBBFFDDD', 'BBCCCDDD', 'CCCCCEEE', 'CCCCCEEE', 'GGCCCEEE', 'GGGCCEEE'],
    objects: ['cmt.mss.', '.bb.e.ms', 'bb.e.sm.', 'e.tm....', 'ee..secc', 'cs.s.kk.', '.c..e.ec', 'cs.cecct'],
    legend: { c: 'caja', m: 'mesa', t: 'television', s: 'silla', b: 'cama', e: 'estanteria', k: 'coche' },
    cast: [
      { id: 'A', tag: 'A', name: 'Archer', gender: 'm', clues: [] }, { id: 'B', tag: 'B', name: 'Bradley', gender: 'm', clues: [] },
      { id: 'C', tag: 'C', name: 'Chloe', gender: 'f', clues: [] }, { id: 'D', tag: 'D', name: 'Denise', gender: 'f', clues: [] },
      { id: 'E', tag: 'E', name: 'Eloise', gender: 'f', clues: [] }, { id: 'F', tag: 'F', name: 'Falcon', gender: 'm', clues: [] },
      { id: 'G', tag: 'G', name: 'Gannon', gender: 'm', clues: [] }, { id: 'H', tag: 'H', name: 'Vicky', gender: 'f', victim: true, clues: [] },
    ],
    solution: { A: [0, 3], B: [1, 7], C: [2, 0], D: [3, 4], E: [5, 6], F: [7, 1], G: [6, 5], H: [4, 2] },
    clues: {
      A: [{ t: 'inRoom', room: 'F' }], B: [{ t: 'on', obj: 'silla' }, { t: 'inRoom', room: 'D' }], C: [{ t: 'on', obj: 'cama' }],
      D: [{ t: 'corner' }], E: [{ t: 'on', obj: 'coche' }], F: [{ t: 'beside', obj: 'caja' }], G: [{ t: 'aloneWith', of: 'E' }],
    },
    story,
  } as PuzzleInput },
  { level: 'Fácil', input: {
    id: 'ref-riding-lesson', num: 0, level: 1, franchise: 'Murdoku', title: 'La lección de equitación', size: 9,
    rooms: { A: R('Picadero'), B: R('Establo'), D: R('Pasto'), E: R('Cobertizo') },
    layout: ['EEEBBBBBB', 'EEEBBBBBB', 'EEEBBBBBB', 'EEAAAABBB', 'AAAAAAAAD', 'AAAAAAAAD', 'DAAAAAAAD', 'DDAAAADDD', 'DDDDDDDDD'],
    objects: ['e.ecmh...', 'm..hmmmhm', 'c.e.....h', '....h..mm', '..x......', '.h...h...', '.x...x...', 'u...c..a.', '.hu.....u'],
    legend: { e: 'estanteria', c: 'caja', m: 'mesa', h: 'caballo', x: CHARCO, u: 'arbusto', a: 'arbol' },
    cast: [
      { id: 'A', tag: 'A', name: 'Ayla', gender: 'f', clues: [] }, { id: 'B', tag: 'B', name: 'Brandon', gender: 'm', clues: [] },
      { id: 'C', tag: 'C', name: 'Christa', gender: 'f', clues: [] }, { id: 'D', tag: 'D', name: 'Dolores', gender: 'f', clues: [] },
      { id: 'E', tag: 'E', name: 'Evangeline', gender: 'f', clues: [] }, { id: 'F', tag: 'F', name: 'Finn', gender: 'm', clues: [] },
      { id: 'G', tag: 'G', name: 'Gabby', gender: 'f', clues: [] }, { id: 'H', tag: 'H', name: 'Heidi', gender: 'f', clues: [] },
      { id: 'I', tag: 'I', name: 'Vanessa', gender: 'f', victim: true, clues: [] },
    ],
    solution: { A: [8, 3], B: [1, 1], C: [0, 7], D: [6, 4], E: [2, 8], F: [5, 5], G: [3, 0], H: [4, 2], I: [7, 6] },
    clues: {
      A: [{ t: 'beside', obj: 'arbusto' }], B: [{ t: 'beside', obj: 'mesa' }],
      C: [{ t: 'someoneAtOffset', axis: 'col', n: 1, dir: 'E', cond: { t: 'on', obj: 'caballo' }, g: 'f' }],
      D: [{ t: 'col', cols: [4] }], E: [{ t: 'inRoom', room: 'B' }], F: [{ t: 'on', obj: 'caballo' }, { t: 'inRoom', room: 'A' }],
      G: [{ t: 'inRoom', room: 'E' }, { t: 'sameRoom', of: 'B' }], H: [{ t: 'on', obj: 'charco' }],
    },
    story,
  } as PuzzleInput },
  { level: 'Medio', input: {
    id: 'ref-retirement', num: 0, level: 1, franchise: 'Murdoku', title: 'La residencia', size: 10,
    rooms: { A: R('Carretera'), B: R('Pista de pickleball'), C: R('Centro social'), D: R('Camino'), E: R('Piscina'), F: R('Apartamento B'), G: R('Apartamento A') },
    layout: ['GGGGGGDEEE', 'GGGGGDDEEE', 'GGGGGDEEEE', 'AAAAADFFFF', 'AAAAAAFFFF', 'CCCCAAAFFF', 'CCCCAAAFFF', 'CCCCCAABBB', 'CCCCCAABBB', 'CCCCCAABBB'],
    objects: ['t..be.....', '...b......', '.s........', '......smt.', 'ag........', '...sa....b', '.s.......b', 'mm.s..g...', 's..mm.....', 'e..sea....'],
    floors: ['..........', 'ww........', 'w.........', '..........', '..........', '.......w..', '..ww...ww.', '..w.......', '..w.......', '..........'],
    legend: { t: 'television', b: 'cama', e: 'estanteria', w: 'alfombra', s: 'silla', m: 'mesa', a: 'arbol', g: CARRITO },
    cast: [
      { id: 'A', tag: 'A', name: 'August', gender: 'm', clues: [] }, { id: 'B', tag: 'B', name: 'Barnaby', gender: 'm', clues: [] },
      { id: 'C', tag: 'C', name: 'Clarence', gender: 'm', clues: [] }, { id: 'D', tag: 'D', name: 'Donna', gender: 'f', clues: [] },
      { id: 'E', tag: 'E', name: 'Eirlys', gender: 'f', clues: [] }, { id: 'F', tag: 'F', name: 'Florence', gender: 'f', clues: [] },
      { id: 'G', tag: 'G', name: 'Gus', gender: 'm', clues: [] }, { id: 'H', tag: 'H', name: 'Horatio', gender: 'm', clues: [] },
      { id: 'I', tag: 'I', name: 'Ira', gender: 'm', clues: [] }, { id: 'J', tag: 'J', name: 'Violet', gender: 'f', victim: true, clues: [] },
    ],
    solution: { A: [6, 2], B: [3, 9], C: [4, 1], D: [8, 0], E: [1, 3], F: [7, 6], G: [0, 8], H: [5, 5], I: [9, 7], J: [2, 4] },
    clues: {
      A: [{ t: 'on', obj: 'alfombra' }], B: [{ t: 'inRooms', rooms: ['G', 'F'], label: 'el apartamento A o el B' }, { t: 'alone' }],
      C: [{ t: 'beside', obj: 'arbol' }], D: [{ t: 'on', obj: 'silla' }], E: [{ t: 'on', obj: 'cama' }], F: [{ t: 'on', obj: 'carrito' }],
      G: [{ t: 'row', rows: [0] }], H: [{ t: 'someoneAtOffset', axis: 'row', n: 1, dir: 'N', cond: { t: 'on', obj: 'carrito' }, g: 'm' }],
      I: [{ t: 'inRoom', room: 'B' }, { t: 'corner' }],
    },
    story,
  } as PuzzleInput },
];

export function measure(input: PuzzleInput) {
  const p = compilePuzzle(input);
  const uniq = solve(p, 2, undefined, 60_000_000);
  const L = solveLogically(p, { allowTrial: true });
  const L0 = solveLogically(p, { allowTrial: false });
  return { p, uniq, L, L0, score: L.score / p.cast.length };
}

if (process.argv[1]?.endsWith('murdoku-ref.ts')) {
  const all = [{ level: 'Difícil', input: PANIC_ROOM }, ...REFS];
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
  for (const { level, input } of all) {
    if (only && !input.id.includes(only)) continue;
    const { p, uniq, L, L0, score } = measure(input);
    const tc = Object.entries(L.techCount).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ');
    console.log(`${level.padEnd(8)} «${p.title}» ${p.size}×${p.size} · soluciones ${uniq.count}${uniq.aborted ? ' (abortado)' : ''} · asesino ${p.cast.find((c) => c.id === p.murderer)?.name} · resuelto ${L.solved} (sin suponer ${L0.solved}) · sólido ${L.sound}`);
    console.log(`         puntuación/pj ${score.toFixed(2)} · total ${L.score.toFixed(1)} · pasos ${L.steps.length} · suposiciones ${L.techCount.trial} · difíciles ${hardSteps(L.techCount)} · ${tc}`);
    if (process.argv.includes('--clues')) for (const ch of p.cast) console.log(`    ${ch.name}: ${clueText(p, ch)}`);
    if (process.argv.includes('--steps')) L.steps.forEach((d, k) => console.log(`    ${k + 1}. [${d.tech}] ${d.text}`));
  }
}
