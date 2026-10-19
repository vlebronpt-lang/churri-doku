import type { CharacterDef, Clue, Dir, Card, ObjectDef, Puzzle, RoomDef, UnaryClue } from './types';

/** Fragmento de texto con información para resaltar en el tablero. */
export interface Seg {
  text: string;
  b?: boolean;
  kw?: Keyword;
  obj?: string;
  room?: number;
  person?: string;
  rows?: number[];
  cols?: number[];
}

export type Keyword =
  | 'beside' | 'alone' | 'aloneWith' | 'with' | 'corner' | 'diagonal' | 'dir' | 'offset'
  | 'row' | 'col' | 'empty' | 'on' | 'only' | 'count' | 'victim' | 'someone';

export interface TextOpts {
  /** Direcciones sencillas: "encima de" en lugar de "al norte de". */
  simple?: boolean;
}

const ORD = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima', 'undécima', 'duodécima'];
const NUM_F = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

export const ordinal = (k: number) => ORD[k] ?? `${k + 1}.ª`;
export const numF = (n: number) => NUM_F[n] ?? String(n);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Nombre visible de un personaje ("El Profesor", "Tokio"). */
export function displayName(ch: CharacterDef): string {
  return ch.article ? `${cap(ch.article)} ${ch.name}` : ch.name;
}

/** Nombre precedido de preposición con contracciones: de + el → del, a + el → al. */
export function withPrep(prep: '' | 'de' | 'a' | 'con' | 'que', ch: CharacterDef): string {
  const art = ch.article;
  if (!art) return prep ? `${prep} ${ch.name}` : ch.name;
  if (art === 'el' && prep === 'de') return `del ${ch.name}`;
  if (art === 'el' && prep === 'a') return `al ${ch.name}`;
  return prep ? `${prep} ${art} ${ch.name}` : `${art} ${ch.name}`;
}

export function roomPhrase(room: RoomDef, prep: 'en' | 'de' | ''): string {
  const art = room.article;
  if (!art) return prep ? `${prep} ${room.name}` : room.name;
  if (art === 'el' && prep === 'de') return `del ${room.name}`;
  return prep ? `${prep} ${art} ${room.name}` : `${art} ${room.name}`;
}

/** "una silla", "un sillón", "el Trono de Hierro", "el agua". */
export function objIndef(o: ObjectDef): string {
  if (o.unique) return `${o.fem ? 'la' : 'el'} ${o.name}`;
  return `${o.fem ? 'una' : 'un'} ${o.name}`;
}

/** "a una silla", "al Trono de Hierro", "al agua". */
function objAfterA(o: ObjectDef): string {
  if (o.unique && !o.fem) return `al ${o.name}`;
  return `a ${objIndef(o)}`;
}

function adj(base: string, g: 'f' | 'm') {
  return g === 'f' ? `${base}a` : `${base}o`;
}

/** Fragmentos para "estar sobre el objeto": "sentada en una silla", "sobre una alfombra", "en el agua". */
function onSegs(o: ObjectDef, g: 'f' | 'm'): Seg[] {
  const objSeg: Seg = { text: objIndef(o), b: true, obj: o.key };
  switch (o.pose) {
    case 'sit': return [{ text: `${adj('sentad', g)} en `, kw: 'on', b: true }, objSeg];
    case 'lie': return [{ text: `${adj('tumbad', g)} en `, kw: 'on', b: true }, objSeg];
    case 'ride': return [{ text: `${adj('montad', g)} en `, kw: 'on', b: true }, objSeg];
    case 'on': return [{ text: 'sobre ', kw: 'on', b: true }, objSeg];
    default: return [{ text: 'en ', kw: 'on' }, objSeg];
  }
}

const DIR_WORD: Record<Dir, string> = {
  N: 'norte', S: 'sur', E: 'este', W: 'oeste', NE: 'noreste', NW: 'noroeste', SE: 'sureste', SW: 'suroeste',
};
const DIR_SIMPLE: Record<Dir, string> = {
  N: 'encima de', S: 'debajo de', E: 'a la derecha de', W: 'a la izquierda de',
  NE: 'encima y a la derecha de', NW: 'encima y a la izquierda de',
  SE: 'debajo y a la derecha de', SW: 'debajo y a la izquierda de',
};
const CARD_SIMPLE: Record<Card, string> = { N: 'por encima de', S: 'por debajo de', E: 'a la derecha de', W: 'a la izquierda de' };

