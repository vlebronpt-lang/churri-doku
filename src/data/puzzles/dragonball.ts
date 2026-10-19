import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'dragonball',
  num: 8,
  level: 2,
  franchise: 'Dragon Ball',
  title: '¡Han matado a Krilin!',
  size: 7,
  rooms: {
    R: { name: 'Cuarto de Mutenroshi', article: 'el', color: '#e8c9a0', floor: 'wood' },
    K: { name: 'Salón de la Kame House', article: 'el', color: '#f4b8c4', floor: 'planks' },
    P: { name: 'Playa', article: 'la', color: '#f3dd9b', floor: 'sand' },
    Z: { name: 'Zona de aterrizaje', article: 'la', color: '#c9b9a6', floor: 'dirt' },
    M: { name: 'Mar', article: 'el', color: '#72b8e2', floor: 'water' },
  },
  layout: [
    'RRRKKKK',
    'RRRKKKK',
    'PPPPKKK',
    'PPPPPPP',
    'ZZZPPMM',
    'ZZZMMMM',
    'ZZZMMMM',
  ],
  objects: [
    '.......',
    'QQe.OOb',
    'y....t.',
    '..o.yUU',
    '.b.b..r',
    'oNNAA..',
    '.......',
  ],
  legend: {
    Q: 'cama',
    e: { base: 'estanteria', name: 'estantería de revistas', plural: 'estanterías de revistas', unique: true, fem: true },
    O: 'sofa',
    b: 'bola',
    t: 'television',
    y: 'palmera',
    o: 'roca',
    r: 'roca',
    N: { base: 'nave', key: 'nave_freezer', name: 'nave de Freezer', plural: 'naves de Freezer', unique: true, fem: true, tint: '#c9c3d9' },
    U: 'tumbona',
    A: 'barca',
  },
  cast: [
    { id: 'G', tag: 'G', name: 'Goku', gender: 'm', clues: [] },
    { id: 'V', tag: 'V', name: 'Vegeta', gender: 'm', clues: [] },
    { id: 'B', tag: 'B', name: 'Bulma', gender: 'f', clues: [] },
    { id: 'P', tag: 'P', name: 'Piccolo', gender: 'm', nonhuman: true, clues: [] },
    { id: 'F', tag: 'F', name: 'Freezer', gender: 'm', nonhuman: true, clues: [] },
    { id: 'M', tag: 'M', name: 'Mutenroshi', gender: 'm', clues: [] },
    { id: 'K', tag: 'K', name: 'Krilin', gender: 'm', victim: true, clues: [] },
  ],
  // <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)
  solution: { "G": [6, 0], "V": [5, 4], "B": [4, 2], "P": [0, 6], "F": [2, 3], "M": [1, 1], "K": [3, 5] },
  clues: {
    "G": [{"t":"inRoom","room":"Z"},{"t":"not","c":{"t":"beside","obj":"bola"}}],
    "V": [{"t":"on","obj":"barca"}],
    "B": [{"t":"beside","obj":"nave_freezer"}],
    "P": [{"t":"inRoom","room":"K"},{"t":"not","c":{"t":"beside","obj":"sofa"}}],
    "F": [{"t":"offset","axis":"row","n":1,"dir":"S","of":"M"}],
    "M": [{"t":"beside","obj":"estanteria"}],
  },
  // </gen>
  wantMurderer: 'F',
  pins: { K: { rooms: ['P'] } },
  story: {
    intro: 'Tarde tranquila en la Kame House: Mutenroshi «lee» sus revistas, Bulma curiosea un cacharro recién aterrizado y Goku entrena como si no hubiera un mañana. De pronto, un grito rompe la siesta: ¡han vuelto a matar a Krilin! Hay bolas de dragón desperdigadas por la isla y Shenron empieza a estar harto de resucitarlo. ¿Quién ha matado a Krilin?',
    epilogue: 'Fue Freezer, cómo no. Aterrizó en la isla para hacerse con las bolas de dragón «por las buenas» y se encontró a Krilin solo en la playa, tomando el sol en una tumbona. Lo hizo volar por los aires igual que en Namek, solo por fastidiar a Goku. A Goku se le volvió a poner el pelo rubio de pura rabia, pero tranquilos: con siete bolas y un dragón, Krilin estará de vuelta para el próximo caso.',
  },
};

export default puzzle;
