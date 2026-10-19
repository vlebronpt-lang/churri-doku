import type { PuzzleInput } from '../engine/types';

/** Minicaso del tutorial guiado (4×4, con la familia Simpson). */
export const TUTORIAL: PuzzleInput = {
  id: 'tutorial',
  num: 0,
  level: 1,
  franchise: 'Los Simpson',
  title: 'Simulacro en la mansión Burns',
  size: 4,
  rooms: {
    D: { name: 'Despacho', article: 'el', color: '#d8c19a', floor: 'wood' },
    C: { name: 'Comedor', article: 'el', color: '#f2cf8f', floor: 'checker' },
    J: { name: 'Jardín', article: 'el', color: '#9fd17f', floor: 'grass' },
  },
  layout: [
    'DDCC',
    'DDCC',
    'JJCC',
    'JJJJ',
  ],
  objects: [
    '.A.s',
    'e.p.',
    '..T.',
    '.t.b',
  ],
  legend: {
    A: 'sillon',
    s: 'silla',
    e: 'estanteria',
    p: 'planta',
    T: 'mesa',
    t: 'arbol',
    b: 'arbusto',
  },
  cast: [
    { id: 'L', tag: 'L', name: 'Lisa', gender: 'f', clues: [] },
    { id: 'H', tag: 'H', name: 'Homer', gender: 'm', clues: [] },
    { id: 'B', tag: 'B', name: 'Bart', gender: 'm', clues: [] },
    { id: 'V', tag: 'SB', name: 'Sr. Burns', article: 'el', gender: 'm', victim: true, clues: [] },
  ],
  solution: { L: [0, 3], H: [1, 1], B: [2, 0], V: [3, 2] },
  clues: {
    L: [{ t: 'on', obj: 'silla' }],
    H: [{ t: 'beside', obj: 'estanteria' }],
    B: [{ t: 'col', cols: [0] }],
  },
  story: {
    intro: 'El Sr. Burns ha organizado un simulacro de asesinato para poner a prueba a sus empleados… y se lo ha tomado tan en serio que se ha tirado al suelo del jardín. Los Simpson estaban por la mansión. ¿Quién estaba a solas con él?',
    epilogue: '¡Fue Bart! Le tiró un globo de agua desde detrás del árbol y el Sr. Burns, muy digno, se dio por «asesinado». Homer seguía junto a la estantería buscando donuts y Lisa, sentada en el comedor, tomaba apuntes del simulacro.',
  },
  art: 'simpson',
  meta: { kind: 'tutorial' },
};
