import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'jurassic',
  num: 9,
  level: 2,
  franchise: 'Parque Jurásico',
  title: 'Fallo en el sistema',
  size: 7,
  rooms: {
    C: { name: 'Sala de control', article: 'la', color: '#b9c6d6', floor: 'metal' },
    L: { name: 'Laboratorio', article: 'el', color: '#d9e9ee', floor: 'tiles' },
    R: { name: 'Restaurante', article: 'el', color: '#f0d3a2', floor: 'checker' },
    G: { name: 'Garaje', article: 'el', color: '#cfc6b8', floor: 'stone' },
    D: { name: 'Recinto del Dilofosaurio', article: 'el', color: '#a9cf8f', floor: 'grass' },
  },
  layout: [
    'CCCLLLL',
    'CCCLLLL',
    'CCRRRLL',
    'GGRRRDD',
    'GGRRRDD',
    'GGDDDDD',
    'GGDDDDD',
  ],
  objects: [
    '......j',
    'ssKh.h.',
    'oosTsa.',
    '..sTs.b',
    'J....t.',
    'J..vv.t',
    '.......',
  ],
  legend: {
    o: 'ordenador',
    K: 'consola',
    s: 'silla',
    h: 'huevo',
    j: 'jaula',
    a: { base: 'orbe', key: 'ambar', name: 'ámbar del mosquito', plural: 'ámbares del mosquito', unique: true, fem: false, tint: '#e39b2d' },
    T: 'mesa',
    J: { base: 'coche', key: 'jeep', name: 'jeep', plural: 'jeeps', unique: true, fem: false, tint: '#4f8a3c' },
    v: 'valla',
    t: 'arbol',
    b: 'arbusto',
  },
  cast: [
    { id: 'A', tag: 'A', name: 'Alan Grant', gender: 'm', clues: [] },
    { id: 'E', tag: 'E', name: 'Ellie Sattler', gender: 'f', clues: [] },
    { id: 'I', tag: 'I', name: 'Ian Malcolm', gender: 'm', clues: [] },
    { id: 'H', tag: 'H', name: 'John Hammond', gender: 'm', clues: [] },
    { id: 'M', tag: 'M', name: 'Robert Muldoon', gender: 'm', clues: [] },
    { id: 'D', tag: 'D', name: 'Dilofosaurio', article: 'el', gender: 'm', nonhuman: true, clues: [] },
    { id: 'N', tag: 'N', name: 'Dennis Nedry', gender: 'm', victim: true, clues: [] },
  ],
  // <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)
  solution: { "A": [4, 3], "E": [2, 2], "I": [5, 0], "H": [0, 1], "M": [1, 4], "D": [3, 5], "N": [6, 6] },
  clues: {
    "A": [{"t":"aloneWith","of":"E"}],
    "E": [{"t":"inRoom","room":"R"},{"t":"corner"}],
    "I": [{"t":"on","obj":"jeep"}],
    "H": [{"t":"inRoom","room":"C"},{"t":"not","c":{"t":"beside","obj":"consola"}}],
    "M": [{"t":"dir","dir":"W","of":"D"}],
    "D": [{"t":"beside","obj":"arbusto"}],
  },
  // </gen>
  wantMurderer: 'D',
  pins: { N: { rooms: ['D'] } },
  story: {
    intro: 'Isla Nublar, noche de tormenta tropical. Alguien ha apagado las vallas eléctricas y los ordenadores del centro de visitantes solo muestran un muñequito que repite «¡Ah, ah, ah! ¡No has dicho la palabra mágica!». Al amanecer encuentran a Dennis Nedry sin vida y empapado, abrazado a un bote de espuma de afeitar lleno de embriones. ¿Quién mató a Dennis Nedry?',
    epilogue: 'Fue el Dilofosaurio. Nedry desactivó la seguridad para huir con los embriones robados, escondidos en un bote de espuma de afeitar, pero se perdió bajo la lluvia, se metió en el recinto equivocado y acabó a solas con un bicho que parecía inofensivo. Le tiró un palo para que fuera a buscarlo como un perrito; el Dilofosaurio prefirió desplegar la gorguera y escupirle veneno a los ojos. Como diría Ian Malcolm, la vida se abre camino; la de Nedry, no tanto.',
  },
};

export default puzzle;
