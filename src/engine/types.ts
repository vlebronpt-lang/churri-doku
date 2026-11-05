// Modelo de datos de Churri-doku.
// Coordenadas: las casillas se identifican por índice i = r * size + c (fila r, columna c, base 0).

export type Gender = 'f' | 'm';
export type Dir = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';
export type Card = 'N' | 'S' | 'E' | 'W';
export type Level = 1 | 2 | 3 | 4 | 5;

/** Postura con la que se "está" sobre un objeto ocupable (para redactar la pista). */
export type Pose = 'sit' | 'lie' | 'on' | 'in' | 'ride';

export interface ObjectDef {
  key: string;
  /** Nombre en singular, en minúscula salvo nombres propios ("silla", "Trono de Hierro"). */
  name: string;
  plural: string;
  /** Género gramatical femenino (una/la) o masculino (un/el). */
  fem: boolean;
  occupiable: boolean;
  /** 'floor' = capa de suelo (alfombras, agua...) que puede convivir con un objeto. */
  layer: 'object' | 'floor';
  pose?: Pose;
  /** Objeto único con nombre propio: las pistas usan artículo determinado. */
  unique?: boolean;
  /** Identificador del dibujo SVG. */
  icon: string;
  /** Las casillas contiguas con la misma letra forman un solo objeto (mesas, camas, alfombras...). */
  mergeable?: boolean;
  /** Color principal opcional para variar el dibujo. */
  tint?: string;
  /** Hacia dónde mira un asiento (si no, se calcula: hacia mesas, teles…). */
  facing?: 'N' | 'E' | 'S' | 'W';
}

export interface RoomDef {
  id: number;
  key: string;
  name: string;
  /** Artículo para "en la Cocina", "en el Salón", "en los Jardines"... ('' si no lleva). */
  article: 'el' | 'la' | 'los' | 'las' | '';
  color: string;
  floor: FloorPattern;
}

export type FloorPattern =
  | 'wood' | 'tiles' | 'checker' | 'grass' | 'stone' | 'sand' | 'water' | 'metal'
  | 'carpet' | 'dirt' | 'snow' | 'marble' | 'plain' | 'planks' | 'lava' | 'space';

export interface CellDef {
  i: number;
  r: number;
  c: number;
  room: number;
  /** Clave del objeto (capa objeto) o null. */
  obj: string | null;
  /** Identificador de instancia del objeto (para objetos de varias casillas). */
  objGroup: number;
  /** Clave del objeto de suelo (alfombra, agua...) o null. */
  floor: string | null;
  floorGroup: number;
  occupiable: boolean;
}

export interface CharacterDef {
  id: string;
  /** Etiqueta corta mostrada en el tablero (1–2 caracteres, única). */
  tag: string;
  name: string;
  /** Artículo que forma parte del nombre ("el Profesor", "la Dragona"). */
  article?: 'el' | 'la';
  gender: Gender;
  victim?: boolean;
  clues: Clue[];
  /** Retrato de otro caso, como 'simpson/V' (por defecto, el del propio caso con su id). */
  portrait?: string;
  /** Color de fondo del retrato / ficha. */
  color?: string;
  /** Frase de ambiente opcional (no aporta información lógica). */
  quote?: string;
  /** Criatura, robot, etc.: se evitan pistas de "con una mujer / un hombre". */
  nonhuman?: boolean;
  /** Grupos a los que pertenece (Targaryen, piso interior, primera clase…): claves de `groups` del caso. */
  groups?: string[];
}

/** Grupo de personas de un caso: una casa, una clase del barco, los pisos interiores… */
export interface GroupDef {
  /** Etiqueta corta para su ficha: «Targaryen», «Piso interior», «1.ª clase». */
  label: string;
  /** Cómo se dice en el rótulo de una zona reservada («solo empleados»), si no es igual que la etiqueta. */
  only?: string;
  /** En singular con artículo: «un Targaryen», «un vecino de piso interior». */
  one: string;
  /** En plural con artículo: «los Targaryen», «los vecinos de pisos interiores». */
  many: string;
  /** Color de su etiqueta. */
  color?: string;
}

/** Reglas del caso: valen para todo el plano y para todo el reparto (las «pistas generales» de Murdoku). */
export type CaseRule =
  /** En estas zonas solo puede haber personas de este grupo. */
  | { t: 'zoneOnly'; rooms: string[]; group: string }
  /** En esta zona hay exactamente n personas (0: está vacía). */
  | { t: 'zoneCount'; room: string; n: number }
  /** Hay exactamente n zonas vacías (0: ninguna). */
  | { t: 'emptyZones'; n: number }
  /** Hay exactamente n personas sobre este objeto (sentadas en una silla, en una alfombra…). */
  | { t: 'objCount'; obj: string; n: number }
  /** En cada una de estas zonas hay al menos una persona de este grupo. */
  | { t: 'zoneHasGroup'; rooms: string[]; group: string }
  /** Estos dos grupos nunca comparten zona. */
  | { t: 'groupsApart'; a: string; b: string }
  /** Ninguna zona tiene exactamente n personas (n = 1: nadie está a solas en su zona). */
  | { t: 'noZoneWith'; n: number };

