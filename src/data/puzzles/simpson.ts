import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'simpson',
  num: 2,
  level: 1,
  franchise: 'Los Simpson',
  title: '¿Quién disparó al Sr. Burns?',
  size: 6,
  rooms: {
    B: { name: 'Biblioteca', article: 'la', color: '#b9a3d6', floor: 'planks' },
    D: { name: 'Despacho', article: 'el', color: '#d8c19a', floor: 'wood' },
    C: { name: 'Comedor', article: 'el', color: '#f2cf8f', floor: 'checker' },
    J: { name: 'Jardín', article: 'el', color: '#9fd17f', floor: 'grass' },
  },
  layout: [
    'BBDDDD',
    'BBDDDD',
    'BBCCCC',
    'JJCCCC',
    'JJCCCC',
    'JJJJJJ',
  ],
  objects: [
    'ee.A.h',
    'A.pEE.',
    'p..s.j',
    't.sTTs',
    '.b..sp',
    'n.k.tn',
  ],
  floors: [
    '......',
    '.a....',
    '.a....',
    '......',
    '......',
    '......',
  ],
  legend: {
    e: 'estanteria',
    A: 'sillon',
    h: 'chimenea',
    p: 'planta',
    E: 'escritorio',
    s: 'silla',
    j: 'jarron',
    T: 'mesa',
    t: 'arbol',
    b: 'arbusto',
    n: 'banco',
    k: { base: 'estatua', key: 'estatua_burns', name: 'estatua del Sr. Burns', plural: 'estatuas del Sr. Burns', unique: true, fem: true, tint: '#e6c35c' },
    a: { base: 'alfombra', tint: '#c25b7a' },
  },
  cast: [
    { id: 'H', tag: 'H', name: 'Homer', gender: 'm', clues: [] },
    { id: 'M', tag: 'M', name: 'Marge', gender: 'f', clues: [] },
    { id: 'B', tag: 'B', name: 'Bart', gender: 'm', clues: [] },
    { id: 'L', tag: 'L', name: 'Lisa', gender: 'f', clues: [] },
    { id: 'G', tag: 'G', name: 'Maggie', gender: 'f', clues: [] },
    { id: 'V', tag: 'SB', name: 'Sr. Burns', article: 'el', gender: 'm', victim: true, clues: [] },
  ],
  // <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)
  solution: { "H": [1, 1], "M": [2, 4], "B": [3, 2], "L": [0, 3], "G": [5, 5], "V": [4, 0] },
  clues: {
    "H": [{"t":"on","obj":"alfombra"}],
    "M": [{"t":"beside","obj":"jarron"}],
    "B": [{"t":"row","rows":[3]}],
    "L": [{"t":"inRoom","room":"D"},{"t":"not","c":{"t":"beside","obj":"planta"}}],
    "G": [{"t":"dir","dir":"E","of":"M"}],
  },
  // </gen>
  wantMurderer: 'G',
  story: {
    intro: 'El Sr. Burns ha invitado a los Simpson a cenar en su mansión para «celebrar» el récord de la central: tres días seguidos sin accidentes. A medianoche suena un disparo y el viejo magnate cae al suelo. Smithers tiene coartada (estaba planchando las camisas de su jefe), así que el culpable está en esta familia. ¿Quién disparó al Sr. Burns?',
    epilogue: '¡Fue Maggie! El Sr. Burns intentó quitarle la piruleta en el jardín («es tan fácil como robarle un caramelo a un bebé», presumía), forcejearon, la pistola que llevaba en el bolsillo cayó en sus manitas... y ¡bang! Nadie en Springfield la creyó capaz. Ella sigue chupando el chupete como si nada.',
  },
};

export default puzzle;
