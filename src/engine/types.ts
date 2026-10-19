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
  /** Ruta del retrato (relativa a /img). */
  portrait?: string;
  /** Color de fondo del retrato / ficha. */
  color?: string;
  /** Frase de ambiente opcional (no aporta información lógica). */
  quote?: string;
  /** Criatura, robot, etc.: se evitan pistas de "con una mujer / un hombre". */
  nonhuman?: boolean;
}

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
  | { t: 'roomCount'; n: number }
  | { t: 'onlyOn'; obj: string }
  | { t: 'withSomeoneOn'; obj: string }
  | { t: 'withSomeoneBeside'; obj: string }
  | { t: 'roomEmpty'; room: string }
  | { t: 'someoneAtOffset'; axis: 'row' | 'col'; n: number; dir: Card; cond: UnaryClue }
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
}

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
  victim: string;
  murderer: string;
  solution: Record<string, number>;
  story: { intro: string; epilogue: string };
  cover?: string;
  accent?: string;
}
