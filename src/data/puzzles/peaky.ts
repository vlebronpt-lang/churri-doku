import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'peaky',
  num: 10,
  level: 2,
  franchise: 'Peaky Blinders',
  title: 'Por orden de los Peaky Blinders',
  size: 7,
  rooms: {
    O: { name: 'Oficina de la Shelby Company', article: 'la', color: '#c9b79a', floor: 'wood' },
    B: { name: 'Barra', article: 'la', color: '#d8a77f', floor: 'planks' },
    S: { name: 'Salón', article: 'el', color: '#e2c79a', floor: 'checker' },
    R: { name: 'Reservado', article: 'el', color: '#b98f8f', floor: 'carpet' },
    K: { name: 'Callejón', article: 'el', color: '#aab0b5', floor: 'stone' },
    W: { name: 'Bodega', article: 'la', color: '#b7a58c', floor: 'stone' },
  },
  layout: [
    'OOOBBBB',
    'OOOBBBB',
    'OOSSSRR',
    'KSSSSRR',
    'KSSSSRR',
    'KKWWWWW',
    'KKWWWWW',
  ],
  objects: [
    '....bbb',
    'fEs.k.k',
    'm...p.n',
    'lsTs.Tn',
    '.....s.',
    '.hx.c..',
    '...x...',
  ],
  legend: {
    f: 'caja_fuerte',
    E: 'escritorio',
    s: 'silla',
    m: 'maquina_escribir',
    b: { base: 'barra', unique: true },
    k: 'taburete',
    p: 'piano',
    T: 'mesa',
    n: 'banco',
    l: 'farola',
    h: { base: 'caballo', key: 'caballo_tommy', name: 'caballo de Tommy', plural: 'caballos de Tommy', unique: true, fem: false, tint: '#3b2a24' },
    x: 'barril',
    c: { base: 'caja', name: 'caja de whisky', plural: 'cajas de whisky' },
  },
  cast: [
    { id: 'T', tag: 'T', name: 'Tommy Shelby', gender: 'm', clues: [] },
    { id: 'A', tag: 'A', name: 'Arthur Shelby', gender: 'm', clues: [] },
    { id: 'P', tag: 'P', name: 'Polly Gray', gender: 'f', clues: [] },
    { id: 'J', tag: 'J', name: 'John Shelby', gender: 'm', clues: [] },
    { id: 'G', tag: 'G', name: 'Grace', gender: 'f', clues: [] },
    { id: 'Al', tag: 'Al', name: 'Alfie Solomons', gender: 'm', clues: [] },
    { id: 'C', tag: 'C', name: 'inspector Campbell', article: 'el', gender: 'm', victim: true, clues: [] },
  ],
  // <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)
  solution: { "T": [3, 6], "A": [6, 5], "P": [5, 1], "J": [2, 2], "G": [1, 4], "Al": [0, 3], "C": [4, 0] },
  clues: {
    "T": [{"t":"on","obj":"banco"}],
    "A": [{"t":"inRoom","room":"W"},{"t":"not","c":{"t":"beside","obj":"caja"}}],
    "P": [{"t":"offset","axis":"col","n":1,"dir":"E","of":"C"}],
    "J": [{"t":"inRoom","room":"S"},{"t":"corner"}],
    "G": [{"t":"on","obj":"taburete"}],
    "Al": [{"t":"inRoom","room":"B"},{"t":"not","c":{"t":"beside","obj":"taburete"}}],
  },
  // </gen>
  wantMurderer: 'P',
  pins: { C: { rooms: ['K'] } },
  story: {
    intro: 'Small Heath, Birmingham, 1919: en The Garrison se bebe whisky irlandés, se apuesta a los caballos y nadie hace preguntas. Esta noche, el inspector Campbell, llegado de Belfast para acabar con los Peaky Blinders, ha aparecido muerto. Nadie ha visto nada, porque en Small Heath nadie ve nunca nada. ¿Quién mató al inspector Campbell?',
    epilogue: 'Fue Polly Gray. La tía Polly llevaba demasiado tiempo tragándose el odio hacia aquel hombre y esa noche decidió saldar cuentas sin pedir permiso a nadie, ni siquiera a Tommy. Lo siguió hasta el callejón a lomos del caballo de Tommy, esperó a estar a solas con él y apretó el gatillo sin pestañear. Luego volvió a la barra, se sirvió una ginebra y brindó en voz baja: por orden de los Peaky Blinders.',
  },
};

export default puzzle;
