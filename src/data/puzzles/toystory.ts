import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'toystory',
  num: 3,
  level: 1,
  franchise: 'Toy Story',
  title: 'Fuga de Sunnyside',
  size: 6,
  rooms: {
    M: { name: 'Sala Mariposa', article: 'la', color: '#e6cdee', floor: 'wood' },
    O: { name: 'Sala Oruga', article: 'la', color: '#c3e2a6', floor: 'tiles' },
    Q: { name: 'Cuarto de la máquina', article: 'el', color: '#c5cdda', floor: 'tiles' },
    P: { name: 'Patio', article: 'el', color: '#eedb9f', floor: 'sand' },
  },
  layout: [
    'MMMOOO',
    'MMMOOO',
    'MMMMOO',
    'QQQPPP',
    'QQPPPP',
    'QQPPPP',
  ],
  objects: [
    '....mC',
    'b...h.',
    'sMsT..',
    'Ec.n.t',
    '.G..k.',
    '.....D',
  ],
  floors: [
    '.aa...',
    '.aa...',
    '......',
    '......',
    '......',
    '......',
  ],
  legend: {
    b: 'baul',
    a: { base: 'alfombra', tint: '#5aa0d8' },
    s: { base: 'silla', key: 'sillita', name: 'sillita', plural: 'sillitas', fem: true, tint: '#e86a4f' },
    M: { base: 'mesa', key: 'mesita', name: 'mesita', plural: 'mesitas', fem: true, tint: '#f3c33b' },
    T: 'bloques',
    m: 'muneca',
    C: 'cuna',
    h: { base: 'caballo', key: 'caballito', name: 'caballito de balancín', plural: 'caballitos de balancín', fem: false, tint: '#d9483b', icon: 'rockinghorse' },
    E: { base: 'expendedora', key: 'maquina_expendedora', name: 'máquina expendedora', plural: 'máquinas expendedoras', unique: true, fem: true },
    c: 'silla',
    G: { base: 'mesa', tint: '#4f9a5a' },
    n: 'banco',
    k: 'bicicleta',
    t: 'arbol',
    D: { base: 'contenedor', key: 'contenedor_basura', name: 'contenedor de basura', plural: 'contenedores de basura', unique: true, fem: false },
  },
  cast: [
    { id: 'W', tag: 'W', name: 'Woody', gender: 'm', nonhuman: true, clues: [] },
    { id: 'B', tag: 'B', name: 'Buzz', gender: 'm', nonhuman: true, clues: [] },
    { id: 'J', tag: 'J', name: 'Jessie', gender: 'f', nonhuman: true, clues: [] },
    { id: 'K', tag: 'K', name: 'Ken', gender: 'm', nonhuman: true, clues: [] },
    { id: 'Bb', tag: 'Bb', name: 'Bebote', gender: 'm', nonhuman: true, clues: [] },
    { id: 'L', tag: 'L', name: 'Lotso', gender: 'm', nonhuman: true, victim: true, clues: [] },
  ],
  // <gen> (generado por scripts/gen.ts; se puede retocar a mano y validar con scripts/validate.ts)
  solution: { "W": [3, 1], "B": [2, 0], "J": [1, 4], "K": [0, 3], "Bb": [5, 2], "L": [4, 5] },
  clues: {
    "W": [{"t":"beside","obj":"maquina_expendedora"}],
    "B": [{"t":"inRoom","room":"M"},{"t":"not","c":{"t":"beside","obj":"bloques"}}],
    "J": [{"t":"on","obj":"caballito"}],
    "K": [{"t":"beside","obj":"muneca"}],
    "Bb": [{"t":"dir","dir":"W","of":"K"}],
  },
  // </gen>
  wantMurderer: 'Bb',
  pins: { L: { rooms: ['P'] } },
  story: {
    intro: 'Es de noche en la guardería Sunnyside y Woody y compañía ultiman su gran fuga. Pero antes de la señal aparece Lotso, el osito con olor a fresa que gobierna el lugar con mano de hierro (y de peluche), tirado en el patio junto al contenedor de basura. ¿Quién ha acabado con el dictador de Sunnyside?',
    epilogue: '¡Fue Bebote! Cuando descubrió que Lotso le había mentido sobre su antigua dueña, levantó a su jefe en volandas y lo lanzó de cabeza al contenedor de basura. Mientras, Woody vigilaba la máquina expendedora, Buzz esperaba en una sillita de la Sala Mariposa, Jessie cabalgaba un caballito de balancín y Ken le hacía ojitos a una muñeca. Sin dictador de peluche, en Sunnyside por fin se juega por turnos.',
  },
};

export default puzzle;
