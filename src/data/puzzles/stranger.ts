import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'stranger',
  num: 4,
  level: 1,
  franchise: 'Stranger Things',
  title: 'Justicia para Barb',
  size: 6,
  rooms: {
    D: { name: 'Dormitorio de Steve', article: 'el', color: '#c8d2ee', floor: 'carpet' },
    S: { name: 'Salón', article: 'el', color: '#efd3ad', floor: 'wood' },
    J: { name: 'Jardín', article: 'el', color: '#a6cf8b', floor: 'grass' },
    P: { name: 'Piscina', article: 'la', color: '#cfe5e8', floor: 'tiles' },
  },
  layout: [
    'DDDSSS',
    'DDDSSS',
    'JJSSSS',
    'JJJPPP',
    'JJPPPP',
    'JPPPPP',
  ],
  objects: [
    '...mVp',
    'QQAFFk',
    '......',
    't.lz..',
    '.b.y..',
    'tp....',
  ],
  floors: [
    '......',
    '......',
    '......',
    '....ww',
    '....ww',
    '......',
  ],
  legend: {
    m: 'mesa',
    V: 'television',
    p: 'planta',
    Q: { base: 'cama', tint: '#c0392b' },
    A: 'armario',
    F: { base: 'sofa', tint: '#b5651d' },
    t: 'arbol',
    b: 'arbusto',
    l: 'farola',
    k: { base: 'barril', key: 'barril_cerveza', name: 'barril de cerveza', plural: 'barriles de cerveza', unique: true, fem: false },
    z: 'tumbona',
    y: 'tumbona',
    w: 'agua',
  },
  cast: [
    { id: 'N', tag: 'N', name: 'Nancy', gender: 'f', clues: [] },
    { id: 'S', tag: 'S', name: 'Steve', gender: 'm', clues: [] },
    { id: 'J', tag: 'J', name: 'Jonathan', gender: 'm', clues: [] },
    { id: 'T', tag: 'T', name: 'Tommy H.', gender: 'm', clues: [] },
    { id: 'D', tag: 'D', name: 'Demogorgon', article: 'el', gender: 'm', nonhuman: true, clues: [] },
    { id: 'B', tag: 'B', name: 'Barb', gender: 'f', victim: true, clues: [] },
  ],
  // <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)
  solution: { "N": [0, 2], "S": [1, 0], "J": [3, 1], "T": [2, 5], "D": [4, 4], "B": [5, 3] },
  clues: {
    "N": [{"t":"dir","dir":"N","of":"S"}],
    "S": [{"t":"on","obj":"cama"}],
    "J": [{"t":"beside","obj":"farola"}],
    "T": [{"t":"beside","obj":"barril_cerveza"}],
    "D": [{"t":"on","obj":"agua"}],
  },
  // </gen>
  wantMurderer: 'D',
  pins: { B: { rooms: ['P'] } },
  story: {
    intro: 'Hawkins, 1983. Steve Harrington aprovecha que sus padres no están para montar una fiesta en casa. Mientras Nancy sube con él al piso de arriba, Barb se queda sola junto a la piscina, con un corte en la mano y cara de pocos amigos. Cuando por fin alguien sale a buscarla, Barb ha desaparecido. ¿Quién se llevó a Barb?',
    epilogue: '¡Fue el Demogorgon! Una gota de sangre de Barb cayó a la piscina y la criatura salió del agua, directamente desde el Mundo del Revés, para llevársela. Nadie se enteró: Steve y Nancy estaban arriba, Tommy H. no se despegaba del barril de cerveza y Jonathan seguía haciendo fotos junto a la farola del jardín. Hawkins tardó demasiado en hacerle justicia a Barb.',
  },
};

export default puzzle;
