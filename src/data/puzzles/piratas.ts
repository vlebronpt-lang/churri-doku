import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'piratas',
  num: 5,
  level: 1,
  franchise: 'Piratas del Caribe',
  title: 'La maldición de la Isla de Muerta',
  size: 6,
  rooms: {
    C: { name: 'Cueva del Tesoro', article: 'la', color: '#c9b9a6', floor: 'stone' },
    L: { name: 'Laguna', article: 'la', color: '#9fc9d9', floor: 'stone' },
    P: { name: 'Playa', article: 'la', color: '#f1dca3', floor: 'sand' },
    K: { name: 'Cubierta de la Perla Negra', article: 'la', color: '#b89b80', floor: 'planks' },
  },
  layout: [
    'CCCLLL',
    'CCCCLL',
    'CCCLLL',
    'KKPPPP',
    'KKKPPP',
    'KKKPPP',
  ],
  objects: [
    '......',
    '.X.r..',
    'r.o.bb',
    'kT....',
    'k.c..p',
    '...p.k',
  ],
  floors: [
    '...www',
    '....ww',
    '...www',
    '......',
    '......',
    '......',
  ],
  legend: {
    r: 'roca',
    X: { base: 'cofre', key: 'cofre_azteca', name: 'cofre del oro azteca', plural: 'cofres del oro azteca', unique: true, fem: false, tint: '#7a4a2c' },
    o: { base: 'oro', key: 'monton_oro', name: 'montón de oro', plural: 'montones de oro', fem: false },
    b: 'barca',
    p: 'palmera',
    T: { base: 'timon', key: 'timon_perla', name: 'timón de la Perla Negra', plural: 'timones de la Perla Negra', unique: true, fem: false },
    k: 'barril',
    c: 'canon',
    w: 'agua',
  },
  cast: [
    { id: 'J', tag: 'J', name: 'Jack Sparrow', gender: 'm', clues: [] },
    { id: 'W', tag: 'W', name: 'Will Turner', gender: 'm', clues: [] },
    { id: 'E', tag: 'E', name: 'Elizabeth Swann', gender: 'f', clues: [] },
    { id: 'G', tag: 'G', name: 'Gibbs', gender: 'm', clues: [] },
    { id: 'N', tag: 'N', name: 'Norrington', gender: 'm', clues: [] },
    { id: 'B', tag: 'B', name: 'Barbossa', gender: 'm', victim: true, clues: [] },
  ],
  // <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)
  solution: { "J": [1, 2], "W": [2, 5], "E": [3, 3], "G": [4, 1], "N": [5, 4], "B": [0, 0] },
  clues: {
    "J": [{"t":"beside","obj":"monton_oro"}],
    "W": [{"t":"dir","dir":"E","of":"N"}],
    "E": [{"t":"inRoom","room":"P"},{"t":"not","c":{"t":"beside","obj":"barril"}}],
    "G": [{"t":"beside","obj":"timon_perla"}],
    "N": [{"t":"inRoom","room":"P"}],
  },
  // </gen>
  wantMurderer: 'J',
  pins: { B: { rooms: ['C'] } },
  story: {
    intro: 'Noche de luna llena en la Isla de Muerta. En la cueva del tesoro, Barbossa espera a que la última moneda vuelva al cofre del oro azteca para romper la maldición que lo convierte en esqueleto bajo la luz de la luna. De pronto, un disparo retumba entre los montones de oro y el capitán se desploma. ¿Quién mató a Barbossa?',
    epilogue: '¡Fue Jack Sparrow! Llevaba diez años guardando una sola bala para su antiguo primer oficial y la disparó justo cuando la maldición se rompía: Barbossa volvió a ser mortal en el peor momento posible. Mientras tanto, Will remaba por la laguna, Gibbs no soltaba el timón de la Perla Negra y Elizabeth y Norrington seguían discutiendo en la playa. Al amanecer, Jack recuperó su barco.',
  },
};

export default puzzle;