function listOrdinals(nums: number[], last: number, noun: 'fila' | 'columna'): string {
  const words = nums.map((k) => (k === last && nums.length === 1 ? 'última' : ordinal(k)));
  if (words.length === 1) return `la ${words[0]} ${noun}`;
  const head = words.slice(0, -1).map((w) => `la ${w}`).join(', ');
  return `${head} o la ${words[words.length - 1]} ${noun}`;
}

interface Clause {
  /** Verbo inicial ("Estaba", "Era"...). */
  verb: string;
  /** Verbo cuando la cláusula se niega. */
  neg?: string;
  body: Seg[];
}

function unaryClause(p: Puzzle, ch: CharacterDef, u: UnaryClue): Clause {
  const g = ch.gender;
  switch (u.t) {
    case 'inRoom': {
      const room = p.rooms[p.roomByKey[u.room]];
      const ph = roomPhrase(room, '');
      return { verb: 'Estaba', neg: 'No estaba', body: [{ text: 'en ' }, { text: ph, b: true, room: room.id }] };
    }
    case 'inRooms':
      return { verb: 'Estaba', neg: 'No estaba', body: [{ text: 'en ' }, { text: u.label, b: true }] };
    case 'on':
      return { verb: 'Estaba', neg: 'No estaba', body: onSegs(p.objects[u.obj], g) };
    case 'onAny': {
      const body: Seg[] = [];
      u.objs.forEach((k, j) => {
        if (j > 0) body.push({ text: ' o ' });
        body.push(...onSegs(p.objects[k], g));
      });
      return { verb: 'Estaba', neg: 'No estaba', body };
    }
    case 'beside': {
      const o = p.objects[u.obj];
      return {
        verb: 'Estaba', neg: 'No estaba',
        body: [{ text: 'junto ', kw: 'beside', b: true }, { text: objAfterA(o), b: true, obj: o.key }],
      };
    }
    case 'besideN': {
      const o = p.objects[u.obj];
      const what = u.n === 1 ? objIndef(o) : `${numF(u.n)} ${o.plural}`;
      return {
        verb: 'Estaba', neg: 'No estaba',
        body: [{ text: 'junto a ', kw: 'beside', b: true }, { text: 'exactamente ' }, { text: what, b: true, obj: o.key }],
      };
    }
    case 'row':
      return { verb: 'Estaba', neg: 'No estaba', body: [{ text: 'en ' }, { text: listOrdinals(u.rows, p.size - 1, 'fila'), b: true, kw: 'row', rows: u.rows }] };
    case 'col':
      return { verb: 'Estaba', neg: 'No estaba', body: [{ text: 'en ' }, { text: listOrdinals(u.cols, p.size - 1, 'columna'), b: true, kw: 'col', cols: u.cols }] };
    case 'corner':
      return { verb: 'Estaba', neg: 'No estaba', body: [{ text: 'en una ' }, { text: 'esquina', b: true, kw: 'corner' }, { text: ' de su zona' }] };
    case 'not': {
      const inner = unaryClause(p, ch, u.c);
      return { verb: inner.neg ?? `No ${inner.verb.toLowerCase()}`, neg: inner.verb, body: inner.body };
    }
  }
}

function personSeg(p: Puzzle, id: string, prep: '' | 'de' | 'a' | 'con' | 'que'): Seg[] {
  const other = p.cast.find((c) => c.id === id);
  if (!other) return [{ text: `?${id}` }];
  const full = withPrep(prep, other);
  const name = displayName(other);
  // Separar la preposición/artículo del nombre para resaltar solo el nombre.
  const idx = full.toLowerCase().lastIndexOf(other.name.toLowerCase());
  const head = full.slice(0, idx);
  return [{ text: head }, { text: idx >= 0 ? full.slice(idx) : name, b: true, person: id }];
}