// ---------------------------------------------------------------------------
// Pistas
// ---------------------------------------------------------------------------

/** Pistas que solo dependen de la casilla del propio personaje. */
export type UnaryClue =
  | { t: 'inRoom'; room: string }
  | { t: 'inRooms'; rooms: string[]; label: string; labelArticle?: string }
  | { t: 'on'; obj: string }
  | { t: 'onAny'; objs: string[] }
  | { t: 'beside'; obj: string }
  | { t: 'besideN'; obj: string; n: number }
  | { t: 'row'; rows: number[] }
  | { t: 'col'; cols: number[] }
  | { t: 'corner' }
  | { t: 'not'; c: UnaryClue };

export type Clue =
  | UnaryClue
  // Relaciones con otro personaje
  | { t: 'dir'; dir: Dir; of: string }
  | { t: 'offset'; axis: 'row' | 'col'; n: number; dir: Card; of: string }
  | { t: 'sameRoom'; of: string }
  | { t: 'notSameRoom'; of: string }
  | { t: 'aloneWith'; of: string }
  | { t: 'adjacentTo'; of: string }
  | { t: 'diagonal'; of: string }
  // Ocupación de habitaciones / globales
  | { t: 'alone' }
  | { t: 'notAlone' }
  | { t: 'withGender'; g: Gender }
  /** Estaba con alguien de este grupo. */
  | { t: 'withGroup'; group: string }
  | { t: 'roomCount'; n: number }
  | { t: 'onlyOn'; obj: string }
  | { t: 'withSomeoneOn'; obj: string }
  | { t: 'withSomeoneBeside'; obj: string }
  | { t: 'roomEmpty'; room: string }
  /** Alguien (que cumple `cond`, o que es mujer/hombre si hay `g`) está a n filas/columnas en esa dirección. */
  | { t: 'someoneAtOffset'; axis: 'row' | 'col'; n: number; dir: Card; cond?: UnaryClue; g?: Gender }
  | { t: 'victim' };

// ---------------------------------------------------------------------------
// Definición del puzzle tal como se escribe (autoría) y su versión compilada.
// ---------------------------------------------------------------------------

export interface RoomInput {
  name: string;
  article: RoomDef['article'];
  color: string;
  floor: FloorPattern;
}

export type ObjectInput = string | (Partial<ObjectDef> & { base: string });

export interface PuzzleInput {
  id: string;
  num: number;
  level: Level;
  franchise: string;
  title: string;
  size: number;
  /** Letra de habitación → definición. */
  rooms: Record<string, RoomInput>;
  /** size filas de size letras de habitación. */
  layout: string[];
  /** Capa de objetos: '.' vacío, o letra de la leyenda. */
  objects: string[];
  /** Capa de suelo opcional (alfombras, agua). */
  floors?: string[];
  /** Letra → clave de objeto base o definición personalizada. */
  legend: Record<string, ObjectInput>;
  cast: CharacterDef[];
  /** Grupos del reparto (clave → definición). */
  groups?: Record<string, GroupDef>;
  /** Reglas del caso. */
  rules?: CaseRule[];
  /** Solución: id de personaje → [fila, columna] (base 0). */
  solution: Record<string, [number, number]>;
  /** Pistas por personaje (sustituyen a las de `cast`). Las escribe el generador. */
  clues?: Record<string, Clue[]>;
  story: { intro: string; epilogue: string };
  /** Ilustración de portada (relativa a /img). */
  cover?: string;
  accent?: string;
  /** Solo para el generador: restricciones temáticas de la solución. */
  pins?: Record<string, { rooms?: string[]; objs?: string[]; cells?: [number, number][] }>;
  /** Solo para el generador: id del asesino deseado. */
  wantMurderer?: string;
  /** Caso cuyas ilustraciones (retratos y portada) se usan; por defecto, el propio id. */
  art?: string;
  /** Tipo de partida especial (caso del día, lección de la academia, tutorial). */
  meta?: PuzzleMeta;
}

export type PuzzleMeta =
  | { kind: 'daily'; date: string; base: string; mirror: boolean }
  | { kind: 'lesson'; lesson: string }
  | { kind: 'tutorial' };

export interface Puzzle {
  id: string;
  num: number;
  level: Level;
  franchise: string;
  title: string;
  size: number;
  rooms: RoomDef[];
  roomByKey: Record<string, number>;
  cells: CellDef[];
  objects: Record<string, ObjectDef>;
  cast: CharacterDef[];
  groups: Record<string, GroupDef>;
  rules: CaseRule[];
  victim: string;
  murderer: string;
  solution: Record<string, number>;
  story: { intro: string; epilogue: string };
  cover?: string;
  accent?: string;
  art?: string;
  meta?: PuzzleMeta;
}
