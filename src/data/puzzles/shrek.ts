import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'shrek',
  num: 1,
  level: 1,
  franchise: 'Shrek',
  title: 'Boda en Duloc',
  size: 5,
  rooms: {
    S: { name: 'Salón del Trono', article: 'el', color: '#d6c4e6', floor: 'marble' },
    T: { name: 'Torre de Fiona', article: 'la', color: '#f3c7d5', floor: 'planks' },
    C: { name: 'Capilla', article: 'la', color: '#ecdfbf', floor: 'stone' },
    P: { name: 'Pantano', article: 'el', color: '#a9c98a', floor: 'grass' },
  },
  layout: [
    'SSSTT',
    'SSSTT',
    'CCCCT',
    'CCCPP',
    'CCCPP',
  ],
  objects: [
    'aIa..',
    '....Q',
    'q.q.Q',
    'n.nLt',
    '.....',
  ],
  floors: [
    '.....',
    '.....',
    '.f...',
    '.f...',
    '....w',
  ],
  legend: {
    a: 'armadura',
    I: { base: 'trono', key: 'trono_farquaad', name: 'trono de Farquaad', plural: 'tronos de Farquaad', unique: true, fem: false },
    Q: { base: 'cama', tint: '#e07a9a' },
    q: { base: 'estandarte', tint: '#c0392b' },
    n: { base: 'banco', facing: 'N' }, // mirando al altar
    L: { base: 'letrina', key: 'letrina_shrek', name: 'letrina de Shrek', plural: 'letrinas de Shrek', unique: true, fem: true },
    t: { base: 'arbol', tint: '#7d9a4a' },
    f: { base: 'alfombra', tint: '#b8323a' },
    w: 'agua',
  },
  cast: [
    { id: 'S', tag: 'S', name: 'Shrek', gender: 'm', nonhuman: true, clues: [] },
    { id: 'A', tag: 'A', name: 'Asno', gender: 'm', nonhuman: true, clues: [] },
    { id: 'F', tag: 'F', name: 'Fiona', gender: 'f', clues: [] },
    { id: 'D', tag: 'D', name: 'Dragona', article: 'la', gender: 'f', nonhuman: true, clues: [] },
    { id: 'LF', tag: 'LF', name: 'Lord Farquaad', gender: 'm', victim: true, clues: [] },
  ],
  // <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)
  solution: { "S": [4, 4], "A": [1, 2], "F": [0, 3], "D": [3, 0], "LF": [2, 1] },
  clues: {
    "S": [{"t":"inRoom","room":"P"}],
    "A": [{"t":"someoneAtOffset","axis":"col","n":2,"dir":"E","cond":{"t":"on","obj":"agua"}}],
    "F": [{"t":"alone"}],
    "D": [{"t":"on","obj":"banco"}],
  },
  // </gen>
  wantMurderer: 'D',
  pins: { LF: { rooms: ['C'] } },
  story: {
    intro: 'Duloc está de boda: Lord Farquaad se casa con la princesa Fiona y unos carteles indican a los invitados cuándo aplaudir. Pero al caer el sol la novia sube corriendo a su torre con una excusa rarísima y, cuando el obispo vuelve a mirar al altar, del novio solo queda la corona rodando por la alfombra roja. ¿Quién se ha zampado a Lord Farquaad?',
    epilogue: '¡Fue la Dragona! Entró en la capilla rompiendo la vidriera, se sentó en un banco como una invitada más y, en cuanto Farquaad se quedó solo en el altar, se lo tragó de un bocado (la corona la devolvió con un eructo). Mientras tanto, Shrek se daba un baño de barro en su pantano, Asno le daba conversación a una armadura que no contestaba y Fiona... digamos que tenía sus motivos para no salir de la torre después del anochecer.',
  },
};

export default puzzle;