function clueClauses(p: Puzzle, ch: CharacterDef, clue: Clue, o: TextOpts): Clause[] {
  const g = ch.gender;
  switch (clue.t) {
    case 'inRoom': case 'inRooms': case 'on': case 'onAny': case 'beside': case 'besideN':
    case 'row': case 'col': case 'corner': case 'not':
      return [unaryClause(p, ch, clue)];
    case 'dir': {
      if (o.simple) {
        const words = DIR_SIMPLE[clue.dir];
        const [pre, prep] = words.endsWith(' de') ? [words.slice(0, -3), 'de' as const] : [words, '' as const];
        return [{ verb: 'Estaba', neg: 'No estaba', body: [{ text: pre + ' ', b: true, kw: 'dir' }, ...personSeg(p, clue.of, prep)] }];
      }
      return [{ verb: 'Estaba', neg: 'No estaba', body: [{ text: `al ${DIR_WORD[clue.dir]} `, b: true, kw: 'dir' }, ...personSeg(p, clue.of, 'de')] }];
    }
    case 'offset': {
      const noun = clue.axis === 'row' ? (clue.n === 1 ? 'fila' : 'filas') : (clue.n === 1 ? 'columna' : 'columnas');
      const amount = `exactamente ${numF(clue.n)} ${noun}`;
      if (o.simple) {
        const words = CARD_SIMPLE[clue.dir];
        const pre = words.slice(0, -3);
        return [{ verb: 'Estaba', neg: 'No estaba', body: [{ text: `${amount} ${pre} `, b: true, kw: 'offset' }, ...personSeg(p, clue.of, 'de')] }];
      }
      return [{ verb: 'Estaba', neg: 'No estaba', body: [{ text: `${amount} al ${DIR_WORD[clue.dir]} `, b: true, kw: 'offset' }, ...personSeg(p, clue.of, 'de')] }];
    }
    case 'sameRoom':
      return [{ verb: 'Estaba', neg: 'No estaba', body: [{ text: 'con ', b: true, kw: 'with' }, ...personSeg(p, clue.of, '')] }];
    case 'notSameRoom':
      return [{ verb: 'No estaba', neg: 'Estaba', body: [{ text: 'con ', b: true, kw: 'with' }, ...personSeg(p, clue.of, '')] }];
    case 'aloneWith':
      return [{ verb: 'Estaba', body: [{ text: 'a solas con ', b: true, kw: 'aloneWith' }, ...personSeg(p, clue.of, '')] }];
    case 'adjacentTo':
      return [{ verb: 'Estaba', neg: 'No estaba', body: [{ text: 'junto ', b: true, kw: 'beside' }, ...personSeg(p, clue.of, 'a')] }];
    case 'diagonal':
      return [{ verb: 'Estaba', neg: 'No estaba', body: [{ text: 'en la misma ' }, { text: 'diagonal', b: true, kw: 'diagonal' }, { text: ' que ' }, ...personSeg(p, clue.of, '')] }];
    case 'alone':
      return [{ verb: 'Estaba', neg: 'No estaba', body: [{ text: adj('sol', g), b: true, kw: 'alone' }] }];
    case 'notAlone':
      return [{ verb: 'No estaba', neg: 'Estaba', body: [{ text: adj('sol', g), b: true, kw: 'alone' }] }];
    case 'withGender':
      return [{ verb: 'Estaba', body: [{ text: 'con ', b: true, kw: 'with' }, { text: clue.g === 'f' ? 'una mujer' : 'un hombre', b: true }] }];
    case 'roomCount':
      return [{ verb: 'Estaba', body: [{ text: 'en una zona con ' }, { text: `exactamente ${numF(clue.n)} personas`, b: true, kw: 'count' }, { text: ` (${g === 'f' ? 'ella' : 'él'} incluid${g === 'f' ? 'a' : 'o'})` }] }];
    case 'onlyOn': {
      const ob = p.objects[clue.obj];
      const segs = onSegs(ob, 'f');
      return [{ verb: 'Era', body: [{ text: 'la ' }, { text: 'única persona', b: true, kw: 'only' }, { text: ' ' }, ...segs] }];
    }
    case 'withSomeoneOn': {
      const ob = p.objects[clue.obj];
      return [{ verb: 'Estaba', body: [{ text: 'con ', b: true, kw: 'with' }, { text: 'alguien ' }, ...onSegs(ob, 'm')] }];
    }
    case 'withSomeoneBeside': {
      const ob = p.objects[clue.obj];
      return [{ verb: 'Estaba', body: [{ text: 'con ', b: true, kw: 'with' }, { text: 'alguien que estaba ' }, { text: 'junto ', b: true, kw: 'beside' }, { text: objAfterA(ob), b: true, obj: ob.key }] }];
    }
    case 'roomEmpty': {
      const room = p.rooms[p.roomByKey[clue.room]];
      return [{ verb: 'Nadie', body: [{ text: 'estuvo en ' }, { text: roomPhrase(room, ''), b: true, room: room.id, kw: 'empty' }] }];
    }
    case 'someoneAtOffset': {
      const noun = clue.axis === 'row' ? (clue.n === 1 ? 'fila' : 'filas') : (clue.n === 1 ? 'columna' : 'columnas');
      if (clue.g && !clue.cond) {
        // «Estaba exactamente dos columnas al este de una mujer» (la mujer está al oeste).
        const opp: Record<Card, Card> = { N: 'S', S: 'N', E: 'W', W: 'E' };
        const who = clue.g === 'f' ? 'una mujer' : 'un hombre';
        const amount = `exactamente ${numF(clue.n)} ${noun}`;
        const where = o.simple ? `${amount} ${CARD_SIMPLE[opp[clue.dir]].slice(0, -3)}` : `${amount} al ${DIR_WORD[opp[clue.dir]]}`;
        return [{ verb: 'Estaba', body: [{ text: `${where} `, b: true, kw: 'offset' }, { text: 'de ' }, { text: who, b: true }] }];
      }
      const pron = g === 'f' ? 'ella' : 'él';
      const dirTxt = o.simple ? `${CARD_SIMPLE[clue.dir]} ${pron}` : `al ${DIR_WORD[clue.dir]} de ${pron}`;
      // «alguien» va siempre en masculino genérico: «alguien estaba sentado en…», aunque la pista sea de una mujer.
      const inner = unaryClause(p, { ...ch, gender: 'm' }, clue.cond!);
      const innerVerb = inner.verb.toLowerCase();
      return [{
        verb: 'Exactamente',
        body: [
          { text: `${numF(clue.n)} ${noun} ${dirTxt}`, b: true, kw: 'offset' },
          { text: ', ' },
          { text: 'alguien', b: true, kw: 'someone' },
          { text: ` ${innerVerb} ` },
          ...inner.body,
        ],
      }];
    }
    case 'victim':
      return [
        { verb: 'La víctima.', body: [] },
        { verb: 'Estaba', body: [{ text: 'a solas con ', b: true, kw: 'aloneWith' }, { text: 'el asesino', b: true }] },
      ];
  }
}

