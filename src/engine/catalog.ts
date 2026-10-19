import type { ObjectDef } from './types';

type Base = Omit<ObjectDef, 'key'>;

const occ = (name: string, plural: string, fem: boolean, pose: ObjectDef['pose'], icon: string, extra: Partial<Base> = {}): Base => ({
  name, plural, fem, occupiable: true, layer: 'object', pose, icon, ...extra,
});
const blk = (name: string, plural: string, fem: boolean, icon: string, extra: Partial<Base> = {}): Base => ({
  name, plural, fem, occupiable: false, layer: 'object', icon, ...extra,
});

/**
 * Catálogo de objetos base. Los puzzles pueden reutilizarlos tal cual o personalizarlos
 * (nombre propio, color, etc.) desde su leyenda.
 */
export const CATALOG: Record<string, Base> = {
  // --- Ocupables (asientos y similares) ---
  silla: occ('silla', 'sillas', true, 'sit', 'chair'),
  sillon: occ('sillón', 'sillones', false, 'sit', 'armchair'),
  sofa: occ('sofá', 'sofás', false, 'sit', 'sofa', { mergeable: true }),
  banco: occ('banco', 'bancos', false, 'sit', 'bench', { mergeable: true }),
  taburete: occ('taburete', 'taburetes', false, 'sit', 'stool'),
  trono: occ('trono', 'tronos', false, 'sit', 'throne'),
  silla_ruedas: occ('silla de ruedas', 'sillas de ruedas', true, 'sit', 'wheelchair'),
  cama: occ('cama', 'camas', true, 'in', 'bed', { mergeable: true }),
  litera: occ('litera', 'literas', true, 'in', 'bunk', { mergeable: true }),
  camilla: occ('camilla', 'camillas', true, 'lie', 'stretcher', { mergeable: true }),
  tumbona: occ('tumbona', 'tumbonas', true, 'lie', 'lounger', { mergeable: true }),
  hamaca: occ('hamaca', 'hamacas', true, 'lie', 'hammock', { mergeable: true }),
  barca: occ('barca', 'barcas', true, 'in', 'boat', { mergeable: true }),
  drakkar: occ('drakkar', 'drakkares', false, 'in', 'longship', { mergeable: true }),
  coche: occ('coche', 'coches', false, 'in', 'car', { mergeable: true }),
  autocaravana: occ('autocaravana', 'autocaravanas', true, 'in', 'rv', { mergeable: true }),
  nave: occ('nave', 'naves', true, 'in', 'ship', { mergeable: true }),
  caballo: occ('caballo', 'caballos', false, 'ride', 'horse'),

  // --- Capa de suelo (ocupable) ---
  alfombra: { name: 'alfombra', plural: 'alfombras', fem: true, occupiable: true, layer: 'floor', pose: 'on', icon: 'carpet', mergeable: true },
  agua: { name: 'agua', plural: 'aguas', fem: false, occupiable: true, layer: 'floor', pose: 'in', icon: 'water', mergeable: true, unique: true },

  // --- Bloqueantes ---
  mesa: blk('mesa', 'mesas', true, 'table', { mergeable: true }),
  escritorio: blk('escritorio', 'escritorios', false, 'desk', { mergeable: true }),
  barra: blk('barra', 'barras', true, 'counter', { mergeable: true }),
  planta: blk('planta', 'plantas', true, 'plant'),
  arbol: blk('árbol', 'árboles', false, 'tree'),
  arbusto: blk('arbusto', 'arbustos', false, 'bush'),
  palmera: blk('palmera', 'palmeras', true, 'palm'),
  estanteria: blk('estantería', 'estanterías', true, 'shelf'),
  estatua: blk('estatua', 'estatuas', true, 'statue'),
  armadura: blk('armadura', 'armaduras', true, 'armor'),
  television: blk('televisión', 'televisiones', true, 'tv'),
  ordenador: blk('ordenador', 'ordenadores', false, 'computer'),
  barril: blk('barril', 'barriles', false, 'barrel'),
  caja: blk('caja', 'cajas', true, 'crate'),
  chimenea: blk('chimenea', 'chimeneas', true, 'fireplace'),
  hoguera: blk('hoguera', 'hogueras', true, 'campfire'),
  brasero: blk('brasero', 'braseros', false, 'brazier'),
  piano: blk('piano', 'pianos', false, 'piano'),
  armario: blk('armario', 'armarios', false, 'wardrobe'),
  pilar: blk('pilar', 'pilares', false, 'pillar'),
  roca: blk('roca', 'rocas', true, 'rock'),
  cofre: blk('cofre', 'cofres', false, 'chest'),
  canon: blk('cañón', 'cañones', false, 'cannon'),
  lampara: blk('lámpara', 'lámparas', true, 'lamp'),
  farola: blk('farola', 'farolas', true, 'streetlamp'),
  nevera: blk('nevera', 'neveras', true, 'fridge'),
  fogon: blk('fogón', 'fogones', false, 'stove'),
  jaula: blk('jaula', 'jaulas', true, 'cage'),
  valla: blk('valla', 'vallas', true, 'fence', { mergeable: true }),
  caldero: blk('caldero', 'calderos', false, 'cauldron'),
  telescopio: blk('telescopio', 'telescopios', false, 'telescope'),
  pedestal: blk('pedestal', 'pedestales', false, 'pedestal'),
  holomesa: blk('holomesa', 'holomesas', true, 'holotable', { mergeable: true }),
  yunque: blk('yunque', 'yunques', false, 'anvil'),
  escudo: blk('escudo', 'escudos', false, 'shield'),
  tarta: blk('tarta', 'tartas', true, 'cake'),
  ataud: blk('ataúd', 'ataúdes', false, 'coffin', { mergeable: true }),
  lapida: blk('lápida', 'lápidas', true, 'grave'),
  muneca: blk('muñeca', 'muñecas', true, 'doll'),
  imprenta: blk('imprenta', 'imprentas', true, 'press', { mergeable: true }),
  caja_fuerte: blk('caja fuerte', 'cajas fuertes', true, 'safe'),
  oro: blk('palé de oro', 'palés de oro', false, 'gold'),
  carbonita: blk('bloque de carbonita', 'bloques de carbonita', false, 'carbonite'),
  foso: blk('foso', 'fosos', false, 'pit', { mergeable: true }),
  torre: blk('torre de vigilancia', 'torres de vigilancia', true, 'watchtower'),
  caminante: blk('caminante', 'caminantes', false, 'walker'),
  titan: blk('titán', 'titanes', false, 'titan', { mergeable: true }),
  buzones: blk('buzón', 'buzones', false, 'mailbox'),
  vivero: blk('vivero de marisco', 'viveros de marisco', false, 'aquarium'),
  maquina_escribir: blk('máquina de escribir', 'máquinas de escribir', true, 'typewriter'),
  violonchelo: blk('violonchelo', 'violonchelos', false, 'cello'),
  freidora: blk('freidora', 'freidoras', true, 'fryer'),
  huevo: blk('huevo', 'huevos', false, 'egg'),
  bola: blk('bola de dragón', 'bolas de dragón', true, 'dragonball'),
  futbolin: blk('futbolín', 'futbolines', false, 'foosball'),
  pato: blk('pato', 'patos', false, 'duck'),
  fotocopiadora: blk('fotocopiadora', 'fotocopiadoras', true, 'copier'),
  expendedora: blk('máquina expendedora', 'máquinas expendedoras', true, 'vending'),
  contenedor: blk('contenedor', 'contenedores', false, 'dumpster'),
  baul: blk('baúl', 'baúles', false, 'toybox'),
  letrina: blk('letrina', 'letrinas', true, 'outhouse'),
  bicicleta: blk('bicicleta', 'bicicletas', true, 'bike'),
  recreativa: blk('máquina recreativa', 'máquinas recreativas', true, 'arcade'),
  timon: blk('timón', 'timones', false, 'helm'),
  ancla: blk('ancla', 'anclas', true, 'anchor'),
  orbe: blk('orbe', 'orbes', false, 'orb'),
  martillo: blk('martillo', 'martillos', false, 'hammer'),
  estandarte: blk('estandarte', 'estandartes', false, 'banner'),
  jarron: blk('jarrón', 'jarrones', false, 'vase'),
  reloj: blk('reloj', 'relojes', false, 'clock'),
  inodoro: blk('inodoro', 'inodoros', false, 'toilet'),
  lavabo: blk('lavabo', 'lavabos', false, 'sink'),
  cactus: blk('cactus', 'cactus', false, 'cactus'),
  maquina: blk('máquina', 'máquinas', true, 'machine', { mergeable: true }),
  consola: blk('consola', 'consolas', true, 'console', { mergeable: true }),
  cuna: blk('cuna', 'cunas', true, 'crib'),
  bloques: blk('torre de bloques', 'torres de bloques', true, 'blocks'),
  calabaza: blk('calabaza', 'calabazas', true, 'pumpkin'),
  colmena: blk('colmena', 'colmenas', true, 'beehive'),
};

export function resolveObject(key: string, input: string | (Partial<ObjectDef> & { base: string })): ObjectDef {
  if (typeof input === 'string') {
    const base = CATALOG[input];
    if (!base) throw new Error(`Objeto base desconocido: ${input}`);
    return { key: input, ...base };
  }
  const base = CATALOG[input.base];
  if (!base) throw new Error(`Objeto base desconocido: ${input.base}`);
  const { base: _b, ...rest } = input;
  void _b;
  return { ...base, ...rest, key: rest.key ?? key };
}