/** Texto de las pistas de un personaje como lista de oraciones con fragmentos. */
export function clueSentences(p: Puzzle, ch: CharacterDef, opts: TextOpts = {}): Seg[][] {
  const out: Seg[][] = [];
  const clues = ch.victim ? ([{ t: 'victim' }, ...ch.clues.filter((c) => c.t !== 'victim')] as Clue[]) : ch.clues;
  for (const clue of clues) {
    for (const cl of clueClauses(p, ch, clue, opts)) {
      const segs: Seg[] = [{ text: cl.verb + (cl.body.length ? ' ' : '') }, ...cl.body];
      // Sin doble punto si la frase acaba en un nombre abreviado («Tommy H.»).
      if (cl.body.length && !/[.!?…]$/.test(cl.body[cl.body.length - 1].text)) segs.push({ text: '.' });
      out.push(merge(segs));
    }
  }
  return out;
}

function merge(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  for (const s of segs) {
    if (!s.text) continue;
    const last = out[out.length - 1];
    const plain = (x: Seg) => !x.b && !x.kw && !x.obj && x.room === undefined && !x.person && !x.rows && !x.cols;
    if (last && plain(last) && plain(s)) last.text += s.text;
    else out.push({ ...s });
  }
  return out;
}

/** Texto plano de las pistas de un personaje. */
export function clueText(p: Puzzle, ch: CharacterDef, opts: TextOpts = {}): string {
  return clueSentences(p, ch, opts).map((segs) => segs.map((s) => s.text).join('')).join(' ');
}
